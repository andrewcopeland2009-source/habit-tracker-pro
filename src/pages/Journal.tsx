import { ChevronLeft, ChevronRight, Heart, PenLine, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, PageHeader, Panel, SectionHeader, Segmented } from '../components/ui';
import { MoodFace, NotebookArt } from '../components/visuals';
import { WEEKDAY_LETTER, addMonths, fmt, longDate, monthDays, monthStart, monthTitle, parseKey, weekday } from '../lib/date';
import { reflectionStreaks } from '../lib/insights';
import { MOOD_META } from '../lib/palette';
import type { Reflection } from '../lib/types';
import { useStore } from '../store/AppStore';
import { useUI } from '../store/ui';
import { moodColors } from '../features/MoodPicker';

type View = 'timeline' | 'calendar' | 'reminders';
const CARD_TINTS = ['bg-blush/25', 'bg-peach/25', 'bg-butter/25', 'bg-sage/25', 'bg-powder/25', 'bg-lavender/25'];

export function Journal() {
  const { data, today } = useStore();
  const [view, setView] = useState<View>('timeline');
  const stats = useMemo(() => reflectionStreaks(data.reflections, today), [data.reflections, today]);
  const gratitudeCount = data.reflections.reduce((a, r) => a + r.gratitude.filter((g) => g.trim()).length, 0);

  return (
    <div className="pb-nav">
      <PageHeader kicker="Gratitude journal" title="Journal">
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {[
            ['Reflections', stats.total, 'bg-blush/35'],
            ['Streak', stats.current, 'bg-peach/35'],
            ['Longest', stats.longest, 'bg-butter/40'],
            ['Gratitudes', gratitudeCount, 'bg-sage/35'],
          ].map(([l, v, t]) => (
            <div key={l as string} className={`rounded-xl px-2 py-1.5 text-center ${t}`}>
              <div className="tabular font-serif text-lg font-semibold leading-tight">{v}</div>
              <div className="label-xs !text-[8px]">{l}</div>
            </div>
          ))}
        </div>
        <Segmented<View>
          className="mt-3"
          value={view}
          onChange={setView}
          options={[
            { value: 'timeline', label: 'Timeline' },
            { value: 'calendar', label: 'Calendar' },
            { value: 'reminders', label: 'Reminders' },
          ]}
        />
      </PageHeader>
      <div className="px-4">
        {view === 'timeline' && <Timeline />}
        {view === 'calendar' && <JournalCalendar />}
        {view === 'reminders' && <Reminders />}
      </div>
    </div>
  );
}

