import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { Todo, Repetition, Game } from '@dashylife/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = process.env.NODE_ENV === 'production' 
  ? process.env.DATA_DIR || path.join(__dirname, 'data')
  : path.join(__dirname, 'data');
const DB_PATH = path.join(dataDir, 'dashylife.sqlite');

mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = DELETE');
db.pragma('foreign_keys = ON');

export default db;

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    repetition_type TEXT,
    repetition_interval INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'nao-jogado',
    date TEXT,
    description TEXT,
    tags TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
  )
`);

export { db }
export function initDatabase() {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM todos');
  const { count } = stmt.get() as { count: number };
  if (count === 0) {
    console.log('Database initialized with empty todos table');
  } else {
    console.log(`Database loaded with ${count} todos`);
  }

  const columns = db.prepare("PRAGMA table_info(todos)").all() as { cid: number; name: string }[];
  const colNames = columns.map((c) => c.name);
  if (!colNames.includes('repetition_type')) {
    db.exec('ALTER TABLE todos ADD COLUMN repetition_type TEXT');
    db.exec('ALTER TABLE todos ADD COLUMN repetition_interval INTEGER');
    console.log('Migrated: added repetition columns');
  }
}

export function getAllTodos(): Todo[] {
  const stmt = db.prepare('SELECT * FROM todos ORDER BY created_at DESC');
  const rows = stmt.all() as Array<{
    id: string;
    title: string;
    description: string | null;
    completed: number;
    due_date: string | null;
    repetition_type: string | null;
    repetition_interval: number | null;
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    completed: row.completed === 1,
    dueDate: row.due_date || undefined,
    repetition: row.repetition_type && row.repetition_interval
      ? { type: row.repetition_type as 'hours' | 'days' | 'weeks', interval: row.repetition_interval }
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getTodoById(id: string): Todo | undefined {
  const stmt = db.prepare('SELECT * FROM todos WHERE id = ?');
  const row = stmt.get(id) as {
    id: string;
    title: string;
    description: string | null;
    completed: number;
    due_date: string | null;
    repetition_type: string | null;
    repetition_interval: number | null;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) return undefined;

  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    completed: row.completed === 1,
    dueDate: row.due_date || undefined,
    repetition: row.repetition_type && row.repetition_interval
      ? { type: row.repetition_type as 'hours' | 'days' | 'weeks', interval: row.repetition_interval }
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createTodo(todo: Omit<Todo, 'id'>): Todo {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const stmt = db.prepare(
    `INSERT INTO todos (id, title, description, completed, due_date, repetition_type, repetition_interval, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    id,
    todo.title,
    todo.description || null,
    todo.completed ? 1 : 0,
    todo.dueDate || null,
    todo.repetition?.type || null,
    todo.repetition?.interval || null,
    todo.createdAt || now,
    todo.updatedAt || now
  );
  return { ...todo, id, createdAt: todo.createdAt || now, updatedAt: todo.updatedAt || now };
}

export function updateTodo(id: string, updates: Partial<Pick<Todo, 'title' | 'description' | 'completed' | 'dueDate' | 'repetition'>>): Todo | undefined {
  const existing = getTodoById(id);
  if (!existing) return undefined;

  const setFields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) {
    setFields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    setFields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.completed !== undefined) {
    setFields.push('completed = ?');
    values.push(updates.completed ? 1 : 0);
  }
  if (updates.dueDate !== undefined) {
    setFields.push('due_date = ?');
    values.push(updates.dueDate);
  }
  if (updates.repetition !== undefined) {
    setFields.push('repetition_type = ?');
    values.push(updates.repetition.type || null);
    setFields.push('repetition_interval = ?');
    values.push(updates.repetition.interval || null);
  }

  setFields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  const stmt = db.prepare(`UPDATE todos SET ${setFields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  const updated = getTodoById(id);
  return updated;
}

export function deleteTodo(id: string): boolean {
  const stmt = db.prepare('DELETE FROM todos WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getAllGames(): Game[] {
  const stmt = db.prepare('SELECT * FROM games ORDER BY created_at DESC');
  const rows = stmt.all() as Array<{
    id: string;
    title: string;
    platform: string;
    status: string;
    date: string | null;
    description: string | null;
    tags: string;
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    platform: row.platform,
    status: row.status as Game['status'],
    date: row.date || undefined,
    description: row.description || undefined,
    tags: row.tags ? JSON.parse(row.tags) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getGameById(id: string): Game | undefined {
  const stmt = db.prepare('SELECT * FROM games WHERE id = ?');
  const row = stmt.get(id) as {
    id: string;
    title: string;
    platform: string;
    status: string;
    date: string | null;
    description: string | null;
    tags: string;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) return undefined;

  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    status: row.status as Game['status'],
    date: row.date || undefined,
    description: row.description || undefined,
    tags: row.tags ? JSON.parse(row.tags) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createGame(game: Omit<Game, 'id'>): Game {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const stmt = db.prepare(
    `INSERT INTO games (id, title, platform, status, date, description, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    id,
    game.title,
    game.platform,
    game.status,
    game.date || null,
    game.description || null,
    JSON.stringify(game.tags),
    game.createdAt || now,
    game.updatedAt || now
  );
  return { ...game, id, createdAt: game.createdAt || now, updatedAt: game.updatedAt || now };
}

export function updateGame(id: string, updates: Partial<Pick<Game, 'title' | 'platform' | 'status' | 'date' | 'description' | 'tags'>>): Game | undefined {
  const existing = getGameById(id);
  if (!existing) return undefined;

  const setFields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) {
    setFields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.platform !== undefined) {
    setFields.push('platform = ?');
    values.push(updates.platform);
  }
  if (updates.status !== undefined) {
    setFields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.date !== undefined) {
    setFields.push('date = ?');
    values.push(updates.date);
  }
  if (updates.description !== undefined) {
    setFields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.tags !== undefined) {
    setFields.push('tags = ?');
    values.push(JSON.stringify(updates.tags));
  }

  setFields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  const stmt = db.prepare(`UPDATE games SET ${setFields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  const updated = getGameById(id);
  return updated;
}

export function deleteGame(id: string): boolean {
  const stmt = db.prepare('DELETE FROM games WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export type AppSetting = { enabled: boolean; platforms: { name: string; visible: boolean }[] };

export function getSetting(key: string): AppSetting | undefined {
  const stmt = db.prepare('SELECT * FROM settings WHERE key = ?');
  const row = stmt.get(key) as { key: string; value: string; updated_at: string } | undefined;
  if (!row) return undefined;
  return JSON.parse(row.value);
}

export function upsertSetting(key: string, value: AppSetting): void {
  const now = new Date().toISOString();
  const existing = getSetting(key);
  if (existing) {
    const stmt = db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?');
    stmt.run(JSON.stringify(value), now, key);
  } else {
    const stmt = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
    stmt.run(key, JSON.stringify(value), now);
  }
}
