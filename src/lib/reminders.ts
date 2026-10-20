import { useEffect } from 'react';
import { lsGet, lsSet } from './prefs';
import { useStore } from '../store/AppStore';

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export function permission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported' as const;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

async function systemNotify(title: string, body: string) {
  if (permission() !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, icon: `${import.meta.env.BASE_URL}icons/icon-192.png`, badge: `${import.meta.env.BASE_URL}icons/icon-192.png`, tag: title });
      return true;
    }
    new Notification(title, { body });
    return true;
  } catch {
    return false;
  }
}

const WINDOW_MIN = 180; // only nudge within three hours after the chosen time

/**
 * In-app reminder engine. Without a push server, reminders can only fire
 * while the app is open (or suspended in the background on some platforms).
 */
export function useReminders() {
  const { prefs, today, ctx, habits, reflectionsByDate, moodsByDate, toast, loaded } = useStore();

  useEffect(() => {
    if (!loaded || !prefs.onboarded || prefs.demo) return;
    const check = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const remaining = habits.filter((h) => ctx.due(h, today) && !ctx.done(h, today));
      const items: { key: string; time: string; enabled: boolean; when: boolean; title: string; body: string }[] = [
        {
          key: 'morning', ...prefs.reminders.morning,
          when: reflectionsByDate.get(today)?.status !== 'complete',
          title: 'Your morning reflection',
          body: 'Three things you’re grateful for, two reminders. A few quiet minutes.',
        },
        {
          key: 'habits', ...prefs.reminders.habits,
          when: remaining.length > 0,
          title: `${remaining.length} habit${remaining.length === 1 ? '' : 's'} left today`,
          body: remaining.slice(0, 3).map((h) => h.name).join(' · '),
        },
        {
          key: 'evening', ...prefs.reminders.evening,
          when: true,
          title: 'Evening check-in',
          body: moodsByDate.has(today) ? 'Take a moment to look back on today.' : 'How did today feel? Log your mood and wrap up your habits.',
        },
      ];
      for (const it of items) {
        if (!it.enabled || !it.when) continue;
        const [h, m] = it.time.split(':').map(Number);
        const at = h * 60 + m;
        if (mins < at || mins > at + WINDOW_MIN) continue;
        const firedKey = `htp.fired.${it.key}.${today}`;
        if (lsGet(firedKey)) continue;
        lsSet(firedKey, '1');
        void systemNotify(it.title, it.body).then((sent) => {
          if (!sent || document.visibilityState === 'visible') toast(`${it.title}${it.body ? ` — ${it.body}` : ''}`);
        });
      }
    };
    check();
    const id = window.setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, [loaded, prefs, today, ctx, habits, reflectionsByDate, moodsByDate, toast]);
}
