import { supabase } from './supabase';
import { UserProfile, Mission, ProtocolChallengeCycle, UserChallenge, DayRecord } from '../core/types';
import { getTodayString } from '../core/dateUtils';
import { getDefaultRyoReward } from '../core/ryoEngine';
import { useUserStore, migrateProfile } from '../state/useUserStore';
import { useHabitStore } from '../state/useHabitStore';
import { useChallengeStore } from '../state/useChallengeStore';
import { useDuelStore } from '../state/useDuelStore';

/** Dados extras guardados dentro de `avatar_config` (JSON) para não exigir migração de schema. */
interface CloudExtras {
  _activeChallenge?: ProtocolChallengeCycle;
  _challengeHistory?: ProtocolChallengeCycle[];
  _customChallenges?: UserChallenge[];
  _dayLog?: Record<string, DayRecord>;
  _shieldedDates?: string[];
  _purchasedItems?: string[];
  _extraShieldWeeks?: string[];
  _soldierPillDates?: string[];
  _bossHp?: Record<string, number>;
  _missionsCompletedTotal?: number;
  _updatedAt?: string;
}

function mergeMissions(local: Mission[], cloud: Mission[], preferCloud: boolean): Mission[] {
  const primary = preferCloud ? cloud : local;
  const secondary = preferCloud ? local : cloud;
  const secondaryById = new Map(secondary.map((m) => [m.id, m]));
  return primary.map((m) => {
    const other = secondaryById.get(m.id);
    if (!other) return m;
    const completedDates = Array.from(new Set([...(m.completedDates || []), ...(other.completedDates || [])])).sort();
    return { ...m, completedDates };
  });
}

/**
 * Sincronização bidirecional entre o estado local (offline-first) e o Supabase.
 * Regra: vence o lado atualizado mais recentemente; datas de conclusão sempre são unidas.
 */
class SyncService {
  public isHydrated = false;
  private isSyncing = false;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;

  public async pullUserData(userId: string) {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const [{ data: profileData, error: profileErr }, { data: missionsData, error: missionsErr }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('missions').select('*').eq('user_id', userId).order('mission_order', { ascending: true }),
      ]);

      const local = useUserStore.getState().profile;
      const extras = ((profileData?.avatar_config || {}) as CloudExtras & Record<string, unknown>) || {};
      const cloudUpdatedAt = extras._updatedAt || profileData?.updated_at || '';
      const localUpdatedAt = local.updatedAt || '';
      const preferCloud = Boolean(profileData) && (!local.hasCompletedOnboarding || cloudUpdatedAt > localUpdatedAt);

      // 1. Perfil
      if (profileData && !profileErr && preferCloud) {
        const { _activeChallenge, _challengeHistory, _customChallenges, _dayLog, _shieldedDates, _purchasedItems,
          _extraShieldWeeks, _soldierPillDates, _bossHp, _missionsCompletedTotal, _updatedAt, ...avatar } = extras;
        void _updatedAt;

        if (Array.isArray(_customChallenges)) useChallengeStore.setState({ challenges: _customChallenges });
        if (_bossHp && typeof _bossHp === 'object') {
          useDuelStore.setState((state) => ({
            adversaries: state.adversaries.map((a) =>
              _bossHp[a.id] !== undefined
                ? { ...a, currentHp: Math.max(0, Math.min(a.maxHp, _bossHp[a.id])), isDefeated: _bossHp[a.id] <= 0 }
                : a
            ),
          }));
          useDuelStore.getState().reconcileAdversaries();
        }

        const cloudProfile: Partial<UserProfile> = {
          ...local,
          id: profileData.id,
          name: profileData.name || local.name,
          email: profileData.email || local.email,
          whatsapp: profileData.whatsapp || local.whatsapp,
          gender: (profileData.gender as 'male' | 'female') || local.gender,
          ryo: profileData.ryo ?? local.ryo,
          avatarConfig: { ...local.avatarConfig, ...(avatar as Partial<UserProfile['avatarConfig']>) },
          totalXp: profileData.total_xp ?? local.totalXp,
          pillarXp: profileData.pillar_xp || local.pillarXp,
          bestStreak: Math.max(profileData.best_streak || 0, local.bestStreak || 0),
          isHardModeEnabled: profileData.is_hard_mode_enabled ?? local.isHardModeEnabled,
          notificationSettings: profileData.notification_settings || local.notificationSettings,
          subscriptionStatus: profileData.subscription_status || local.subscriptionStatus,
          hasCompletedOnboarding: profileData.has_completed_onboarding ?? true,
          equippedItems: profileData.equipped_items || local.equippedItems,
          lastActiveDate: profileData.last_active_date || local.lastActiveDate || getTodayString(),
          activeChallenge: _activeChallenge,
          challengeHistory: _challengeHistory || local.challengeHistory,
          dayLog: { ...(local.dayLog || {}), ...(_dayLog || {}) },
          shieldedDates: Array.from(new Set([...(local.shieldedDates || []), ...(_shieldedDates || [])])).sort(),
          purchasedItems: Array.from(new Set([...(local.purchasedItems || []), ...(_purchasedItems || [])])),
          extraShieldWeeks: _extraShieldWeeks || local.extraShieldWeeks,
          soldierPillDates: _soldierPillDates || local.soldierPillDates,
          missionsCompletedTotal: Math.max(_missionsCompletedTotal || 0, local.missionsCompletedTotal || 0),
          updatedAt: cloudUpdatedAt || local.updatedAt,
        };

        useUserStore.setState({ profile: migrateProfile(cloudProfile, useHabitStore.getState().missions) });
      }

