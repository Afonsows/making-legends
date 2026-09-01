import { getTodayString } from './streakEngine';
import { useUserStore } from '../state/useUserStore';
import { useHabitStore } from '../state/useHabitStore';
import { useToolStore } from '../state/useToolStore';

/**
 * Retorna os milissegundos restantes até a próxima meia-noite (00:00:00.050) no horário local.
 */
export function getMsUntilNextMidnight(): number {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    50
  );
  return Math.max(100, nextMidnight.getTime() - now.getTime());
}

/**
 * Retorna uma string formatada do tempo restante até a próxima meia-noite (ex: "11h 45m").
 */
export function getTimeUntilMidnightString(): string {
  const ms = getMsUntilNextMidnight();
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

/**
 * Executa a manutenção e reconciliação diária em todos os stores do sistema.
 * 1. Processa a transição de dias no protocolo de 66 dias e streaks do usuário.
 * 2. Reseta as missões diárias para o novo dia (desmarcando tarefas concluídas em datas anteriores).
 * 3. Zera os contadores diários de ferramentas (sessões de pomodoro, minutos de meditação, etc).
 */
export function runDailyMaintenance(): void {
  try {
    const today = getTodayString();

    // 1. Manutenção do Perfil e Protocolo de 66 Dias
    useUserStore.getState().checkDayTransition();

    // 2. Manutenção das Missões Diárias
    useHabitStore.getState().resetDailyMissionsIfNewDay();

    // 3. Manutenção das Ferramentas Shinobi
    useToolStore.getState().resetDailyToolsIfNewDay();

    // Notifica ouvintes que uma transição de dia ocorreu
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shinobi_day_reset', { detail: { date: today } }));
    }
  } catch (error) {
    console.error('Erro ao executar a manutenção diária do sistema:', error);
  }
}

/**
 * Inicializa os ouvintes do motor de renovação diária:
 * - Timer de precisão para a meia-noite (00:00:00).
 * - Listener de mudança de visibilidade (app voltando do background / celular desbloqueado).
 * - Listener de foco na janela.
 * - Intervalo de verificação de segurança a cada 30 segundos.
 */
export function initDailyResetEngine(): () => void {
  let midnightTimeout: ReturnType<typeof setTimeout> | null = null;
  let safetyInterval: ReturnType<typeof setInterval> | null = null;
  let lastCheckedDate = getTodayString();

  // Executa imediatamente na inicialização
  runDailyMaintenance();

  const scheduleMidnightReset = () => {
    if (midnightTimeout) clearTimeout(midnightTimeout);
    const msUntilMidnight = getMsUntilNextMidnight();

    midnightTimeout = setTimeout(() => {
      runDailyMaintenance();
      lastCheckedDate = getTodayString();
      // Reagenda para a próxima meia-noite
      scheduleMidnightReset();
    }, msUntilMidnight);
  };

  const handleCheckTransition = () => {
    const currentDate = getTodayString();
    if (currentDate !== lastCheckedDate) {
      lastCheckedDate = currentDate;
      runDailyMaintenance();
    }
  };

  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      handleCheckTransition();
    }
  };

  // Agenda timer de meia-noite
  scheduleMidnightReset();

  // Intervalo de segurança (detecta mudança de relógio do sistema / suspensão de CPU)
  safetyInterval = setInterval(() => {
    handleCheckTransition();
  }, 30000);

  if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleCheckTransition);
  }

  // Função de limpeza para desmontagem do componente
  return () => {
    if (midnightTimeout) clearTimeout(midnightTimeout);
    if (safetyInterval) clearInterval(safetyInterval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleCheckTransition);
    }
  };
}
