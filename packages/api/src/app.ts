import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  addMcpActionLog,
  db,
  getMcpControlSettings,
  getSetting,
  initDatabase,
  listMcpActionLogs,
  saveMcpControlSettings,
  upsertSetting,
} from './db.js';
import { TodoRepository } from './repositories/todo.repository.js';
import { GameRepository } from './repositories/game.repository.js';
import { RoutineRepository } from './repositories/routine.repository.js';
import { ApiError } from './validation.js';
import type { AppSettings, CreateTodoInput, GameListSettings, GameStatus, TodoListSettings, UpdateTodoInput } from '@dashylife/shared';

export const app = Fastify();

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ApiError) return reply.code(error.statusCode).send({ error: error.message });
  reply.send(error);
});

const adminKey = process.env.DASHYLIFE_ADMIN_KEY?.trim() || undefined;

app.register(cors, {
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Dashylife-Admin-Key'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

function secureEqual(left: string | undefined, right: string | undefined): boolean {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

async function requireAdminKey(request: FastifyRequest, reply: FastifyReply) {
  if (!adminKey) {
    return reply.code(503).send({ error: 'DASHYLIFE_ADMIN_KEY is not configured on the server.' });
  }
  const headerValue = request.headers['x-dashylife-admin-key'];
  const suppliedAdminKey = Array.isArray(headerValue) ? undefined : headerValue;
  if (!secureEqual(suppliedAdminKey, adminKey)) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}

app.addHook('onRequest', async (request, reply) => {
  if (!request.url.startsWith('/api/mcp/')) return;
  const settings = getMcpControlSettings();
  if (!settings.enabled) return reply.code(503).send({ error: 'DashyLife MCP is disabled.' });

  const authorization = request.headers.authorization;
  const suppliedKey = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : undefined;
  if (!settings.apiKeyHash || !suppliedKey || !secureEqual(hashApiKey(suppliedKey), settings.apiKeyHash)) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
});

initDatabase();

const todoRepo = new TodoRepository();
const gameRepo = new GameRepository();
const routineRepo = new RoutineRepository();

class McpRequestError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'McpRequestError';
  }
}

function requireId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new McpRequestError(400, 'A non-empty id is required.');
  return value;
}

