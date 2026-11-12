import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { useUserStore } from './state/useUserStore';
import { useHabitStore } from './state/useHabitStore';
import { supabase } from './services/supabase';
import { syncService } from './services/syncService';
import { Navbar } from './components/layout/Navbar';
import { BottomNav, TabType } from './components/layout/BottomNav';
import { MissionsView } from './components/missions/MissionsView';
import { ChallengesView } from './components/challenges/ChallengesView';
import { StatusWindow } from './components/status/StatusWindow';
import { ToolsHub } from './components/tools/ToolsHub';
import { TeachingCardsView } from './components/cards/TeachingCardsView';
import { OnboardingQuiz } from './components/onboarding/OnboardingQuiz';
import { LevelUpModal } from './components/modals/LevelUpModal';
import { BossVictoryModal } from './components/modals/BossVictoryModal';
import { ChallengeResetModal } from './components/modals/ChallengeResetModal';
import { ChallengeCompletionModal } from './components/modals/ChallengeCompletionModal';
import { StartChallengeModal } from './components/challenges/StartChallengeModal';
import { IosInstallModal } from './components/pwa/IosInstallModal';
import { NotificationSettingsModal } from './components/pwa/NotificationSettingsModal';
import { AuthModal } from './components/auth/AuthModal';
import { ShinobiBackground } from './components/ui/ShinobiBackground';

import { ToastHost } from './components/ui/ToastHost';
import { useChallengeStore } from './state/useChallengeStore';
import { soundFx } from './utils/audio';
import { initReminderScheduler } from './utils/reminders';
import { initDailyResetEngine } from './core/dailyResetEngine';

export const AppContent: React.FC = () => {
  const { profile, isStartChallengeModalOpen, closeStartChallengeModal } = useUserStore();
  const { missions } = useHabitStore();

  const [activeTab, setActiveTab] = useState<TabType>('missions');
  const [isIosModalOpen, setIsIosModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string; id?: string } | null>(null);

  // Inicialização: conta, primeira sincronização e motor de renovação diária.
  // Enquanto não sabemos se há dados mais novos na nuvem, o "portão" fica fechado:
  // nenhum dia é encerrado e nenhum desafio é interrompido com dados desatualizados.
  useEffect(() => {
    const user = useUserStore.getState();
    soundFx.setSoundEnabled(user.profile.notificationSettings.soundEnabled !== false);
    user.syncInventory();
    user.setCloudGate('pending');

    const failSafe = setTimeout(() => useUserStore.getState().setCloudGate('open'), 6000);
    const openGate = () => {
      clearTimeout(failSafe);
      useUserStore.getState().setCloudGate('open');
    };

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          setCurrentUser({ email: session.user.email, id: session.user.id });
          syncService.setUser(session.user.id);
          await syncService.sync();
        }
      })
      .catch(() => undefined)
      .finally(openGate);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUser({ email: session.user.email, id: session.user.id });
        syncService.setUser(session.user.id);
        if (event === 'SIGNED_IN') void syncService.sync();
      } else {
        setCurrentUser(null);
        syncService.setUser(null);
      }
    });

    const cleanupDailyEngine = initDailyResetEngine();
    const cleanupReminders = initReminderScheduler();

    // Ao voltar para o app: busca novidades de outros aparelhos. Ao sair: envia o que estiver pendente.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncService.syncOnFocus();
      else syncService.flush();
    };
    const handleFocus = () => syncService.syncOnFocus();
    const handlePageHide = () => syncService.flush();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearTimeout(failSafe);
      subscription.unsubscribe();
      cleanupDailyEngine();
      cleanupReminders();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  // Sincronização em segundo plano (agrupada) quando perfil, missões ou desafios mudam
  const challenges = useChallengeStore((s) => s.challenges);
  useEffect(() => {
    if (currentUser?.id) syncService.schedule();
  }, [profile, missions, challenges, currentUser]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    syncService.setUser(null);
    setCurrentUser(null);
    setIsAuthModalOpen(false);
  };

  // Se o usuário ainda não passou pelo quiz inicial de aptidão
  if (!profile.hasCompletedOnboarding) {
    return <OnboardingQuiz onFinishOnboarding={() => setActiveTab('missions')} />;
  }

  const pendingMissionsCount = missions.filter((m) => !m.isCompletedToday).length;

  return (
    <div className="app-shell bg-shinobi-bg text-slate-100 flex flex-col selection:bg-shinobi-crimson selection:text-white relative">
      {/* Ambientação Shinobi Animada */}
      <ShinobiBackground opacity={0.5} />

      {/* Faixa opaca sob a barra de status do aparelho */}
      <div className="safe-top-scrim" aria-hidden="true" />

      {/* Navbar Superior com Nível, Rank, Streak, Escudo e Status Nuvem */}
      <Navbar
        onOpenNotifications={() => setIsNotifModalOpen(true)}
        onOpenStatus={() => setActiveTab('status')}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isCloudSynced={!!currentUser}
      />

      {/* Conteúdo Principal da Aba Selecionada */}
      <main className="flex-1 w-full max-w-4xl mx-auto relative">
        {activeTab === 'missions' && (
          <MissionsView onOpenCard={() => setActiveTab('cards')} />
        )}
        {activeTab === 'challenges' && <ChallengesView />}
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

      {/* Avisos de jogo */}
      <ToastHost />

      {/* Modais Globais do Sistema */}
      <LevelUpModal />
      <BossVictoryModal />
      <ChallengeResetModal />
      <ChallengeCompletionModal />
      <StartChallengeModal
        isOpen={isStartChallengeModalOpen}
        onClose={closeStartChallengeModal}
      />
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
