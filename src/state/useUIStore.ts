import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStoreState {
  // Modo Clean Global
  isCleanMode: boolean;
  toggleCleanMode: () => void;
  setCleanMode: (enabled: boolean) => void;

  // Toggles de seções em MissionsView
  isDailyCheckInCollapsed: boolean;
  toggleDailyCheckIn: () => void;

  isDailyScrollCollapsed: boolean;
  toggleDailyScroll: () => void;

  isPendingMissionsCollapsed: boolean;
  togglePendingMissions: () => void;

  isCompletedMissionsCollapsed: boolean;
  toggleCompletedMissions: () => void;

  // Toggles em ChallengesView
  isChallengesBannerCollapsed: boolean;
  toggleChallengesBanner: () => void;

  isMainChallengeCollapsed: boolean;
  toggleMainChallenge: () => void;

  isCustomChallengesCollapsed: boolean;
  toggleCustomChallenges: () => void;

  // Toggles em ChallengeDetailModal
  isDetailMetricsCollapsed: boolean;
  toggleDetailMetrics: () => void;

  isAllHabitGridsCollapsed: boolean;
  toggleAllHabitGrids: () => void;

  // Expansão individual de cards de missões
  expandedMissionIds: Record<string, boolean>;
  toggleMissionExpanded: (missionId: string) => void;
  expandAllMissions: (missionIds: string[]) => void;
  collapseAllMissions: () => void;

  // Expansão individual de cards de hábitos em desafios
  collapsedHabitIds: Record<string, boolean>;
  toggleHabitCollapsed: (habitId: string) => void;
}

export const useUIStore = create<UIStoreState>()(
  persist(
    (set, get) => ({
      isCleanMode: false,
      toggleCleanMode: () => set((state) => ({ isCleanMode: !state.isCleanMode })),
      setCleanMode: (enabled) => set({ isCleanMode: enabled }),

      isDailyCheckInCollapsed: false,
      toggleDailyCheckIn: () => set((state) => ({ isDailyCheckInCollapsed: !state.isDailyCheckInCollapsed })),

      isDailyScrollCollapsed: false,
      toggleDailyScroll: () => set((state) => ({ isDailyScrollCollapsed: !state.isDailyScrollCollapsed })),

      isPendingMissionsCollapsed: false,
      togglePendingMissions: () => set((state) => ({ isPendingMissionsCollapsed: !state.isPendingMissionsCollapsed })),

      isCompletedMissionsCollapsed: false,
      toggleCompletedMissions: () => set((state) => ({ isCompletedMissionsCollapsed: !state.isCompletedMissionsCollapsed })),

      isChallengesBannerCollapsed: false,
      toggleChallengesBanner: () => set((state) => ({ isChallengesBannerCollapsed: !state.isChallengesBannerCollapsed })),

      isMainChallengeCollapsed: false,
      toggleMainChallenge: () => set((state) => ({ isMainChallengeCollapsed: !state.isMainChallengeCollapsed })),

      isCustomChallengesCollapsed: false,
      toggleCustomChallenges: () => set((state) => ({ isCustomChallengesCollapsed: !state.isCustomChallengesCollapsed })),

      isDetailMetricsCollapsed: false,
      toggleDetailMetrics: () => set((state) => ({ isDetailMetricsCollapsed: !state.isDetailMetricsCollapsed })),

      isAllHabitGridsCollapsed: false,
      toggleAllHabitGrids: () => set((state) => ({ isAllHabitGridsCollapsed: !state.isAllHabitGridsCollapsed })),

      expandedMissionIds: {},
      toggleMissionExpanded: (missionId: string) =>
        set((state) => ({
          expandedMissionIds: {
            ...state.expandedMissionIds,
            [missionId]: !state.expandedMissionIds[missionId],
          },
        })),

      expandAllMissions: (missionIds: string[]) => {
        const next: Record<string, boolean> = {};
        missionIds.forEach((id) => {
          next[id] = true;
        });
        set({ expandedMissionIds: next });
      },

      collapseAllMissions: () => set({ expandedMissionIds: {} }),

      collapsedHabitIds: {},
      toggleHabitCollapsed: (habitId: string) =>
        set((state) => ({
          collapsedHabitIds: {
            ...state.collapsedHabitIds,
            [habitId]: !state.collapsedHabitIds[habitId],
          },
        })),
    }),
    {
      name: 'shinobi_ui_prefs_v1',
    }
  )
);
