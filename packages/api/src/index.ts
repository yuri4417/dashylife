import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initDatabase, getSetting, upsertSetting } from './db.js';
import { TodoRepository } from './repositories/todo.repository.js';
import { GameRepository } from './repositories/game.repository.js';
import { Repetition, GameStatus } from '@dashylife/shared';

const app = Fastify();

app.register(cors, { origin: '*' });

initDatabase();

const todoRepo = new TodoRepository();
const gameRepo = new GameRepository();

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