export function EntryCard({ r, index }: { r: Reflection; index: number }) {
  const { moodsByDate, dark } = useStore();
  const ui = useUI();
  const mood = moodsByDate.get(r.date)?.mood;
  return (
    <button type="button" onClick={() => ui.openReflection(r.date)} className={`panel relative block w-full overflow-hidden p-0 text-left`}>
      <div className={`flex items-center gap-3 border-b border-line/60 px-3.5 py-2.5 ${CARD_TINTS[index % CARD_TINTS.length]}`}>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-card/80 text-center leading-none">
          <div>
            <div className="text-[9px] font-bold uppercase text-muted">{fmt(r.date, { month: 'short' })}</div>
            <div className="tabular font-serif text-lg font-semibold">{parseKey(r.date).d}</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold">{fmt(r.date, { weekday: 'long' })}</div>
          <div className="text-[11px] text-muted">
            {fmt(r.date, { year: 'numeric' })}
            {r.status === 'draft' && <span className="ml-1.5 rounded-full bg-card px-1.5 py-px text-[9px] font-bold uppercase">Draft</span>}
          </div>
        </div>
        {mood && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-muted">
            <MoodFace mood={mood} size={26} fill={moodColors(mood, dark).fill} ink={moodColors(mood, dark).ink} />
            {MOOD_META[mood].label}
          </span>
        )}
      </div>
      <div className="px-3.5 py-2.5">
        <ul className="space-y-0.5">
          {r.gratitude.filter((g) => g.trim()).map((g, i) => (
            <li key={i} className="flex gap-2 font-hand text-[19px] leading-snug">
              <Heart size={11} className="mt-[7px] shrink-0 fill-blush text-blush" />
              <span className="min-w-0 break-words">{g}</span>
            </li>
          ))}
        </ul>
        {r.reminders.some((x) => x.trim()) && (
          <div className="mt-2 space-y-1 border-t border-dashed border-line pt-2">
            {r.reminders.filter((x) => x.trim()).map((x, i) => (
              <p key={i} className="font-serif text-[13px] italic leading-snug text-ink/80">“{x}”</p>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function Timeline() {
  const { data, moodsByDate, today, reflectionsByDate } = useStore();
  const ui = useUI();
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(20);
  const entries = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...data.reflections]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((r) => {
        if (!needle) return true;
        const mood = moodsByDate.get(r.date);
        const hay = [...r.gratitude, ...r.reminders, longDate(r.date), mood ? MOOD_META[mood.mood].label : ''].join(' ').toLowerCase();
        return hay.includes(needle);
      });
  }, [data.reflections, q, moodsByDate]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search gratitudes, reminders, moods…" className="input !pl-9" aria-label="Search journal" />
      </div>
      {!reflectionsByDate.has(today) && (
        <button type="button" onClick={ui.resumeReflection} className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-accent/50 px-4 py-3 text-sm font-semibold text-accent">
          <PenLine size={15} /> Write today’s reflection
        </button>
      )}
      {!data.reflections.length ? (
        <Panel>
          <EmptyState art={<NotebookArt className="h-24 w-28" />} title="Your journal starts today" message="Each daily reflection is saved here — a quiet record of what mattered." />
        </Panel>
      ) : entries.length ? (
        <>
          {entries.slice(0, limit).map((r, i) => <EntryCard key={r.date} r={r} index={i} />)}
          {entries.length > limit && (
            <button type="button" className="btn-soft w-full" onClick={() => setLimit(limit + 20)}>
              Show older entries ({entries.length - limit} more)
            </button>
          )}
        </>
      ) : (
        <p className="py-10 text-center text-sm text-muted">No entries match “{q}”.</p>
      )}
    </div>
  );
}

function JournalCalendar() {
  const { today, reflectionsByDate, moodsByDate, dark, prefs } = useStore();
  const [month, setMonth] = useState(monthStart(today));
  const [selected, setSelected] = useState(today);
  const days = monthDays(month);
  const lead = (weekday(days[0]) - prefs.weekStart + 7) % 7;
  const entry = reflectionsByDate.get(selected);
  const ui = useUI();

  return (
    <div className="space-y-3">
      <Panel className="p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-serif text-[17px] font-semibold">{monthTitle(month)}</h2>
          <div className="flex gap-1">
            <button type="button" className="btn-soft !p-1.5" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft size={16} /></button>
            <button type="button" className="btn-soft !p-1.5" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-faint">{WEEKDAY_LETTER[(i + prefs.weekStart) % 7]}</div>
          ))}
          {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
          {days.map((d) => {
            const r = reflectionsByDate.get(d);
            const mood = moodsByDate.get(d)?.mood;
            const sel = d === selected;
            return (
              <button
                key={d}
                type="button"
                disabled={d > today}
                onClick={() => setSelected(d)}
                aria-pressed={sel}
                aria-label={`${longDate(d)}${r ? ', has reflection' : ''}`}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-[12px] font-semibold transition disabled:opacity-35 ${sel ? 'bg-ink text-paper' : r?.status === 'complete' ? 'bg-blush/40' : r ? 'bg-blush/15' : 'bg-sunk/60'} ${d === today && !sel ? 'ring-2 ring-accent/50' : ''}`}
              >
                <span className="tabular">{parseKey(d).d}</span>
                {mood && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full" style={{ background: moodColors(mood, dark).mid }} />}
              </button>
            );
          })}
        </div>
      </Panel>
      {entry ? (
        <EntryCard r={entry} index={parseKey(selected).d} />
      ) : (
        <Panel className="p-5 text-center">
          <p className="text-sm text-muted">No reflection on {longDate(selected)}.</p>
          <button type="button" className="btn-soft mt-3" onClick={() => (selected === today ? ui.resumeReflection() : ui.openReflection(selected))}>
            <PenLine size={14} /> Write one
          </button>
        </Panel>
      )}
    </div>
  );
}

function Reminders() {
  const { data, saveReflection } = useStore();
  const [onlyFav, setOnlyFav] = useState(false);
  const items = useMemo(
    () =>
      [...data.reflections]
        .sort((a, b) => b.date.localeCompare(a.date))
        .flatMap((r) => r.reminders.map((text, i) => ({ r, i, text, fav: r.favorites[i] })))
        .filter((x) => x.text.trim() && (!onlyFav || x.fav)),
    [data.reflections, onlyFav],
  );
  const toggleFav = (r: Reflection, i: number) =>
    saveReflection({ ...r, favorites: r.favorites.map((f, j) => (j === i ? !f : f)) as Reflection['favorites'], updatedAt: Date.now() });
  const tints = ['bg-powder/35', 'bg-lavender/35', 'bg-sage/30', 'bg-blush/30', 'bg-butter/35', 'bg-peach/30'];

  return (
    <div className="space-y-3">
      <SectionHeader
        kicker="Notes to self"
        title="Personal reminder collection"
        action={
          <button type="button" aria-pressed={onlyFav} onClick={() => setOnlyFav(!onlyFav)} className={`chip !px-2.5 !py-1 ${onlyFav ? 'bg-butter text-ink' : 'bg-sunk text-muted'}`}>
            <Star size={11} className={onlyFav ? 'fill-current' : ''} /> Favorites
          </button>
        }
      />
      {items.length ? (
        <div className="columns-2 gap-2.5 [&>*]:mb-2.5">
          {items.map(({ r, i, text, fav }, k) => (
            <div key={`${r.date}-${i}`} className={`relative break-inside-avoid rounded-2xl border border-line/60 p-3 pr-8 ${tints[k % tints.length]}`}>
              <p className="font-hand text-[20px] leading-snug">{text}</p>
              <div className="mt-1.5 text-[10px] font-medium text-muted">{fmt(r.date, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <button type="button" aria-pressed={fav} aria-label={fav ? 'Unfavorite' : 'Favorite'} onClick={() => toggleFav(r, i)} className="absolute right-2 top-2 p-1">
                <Star size={16} className={fav ? 'fill-butter text-[#c9a227]' : 'text-faint'} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Panel className="p-6 text-center text-sm text-muted">{onlyFav ? 'Star reminders you want to keep close.' : 'Reminders from your daily reflections will collect here.'}</Panel>
      )}
    </div>
  );
}
