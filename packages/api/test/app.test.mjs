import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

const dataDir = mkdtempSync(join(tmpdir(), 'dashylife-test-'));
const adminKey = 'temporary-test-admin-key';
process.env.NODE_ENV = 'production';
process.env.DATA_DIR = dataDir;
process.env.DASHYLIFE_ADMIN_KEY = adminKey;
process.env.TZ = 'UTC';

const { app } = await import('../dist/app.js');
const { addMcpActionLog, db, listMcpActionLogs } = await import('../dist/db.js');
let mcpKey;

before(async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/admin/mcp/activate',
    headers: { 'x-dashylife-admin-key': adminKey },
  });
  assert.equal(response.statusCode, 200);
  mcpKey = response.json().apiKey;
});

after(async () => {
  await app.close();
  db.close();
  rmSync(dataDir, { recursive: true, force: true });
});

async function createRecurringTodo(title) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/todos',
    payload: { title, dueDate: '2026-11-15', repetition: { type: 'days', interval: 2 } },
  });
  assert.equal(response.statusCode, 201);
  return response.json();
}

function updateViaWeb(id, update) {
  return app.inject({ method: 'PUT', url: `/api/todos/${id}`, payload: update });
}

function updateViaMcp(id, update) {
  return app.inject({
    method: 'POST',
    url: '/api/mcp/tools/update_todo',
    headers: { authorization: `Bearer ${mcpKey}` },
    payload: { id, ...update },
  });
}

test('web and MCP use the same idempotent completion, in either order', async () => {
  for (const [first, retry] of [[updateViaWeb, updateViaMcp], [updateViaMcp, updateViaWeb]]) {
    const todo = await createRecurringTodo(`Recurring via ${first.name}`);
    const unchanged = await retry(todo.id, { completed: false });
    assert.equal(unchanged.statusCode, 200);
    assert.equal(unchanged.json().updated.completed, false);
    assert.equal(unchanged.json().next, undefined);

    const completed = await first(todo.id, { completed: true });
    assert.equal(completed.statusCode, 200);
    assert.equal(completed.json().updated.completed, true);
    assert.equal(completed.json().next.completed, false);
    assert.equal(completed.json().next.dueDate, '2026-11-17T00:00:00.000Z');

    const repeated = await retry(todo.id, { completed: true });
    assert.equal(repeated.statusCode, 200);
    assert.deepEqual(repeated.json(), { updated: completed.json().updated });
    const list = await app.inject('/api/todos');
    assert.deepEqual(
      list.json().filter((item) => item.title === todo.title).map((item) => item.id).sort(),
      [todo.id, completed.json().next.id].sort(),
    );
  }
});

test('a recurrence write failure rolls back completion', async () => {
  const todo = await createRecurringTodo('Rollback test');
  db.exec(`
    CREATE TEMP TRIGGER reject_next_todo BEFORE INSERT ON todos
    WHEN NEW.title = 'Rollback test' BEGIN SELECT RAISE(ABORT, 'test failure'); END;
  `);
  try {
    const response = await updateViaWeb(todo.id, { completed: true });
    assert.equal(response.statusCode, 500);
    const list = await app.inject('/api/todos');
    assert.deepEqual(list.json().filter((item) => item.title === todo.title), [todo]);
  } finally {
    db.exec('DROP TRIGGER reject_next_todo');
  }
});

test('completing an ordinary task preserves its record and deletion remains available', async () => {
  const created = await app.inject({ method: 'POST', url: '/api/todos', payload: { title: 'Ordinary' } });
  assert.equal(created.statusCode, 201);
  const { id } = created.json();

  const completed = await updateViaWeb(id, { completed: true });
  assert.equal(completed.statusCode, 200);
  assert.equal(completed.json().completed, true);
  assert.equal(completed.json().id, id);

  const removed = await app.inject({ method: 'DELETE', url: `/api/todos/${id}` });
  assert.equal(removed.statusCode, 200);
  assert.equal((await app.inject('/api/todos')).json().some((todo) => todo.id === id), false);
});

test('partial batch imports report each result and retries reuse the original game', async () => {
  const game = { title: 'Imported game', platform: 'Steam', status: 'nao-jogado' };
  const importItems = (payload) => app.inject({ method: 'POST', url: '/api/games/import', payload });
  const first = await importItems([{ requestId: 'valid-row', game }, { requestId: 'invalid-row', game: null }]);
  assert.equal(first.statusCode, 200);
  const [valid, invalid] = first.json().results;
  assert.ok(valid.gameId);
  assert.ok(invalid.error);

  const retried = await importItems([{ requestId: 'valid-row', game }, { requestId: 'invalid-row', game }]);
  assert.equal(retried.statusCode, 200);
  assert.deepEqual(retried.json().results[0], valid);
  assert.notEqual(retried.json().results[1].gameId, valid.gameId);

  const games = (await app.inject('/api/games')).json();
  assert.equal(games.filter((item) => item.title === game.title).length, 2);
});

test('persisted legacy GameList settings load alongside independent Tarefas settings', async () => {
  const gamelist = { enabled: false, platforms: [{ name: 'Custom launcher', visible: false }] };
  const legacy = await app.inject({ method: 'PUT', url: '/api/settings', payload: gamelist });
  assert.equal(legacy.statusCode, 200);
  assert.deepEqual((await app.inject('/api/app-settings')).json(), { gamelist, todolist: { enabled: true } });

  const todolist = { enabled: false };
  const saved = await app.inject({ method: 'PATCH', url: '/api/app-settings', payload: { todolist } });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(saved.json(), { gamelist, todolist });
  assert.deepEqual((await app.inject('/api/app-settings')).json(), { gamelist, todolist });
  assert.deepEqual((await app.inject('/api/settings')).json(), gamelist);
});

test('MCP log retention keeps the newest 10,000 rows across gaps in IDs', () => {
  db.exec(`
    DELETE FROM mcp_action_logs;
    WITH RECURSIVE seq(id) AS (
      SELECT 2 UNION ALL SELECT id + 2 FROM seq WHERE id < 20000
    )
    INSERT INTO mcp_action_logs (id, created_at, tool, status, duration_ms)
    SELECT id, '2026-11-15', 'list_todos', 200, 0 FROM seq;
  `);
  addMcpActionLog({ createdAt: '2026-11-16', tool: 'list_games', status: 200, durationMs: 1, error: null });
  assert.equal(listMcpActionLogs(1, 0).items[0].tool, 'list_games');
  const oldest = listMcpActionLogs(1, 9999);
  assert.equal(oldest.total, 10000);
  assert.equal(oldest.items[0].id, 4);
});
