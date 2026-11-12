import { supabase } from './supabase';
import { UserProfile, Mission, ProtocolChallengeCycle, UserChallenge, DayRecord, RewardGrant } from '../core/types';
import { getTodayString } from '../core/dateUtils';
import { getDefaultRyoReward } from '../core/ryoEngine';
import { mergeSnapshots, stableStringify, SyncSnapshot } from '../core/syncMerge';
import { useUserStore, migrateProfile } from '../state/useUserStore';
import { useHabitStore } from '../state/useHabitStore';
import { useChallengeStore, setChallengesSilently } from '../state/useChallengeStore';
import { useDuelStore } from '../state/useDuelStore';
import { useToolStore } from '../state/useToolStore';

/**
 * SINCRONIZAÇÃO (offline-first)
 * ─────────────────────────────────────────────────────────────
 * Um ciclo de sincronização é sempre: BAIXAR → MESCLAR → APLICAR → ENVIAR.
 * Nunca enviamos sem antes mesclar com o que está na nuvem, então um
 * aparelho com dados atrasados não apaga o progresso feito em outro.
 * As regras de mesclagem ficam em `core/syncMerge.ts` (puras e testadas).
 */

/** Dados extras guardados dentro de `avatar_config` (JSON) para não exigir migração de schema. */
interface CloudExtras {
  _v?: number;
  _activeChallenge?: ProtocolChallengeCycle;
  _challengeHistory?: ProtocolChallengeCycle[];
  _customChallenges?: UserChallenge[];
  _dayLog?: Record<string, DayRecord>;
  _shieldedDates?: string[];
  _shieldsThrough?: string;
  _purchasedItems?: string[];
  _extraShieldWeeks?: string[];
  _soldierPillDates?: string[];
  _bossHp?: Record<string, number>;
  _missionsCompletedTotal?: number;
  _grants?: Record<string, RewardGrant>;
  _revoked?: Record<string, string>;
  _deletedMissions?: Record<string, string>;
  _deletedCycles?: Record<string, string>;
  _dayWipe?: { from: string; at: string };
  _resetEpoch?: string;
  _updatedAt?: string;
}

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const SYNC_META_KEY = 'ml_sync_meta_v3';
const FOCUS_SYNC_MIN_INTERVAL_MS = 15_000;
const SYNC_TIMEOUT_MS = 20_000;

/** Campos recalculados localmente a cada reconciliação — não contam como "diferença" entre aparelhos. */
const DERIVED_PROFILE_KEYS = [
  'currentStreak',
  'weeklyShieldsRemaining',
  'weeklyShieldsMax',
  'unlockedCards',
  'inventory',
  'bossesDefeated',
  'currentProtocolDay',
  'lastActiveDate',
  'totalXp',
  'pillarXp',
  'level',
  'currentRankId',
  'ryo',
] as const;

const toIso = (value?: string): string => {
  const ms = value ? Date.parse(value) : NaN;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : '';
};

