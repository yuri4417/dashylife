import type { CreateTodoInput, Repetition, Todo, TodoCompletionResult, UpdateTodoInput } from '@dashylife/shared';
import {
  getAllTodos,
  getTodoById,
  createTodo as dbCreateTodo,
  updateTodo as dbUpdateTodo,
  deleteTodo as dbDeleteTodo,
  db,
} from '../db.js';
import { validateTimeRange } from '../validation.js';

function calculateNextDueDate(dueDate: string, repetition: Repetition): string {
  const current = new Date(dueDate);
  const { type, interval } = repetition;

  if (type === 'hours') {
    current.setHours(current.getHours() + interval);
  } else if (type === 'days') {
    current.setDate(current.getDate() + interval);
  } else if (type === 'weeks') {
    current.setDate(current.getDate() + interval * 7);
  }

  return current.toISOString();
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
    validateTimeRange(input.startTime === undefined ? current.startTime : input.startTime,
      input.endTime === undefined ? current.endTime : input.endTime);
    return input.completed === undefined ? dbUpdateTodo(id, input) : updateCompletion(id, input);
  }

  delete(id: string): boolean {
    return dbDeleteTodo(id);
  }

}
