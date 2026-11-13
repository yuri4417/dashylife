import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null;
}
function dateValue(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
const months = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const fullDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' });
const weekdays = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

export function DateInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const selected = parseDate(value);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => selected || new Date());
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const calendar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  const focusDate = (date: Date) => {
    setCursor(date);
    requestAnimationFrame(() => calendar.current?.querySelector<HTMLButtonElement>(`[data-date="${dateValue(date)}"]`)?.focus());
  };
  const choose = (date: Date) => { onChange(dateValue(date)); setOpen(false); trigger.current?.focus(); };
  const changeMonth = (offset: number) => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1);
    const day = Math.min(cursor.getDate(), new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate());
    setCursor(new Date(first.getFullYear(), first.getMonth(), day));
  };
  const firstWeekday = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => index < firstWeekday ? null : new Date(cursor.getFullYear(), cursor.getMonth(), index - firstWeekday + 1));
  return <div className="date-input" ref={root}>
    <button type="button" ref={trigger} className="date-trigger" aria-label={`${label}: ${selected ? selected.toLocaleDateString('pt-BR') : 'nenhuma data'}`} aria-expanded={open} aria-controls={panelId} onClick={() => { if (!open) setCursor(selected || new Date()); setOpen(!open); }}>
      <span className={selected ? '' : 'date-placeholder'}>{selected ? selected.toLocaleDateString('pt-BR') : 'Selecionar data'}</span><CalendarDays size={18} aria-hidden="true" />
    </button>
    {open && <div className="date-calendar" id={panelId} ref={calendar} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); } }}>
      <div className="date-calendar-header"><button type="button" aria-label="Mês anterior" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button><strong aria-live="polite">{months.format(cursor)}</strong><button type="button" aria-label="Próximo mês" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button></div>
      <div className="date-grid" role="grid" aria-label={`Calendário de ${months.format(cursor)}`}><div className="date-week" role="row">{weekdays.map(day => <span role="columnheader" key={day}>{day}</span>)}</div>{Array.from({ length: Math.ceil(cells.length / 7) }, (_, week) => <div className="date-week" role="row" key={week}>{Array.from({ length: 7 }, (_, day) => { const date = cells[week * 7 + day]; if (!date) return <span role="gridcell" key={day} />; const current = dateValue(date); return <span role="gridcell" key={current} aria-selected={current === value}><button type="button" data-date={current} aria-label={fullDate.format(date)} aria-current={current === dateValue(new Date()) ? 'date' : undefined} tabIndex={current === dateValue(cursor) ? 0 : -1} className={current === value ? 'is-selected' : ''} onClick={() => choose(date)} onKeyDown={event => { const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }; if (event.key in offsets) { event.preventDefault(); focusDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsets[event.key])); } else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); focusDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + (event.key === 'Home' ? -date.getDay() : 6 - date.getDay()))); } else if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); const offset = event.key === 'PageUp' ? -1 : 1; const target = new Date(date.getFullYear(), date.getMonth() + offset, 1); target.setDate(Math.min(date.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate())); focusDate(target); } }}>{date.getDate()}</button></span>; })}</div>)}</div>
      <div className="date-calendar-footer"><button type="button" onClick={() => choose(new Date())}>Hoje</button><button type="button" onClick={() => { onChange(''); setOpen(false); trigger.current?.focus(); }}>Limpar data</button></div>
    </div>}
  </div>;
}