function readMeta(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(SYNC_META_KEY) || '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

function comparable(snapshot: SyncSnapshot): unknown {
  const profile = { ...(snapshot.profile as unknown as Record<string, unknown>) };
  DERIVED_PROFILE_KEYS.forEach((key) => delete profile[key]);
  return {
    profile,
    missions: snapshot.missions.map(({ isCompletedToday, ...rest }) => {
      void isCompletedToday;
      return rest;
    }),
    challenges: snapshot.challenges,
    bossHp: snapshot.bossHp,
  };
}

class SyncService {
  /** Usuário autenticado (null = modo local, sem nuvem). */
  public userId: string | null = null;
  /** Compatibilidade: indica que este aparelho já sincronizou ao menos uma vez nesta sessão. */
  public isHydrated = false;

  private running: Promise<void> | null = null;
  private rerun = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastSyncAt = 0;
  private lastApplied = '';

  public setUser(userId: string | null) {
    this.userId = userId;
    if (!userId) this.isHydrated = false;
  }

  // ── Agendamento ────────────────────────────────────────────

  /** Agenda um ciclo de sincronização (agrupa várias alterações em um envio). */
  public schedule(delay = 800) {
    if (!this.userId) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.sync();
    }, delay);
  }

  /** Envia imediatamente o que estiver pendente (app indo para segundo plano). */
  public flush() {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
    void this.sync();
  }

  /** App voltou ao primeiro plano: busca novidades de outros aparelhos (com limite de frequência). */
  public syncOnFocus() {
    if (!this.userId || Date.now() - this.lastSyncAt < FOCUS_SYNC_MIN_INTERVAL_MS) return;
    this.schedule(0);
  }

  /**
   * Virada de dia: só fecha o dia anterior DEPOIS de buscar os dados da nuvem,
   * para não registrar falta em um dia cumprido em outro aparelho.
   */
  public async settleWithFreshData() {
    const user = useUserStore.getState();
    if (!this.userId) {
      user.checkDayTransition();
      return;
    }
    user.setCloudGate('pending');
    const failSafe = setTimeout(() => useUserStore.getState().setCloudGate('open'), 6000);
    try {
      await this.sync();
    } finally {
      clearTimeout(failSafe);
      useUserStore.getState().setCloudGate('open');
      useUserStore.getState().checkDayTransition();
    }
  }

  // ── Ciclo de sincronização ─────────────────────────────────

  public async sync(userId: string | null = this.userId): Promise<void> {
    if (!userId) return;
    this.userId = userId;
    if (this.running) {
      // Já existe um ciclo em andamento: roda mais um logo depois, com os dados novos
      this.rerun = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.rerun = false;
          // Rede travada não pode segurar a fila: desiste e tenta de novo na próxima oportunidade
          let timer: ReturnType<typeof setTimeout> | undefined;
          const timeout = new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => reject(new Error('tempo esgotado')), SYNC_TIMEOUT_MS);
          });
          try {
            await Promise.race([this.runSync(userId), timeout]);
          } finally {
            clearTimeout(timer);
          }
        } while (this.rerun);
      } catch (err) {
        console.warn('Sincronização adiada: os dados continuam salvos neste aparelho.', err);
      } finally {
        this.running = null;
        this.lastSyncAt = Date.now();
      }
    })();
    return this.running;
  }

  private async runSync(userId: string) {
    const [{ data: profileRow, error: profileErr }, { data: missionRows, error: missionsErr }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('missions').select('*').eq('user_id', userId).order('mission_order', { ascending: true }),
    ]);
    if (profileErr) throw profileErr;
    if (missionsErr) throw missionsErr;

    const local = this.localSnapshot();
    let merged: SyncSnapshot = local;
    let localResetWins = false;

    if (profileRow) {
      const cloud = this.cloudToSnapshot(profileRow as Row, (missionRows || []) as Row[], local);
      const isV3Cloud = Number((profileRow as Row).avatar_config?._v || 0) >= 3;
      const isOtherAccount = local.profile.id !== 'local_shinobi' && local.profile.id !== userId;
      localResetWins = (local.profile.resetEpoch || '') > (cloud.profile.resetEpoch || '');

      merged = isOtherAccount
        ? cloud // dados locais de outra conta nunca se misturam com esta
        : mergeSnapshots(local, cloud, { missionList: isV3Cloud && readMeta()[userId] ? 'union' : 'primary' });
    }
    merged = { ...merged, profile: { ...merged.profile, id: userId } };

    // Aplica localmente só se a mesclagem trouxe algo novo
    const mergedKey = stableStringify(comparable(merged));
    if (mergedKey !== stableStringify(comparable(local)) && mergedKey !== this.lastApplied) {
      this.lastApplied = mergedKey;
      this.apply(merged, local);
    }
    this.isHydrated = true;
    try {
      localStorage.setItem(SYNC_META_KEY, JSON.stringify({ ...readMeta(), [userId]: true }));
    } catch {
      /* sem armazenamento disponível */
    }

    // Envia só se a nuvem ficou diferente do estado local reconciliado
    const after = this.localSnapshot();
    const profilePayload = this.profileToRow(after, userId);
    const missionPayload = after.missions.map((m) => this.missionToRow(m, userId));
    const remoteIds = ((missionRows || []) as Row[]).map((r) => r.id as string);
    const currentIds = new Set(after.missions.map((m) => m.id));
    const deleted = after.profile.deletedMissions || {};
    const idsToDelete = remoteIds.filter((id) => !currentIds.has(id) && (localResetWins || Boolean(deleted[id])));

    const pick = (row: Row | null | undefined, keys: string[]) =>
      Object.fromEntries(keys.map((k) => [k, k === 'created_at' ? toIso(row?.[k]) : row?.[k]]));
    const profileChanged =
      !profileRow || stableStringify(pick(profileRow as Row, Object.keys(profilePayload))) !== stableStringify(profilePayload);
    const remoteById = new Map(((missionRows || []) as Row[]).map((r) => [r.id as string, r]));
    const missionsChanged = missionPayload.filter(
      (m) => stableStringify(pick(remoteById.get(m.id as string), Object.keys(m))) !== stableStringify(m)
    );

    if (profileChanged) {
      const { error } = await supabase.from('profiles').upsert({ ...profilePayload, updated_at: new Date().toISOString() });
      if (error) throw error;
    }
    if (idsToDelete.length > 0) {
      const { error } = await supabase.from('missions').delete().eq('user_id', userId).in('id', idsToDelete);
      if (error) throw error;
    }
    if (missionsChanged.length > 0) {
      const stampedAt = new Date().toISOString();
      const { error } = await supabase.from('missions').upsert(missionsChanged.map((m) => ({ ...m, updated_at: stampedAt })));
      if (error) throw error;
    }
  }

  // ── Conversões ─────────────────────────────────────────────

  private localSnapshot(): SyncSnapshot {
    const bossHp: Record<string, number> = {};
    useDuelStore.getState().adversaries.forEach((a) => {
      if (a.currentHp < a.maxHp || a.isDefeated) bossHp[a.id] = a.currentHp;
    });
    return {
      profile: useUserStore.getState().profile,
      missions: useHabitStore.getState().missions,
      challenges: useChallengeStore.getState().challenges,
      bossHp,
    };
  }

  private cloudToSnapshot(row: Row, missionRows: Row[], local: SyncSnapshot): SyncSnapshot {
    const todayStr = getTodayString();
    const extras = (row.avatar_config || {}) as CloudExtras & Record<string, unknown>;
    const avatar: Record<string, unknown> = {};
    Object.entries(extras).forEach(([key, value]) => {
      if (!key.startsWith('_')) avatar[key] = value;
    });
    const lp = local.profile;

    const missions: Mission[] = missionRows.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description || undefined,
      pillarId: m.pillar_id,
      rank: m.rank,
      xpReward: m.xp_reward,
      ryoReward: m.ryo_reward > 0 ? m.ryo_reward : getDefaultRyoReward(m.rank),
      timeOfDay: m.time_of_day || 'anytime',
      isCompletedToday: (m.completed_dates || []).includes(todayStr),
      completedDates: m.completed_dates || [],
      isCustom: Boolean(m.is_custom),
      order: m.mission_order,
      createdAt: toIso(m.created_at),
    }));

    const raw: Partial<UserProfile> = {
      id: row.id,
      name: row.name || lp.name,
      email: row.email || undefined,
      whatsapp: row.whatsapp || undefined,
      gender: (row.gender as 'male' | 'female') || lp.gender,
      avatarConfig: { ...lp.avatarConfig, ...(avatar as Partial<UserProfile['avatarConfig']>) },
      isHardModeEnabled: row.is_hard_mode_enabled ?? lp.isHardModeEnabled,
      notificationSettings: row.notification_settings || lp.notificationSettings,
      subscriptionStatus: row.subscription_status || lp.subscriptionStatus,
      hasCompletedOnboarding: row.has_completed_onboarding ?? true,
      equippedItems: row.equipped_items || lp.equippedItems,
      lastActiveDate: row.last_active_date || lp.lastActiveDate,
      bestStreak: row.best_streak || 0,
      createdAt: toIso(row.created_at) || lp.createdAt,
      updatedAt: extras._updatedAt || toIso(row.updated_at),
      activeChallenge: extras._activeChallenge,
      challengeHistory: extras._challengeHistory || [],
      dayLog: extras._dayLog || {},
      shieldedDates: extras._shieldedDates || [],
      shieldsThrough: extras._shieldsThrough,
      purchasedItems: extras._purchasedItems || [],
      extraShieldWeeks: extras._extraShieldWeeks || [],
      soldierPillDates: extras._soldierPillDates || [],
      missionsCompletedTotal: extras._missionsCompletedTotal || 0,
      grants: extras._grants || {},
      deletedMissions: extras._deletedMissions || {},
      deletedCycles: extras._deletedCycles || {},
      dayWipe: extras._dayWipe,
      resetEpoch: extras._resetEpoch,
    };

    if (Number(extras._v || 0) >= 3) {
      raw.revoked = extras._revoked || {};
    } else {
      // Nuvem ainda no formato antigo: os totais viram o saldo inicial do livro-razão
      raw.totalXp = row.total_xp ?? 0;
      raw.ryo = row.ryo ?? 0;
      raw.pillarXp = row.pillar_xp || undefined;
    }

    return {
      profile: migrateProfile(raw, missions),
      missions,
      challenges: Array.isArray(extras._customChallenges) ? extras._customChallenges : local.challenges,
      bossHp: extras._bossHp && typeof extras._bossHp === 'object' ? extras._bossHp : local.bossHp,
    };
  }

  private profileToRow(snapshot: SyncSnapshot, userId: string): Row {
    const profile = snapshot.profile;
    const extras: CloudExtras = {
      _v: 3,
      _activeChallenge: profile.activeChallenge,
      _challengeHistory: profile.challengeHistory,
      _customChallenges: snapshot.challenges,
      _dayLog: profile.dayLog,
      _shieldedDates: profile.shieldedDates,
      _shieldsThrough: profile.shieldsThrough,
      _purchasedItems: profile.purchasedItems,
      _extraShieldWeeks: profile.extraShieldWeeks,
      _soldierPillDates: profile.soldierPillDates,
      _bossHp: snapshot.bossHp,
      _missionsCompletedTotal: profile.missionsCompletedTotal,
      _grants: profile.grants,
      _revoked: profile.revoked,
      _deletedMissions: profile.deletedMissions,
      _deletedCycles: profile.deletedCycles,
      _dayWipe: profile.dayWipe,
      _resetEpoch: profile.resetEpoch,
      _updatedAt: profile.updatedAt || new Date().toISOString(),
    };

    return {
      id: userId,
      name: profile.name,
      email: profile.email,
      whatsapp: profile.whatsapp,
      gender: profile.gender,
      ryo: profile.ryo || 0,
      avatar_config: { ...profile.avatarConfig, ...extras },
      level: profile.level,
      total_xp: profile.totalXp,
      current_rank_id: profile.currentRankId,
      pillar_xp: profile.pillarXp,
      current_protocol_day: profile.currentProtocolDay,
      current_streak: profile.currentStreak,
      best_streak: profile.bestStreak,
      weekly_shields_remaining: profile.weeklyShieldsRemaining,
      is_hard_mode_enabled: profile.isHardModeEnabled,
      notification_settings: profile.notificationSettings,
      subscription_status: profile.subscriptionStatus,
      has_completed_onboarding: profile.hasCompletedOnboarding,
      unlocked_cards: profile.unlockedCards,
      equipped_items: profile.equippedItems,
      inventory: profile.inventory,
      last_active_date: profile.lastActiveDate || getTodayString(),
    };
  }

  private missionToRow(m: Mission, userId: string): Row {
    const todayStr = getTodayString();
    const createdAt = toIso(m.createdAt);
    return {
      id: m.id,
      user_id: userId,
      title: m.title,
      description: m.description || null,
      pillar_id: m.pillarId,
      rank: m.rank,
      xp_reward: m.xpReward,
      ryo_reward: m.ryoReward || getDefaultRyoReward(m.rank),
      time_of_day: m.timeOfDay,
      is_completed_today: (m.completedDates || []).includes(todayStr),
      completed_dates: m.completedDates || [],
      is_custom: Boolean(m.isCustom),
      mission_order: m.order,
      ...(createdAt ? { created_at: createdAt } : {}),
    };
  }

  /** Grava nos stores o resultado da mesclagem. */
  private apply(merged: SyncSnapshot, local: SyncSnapshot) {
    const adoptedReset = (merged.profile.resetEpoch || '') > (local.profile.resetEpoch || '');
    if (adoptedReset) {
      // Outro aparelho zerou o progresso: os registros locais do Dojo também recomeçam
      useHabitStore.setState({ missionLogs: [], lastCompletion: null });
      useToolStore.setState({
        nutritionLogs: {},
        bodyJournal: {},
        trainingLogs: [],
        pomodoroSessionsCompletedToday: 0,
        meditationMinutesToday: 0,
      });
    }

    useHabitStore.getState().replaceMissions(merged.missions);

    if (stableStringify(merged.challenges) !== stableStringify(local.challenges)) {
      setChallengesSilently(merged.challenges);
    }

    if (stableStringify(merged.bossHp) !== stableStringify(local.bossHp)) {
      useDuelStore.setState((state) => ({
        adversaries: state.adversaries.map((a) => {
          const hp = merged.bossHp[a.id];
          return hp === undefined
            ? { ...a, currentHp: a.maxHp, isDefeated: false }
            : { ...a, currentHp: Math.max(0, Math.min(a.maxHp, hp)), isDefeated: hp <= 0 };
        }),
      }));
      useDuelStore.getState().reconcileAdversaries();
    }

    useUserStore.getState().applySyncedProfile(migrateProfile(merged.profile, merged.missions));
  }

  // ── Compatibilidade com as telas existentes ────────────────

  public pullUserData(userId: string) {
    return this.sync(userId);
  }

  public pushUserProfile(_profile: UserProfile, userId: string) {
    return this.sync(userId);
  }

  public pushMissions(_missions: Mission[], userId: string, _bypassHydration = false) {
    return this.sync(userId);
  }

  public schedulePush(userId: string, delay = 800) {
    this.userId = userId;
    this.schedule(delay);
  }
}

export const syncService = new SyncService();
