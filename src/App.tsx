import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { FlaskConical } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { Toasts } from './components/ui';
import { Blossom, Confetti } from './components/visuals';
import { DailyReflection } from './features/DailyReflection';
import { GoalEditor } from './features/GoalEditor';
import { HabitEditor, HabitManager } from './features/HabitEditor';
import { Onboarding } from './features/Onboarding';
import { ReflectionSheet } from './features/ReflectionSheet';
import { requestPersistence } from './lib/db';
import { ssGet, ssSet } from './lib/prefs';
import { useReminders } from './lib/reminders';
import type { DateKey, Goal, GoalPeriod, Habit } from './lib/types';
import { Calendar } from './pages/Calendar';
import { Goals } from './pages/Goals';
import { Insights } from './pages/Insights';
import { Journal } from './pages/Journal';
import { Settings } from './pages/Settings';
import { Today } from './pages/Today';
import { useStore } from './store/AppStore';
import { UICtx, type Tab, type UI } from './store/ui';

const TABS: Tab[] = ['today', 'calendar', 'insights', 'journal', 'goals'];

function Splash() {
  return (
    <div className="paper-grid fixed inset-0 grid place-items-center bg-paper">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}>
          <Blossom className="h-14 w-14" />
        </motion.div>
        <div className="font-serif text-lg font-semibold text-ink/80">Habit Tracker Pro</div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const { loaded, prefs, setPrefs, today, reflectionsByDate, setDemo } = useStore();
  const [tab, setTabState] = useState<Tab>(() => (TABS.includes(prefs.lastTab as Tab) ? (prefs.lastTab as Tab) : 'today'));
  const [habitEdit, setHabitEdit] = useState<{ open: boolean; habit?: Habit }>({ open: false });
  const [managing, setManaging] = useState(false);
  const [goalEdit, setGoalEdit] = useState<{ open: boolean; goal?: Goal; period?: GoalPeriod }>({ open: false });
  const [reflectionDate, setReflectionDate] = useState<DateKey | null>(null);
  const [settings, setSettings] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [forceReflection, setForceReflection] = useState(false);
  const [bypassed, setBypassed] = useState(() => ssGet(`htp.bypass.${today}`) === '1');

  useReminders();

  useEffect(() => setBypassed(ssGet(`htp.bypass.${today}`) === '1'), [today]);
  useEffect(() => {
    if (prefs.onboarded) void requestPersistence();
  }, [prefs.onboarded]);

  const setTab = useCallback(
    (t: Tab) => {
      setTabState(t);
      setPrefs({ lastTab: t });
      window.scrollTo({ top: 0 });
    },
    [setPrefs],
  );

  const ui: UI = useMemo(
    () => ({
      tab,
      setTab,
      editHabit: (habit) => setHabitEdit({ open: true, habit }),
      manageHabits: () => setManaging(true),
      editGoal: (goal, period) => setGoalEdit({ open: true, goal, period }),
      openReflection: (d) => setReflectionDate(d),
      resumeReflection: () => setForceReflection(true),
      openSettings: () => setSettings(true),
      celebrate: () => setConfetti(Date.now()),
    }),
    [tab, setTab],
  );

  useEffect(() => {
    if (!confetti) return;
    const t = setTimeout(() => setConfetti(0), 2800);
    return () => clearTimeout(t);
  }, [confetti]);

  if (!loaded) return <Splash />;

  const showOnboarding = !prefs.demo && !prefs.onboarded;
  const todayDone = reflectionsByDate.get(today)?.status === 'complete';
  const gate = !prefs.demo && prefs.reflectionRequired && !todayDone && !bypassed;
  const showReflection = !showOnboarding && (gate || (forceReflection && !todayDone));

  return (
    <MotionConfig reducedMotion="user">
      <UICtx.Provider value={ui}>
        <Toasts />
        {showOnboarding ? (
          <Onboarding />
        ) : (
          <>
            {!showReflection && (
              <div className="pt-safe mx-auto min-h-[100dvh] max-w-5xl">
                {prefs.demo && (
                  <div className="mx-4 mt-2 flex items-center gap-2 rounded-2xl border border-lavender bg-lavender/30 px-3 py-2 text-[12px]">
                    <FlaskConical size={14} className="shrink-0" />
                    <span className="flex-1 font-medium">Demo preview — sample data only. Your real data is untouched.</span>
                    <button type="button" className="rounded-full bg-card px-2.5 py-1 text-[11px] font-bold shadow-soft" onClick={() => setDemo(false)}>
                      Exit
                    </button>
                  </div>
                )}
                <motion.main key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                    {tab === 'today' && <Today />}
                    {tab === 'calendar' && <Calendar />}
                    {tab === 'insights' && <Insights />}
                    {tab === 'journal' && <Journal />}
                    {tab === 'goals' && <Goals />}
                </motion.main>
                <BottomNav tab={tab} onChange={setTab} />
              </div>
            )}
            <AnimatePresence>
              {showReflection && (
                <DailyReflection
                  key={today}
                  onDone={() => {
                    setForceReflection(false);
                    setTab('today');
                    setConfetti(Date.now());
                  }}
                  onBypass={() => {
                    ssSet(`htp.bypass.${today}`, '1');
                    setBypassed(true);
                    setForceReflection(false);
                  }}
                />
              )}
            </AnimatePresence>
          </>
        )}

        <HabitEditor open={habitEdit.open} habit={habitEdit.habit} onClose={() => setHabitEdit({ open: false })} />
        <HabitManager open={managing} onClose={() => setManaging(false)} onEdit={(h) => setHabitEdit({ open: true, habit: h })} />
        <GoalEditor open={goalEdit.open} goal={goalEdit.goal} period={goalEdit.period} onClose={() => setGoalEdit({ open: false })} />
        <ReflectionSheet date={reflectionDate} onClose={() => setReflectionDate(null)} />
        <AnimatePresence>{settings && <Settings onClose={() => setSettings(false)} />}</AnimatePresence>
        {confetti > 0 && <Confetti key={confetti} />}
      </UICtx.Provider>
    </MotionConfig>
  );
}
