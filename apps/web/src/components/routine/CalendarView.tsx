import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { ChevronLeft, ChevronRight, Hourglass } from 'lucide-react';
import type { Todo } from '@dashylife/shared';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { DateInput } from '../ui/DateInput';
import { todoOccursOn } from '../../utils/todoSchedule';
import { addDays, dateString, visibleRange, type CalendarView as View } from '../../utils/calendarDates';

export type CalendarActivity = { id: string; title: string; description?: string; categoryId?: string; startDate: string; startTime?: string; endTime?: string; recurrence?: { frequency: 'daily' | 'weekly' | 'monthly'; interval: number; weekdays?: number[]; endDate?: string }; occurrenceDate: string; originalDate: string; isException?: boolean };
type Entry = { kind: 'todo'; value: Todo; projected: boolean } | { kind: 'activity'; value: CalendarActivity };
type Context = { entry: Entry; x: number; y: number };
type TimeSegment = { entry: Entry; start: number; end: number };
const timeMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const HOUR_HEIGHT = 60;

function layoutEntries(entries: TimeSegment[]) {
  const sorted = [...entries].sort((a, b) => a.start - b.start || a.end - b.end);
  const result: Array<{ entry: Entry; start: number; end: number; lane: number; lanes: number }> = [];
  let group: typeof result = [], ends: number[] = [], groupEnd = -1;
  const finish = () => { const lanes = ends.length; group.forEach(item => { item.lanes = lanes; }); result.push(...group); group = []; ends = []; };
  for (const item of sorted) {
    if (group.length && item.start >= groupEnd) finish();
    let lane = ends.findIndex(end => end <= item.start);
    if (lane < 0) { lane = ends.length; ends.push(item.end); } else ends[lane] = item.end;
    groupEnd = Math.max(groupEnd, item.end);
    group.push({ ...item, lane, lanes: 1 });
  }
  finish();
  return result;
}

