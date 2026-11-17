import type {
  RoutineActivity, RoutineCategory, RoutineDeleteScope, RoutineOccurrence, RoutineRecurrence,
} from '@dashylife/shared';
import { db } from '../db.js';
import { ApiError, validateTimeRange } from '../validation.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366 * 5;

type CategoryRow = { id: string; name: string; color: string; created_at: string; updated_at: string };
type ActivityRow = {
  id: string; title: string; description: string | null; category_id: string | null;
  start_date: string; start_time: string | null; end_time: string | null; recurrence: string | null;
  created_at: string; updated_at: string;
};
type ActivityValues = Omit<RoutineActivity, 'id' | 'createdAt' | 'updatedAt'>;

function categoryFromRow(row: CategoryRow): RoutineCategory {
  return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at, updatedAt: row.updated_at };
}

function activityFromRow(row: ActivityRow): RoutineActivity {
  return {
    id: row.id, title: row.title, description: row.description || undefined,
    categoryId: row.category_id || undefined, startDate: row.start_date,
    startTime: row.start_time || undefined, endTime: row.end_time || undefined,
    recurrence: row.recurrence ? JSON.parse(row.recurrence) as RoutineRecurrence : undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateMs(value: string): number {
  return new Date(`${value}T00:00:00.000Z`).getTime();
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Dados inválidos.');
  return value as Record<string, unknown>;
}

function categoryValues(input: unknown, previous?: RoutineCategory): Pick<RoutineCategory, 'name' | 'color'> {
  const data = object(input);
  const name = data.name === undefined ? previous?.name : data.name;
  const color = data.color === undefined ? previous?.color : data.color;
  if (typeof name !== 'string' || !name.trim()) throw new ApiError(400, 'Informe o nome da categoria.');
  if (typeof color !== 'string' || !/^#[\da-fA-F]{6}$/.test(color)) throw new ApiError(400, 'Informe uma cor válida no formato #RRGGBB.');
  return { name: name.trim(), color };
}

function recurrenceValue(input: unknown, startDate: string): RoutineRecurrence | undefined {
  if (input === undefined || input === null) return undefined;
  const data = object(input);
  if (data.frequency !== 'daily' && data.frequency !== 'weekly' && data.frequency !== 'monthly') {
    throw new ApiError(400, 'Informe uma frequência de repetição válida.');
  }
  if (!Number.isSafeInteger(data.interval) || (data.interval as number) < 1) {
    throw new ApiError(400, 'O intervalo de repetição deve ser um número inteiro positivo.');
  }
  let weekdays: number[] | undefined;
  if (data.weekdays !== undefined && data.weekdays !== null) {
    if (data.frequency !== 'weekly' || !Array.isArray(data.weekdays) || data.weekdays.length === 0
      || !data.weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) {
      throw new ApiError(400, 'Informe dias da semana válidos para a repetição semanal.');
    }
    weekdays = [...new Set(data.weekdays as number[])].sort((a, b) => a - b);
  }
  if (data.endDate !== undefined && data.endDate !== null && (!isDate(data.endDate) || data.endDate < startDate)) {
    throw new ApiError(400, 'A data final da repetição deve ser válida e não pode anteceder o início.');
  }
  return {
    frequency: data.frequency, interval: data.interval as number, weekdays,
    endDate: typeof data.endDate === 'string' ? data.endDate : undefined,
  };
}

function activityValues(input: unknown, previous?: RoutineActivity): ActivityValues {
  const data = object(input);
  const title = data.title === undefined ? previous?.title : data.title;
  const description = data.description === undefined ? previous?.description : data.description;
  const categoryId = data.categoryId === undefined ? previous?.categoryId : data.categoryId;
  const startDate = data.startDate === undefined ? previous?.startDate : data.startDate;
  const startTime = data.startTime === undefined ? previous?.startTime : data.startTime;
  const endTime = data.endTime === undefined ? previous?.endTime : data.endTime;
  const recurrence = data.recurrence === undefined ? previous?.recurrence : data.recurrence;
  if (typeof title !== 'string' || !title.trim()) throw new ApiError(400, 'Informe o título da atividade.');
  if (description !== undefined && description !== null && typeof description !== 'string') throw new ApiError(400, 'Descrição inválida.');
  if (categoryId !== undefined && categoryId !== null && (typeof categoryId !== 'string' || !categoryId)) throw new ApiError(400, 'Categoria inválida.');
  if (typeof categoryId === 'string' && !db.prepare('SELECT id FROM routine_categories WHERE id = ?').get(categoryId)) {
    throw new ApiError(400, 'Categoria não encontrada.');
  }
  if (!isDate(startDate)) throw new ApiError(400, 'Informe uma data inicial válida no formato AAAA-MM-DD.');
  validateTimeRange(startTime, endTime);
  return {
    title: title.trim(), description: typeof description === 'string' && description ? description : undefined,
    categoryId: typeof categoryId === 'string' ? categoryId : undefined, startDate,
    startTime: typeof startTime === 'string' ? startTime : undefined,
    endTime: typeof endTime === 'string' ? endTime : undefined,
    recurrence: recurrenceValue(recurrence, startDate),
  };
}

function occursOn(activity: RoutineActivity, date: string): boolean {
  if (date < activity.startDate) return false;
  const recurrence = activity.recurrence;
  if (!recurrence) return date === activity.startDate;
  if (recurrence.endDate && date > recurrence.endDate) return false;
  const start = new Date(dateMs(activity.startDate));
  const current = new Date(dateMs(date));
  const days = (current.getTime() - start.getTime()) / DAY_MS;
  if (recurrence.frequency === 'daily') return days % recurrence.interval === 0;
  if (recurrence.frequency === 'weekly') {
    const startMonday = start.getTime() - ((start.getUTCDay() + 6) % 7) * DAY_MS;
    const weeks = Math.floor((current.getTime() - startMonday) / (7 * DAY_MS));
    return weeks % recurrence.interval === 0
      && (recurrence.weekdays ?? [start.getUTCDay()]).includes(current.getUTCDay());
  }
  const months = (current.getUTCFullYear() - start.getUTCFullYear()) * 12 + current.getUTCMonth() - start.getUTCMonth();
  return months % recurrence.interval === 0 && current.getUTCDate() === start.getUTCDate();
}

export class RoutineRepository {
  listCategories(): RoutineCategory[] {
    return (db.prepare('SELECT * FROM routine_categories ORDER BY name COLLATE NOCASE, id').all() as CategoryRow[]).map(categoryFromRow);
  }

  createCategory(input: unknown): RoutineCategory {
    const values = categoryValues(input);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO routine_categories (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, values.name, values.color, now, now);
    return { id, ...values, createdAt: now, updatedAt: now };
  }

  updateCategory(id: string, input: unknown): RoutineCategory {
    const row = db.prepare('SELECT * FROM routine_categories WHERE id = ?').get(id) as CategoryRow | undefined;
    if (!row) throw new ApiError(404, 'Categoria não encontrada.');
    const previous = categoryFromRow(row);
    const values = categoryValues(input, previous);
    const updatedAt = new Date().toISOString();
    db.prepare('UPDATE routine_categories SET name = ?, color = ?, updated_at = ? WHERE id = ?')
      .run(values.name, values.color, updatedAt, id);
    return { ...previous, ...values, updatedAt };
  }

  deleteCategory(id: string): { deleted: string } {
    if (!db.prepare('DELETE FROM routine_categories WHERE id = ?').run(id).changes) throw new ApiError(404, 'Categoria não encontrada.');
    return { deleted: id };
  }

  listActivities(start: unknown, end: unknown): RoutineOccurrence[] {
    if (!isDate(start) || !isDate(end) || start > end || (dateMs(end) - dateMs(start)) / DAY_MS > MAX_RANGE_DAYS) {
      throw new ApiError(400, 'Informe um período válido de até cinco anos com start e end (AAAA-MM-DD).');
    }
    const rows = db.prepare('SELECT * FROM routine_activities WHERE start_date <= ?').all(end) as ActivityRow[];
    const excludedRows = db.prepare('SELECT activity_id, occurrence_date FROM routine_exclusions WHERE occurrence_date BETWEEN ? AND ?')
      .all(start, end) as Array<{ activity_id: string; occurrence_date: string }>;
    const exclusions = new Set(excludedRows.map((row) => `${row.activity_id}:${row.occurrence_date}`));
    const result: RoutineOccurrence[] = [];
    for (const row of rows) {
      const activity = activityFromRow(row);
      const first = Math.max(dateMs(start), dateMs(activity.startDate));
      const last = Math.min(dateMs(end), activity.recurrence?.endDate ? dateMs(activity.recurrence.endDate) : dateMs(end));
      for (let day = first; day <= last; day += DAY_MS) {
        const date = new Date(day).toISOString().slice(0, 10);
        if (occursOn(activity, date) && !exclusions.has(`${activity.id}:${date}`)) result.push({ ...activity, occurrenceDate: date });
        if (!activity.recurrence) break;
      }
    }
    return result.sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate)
      || (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.title.localeCompare(b.title, 'pt-BR') || a.id.localeCompare(b.id));
  }

  createActivity(input: unknown): RoutineActivity {
    const values = activityValues(input);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO routine_activities
      (id, title, description, category_id, start_date, start_time, end_time, recurrence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, values.title, values.description ?? null, values.categoryId ?? null,
      values.startDate, values.startTime ?? null, values.endTime ?? null,
      values.recurrence ? JSON.stringify(values.recurrence) : null, now, now);
    return { id, ...values, createdAt: now, updatedAt: now };
  }

  updateActivity(id: string, input: unknown): RoutineActivity {
    const previous = this.getActivity(id);
    const values = activityValues(input, previous);
    const updatedAt = new Date().toISOString();
    db.prepare(`UPDATE routine_activities SET title = ?, description = ?, category_id = ?, start_date = ?,
      start_time = ?, end_time = ?, recurrence = ?, updated_at = ? WHERE id = ?`).run(values.title, values.description ?? null,
      values.categoryId ?? null, values.startDate, values.startTime ?? null, values.endTime ?? null,
      values.recurrence ? JSON.stringify(values.recurrence) : null, updatedAt, id);
    return { ...previous, ...values, updatedAt };
  }

  deleteActivity(id: string, scope: unknown, date: unknown): { deleted: string; scope: RoutineDeleteScope; date?: string } {
    const activity = this.getActivity(id);
    if (scope !== 'occurrence' && scope !== 'future' && scope !== 'series') throw new ApiError(400, 'Informe o escopo de exclusão da atividade.');
    if (scope === 'series') {
      db.prepare('DELETE FROM routine_activities WHERE id = ?').run(id);
      return { deleted: id, scope };
    }
    if (!isDate(date)) throw new ApiError(400, 'Informe a data da ocorrência no formato AAAA-MM-DD.');
    if (!occursOn(activity, date) || db.prepare('SELECT 1 FROM routine_exclusions WHERE activity_id = ? AND occurrence_date = ?').get(id, date)) {
      throw new ApiError(404, 'Ocorrência não encontrada.');
    }
    if (!activity.recurrence || (scope === 'future' && date === activity.startDate)) {
      db.prepare('DELETE FROM routine_activities WHERE id = ?').run(id);
    } else if (scope === 'occurrence') {
      db.prepare('INSERT INTO routine_exclusions (activity_id, occurrence_date) VALUES (?, ?)').run(id, date);
    } else {
      const previousDate = new Date(dateMs(date) - DAY_MS).toISOString().slice(0, 10);
      const recurrence = { ...activity.recurrence, endDate: previousDate };
      db.prepare('UPDATE routine_activities SET recurrence = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(recurrence), new Date().toISOString(), id);
    }
    return { deleted: id, scope, date };
  }

  private getActivity(id: string): RoutineActivity {
    const row = db.prepare('SELECT * FROM routine_activities WHERE id = ?').get(id) as ActivityRow | undefined;
    if (!row) throw new ApiError(404, 'Atividade não encontrada.');
    return activityFromRow(row);
  }
}
