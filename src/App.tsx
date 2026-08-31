import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { useUserStore } from './state/useUserStore';
import { useHabitStore } from './state/useHabitStore';
import { supabase } from './services/supabase';
import { syncService } from './services/syncService';
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
import { AuthModal } from './components/auth/AuthModal';
import { ShinobiBackground } from './components/ui/ShinobiBackground';

export const AppContent: React.FC = () => {
  const { profile, checkDayTransition } = useUserStore();
  const { missions, resetDailyMissionsIfNewDay } = useHabitStore();

  const [activeTab, setActiveTab] = useState<TabType>('missions');
  const [isIosModalOpen, setIsIosModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string; id?: string } | null>(null);

  // Inicialização de Auth do Supabase e sincronização automática
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser({ email: session.user.email, id: session.user.id });
        syncService.pullUserData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({ email: session.user.email, id: session.user.id });
        syncService.pullUserData(session.user.id);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sincronização em background quando missões ou perfil mudam (se autenticado e hidratado)
  useEffect(() => {
    if (currentUser?.id && syncService.isHydrated) {
      syncService.pushUserProfile(profile, currentUser.id);
    }
  }, [profile, currentUser]);

  useEffect(() => {
    if (currentUser?.id && syncService.isHydrated) {
      syncService.pushMissions(missions, currentUser.id);
    }
  }, [missions, currentUser]);

  // Checagem de transição diária e reset de missões ao carregar
  useEffect(() => {
    checkDayTransition();
    resetDailyMissionsIfNewDay();
  }, [checkDayTransition, resetDailyMissionsIfNewDay]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setIsAuthModalOpen(false);
  };

  // Se o usuário ainda não passou pelo quiz inicial de aptidão
  if (!profile.hasCompletedOnboarding) {
    return <OnboardingQuiz onFinishOnboarding={() => setActiveTab('missions')} />;
  }

  const pendingMissionsCount = missions.filter((m) => !m.isCompletedToday).length;

  return (
    <div className="min-h-screen bg-shinobi-bg text-slate-100 flex flex-col selection:bg-shinobi-crimson selection:text-white relative overflow-x-hidden">
      {/* Ambientação Shinobi Animada */}
      <ShinobiBackground opacity={0.5} />

      {/* Navbar Superior com Nível, Rank, Streak, Escudo e Status Nuvem */}
      <Navbar
        onOpenNotifications={() => setIsNotifModalOpen(true)}
        onOpenStatus={() => setActiveTab('status')}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isCloudSynced={!!currentUser}
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
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
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