function executeMcpTool(tool: string, rawArgs: unknown): unknown {
  const args = (rawArgs && typeof rawArgs === 'object' ? rawArgs : {}) as Record<string, unknown>;
  switch (tool) {
    case 'list_todos':
      return todoRepo.findAll();
    case 'create_todo':
      if (typeof args.title !== 'string' || !args.title.trim()) throw new McpRequestError(400, 'A non-empty title is required.');
      return todoRepo.create(args as unknown as CreateTodoInput);
    case 'update_todo': {
      const id = requireId(args.id);
      const { id: _id, ...update } = args;
      if (update.completed !== undefined && typeof update.completed !== 'boolean') {
        throw new McpRequestError(400, 'Completed must be a boolean.');
      }
      const updated = todoRepo.update(id, update as Omit<UpdateTodoInput, 'id'>);
      if (!updated) throw new McpRequestError(404, 'Todo not found.');
      return updated;
    }
    case 'delete_todo': {
      const id = requireId(args.id);
      if (!todoRepo.delete(id)) throw new McpRequestError(404, 'Todo not found.');
      return { deleted: id };
    }
    case 'list_routine_categories':
      return routineRepo.listCategories();
    case 'create_routine_category':
      return routineRepo.createCategory(args);
    case 'update_routine_category': {
      const { id: rawId, ...update } = args;
      return routineRepo.updateCategory(requireId(rawId), update);
    }
    case 'delete_routine_category':
      return routineRepo.deleteCategory(requireId(args.id));
    case 'list_routine_activities':
      return routineRepo.listActivities(args.start, args.end);
    case 'create_routine_activity':
      return routineRepo.createActivity(args);
    case 'update_routine_activity': {
      const { id: rawId, ...update } = args;
      return routineRepo.updateActivity(requireId(rawId), update);
    }
    case 'delete_routine_activity':
      return routineRepo.deleteActivity(requireId(args.id), args.scope, args.date);
    case 'list_games':
      return gameRepo.findAll();
    case 'create_game': {
      if (typeof args.title !== 'string' || !args.title.trim()) throw new McpRequestError(400, 'A non-empty title is required.');
      if (typeof args.platform !== 'string' || !args.platform.trim()) throw new McpRequestError(400, 'A non-empty platform is required.');
      if (!['nao-jogado', 'jogando', 'zerado', 'droppado'].includes(String(args.status))) throw new McpRequestError(400, 'Invalid game status.');
      const now = new Date().toISOString();
      return gameRepo.create({
        title: args.title,
        platform: args.platform,
        status: args.status as GameStatus,
        date: args.date as string | undefined,
        description: args.description as string | undefined,
        tags: (args.tags as string[] | undefined) || [],
        createdAt: now,
        updatedAt: now,
      });
    }
    case 'update_game': {
      const id = requireId(args.id);
      const { id: _id, ...update } = args;
      if (update.status !== undefined && !['nao-jogado', 'jogando', 'zerado', 'droppado'].includes(String(update.status))) {
        throw new McpRequestError(400, 'Invalid game status.');
      }
      const updated = gameRepo.update(id, update as Partial<Pick<import('@dashylife/shared').Game, 'title' | 'platform' | 'status' | 'date' | 'description' | 'tags'>>);
      if (!updated) throw new McpRequestError(404, 'Game not found.');
      return updated;
    }
    case 'delete_game': {
      const id = requireId(args.id);
      if (!gameRepo.delete(id)) throw new McpRequestError(404, 'Game not found.');
      return { deleted: id };
    }
    default:
      throw new McpRequestError(404, 'Unknown MCP tool.');
  }
}

app.get('/api/admin/mcp', { preHandler: requireAdminKey }, async () => {
  return { enabled: getMcpControlSettings().enabled };
});

app.post('/api/admin/mcp/activate', { preHandler: requireAdminKey }, async (_request, reply) => {
  const current = getMcpControlSettings();
  if (current.enabled) return reply.code(409).send({ error: 'MCP is already active. Rotate its key instead.' });
  const apiKey = randomBytes(32).toString('base64url');
  saveMcpControlSettings({ enabled: true, apiKeyHash: hashApiKey(apiKey) });
  return { enabled: true, apiKey };
});

app.post('/api/admin/mcp/rotate-key', { preHandler: requireAdminKey }, async (_request, reply) => {
  const current = getMcpControlSettings();
  if (!current.enabled) return reply.code(409).send({ error: 'Activate MCP before rotating its key.' });
  const apiKey = randomBytes(32).toString('base64url');
  saveMcpControlSettings({ enabled: true, apiKeyHash: hashApiKey(apiKey) });
  return { enabled: true, apiKey };
});

app.post('/api/admin/mcp/deactivate', { preHandler: requireAdminKey }, async (_request, reply) => {
  saveMcpControlSettings({ enabled: false, apiKeyHash: null });
  reply.send({ enabled: false });
});

app.get('/api/admin/mcp/logs', { preHandler: requireAdminKey }, async (request) => {
  const query = request.query as { limit?: string; offset?: string };
  const limit = Math.min(Math.max(Number.parseInt(query.limit || '25', 10) || 25, 1), 100);
  const offset = Math.max(Number.parseInt(query.offset || '0', 10) || 0, 0);
  return { ...listMcpActionLogs(limit, offset), limit, offset };
});