export function CalendarView({ date, view, onDateChange, onViewChange, activities, todos, categories, onCreate, onEdit, onDelete }: {
  date: Date; view: View; onDateChange: (date: Date) => void; onViewChange: (view: View) => void;
  activities: CalendarActivity[]; todos: Todo[]; categories: Array<{ id: string; color: string }>;
  onCreate: (date: string) => void; onEdit: (entry: Entry) => void; onDelete: (entry: Entry) => void;
}) {
  const [day, setDay] = useState<Date | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const mainTimeline = useRef<HTMLDivElement>(null);
  const detailTimeline = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const scroll = (element: HTMLDivElement | null, selected: Date | null) => {
      if (!element || !selected) return;
      const today = dateString(selected) === dateString(new Date());
      element.scrollTop = Math.max(0, ((today ? new Date().getHours() : 8) - 2) * HOUR_HEIGHT);
    };
    if (view !== 'month') scroll(mainTimeline.current, view === 'week' && dateString(new Date()) >= dateString(visibleRange(date, view)[0]) && dateString(new Date()) <= dateString(visibleRange(date, view)[1]) ? new Date() : date);
    scroll(detailTimeline.current, day);
  }, [date, view, day]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!context) return;
    const close = () => setContext(null);
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('click', close); window.addEventListener('scroll', close, true); window.addEventListener('keydown', key);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); window.removeEventListener('keydown', key); };
  }, [context]);
  const [start, end] = visibleRange(date, view);
  const dates = Array.from({ length: Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000) + 1 }, (_, i) => addDays(start, i));
  const entriesFor = (d: Date): Entry[] => { const key = dateString(d); return [...todos.filter(t => todoOccursOn(t, key)).map(value => ({ kind: 'todo' as const, value, projected: value.dueDate?.slice(0, 10) !== key })), ...activities.filter(a => a.occurrenceDate === key).map(value => ({ kind: 'activity' as const, value }))]; };
  const timedEntriesFor = (d: Date): TimeSegment[] => {
    const previousKey = dateString(addDays(d, -1));
    const starts = entriesFor(d).filter(e => e.value.startTime && e.value.endTime);
    const continues = [
      ...todos.filter(t => todoOccursOn(t, previousKey)).map(value => ({ kind: 'todo' as const, value, projected: value.dueDate?.slice(0, 10) !== previousKey })),
      ...activities.filter(a => a.occurrenceDate === previousKey).map(value => ({ kind: 'activity' as const, value })),
    ].filter(e => {
      if (!e.value.startTime || !e.value.endTime) return false;
      const start = timeMinutes(e.value.startTime), end = timeMinutes(e.value.endTime);
      return end > 0 && end < start;
    });
    return [
      ...starts.map(entry => ({ entry, start: timeMinutes(entry.value.startTime!), end: timeMinutes(entry.value.endTime!) < timeMinutes(entry.value.startTime!) ? 1440 : timeMinutes(entry.value.endTime!) })),
      ...continues.map(entry => ({ entry, start: 0, end: timeMinutes(entry.value.endTime!) })),
    ];
  };
  const colorFor = (entry: Entry) => entry.kind === 'todo' ? 'var(--color-accent)' : categories.find(c => c.id === entry.value.categoryId)?.color || '#8bbf85';
  const menu = (event: MouseEvent, entry: Entry) => { event.preventDefault(); event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); const x = event.type === 'contextmenu' ? event.clientX : rect.left; const y = event.type === 'contextmenu' ? event.clientY : rect.bottom; setContext({ entry, x: Math.max(8, Math.min(x, window.innerWidth - 190)), y: Math.max(8, Math.min(y, window.innerHeight - (entry.kind === 'todo' && entry.projected ? 180 : 115))) }); };
  const eventButton = (entry: Entry, style?: CSSProperties, keySuffix = '') => { const color = colorFor(entry); return <button key={`${entry.kind}-${entry.value.id}-${entry.kind === 'activity' ? entry.value.originalDate : ''}${keySuffix}`} type="button" title={`${entry.kind === 'todo' ? 'Tarefa' : 'Atividade'}: ${entry.value.title}${entry.kind === 'todo' && entry.projected ? ' (ocorrência futura)' : ''}`} aria-label={`${entry.kind === 'todo' ? 'Tarefa' : 'Atividade'}: ${entry.value.title}${entry.kind === 'todo' && entry.projected ? ', ocorrência futura' : ''}. Abrir opções`} className="routine-event" style={{ ...style, borderLeftColor: color, background: `color-mix(in srgb, ${color} 23%, var(--color-surface))` }} onClick={e => menu(e, entry)} onContextMenu={e => menu(e, entry)}>{entry.value.title}</button>; };
  const timeline = (days: Date[], detailed = false) => <div ref={detailed ? detailTimeline : mainTimeline} className={`routine-timeline-scroll ${detailed ? 'is-detail' : ''}`}><div className="routine-timeline" style={{ '--routine-days': days.length } as CSSProperties}>
    <div className="routine-time-head">Dia inteiro</div>{days.map(d => <div className="routine-all-day" key={dateString(d)} onClick={() => onCreate(dateString(d))}>{entriesFor(d).filter(e => !e.value.startTime || !e.value.endTime).map(e => eventButton(e))}</div>)}
    <div className="routine-time-labels">{Array.from({ length: 24 }, (_, i) => <div key={i} style={{ height: HOUR_HEIGHT }}>{String(i).padStart(2, '0')}:00</div>)}</div>
    {days.map(d => { const key = dateString(d); const entries = timedEntriesFor(d); return <div key={key} className="routine-time-column" onClick={() => onCreate(key)} style={{ height: HOUR_HEIGHT * 24 }}>
      {Array.from({ length: 24 }, (_, i) => <div className="routine-hour" style={{ top: i * HOUR_HEIGHT }} key={i}/>)}
      {layoutEntries(entries).map(({ entry, start: from, end: to, lane, lanes }) => eventButton(entry, { position: 'absolute', top: from, height: Math.max(18, to - from), left: `calc(${lane * 100 / lanes}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }, `-${from}-${to}`))}
      {key === dateString(now) && <div className="routine-now-line" style={{ top: now.getHours() * HOUR_HEIGHT + now.getMinutes() }} aria-label={`Horário atual: ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}><span><Hourglass size={12}/></span></div>}
    </div>; })}
  </div></div>;
  const periodLabel = view === 'month' ? date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : view === 'day' ? date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : `${start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const move = (direction: number) => onDateChange(view === 'month' ? new Date(date.getFullYear(), date.getMonth() + direction, 1) : addDays(date, direction * (view === 'week' ? 7 : 1)));
  return <>
    <div className="routine-toolbar"><div className="routine-period"><Button variant="secondary" aria-label="Período anterior" onClick={() => move(-1)}><ChevronLeft size={16}/></Button><Button variant="secondary" onClick={() => onDateChange(new Date())}>Hoje</Button><Button variant="secondary" aria-label="Próximo período" onClick={() => move(1)}><ChevronRight size={16}/></Button><h2>{periodLabel}</h2><div className="routine-jump"><DateInput label="Ir para data" value={dateString(date)} allowClear={false} onChange={value => { const [year, month, day] = value.split('-').map(Number); onDateChange(new Date(year, month - 1, day)); }} /></div></div><div className="routine-view-switch" role="group" aria-label="Visualização do calendário">{([['day', 'Diária'], ['week', 'Semanal'], ['month', 'Mensal']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={view === value} onClick={() => onViewChange(value)}>{label}</button>)}</div></div>
    <p className={`routine-swipe-hint ${view === 'day' ? 'is-hidden' : ''}`} aria-hidden="true">Deslize para ver os outros dias ↔</p><div className="routine-calendar-scroll"><div className={`routine-calendar-inner ${view === 'day' ? 'is-single' : ''}`}><div className="routine-day-headings" style={{ '--routine-days': view === 'month' ? 7 : dates.length } as CSSProperties}>{view !== 'month' && <div className="routine-heading-spacer"/>}{(view === 'month' ? dates.slice(0, 7) : dates).map(d => <div key={dateString(d)}><span>{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>{view !== 'month' && <button className={dateString(d) === dateString(now) ? 'is-today' : ''} aria-label={`Ver dia ${d.toLocaleDateString('pt-BR')}`} onClick={() => setDay(d)}>{d.getDate()}</button>}</div>)}</div>
    {view === 'month' ? <div className="routine-month-grid">{dates.map(d => { const key = dateString(d); return <div key={key} className={`routine-month-cell ${d.getMonth() !== date.getMonth() ? 'is-outside' : ''}`} onClick={() => onCreate(key)}><button className={`routine-date-number ${key === dateString(now) ? 'is-today' : ''}`} aria-label={`Ver dia ${d.toLocaleDateString('pt-BR')}`} onClick={e => { e.stopPropagation(); setDay(d); }}>{d.getDate()}</button><div className="routine-month-events">{entriesFor(d).map(e => eventButton(e))}</div></div>; })}</div> : timeline(dates)}
    </div></div>
    {day && <Modal title={day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} maxWidth="max-w-3xl" onClose={() => setDay(null)}><p className="text-xs text-tertiary">Clique em um espaço livre para criar uma atividade. Clique em um evento para ver as opções.</p>{timeline([day], true)}</Modal>}
    {context && <div className="routine-context" role="menu" aria-label="Opções do evento" style={{ left: context.x, top: context.y }} onClick={e => e.stopPropagation()}>{context.entry.kind === 'todo' && context.entry.projected && <p className="routine-context-note">Ocorrência futura. Alterar ou excluir afeta a tarefa pendente e suas próximas ocorrências.</p>}<button role="menuitem" onClick={() => { onEdit(context.entry); setContext(null); }}>Alterar</button><button role="menuitem" className="is-danger" onClick={() => { onDelete(context.entry); setContext(null); }}>Excluir</button></div>}
  </>;
}
