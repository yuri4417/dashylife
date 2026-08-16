import { Todo, Repetition } from '@dashylife/shared';
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

export class TodoRepository {
  findAll(): Todo[] {
    return getAllTodos();
  }

  findById(id: string): Todo | undefined {
    return getTodoById(id);
  }

  create(input: { title: string; description?: string; dueDate?: string; repetition?: Repetition }): Todo {
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

  update(id: string, input: { title?: string; description?: string; completed?: boolean; dueDate?: string; repetition?: Repetition }): Todo | undefined {
    return dbUpdateTodo(id, input);
  }

  delete(id: string): boolean {
    return dbDeleteTodo(id);
  }

  toggleWithRepetition(id: string): { updated: Todo; next?: Todo } | undefined {
    const existing = getTodoById(id);
    if (!existing) return undefined;

    const updated = dbUpdateTodo(id, { completed: !existing.completed });
    if (!updated) return undefined;

    let nextTodo: Todo | undefined;

    if (updated.completed && existing.repetition && existing.dueDate) {
      const nextDueDate = calculateNextDueDate(existing.dueDate, existing.repetition);
      const now = new Date().toISOString();
      const nextId = crypto.randomUUID();

      const stmt = db.prepare(
        `INSERT INTO todos (id, title, description, completed, due_date, repetition_type, repetition_interval, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      stmt.run(
        nextId,
        existing.title,
        existing.description || null,
        0,
        nextDueDate,
        existing.repetition.type || null,
        existing.repetition.interval || null,
        now,
        now
      );

      nextTodo = {
        id: nextId,
        title: existing.title,
        description: existing.description || undefined,
        completed: false,
        dueDate: nextDueDate,
        repetition: existing.repetition,
        createdAt: now,
        updatedAt: now,
      };
    }

    return { updated, next: nextTodo };
  }
}
