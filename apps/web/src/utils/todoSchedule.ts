import type { Todo } from '@dashylife/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendário civil em UTC evita deslocamentos por fuso horário e horário de verão. */
function dateValue(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms : null;
}

/** Indica quando a tarefa atual ou uma ocorrência futura semanal aparece no calendário. */
export function todoOccursOn(todo: Todo, date: string): boolean {
  const initial = todo.dueDate?.slice(0, 10);
  if (!initial) return false;
  if (initial === date) return true;
  const repetition = todo.repetition;
  if (todo.completed || repetition?.type !== 'weeks' || !repetition.weekdays?.length || !Number.isSafeInteger(repetition.interval) || repetition.interval < 1) return false;
  const start = dateValue(initial), target = dateValue(date);
  if (start === null || target === null || target <= start) return false;
  const startDay = new Date(start).getUTCDay();
  const week = Math.floor((target - start + startDay * DAY_MS) / (7 * DAY_MS));
  return week % repetition.interval === 0 && repetition.weekdays.includes(new Date(target).getUTCDay());
}
