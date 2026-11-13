import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  addMcpActionLog,
  getMcpControlSettings,
  getSetting,
  initDatabase,
  listMcpActionLogs,
  saveMcpControlSettings,
  upsertSetting,
} from './db.js';
import { TodoRepository } from './repositories/todo.repository.js';
import { GameRepository } from './repositories/game.repository.js';
import { Repetition, GameStatus } from '@dashylife/shared';

const app = Fastify();

const adminKey = process.env.DASHYLIFE_ADMIN_KEY?.trim() || undefined;

app.register(cors, {
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Dashylife-Admin-Key'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
      return todoRepo.create(args as { title: string; description?: string; dueDate?: string; repetition?: Repetition });
    case 'update_todo': {
      const id = requireId(args.id);
      const { id: _id, ...update } = args;
      if (update.completed !== undefined && typeof update.completed === 'boolean') {
        const existing = todoRepo.findById(id);
        if (existing?.repetition) {
          const result = todoRepo.toggleWithRepetition(id);
          if (!result) throw new McpRequestError(404, 'Todo not found.');
          return { updated: result.updated, next: result.next };
        }
      }
      const updated = todoRepo.update(id, update as { title?: string; description?: string; completed?: boolean; dueDate?: string; repetition?: Repetition });
      if (!updated) throw new McpRequestError(404, 'Todo not found.');
      return updated;
    }
    case 'delete_todo': {
      const id = requireId(args.id);
      if (!todoRepo.delete(id)) throw new McpRequestError(404, 'Todo not found.');
      return { deleted: id };
    }
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
    status = caught instanceof McpRequestError ? caught.statusCode : 500;
    error = caught instanceof Error ? `${caught.name}: ${caught.message}`.slice(0, 500) : 'Unknown error';
    try {
      addMcpActionLog({ createdAt: new Date().toISOString(), tool, status, durationMs: Math.round(performance.now() - startedAt), error });
    } catch (logError) {
      app.log.error({ err: logError, tool }, 'Failed to persist MCP action log');
    }
    return reply.code(status).send({ error });
  }
});

function broadcast(message: object) {
  // Will implement with SSE later
}

app.get('/api/todos', async () => {
  return todoRepo.findAll();
});

app.post('/api/todos', async (request, reply) => {
  const body = request.body as { title: string; description?: string; dueDate?: string; repetition?: Repetition };
  const newTodo = todoRepo.create({
    title: body.title,
    description: body.description,
    dueDate: body.dueDate,
    repetition: body.repetition,
  });
  reply.code(201).send(newTodo);
});

app.put('/api/todos/:id', async (request, reply) => {
  const params = request.params as { id: string };
  const body = request.body as { title?: string; description?: string; completed?: boolean; dueDate?: string; repetition?: Repetition };

  if (body.completed !== undefined) {
    const existing = todoRepo.findById(params.id);
    if (existing && existing.repetition) {
      const result = todoRepo.toggleWithRepetition(params.id);
      if (!result) {
        reply.code(404).send({ error: 'Todo not found' });
        return;
      }
      reply.send({ updated: result.updated, next: result.next });
      return;
    }
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

app.get('/api/settings', async () => {
  const setting = getSetting('gamelist-settings');
  if (!setting) {
    const defaults = { enabled: true, platforms: [{ name: 'EA App', visible: true }, { name: 'Epic Games', visible: true }, { name: 'GOG', visible: true }, { name: 'Steam', visible: true }, { name: 'Ubisoft Connect', visible: true }] };
    upsertSetting('gamelist-settings', defaults);
    return defaults;
  }
  return setting;
});

app.put('/api/settings', async (request, reply) => {
  const body = request.body as { enabled: boolean; platforms: { name: string; visible: boolean }[] };
  upsertSetting('gamelist-settings', body);
  reply.send(body);
});

app.listen({ port: 3000, host: '0.0.0.0' }, () => {
  console.log('API running on http://localhost:3000');
});
