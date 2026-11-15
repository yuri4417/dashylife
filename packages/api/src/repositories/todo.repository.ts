import type { CreateTodoInput, Repetition, Todo, TodoCompletionResult, UpdateTodoInput } from '@dashylife/shared';
import {
  getAllTodos,
  getTodoById,
  createTodo as dbCreateTodo,
  updateTodo as dbUpdateTodo,
  deleteTodo as dbDeleteTodo,
  db,
} from '../db.js';

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
    const now = new Date().toISOString();
    const todo: Omit<Todo, 'id'> = {
      title: input.title,
      description: input.description,
      completed: false,
      dueDate: input.dueDate,
      repetition: input.repetition,
      createdAt: now,
      updatedAt: now,
    };
    return dbCreateTodo(todo);
  }

  update(id: string, input: TodoUpdate): Todo | TodoCompletionResult | undefined {
    return input.completed === undefined ? dbUpdateTodo(id, input) : updateCompletion(id, input);
  }

  delete(id: string): boolean {
    return dbDeleteTodo(id);
  }

}
