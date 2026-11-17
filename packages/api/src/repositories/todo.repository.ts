import type { CreateTodoInput, Repetition, Todo, TodoCompletionResult, UpdateTodoInput } from '@dashylife/shared';
import {
  getAllTodos,
  getTodoById,
  createTodo as dbCreateTodo,
  updateTodo as dbUpdateTodo,
  deleteTodo as dbDeleteTodo,
  db,
} from '../db.js';
import { ApiError, validateTimeRange } from '../validation.js';

function calculateNextDueDate(dueDate: string, repetition: Repetition): string {
  const current = new Date(dueDate);
  const { type, interval } = repetition;

  if (type === 'hours') {
    current.setHours(current.getHours() + interval);
  } else if (type === 'days') {
    current.setDate(current.getDate() + interval);
  } else if (type === 'weeks' && repetition.weekdays?.length) {
    const today = current.getUTCDay();
    const weekdays = [...new Set(repetition.weekdays)].sort((a, b) => a - b);
    const later = weekdays.find(day => day > today);
    current.setUTCDate(current.getUTCDate() + (later === undefined ? interval * 7 - today + weekdays[0] : later - today));
  } else if (type === 'weeks') {
    current.setDate(current.getDate() + interval * 7);
  }

  return current.toISOString();
}

function validateRepetition(value: Repetition | null | undefined): void {
  if (value === undefined || value === null) return;
  if (typeof value !== 'object' || !['hours', 'days', 'weeks'].includes(value.type) || !Number.isSafeInteger(value.interval) || value.interval < 1) {
    throw new ApiError(400, 'Informe uma repetição e um intervalo válidos.');
  }
  if (value.weekdays !== undefined && (value.type !== 'weeks' || !Array.isArray(value.weekdays) || value.weekdays.length === 0 || value.weekdays.length > 7 || !value.weekdays.every(day => Number.isInteger(day) && day >= 0 && day <= 6) || new Set(value.weekdays).size !== value.weekdays.length)) {
    throw new ApiError(400, 'Selecione dias da semana válidos e sem duplicação para a repetição semanal.');
  }
}

function validateWeeklyDate(repetition: Repetition | null | undefined, dueDate: string | undefined): void {
  if (!repetition?.weekdays?.length) return;
  const date = typeof dueDate === 'string' ? dueDate.slice(0, 10) : '';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00.000Z`) : new Date(NaN);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || !Number.isFinite(new Date(dueDate!).getTime())) {
    throw new ApiError(400, 'Informe uma data válida para a tarefa com dias da semana selecionados.');
  }
}

type TodoUpdate = Omit<UpdateTodoInput, 'id'>;

const updateCompletion = db.transaction((id: string, { completed, ...changes }: TodoUpdate): Todo | TodoCompletionResult | undefined => {
  const current = getTodoById(id);
  if (!current) return undefined;

  const hasChanges = Object.values(changes).some((value) => value !== undefined);
  const updated = current.completed === completed && !hasChanges
    ? current
    : dbUpdateTodo(id, { ...changes, completed });
  if (!updated) return undefined;

  if (!current.repetition && !updated.repetition) return updated;
  if (current.completed || !updated.completed || !updated.repetition || !updated.dueDate) {
    return { updated };
  }

  const now = new Date().toISOString();
  const next = dbCreateTodo({
    title: updated.title,
    description: updated.description,
    completed: false,
    dueDate: calculateNextDueDate(updated.dueDate, updated.repetition),
    startTime: updated.startTime,
    endTime: updated.endTime,
    repetition: updated.repetition,
    createdAt: now,
    updatedAt: now,
  });
  return { updated, next };
});

export class TodoRepository {
  findAll(): Todo[] {
    return getAllTodos();
  }

  create(input: CreateTodoInput): Todo {
    validateTimeRange(input.startTime, input.endTime);
    validateRepetition(input.repetition);
    validateWeeklyDate(input.repetition, input.dueDate);
    const now = new Date().toISOString();
    const todo: Omit<Todo, 'id'> = {
      title: input.title,
      description: input.description,
      completed: false,
      dueDate: input.dueDate,
      startTime: input.startTime ?? undefined,
      endTime: input.endTime ?? undefined,
      repetition: input.repetition,
      createdAt: now,
      updatedAt: now,
    };
    return dbCreateTodo(todo);
  }

  update(id: string, input: TodoUpdate): Todo | TodoCompletionResult | undefined {
    const current = getTodoById(id);
    if (!current) return undefined;
    validateRepetition(input.repetition);
    validateWeeklyDate(input.repetition === undefined ? current.repetition : input.repetition, input.dueDate === undefined ? current.dueDate : input.dueDate);
    validateTimeRange(input.startTime === undefined ? current.startTime : input.startTime,
      input.endTime === undefined ? current.endTime : input.endTime);
    return input.completed === undefined ? dbUpdateTodo(id, input) : updateCompletion(id, input);
  }

  delete(id: string): boolean {
    return dbDeleteTodo(id);
  }

}