      // 2. Missões (datas de conclusão sempre unidas)
      if (missionsData && !missionsErr) {
        if (missionsData.length > 0) {
          const todayStr = getTodayString();
          const cloudMissions: Mission[] = missionsData.map((m) => ({
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
            isCustom: m.is_custom,
            order: m.mission_order,
            createdAt: m.created_at,
          }));
          const merged = mergeMissions(useHabitStore.getState().missions, cloudMissions, preferCloud);
          useHabitStore.getState().setCustomMissionList(merged);
        } else {
          this.isHydrated = true;
          await this.pushMissions(useHabitStore.getState().missions, userId, true);
        }
      }

      this.isHydrated = true;
      useUserStore.getState().syncInventory();
      useUserStore.getState().checkDayTransition();
      useUserStore.getState().refreshToday({ silent: true });

      // Se o local era mais novo (ou foi corrigido), atualiza a nuvem
      if (!preferCloud || !profileData) {
        await this.pushUserProfile(useUserStore.getState().profile, userId);
      }
    } catch (err) {
      console.error('Erro ao sincronizar dados do Supabase:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  /** Agenda um envio (debounce) para não disparar uma requisição a cada clique. */
  public schedulePush(userId: string, delay = 1500) {
    if (!this.isHydrated) return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      this.pushUserProfile(useUserStore.getState().profile, userId);
      this.pushMissions(useHabitStore.getState().missions, userId);
    }, delay);
  }

  public async pushUserProfile(profile: UserProfile, userId: string) {
    if (!this.isHydrated) return; // evita sobrescrever a nuvem antes de baixar os dados existentes

    try {
      const bossHp: Record<string, number> = {};
      useDuelStore.getState().adversaries.forEach((a) => {
        if (a.currentHp < a.maxHp || a.isDefeated) bossHp[a.id] = a.currentHp;
      });

      const extras: CloudExtras = {
        _activeChallenge: profile.activeChallenge,
        _challengeHistory: profile.challengeHistory,
        _customChallenges: useChallengeStore.getState().challenges,
        _dayLog: profile.dayLog,
        _shieldedDates: profile.shieldedDates,
        _purchasedItems: profile.purchasedItems,
        _extraShieldWeeks: profile.extraShieldWeeks,
        _soldierPillDates: profile.soldierPillDates,
        _bossHp: bossHp,
        _missionsCompletedTotal: profile.missionsCompletedTotal,
        _updatedAt: profile.updatedAt || new Date().toISOString(),
      };

      await supabase.from('profiles').upsert({
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
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Sync offline: o perfil será sincronizado quando a conexão voltar.', err);
    }
  }

  public async deleteMission(missionId: string, userId?: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const targetUserId = userId || session?.user?.id;
      if (!targetUserId) return;
      const { error } = await supabase.from('missions').delete().eq('id', missionId).eq('user_id', targetUserId);
      if (error) console.warn('Erro ao excluir missão no Supabase:', error);
    } catch (err) {
      console.warn('Sync offline: a exclusão será sincronizada depois.', err);
    }
  }

  public async pushMissions(missions: Mission[], userId: string, bypassHydration = false) {
    if (!this.isHydrated && !bypassHydration) return;

    try {
      const currentIds = new Set(missions.map((m) => m.id));
      const { data: remoteMissions } = await supabase.from('missions').select('id').eq('user_id', userId);
      const idsToDelete = (remoteMissions || []).map((r) => r.id).filter((id) => !currentIds.has(id));
      if (idsToDelete.length > 0) {
        await supabase.from('missions').delete().eq('user_id', userId).in('id', idsToDelete);
      }
      if (missions.length === 0) return;

      const todayStr = getTodayString();
      await supabase.from('missions').upsert(
        missions.map((m) => ({
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
          is_custom: m.isCustom,
          mission_order: m.order,
          updated_at: new Date().toISOString(),
        }))
      );
    } catch (err) {
      console.warn('Sync offline: as missões serão sincronizadas depois.', err);
    }
  }
}

export const syncService = new SyncService();
