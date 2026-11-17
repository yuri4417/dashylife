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
    start_time TEXT,
    end_time TEXT,
    repetition_type TEXT,
    repetition_interval INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS routine_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS routine_activities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category_id TEXT REFERENCES routine_categories(id) ON DELETE SET NULL,
    start_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    recurrence TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS routine_exclusions (
    activity_id TEXT NOT NULL REFERENCES routine_activities(id) ON DELETE CASCADE,
    occurrence_date TEXT NOT NULL,
    PRIMARY KEY (activity_id, occurrence_date)
  );
  CREATE INDEX IF NOT EXISTS routine_activity_dates ON routine_activities(start_date);
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
  CREATE TABLE IF NOT EXISTS game_import_items (
    request_id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS mcp_action_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    tool TEXT NOT NULL,
    status INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    error TEXT
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
  if (!colNames.includes('repetition_type')) db.exec('ALTER TABLE todos ADD COLUMN repetition_type TEXT');
  if (!colNames.includes('repetition_interval')) db.exec('ALTER TABLE todos ADD COLUMN repetition_interval INTEGER');
  if (!colNames.includes('start_time')) db.exec('ALTER TABLE todos ADD COLUMN start_time TEXT');
  if (!colNames.includes('end_time')) db.exec('ALTER TABLE todos ADD COLUMN end_time TEXT');
}

export function getAllTodos(): Todo[] {
  const stmt = db.prepare('SELECT * FROM todos ORDER BY created_at DESC');
  const rows = stmt.all() as Array<{
    id: string;
    title: string;
    description: string | null;
    completed: number;
    due_date: string | null;
    start_time: string | null;
    end_time: string | null;
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
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
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
    start_time: string | null;
    end_time: string | null;
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
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
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
    `INSERT INTO todos (id, title, description, completed, due_date, start_time, end_time, repetition_type, repetition_interval, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    id,
    todo.title,
    todo.description || null,
    todo.completed ? 1 : 0,
    todo.dueDate || null,
    todo.startTime || null,
    todo.endTime || null,
    todo.repetition?.type || null,
    todo.repetition?.interval || null,
    todo.createdAt || now,
    todo.updatedAt || now
  );
  return { ...todo, id, createdAt: todo.createdAt || now, updatedAt: todo.updatedAt || now };
}

export function updateTodo(id: string, updates: Partial<Pick<Todo, 'title' | 'description' | 'completed' | 'dueDate' | 'repetition'>> & { startTime?: string | null; endTime?: string | null }): Todo | undefined {
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
  if (updates.startTime !== undefined) {
    setFields.push('start_time = ?');
    values.push(updates.startTime);
  }
  if (updates.endTime !== undefined) {
    setFields.push('end_time = ?');
    values.push(updates.endTime);
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

const getImportReceipt = db.prepare('SELECT game_id FROM game_import_items WHERE request_id = ?');
const saveImportReceipt = db.prepare('INSERT INTO game_import_items (request_id, game_id) VALUES (?, ?)');

export const createImportedGame = db.transaction((requestId: string, game: Omit<Game, 'id'>): string => {
  const receipt = getImportReceipt.get(requestId) as { game_id: string } | undefined;
  if (receipt) return receipt.game_id;

  const created = createGame(game);
  saveImportReceipt.run(requestId, created.id);
  return created.id;
});

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

export function getSetting<T>(key: string): T | undefined {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get(key) as { value: string } | undefined;
  if (!row) return undefined;
  return JSON.parse(row.value);
}

export function upsertSetting(key: string, value: unknown): void {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value), new Date().toISOString());
}

export interface McpControlSettings {
  enabled: boolean;
  apiKeyHash: string | null;
}

export interface McpActionLog {
  id: number;
  createdAt: string;
  tool: string;
  status: number;
  durationMs: number;
  error: string | null;
}

export function getMcpControlSettings(): McpControlSettings {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get('mcp-control') as { value: string } | undefined;
  if (!row) return { enabled: false, apiKeyHash: null };
  const parsed = JSON.parse(row.value) as Partial<McpControlSettings>;
  return { enabled: parsed.enabled === true, apiKeyHash: parsed.apiKeyHash || null };
}

export function saveMcpControlSettings(value: McpControlSettings): void {
  upsertSetting('mcp-control', value);
}

const insertMcpActionLog = db.prepare(
  'INSERT INTO mcp_action_logs (created_at, tool, status, duration_ms, error) VALUES (?, ?, ?, ?, ?)'
);
const pruneMcpActionLogs = db.prepare(`
  DELETE FROM mcp_action_logs
  WHERE id < (SELECT id FROM mcp_action_logs ORDER BY id DESC LIMIT 1 OFFSET 9999)
`);

export const addMcpActionLog = db.transaction((entry: Omit<McpActionLog, 'id'>) => {
  insertMcpActionLog.run(entry.createdAt, entry.tool, entry.status, entry.durationMs, entry.error);
  pruneMcpActionLogs.run();
});

export function listMcpActionLogs(limit: number, offset: number): { items: McpActionLog[]; total: number } {
  const count = db.prepare('SELECT COUNT(*) AS total FROM mcp_action_logs').get() as { total: number };
  const rows = db.prepare(
    'SELECT id, created_at, tool, status, duration_ms, error FROM mcp_action_logs ORDER BY id DESC LIMIT ? OFFSET ?'
  ).all(limit, offset) as Array<{
    id: number;
    created_at: string;
    tool: string;
    status: number;
    duration_ms: number;
    error: string | null;
  }>;
  return {
    total: count.total,
    items: rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      tool: row.tool,
      status: row.status,
      durationMs: row.duration_ms,
      error: row.error,
    })),
  };
}
