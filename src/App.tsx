import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { useUserStore } from './state/useUserStore';
import { useHabitStore } from './state/useHabitStore';
import { Navbar } from './components/layout/Navbar';
import { BottomNav, TabType } from './components/layout/BottomNav';
import { MissionsView } from './components/missions/MissionsView';
import { DuelView } from './components/duel/DuelView';
import { StatusWindow } from './components/status/StatusWindow';
import { ToolsHub } from './components/tools/ToolsHub';
import { TeachingCardsView } from './components/cards/TeachingCardsView';
import { OnboardingQuiz } from './components/onboarding/OnboardingQuiz';
import { LevelUpModal } from './components/modals/LevelUpModal';
import { BossVictoryModal } from './components/modals/BossVictoryModal';
import { IosInstallModal } from './components/pwa/IosInstallModal';
import { NotificationSettingsModal } from './components/pwa/NotificationSettingsModal';

export const AppContent: React.FC = () => {
  const { profile, checkDayTransition } = useUserStore();
  const { missions, resetDailyMissionsIfNewDay } = useHabitStore();

  const [activeTab, setActiveTab] = useState<TabType>('missions');
  const [isIosModalOpen, setIsIosModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  // Checagem de transição diária e reset de missões ao carregar
  useEffect(() => {
    checkDayTransition();
    resetDailyMissionsIfNewDay();
  }, [checkDayTransition, resetDailyMissionsIfNewDay]);

  // Se o usuário ainda não passou pelo quiz inicial de aptidão
  if (!profile.hasCompletedOnboarding) {
    return <OnboardingQuiz onFinishOnboarding={() => setActiveTab('missions')} />;
  }

  const pendingMissionsCount = missions.filter((m) => !m.isCompletedToday).length;

  return (
    <div className="min-h-screen bg-shinobi-bg text-slate-100 flex flex-col selection:bg-shinobi-crimson selection:text-white">
      {/* Navbar Superior com Nível, Rank, Streak e Escudo */}
      <Navbar
        onOpenNotifications={() => setIsNotifModalOpen(true)}
        onOpenStatus={() => setActiveTab('status')}
      />

      {/* Conteúdo Principal da Aba Selecionada */}
      <main className="flex-1 w-full max-w-4xl mx-auto">
        {activeTab === 'missions' && (
          <MissionsView onOpenCard={() => setActiveTab('cards')} />
        )}
        {activeTab === 'duel' && <DuelView />}
        {activeTab === 'status' && <StatusWindow />}
        {activeTab === 'tools' && <ToolsHub />}
        {activeTab === 'cards' && <TeachingCardsView />}
      </main>

      {/* Barra de Navegação Inferior Mobile */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingMissionsCount={pendingMissionsCount}
      />

      {/* Modais Globais do Sistema */}
      <LevelUpModal />
      <BossVictoryModal />
      <IosInstallModal
        isOpen={isIosModalOpen}
        onClose={() => setIsIosModalOpen(false)}
      />
      <NotificationSettingsModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        onOpenIosGuide={() => setIsIosModalOpen(true)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
