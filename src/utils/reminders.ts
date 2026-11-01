import { useUserStore } from '../state/useUserStore';
import { useHabitStore } from '../state/useHabitStore';
import { calculateDailyXpProgress } from '../core/streakEngine';
import { getTodayString } from '../core/dateUtils';

/**
 * Lembretes locais (manhã e noite).
 * Funcionam enquanto o app estiver aberto ou em segundo plano no aparelho —
 * notificações com o app totalmente fechado exigiriam um servidor de push.
 */

const SENT_KEY = 'ml_reminders_sent';

function alreadySent(slot: string): boolean {
  try {
    const sent = JSON.parse(localStorage.getItem(SENT_KEY) || '{}') as Record<string, string>;
    return sent[slot] === getTodayString();
  } catch {
    return false;
  }
}

function markSent(slot: string) {
  try {
    const sent = JSON.parse(localStorage.getItem(SENT_KEY) || '{}') as Record<string, string>;
    sent[slot] = getTodayString();
    localStorage.setItem(SENT_KEY, JSON.stringify(sent));
  } catch {
    /* sem armazenamento disponível */
  }
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showShinobiNotification(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const options: NotificationOptions = { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: 'making-legends' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    /* cai para a API direta */
  }
  try {
    new Notification(title, options);
  } catch {
    /* alguns navegadores móveis exigem service worker */
  }
}

function minutesOf(time: string): number {
  const [h, m] = (time || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function checkReminders() {
  const { profile } = useUserStore.getState();
  const settings = profile.notificationSettings;
  if (!settings.enabled || !profile.hasCompletedOnboarding) return;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const missions = useHabitStore.getState().missions;
  const progress = calculateDailyXpProgress(missions);
  const pending = missions.filter((m) => !m.isCompletedToday).length;

  const morning = minutesOf(settings.morningTime);
  if (nowMin >= morning && nowMin < morning + 90 && !alreadySent('morning')) {
    markSent('morning');
    showShinobiNotification(
      'Bom dia, shinobi! 🍃',
      `${pending} ${pending === 1 ? 'missão aguarda' : 'missões aguardam'} por você. Meta do dia: ${progress.target50PctXp} XP.`
    );
  }

  const evening = minutesOf(settings.eveningTime);
  if (nowMin >= evening && nowMin < evening + 90 && !alreadySent('evening')) {
    markSent('evening');
    if (!progress.isUnlocked) {
      showShinobiNotification(
        'Seu dia ainda não foi cumprido ⚠️',
        `Faltam ${progress.remainingXpToUnlock} XP para garantir a presença e proteger sua sequência de ${profile.currentStreak} dias.`
      );
    } else if (pending > 0) {
      showShinobiNotification('Dia cumprido! 完', `Ainda dá tempo de concluir mais ${pending} ${pending === 1 ? 'missão' : 'missões'} e fortalecer seu chakra.`);
    }
  }
}

export function initReminderScheduler(): () => void {
  checkReminders();
  const interval = setInterval(checkReminders, 60_000);
  const onVisible = () => document.visibilityState === 'visible' && checkReminders();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
