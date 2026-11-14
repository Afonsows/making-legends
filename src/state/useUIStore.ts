import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';
export type AppTab = 'missions' | 'challenges' | 'status' | 'tools' | 'cards';

interface UIStoreState {
  // Aparência: claro, escuro ou acompanhar o aparelho
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // Aba aberta (não é salva: o app sempre abre em "Hoje")
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  // Filtros da lista de missões abertos/fechados
  isMissionFiltersOpen: boolean;
  toggleMissionFilters: () => void;

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
    (set) => ({
      themeMode: 'dark',
      setThemeMode: (mode) => set({ themeMode: mode }),

      activeTab: 'missions',
      setActiveTab: (tab) => set({ activeTab: tab }),

      isMissionFiltersOpen: false,
      toggleMissionFilters: () => set((state) => ({ isMissionFiltersOpen: !state.isMissionFiltersOpen })),

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
      // A aba aberta não é salva
      partialize: (state) => {
        const { activeTab: _activeTab, ...rest } = state;
        return rest;
      },
    }
  )
);