app.post('/api/mcp/tools/:tool', async (request, reply) => {
  const { tool } = request.params as { tool: string };
  const startedAt = performance.now();
  let status = 200;
  let error: string | null = null;
  try {
    const result = executeMcpTool(tool, request.body);
    try {
      addMcpActionLog({ createdAt: new Date().toISOString(), tool, status, durationMs: Math.round(performance.now() - startedAt), error });
    } catch (logError) {
      console.error(JSON.stringify({ event: 'mcp_action_log_error', tool, error: logError instanceof Error ? logError.message : 'Unknown error' }));
    }
    return result;
  } catch (caught) {
    status = caught instanceof McpRequestError || caught instanceof ApiError ? caught.statusCode : 500;
    error = caught instanceof Error ? `${caught.name}: ${caught.message}`.slice(0, 500) : 'Unknown error';
    try {
      addMcpActionLog({ createdAt: new Date().toISOString(), tool, status, durationMs: Math.round(performance.now() - startedAt), error });
    } catch (logError) {
      app.log.error({ err: logError, tool }, 'Failed to persist MCP action log');
    }
    return reply.code(status).send({ error });
  }
});

app.get('/api/todos', async () => {
  return todoRepo.findAll();
});

app.post('/api/todos', async (request, reply) => {
  const body = request.body as CreateTodoInput;
  const newTodo = todoRepo.create({
    title: body.title,
    description: body.description,
    dueDate: body.dueDate,
    startTime: body.startTime,
    endTime: body.endTime,
    repetition: body.repetition,
  });
  reply.code(201).send(newTodo);
});

app.put<{ Params: { id: string }; Body: Omit<UpdateTodoInput, 'id'> }>('/api/todos/:id', async (request, reply) => {
  const { body, params } = request;
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || (body.completed !== undefined && typeof body.completed !== 'boolean')) {
    return reply.code(400).send({ error: 'Invalid todo update' });
  }

  const updated = todoRepo.update(params.id, body);
  if (!updated) {
    reply.code(404).send({ error: 'Todo not found' });
    return;
  }
  reply.send(updated);
});

app.delete('/api/todos/:id', async (request, reply) => {
  const id = request.params as { id: string };
  const deleted = todoRepo.delete(id.id);
  if (!deleted) {
    reply.code(404).send({ error: 'Todo not found' });
    return;
  }
  reply.send({ deleted: id.id });
});

app.get('/api/games', async () => {
  return gameRepo.findAll();
});

app.post('/api/games', async (request, reply) => {
  const body = request.body as { title: string; platform: string; status: string; date?: string; description?: string; tags?: string[] };
  const now = new Date().toISOString();
  const newGame = gameRepo.create({
    title: body.title,
    platform: body.platform,
    status: body.status as GameStatus,
    date: body.date,
    description: body.description,
    tags: body.tags || [],
    createdAt: now,
    updatedAt: now,
  });
  reply.code(201).send(newGame);
});

function hasImportRequestId(value: unknown): value is { requestId: string; game?: unknown } {
  if (!value || typeof value !== 'object' || !('requestId' in value)) return false;
  return typeof value.requestId === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(value.requestId);
}

app.post('/api/games/import', async (request, reply) => {
  const items: unknown = request.body;
  if (!Array.isArray(items) || items.length === 0 || items.length > 100 || !items.every(hasImportRequestId)) {
    return reply.code(400).send({ error: 'Envie de 1 a 100 itens com um identificador de importação válido.' });
  }
  return { results: gameRepo.importBatch(items) };
});

app.put('/api/games/:id', async (request, reply) => {
  const params = request.params as { id: string };
  const body = request.body as { title?: string; platform?: string; status?: string; date?: string; description?: string; tags?: string[] };
  const updateData: Partial<Pick<import('@dashylife/shared').Game, 'title' | 'platform' | 'status' | 'date' | 'description' | 'tags'>> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.platform !== undefined) updateData.platform = body.platform;
  if (body.status !== undefined) updateData.status = body.status as GameStatus;
  if (body.date !== undefined) updateData.date = body.date;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.tags !== undefined) updateData.tags = body.tags;
  const updated = gameRepo.update(params.id, updateData);
  if (!updated) {
    reply.code(404).send({ error: 'Game not found' });
    return;
  }
  reply.send(updated);
});

