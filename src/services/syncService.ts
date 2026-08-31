import { supabase } from './supabase';
import { UserProfile, Mission } from '../core/types';
import { useUserStore } from '../state/useUserStore';
import { useHabitStore } from '../state/useHabitStore';
import { useDuelStore } from '../state/useDuelStore';
import { useToolStore } from '../state/useToolStore';

/**
 * Serviço de sincronização bidirecional entre o estado local (Offline-first)
 * e o banco de dados PostgreSQL na nuvem via Supabase.
 */
class SyncService {
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
            avatarConfig: profileData.avatar_config || state.profile.avatarConfig,
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
            hasCompletedOnboarding: profileData.has_completed_onboarding ?? state.profile.hasCompletedOnboarding,
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
        const mappedMissions: Mission[] = missionsData.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description || undefined,
          pillarId: m.pillar_id,
          rank: m.rank,
          xpReward: m.xp_reward,
          timeOfDay: m.time_of_day,
          isCompletedToday: m.is_completed_today,
          completedDates: m.completed_dates || [],
          isCustom: m.is_custom,
          order: m.mission_order,
          createdAt: m.created_at,
        }));

        useHabitStore.getState().setCustomMissionList(mappedMissions);
      }
    } catch (err) {
      console.error('Erro ao sincronizar dados do Supabase:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  public async pushUserProfile(profile: UserProfile, userId: string) {
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        name: profile.name,
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

  public async pushMissions(missions: Mission[], userId: string) {
    try {
      const records = missions.map((m) => ({
        id: m.id,
        user_id: userId,
        title: m.title,
        description: m.description || null,
        pillar_id: m.pillarId,
        rank: m.rank,
        xp_reward: m.xpReward,
        time_of_day: m.timeOfDay,
        is_completed_today: m.isCompletedToday,
        completed_dates: m.completedDates,
        is_custom: m.isCustom,
        mission_order: m.order,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from('missions').upsert(records);
    } catch (err) {
      console.warn('Sync offline: Missões serão sincronizadas com o Supabase posteriormente.', err);
    }
  }
}

export const syncService = new SyncService();
