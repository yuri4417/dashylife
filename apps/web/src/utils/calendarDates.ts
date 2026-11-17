export type CalendarView = 'day' | 'week' | 'month';

export const dateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const sundayOffset = (date: Date) => date.getDay();

/** A semana do calendário deve coincidir com a semana usada na recorrência. */
export function visibleRange(date: Date, view: CalendarView): [Date, Date] {
  if (view === 'day') return [date, date];
  const first = view === 'month' ? new Date(date.getFullYear(), date.getMonth(), 1) : date;
  const start = addDays(first, -sundayOffset(first));
  return [start, addDays(start, view === 'week' ? 6 : 41)];
}