app.delete('/api/games/:id', async (request, reply) => {
  const id = request.params as { id: string };
  const deleted = gameRepo.delete(id.id);
  if (!deleted) {
    reply.code(404).send({ error: 'Game not found' });
    return;
  }
  reply.send({ deleted: id.id });
});

const DEFAULT_GAME_SETTINGS: GameListSettings = {
  enabled: true,
  platforms: ['EA App', 'Epic Games', 'GOG', 'Steam', 'Ubisoft Connect'].map((name) => ({ name, visible: true })),
};

function isTodoListSettings(value: unknown): value is TodoListSettings {
  return !!value && typeof value === 'object' && 'enabled' in value && typeof value.enabled === 'boolean';
}

function isGameListSettings(value: unknown): value is GameListSettings {
  return isTodoListSettings(value) && 'platforms' in value && Array.isArray(value.platforms)
    && value.platforms.every((platform) => platform && typeof platform.name === 'string' && typeof platform.visible === 'boolean');
}

function readGameListSettings(): GameListSettings {
  return getSetting<GameListSettings>('gamelist-settings') ?? DEFAULT_GAME_SETTINGS;
}

function readAppSettings(): AppSettings {
  return {
    gamelist: readGameListSettings(),
    todolist: getSetting<TodoListSettings>('todolist-settings') ?? { enabled: true },
    routine: getSetting<TodoListSettings>('routine-settings') ?? { enabled: true },
  };
}

const saveAppSettings = db.transaction(({ gamelist, todolist, routine }: Partial<AppSettings>) => {
  if (gamelist) upsertSetting('gamelist-settings', gamelist);
  if (todolist) upsertSetting('todolist-settings', todolist);
  if (routine) upsertSetting('routine-settings', routine);
  return readAppSettings();
});

app.get('/api/settings', async () => readGameListSettings());

app.put('/api/settings', async (request, reply) => {
  const { body } = request;
  if (!isGameListSettings(body)) return reply.code(400).send({ error: 'Configuração da GameList inválida.' });
  upsertSetting('gamelist-settings', body);
  reply.send(body);
});

app.get('/api/app-settings', async () => readAppSettings());

app.patch<{ Body: Partial<AppSettings> }>('/api/app-settings', async ({ body }, reply) => {
  if (!body || (body.gamelist === undefined && body.todolist === undefined && body.routine === undefined)
    || (body.gamelist !== undefined && !isGameListSettings(body.gamelist))
    || (body.todolist !== undefined && !isTodoListSettings(body.todolist))
    || (body.routine !== undefined && !isTodoListSettings(body.routine))) {
    return reply.code(400).send({ error: 'Configuração de módulo inválida.' });
  }
  return saveAppSettings(body);
});


app.get('/api/routine/categories', async () => routineRepo.listCategories());

app.post('/api/routine/categories', async (request, reply) => {
  return reply.code(201).send(routineRepo.createCategory(request.body));
});

app.put<{ Params: { id: string } }>('/api/routine/categories/:id', async ({ params, body }) => {
  return routineRepo.updateCategory(params.id, body);
});

app.delete<{ Params: { id: string } }>('/api/routine/categories/:id', async ({ params }) => {
  return routineRepo.deleteCategory(params.id);
});

app.get<{ Querystring: { start?: string; end?: string } }>('/api/routine/activities', async ({ query }) => {
  return routineRepo.listActivities(query.start, query.end);
});

app.post('/api/routine/activities', async (request, reply) => {
  return reply.code(201).send(routineRepo.createActivity(request.body));
});

app.put<{ Params: { id: string } }>('/api/routine/activities/:id', async ({ params, body }) => {
  return routineRepo.updateActivity(params.id, body);
});

app.delete<{ Params: { id: string }; Querystring: { scope?: string; date?: string } }>(
  '/api/routine/activities/:id', async ({ params, query }) => routineRepo.deleteActivity(params.id, query.scope, query.date),
);
