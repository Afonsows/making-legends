import { supabase } from './supabase';
import { UserProfile, Mission } from '../core/types';
import { getTodayString } from '../core/streakEngine';
import { useUserStore } from '../state/useUserStore';
import { useHabitStore, getDefaultRyoReward } from '../state/useHabitStore';
import { useDuelStore } from '../state/useDuelStore';
import { useToolStore } from '../state/useToolStore';

/**
 * Serviço de sincronização bidirecional entre o estado local (Offline-first)
 * e o banco de dados PostgreSQL na nuvem via Supabase.
 */
class SyncService {
  public isHydrated = false;
  private isSyncing = false;

  public async pullUserData(userId: string) {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      // 1. Puxar Perfil
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData && !profileErr) {
        useUserStore.setState((state) => ({
          profile: {
            ...state.profile,
            id: profileData.id,
            name: profileData.name || state.profile.name,
            email: profileData.email || state.profile.email,
            whatsapp: profileData.whatsapp || state.profile.whatsapp,
            gender: (profileData.gender as 'male' | 'female') || state.profile.gender || 'male',
            ryo: profileData.ryo !== undefined && profileData.ryo !== null ? profileData.ryo : state.profile.ryo,
            avatarConfig: {
              ...state.profile.avatarConfig,
              ...(profileData.avatar_config || {}),
              customEmoji: profileData.avatar_config?.customEmoji || (profileData.gender === 'female' ? '🥷‍♀️' : '🥷'),
            },
            level: profileData.level || state.profile.level,
            totalXp: profileData.total_xp || state.profile.totalXp,
            currentRankId: profileData.current_rank_id || state.profile.currentRankId,
            pillarXp: profileData.pillar_xp || state.profile.pillarXp,
            currentProtocolDay: profileData.current_protocol_day || state.profile.currentProtocolDay,
            currentStreak: profileData.current_streak || state.profile.currentStreak,
            bestStreak: profileData.best_streak || state.profile.bestStreak,
            weeklyShieldsRemaining: profileData.weekly_shields_remaining ?? state.profile.weeklyShieldsRemaining,
            isHardModeEnabled: profileData.is_hard_mode_enabled ?? state.profile.isHardModeEnabled,
            subscriptionStatus: profileData.subscription_status || state.profile.subscriptionStatus,
            hasCompletedOnboarding: profileData.has_completed_onboarding ?? true,
            unlockedCards: profileData.unlocked_cards || state.profile.unlockedCards,
            equippedItems: profileData.equipped_items || state.profile.equippedItems,
            inventory: profileData.inventory || state.profile.inventory,
          },
        }));
      }

      // 2. Puxar Missões
      const { data: missionsData, error: missionsErr } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', userId)
        .order('mission_order', { ascending: true });

      if (missionsData && missionsData.length > 0 && !missionsErr) {
        const todayStr = getTodayString();
        const mappedMissions: Mission[] = missionsData.map((m) => {
          const completedDates: string[] = m.completed_dates || [];
          const isCompletedToday = completedDates.includes(todayStr);
          const defaultRankRyo = getDefaultRyoReward(m.rank);
          const ryoReward = (m.ryo_reward !== undefined && m.ryo_reward !== null && m.ryo_reward > 0)
            ? m.ryo_reward
            : defaultRankRyo;

          return {
            id: m.id,
            title: m.title,
            description: m.description || undefined,
            pillarId: m.pillar_id,
            rank: m.rank,
            xpReward: m.xp_reward,
            ryoReward: ryoReward,
            timeOfDay: m.time_of_day,
            isCompletedToday: isCompletedToday,
            completedDates: completedDates,
            isCustom: m.is_custom,
            order: m.mission_order,
            createdAt: m.created_at,
          };
        });

        useHabitStore.getState().setCustomMissionList(mappedMissions);
      } else if (missionsData && missionsData.length === 0 && !missionsErr) {
        // Primeiro acesso sem missões no Supabase: inicializa nuvem com as missões locais
        const localMissions = useHabitStore.getState().missions;
        if (localMissions.length > 0) {
          await this.pushMissions(localMissions, userId, true);
        }
      }

      this.isHydrated = true;

      // Recalcula o streak imediatamente a partir das presenças reais em desafios
      const streakRes = useUserStore.getState().recalculateStreak();
      const finalProfile = useUserStore.getState().profile;

      // Se a contagem foi corrigida em relação à nuvem, atualiza o Supabase com o streak real
      if (profileData && profileData.current_streak !== streakRes.currentStreak) {
        this.pushUserProfile(finalProfile, userId);
      }
    } catch (err) {
      console.error('Erro ao sincronizar dados do Supabase:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  public async pushUserProfile(profile: UserProfile, userId: string) {
    if (!this.isHydrated && profile.name === 'Aspirante Shinobi') {
      return; // Previne sobrescrever perfil na nuvem com dados padrão não hidratados
    }

    try {
      await supabase.from('profiles').upsert({
        id: userId,
        name: profile.name,
        email: profile.email,
        whatsapp: profile.whatsapp,
        gender: profile.gender,
        ryo: profile.ryo || 0,
        avatar_config: profile.avatarConfig,
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
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Sync offline: Perfil será sincronizado quando a conexão for restabelecida.', err);
    }
  }

  public async deleteMission(missionId: string, userId?: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const targetUserId = userId || session?.user?.id;
      if (!targetUserId) return;

      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', missionId)
        .eq('user_id', targetUserId);

      if (error) {
        console.warn('Erro ao deletar missão no Supabase:', error);
      }
    } catch (err) {
      console.warn('Sync offline: Exclusão da missão será sincronizada posteriormente.', err);
    }
  }

  public async pushMissions(missions: Mission[], userId: string, bypassHydration: boolean = false) {
    if (!this.isHydrated && !bypassHydration) {
      return; // Previne sobrescrever a nuvem antes de baixar as missões existentes
    }

    try {
      const currentIds = missions.map((m) => m.id);

      // 1. Reconciliação: Deleta no Supabase missões que foram excluídas localmente
      const { data: remoteMissions } = await supabase
        .from('missions')
        .select('id')
        .eq('user_id', userId);

      if (remoteMissions && remoteMissions.length > 0) {
        const idsToDelete = remoteMissions
          .map((r) => r.id)
          .filter((remoteId) => !currentIds.includes(remoteId));

        if (idsToDelete.length > 0) {
          await supabase
            .from('missions')
            .delete()
            .eq('user_id', userId)
            .in('id', idsToDelete);
        }
      }

      if (missions.length === 0) return;

      // 2. Upsert das missões atuais mantidas
      const todayStr = getTodayString();
      const records = missions.map((m) => {
        const completedDates = m.completedDates || [];
        const isCompletedToday = completedDates.includes(todayStr);
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
          is_completed_today: isCompletedToday,
          completed_dates: completedDates,
          is_custom: m.isCustom,
          mission_order: m.order,
          updated_at: new Date().toISOString(),
        };
      });

      await supabase.from('missions').upsert(records);
    } catch (err) {
      console.warn('Sync offline: Missões serão sincronizadas com o Supabase posteriormente.', err);
    }
  }
}

export const syncService = new SyncService();
