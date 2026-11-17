import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
  assert.deepEqual((await app.inject('/api/app-settings')).json(), { gamelist, todolist: { enabled: true }, routine: { enabled: true } });

  const todolist = { enabled: false };
  const saved = await app.inject({ method: 'PATCH', url: '/api/app-settings', payload: { todolist } });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(saved.json(), { gamelist, todolist, routine: { enabled: true } });
  assert.deepEqual((await app.inject('/api/app-settings')).json(), { gamelist, todolist, routine: { enabled: true } });
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

test('routine categories, recurring exclusions and future deletion preserve past occurrences', async () => {
  const createCategory = await app.inject({ method: 'POST', url: '/api/routine/categories', payload: { name: '  Saúde  ', color: '#12aBcD' } });
  assert.equal(createCategory.statusCode, 201);
  const category = createCategory.json();
  assert.equal(category.name, 'Saúde');
  assert.equal((await app.inject({ method: 'POST', url: '/api/routine/categories', payload: { name: 'Inválida', color: 'red' } })).statusCode, 400);

  const created = await app.inject({ method: 'POST', url: '/api/routine/activities', payload: {
    title: 'Treinar', description: 'Academia', categoryId: category.id, startDate: '2026-11-02',
    startTime: '08:00', endTime: '09:00', recurrence: { frequency: 'weekly', interval: 1, weekdays: [1, 3] },
  } });
  assert.equal(created.statusCode, 201);
  const activity = created.json();
  const list = async () => (await app.inject('/api/routine/activities?start=2026-11-02&end=2026-11-30')).json()
    .filter((item) => item.id === activity.id);
  assert.deepEqual((await list()).map((item) => item.occurrenceDate), [
    '2026-11-02', '2026-11-04', '2026-11-09', '2026-11-11', '2026-11-16', '2026-11-18', '2026-11-23', '2026-11-25', '2026-11-30',
  ]);
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/routine/activities/${activity.id}?scope=occurrence&date=2026-11-09` })).statusCode, 200);
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/routine/activities/${activity.id}?scope=future&date=2026-11-23` })).statusCode, 200);
  assert.deepEqual((await list()).map((item) => item.occurrenceDate), ['2026-11-02', '2026-11-04', '2026-11-11', '2026-11-16', '2026-11-18']);
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/routine/categories/${category.id}` })).statusCode, 200);
  assert.equal((await list())[0].categoryId, undefined);
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/routine/activities/${activity.id}?scope=series` })).statusCode, 200);
  assert.deepEqual(await list(), []);
});

test('routine validation, monthly dates, partial updates and MCP share the same data', async () => {
  const viaMcp = (tool, payload) => app.inject({ method: 'POST', url: `/api/mcp/tools/${tool}`, headers: { authorization: `Bearer ${mcpKey}` }, payload });
  const created = await viaMcp('create_routine_activity', {
    title: 'Fim do mês', startDate: '2027-01-31', startTime: '09:00', endTime: '10:00',
    recurrence: { frequency: 'monthly', interval: 1, endDate: '2027-05-31' },
  });
  assert.equal(created.statusCode, 200);
  const activity = created.json();
  const list = await app.inject('/api/routine/activities?start=2027-01-01&end=2027-05-31');
  assert.deepEqual(list.json().filter((item) => item.id === activity.id).map((item) => item.occurrenceDate), ['2027-01-31', '2027-03-31', '2027-05-31']);
  assert.equal((await viaMcp('list_routine_activities', { start: '2027-01-01', end: '2027-05-31' })).json().filter((item) => item.id === activity.id).length, 3);
  const changed = await app.inject({ method: 'PUT', url: `/api/routine/activities/${activity.id}`, payload: { startTime: null, endTime: null, recurrence: null } });
  assert.equal(changed.statusCode, 200);
  assert.equal(changed.json().startTime, undefined);
  assert.equal(changed.json().recurrence, undefined);
  assert.equal((await app.inject({ method: 'PUT', url: `/api/routine/activities/${activity.id}`, payload: { startTime: '13:00', endTime: '12:00' } })).statusCode, 400);
  assert.equal((await app.inject('/api/routine/activities?start=2027-02-30&end=2027-03-01')).statusCode, 400);
  assert.equal((await app.inject('/api/routine/activities?start=2020-01-01&end=2030-01-01')).statusCode, 400);
  assert.equal((await viaMcp('delete_routine_activity', { id: activity.id, scope: 'occurrence', date: '2027-01-31' })).statusCode, 200);
});

test('task times are validated, can be cleared and carry over on repetition', async () => {
  assert.equal((await app.inject({ method: 'POST', url: '/api/todos', payload: { title: 'Horário inválido', startTime: '10:00', endTime: '09:00' } })).statusCode, 400);
  const created = await app.inject({ method: 'POST', url: '/api/todos', payload: {
    title: 'Horário recorrente', dueDate: '2026-11-15', startTime: '10:00', endTime: '11:00', repetition: { type: 'days', interval: 1 },
  } });
  assert.equal(created.statusCode, 201);
  const task = created.json();
  assert.equal((await updateViaWeb(task.id, { startTime: null })).statusCode, 400);
  const completed = await updateViaWeb(task.id, { completed: true });
  assert.equal(completed.statusCode, 200);
  assert.equal(completed.json().next.startTime, '10:00');
  assert.equal(completed.json().next.endTime, '11:00');
  const cleared = await updateViaMcp(completed.json().next.id, { startTime: null, endTime: null });
  assert.equal(cleared.statusCode, 200);
  assert.equal(cleared.json().startTime, undefined);
  assert.equal(cleared.json().endTime, undefined);
});

test('routine setting is independent and does not remove the task endpoint', async () => {
  const changed = await app.inject({ method: 'PATCH', url: '/api/app-settings', payload: { routine: { enabled: false }, todolist: { enabled: false } } });
  assert.equal(changed.statusCode, 200);
  assert.equal(changed.json().routine.enabled, false);
  assert.equal((await app.inject('/api/todos')).statusCode, 200);
  assert.equal((await app.inject({ method: 'PATCH', url: '/api/app-settings', payload: { routine: { enabled: true } } })).json().routine.enabled, true);
});


test('existing task databases are migrated without losing records', () => {
  const legacyDir = mkdtempSync(join(tmpdir(), 'dashylife-legacy-'));
  try {
    const script = `
      import assert from 'node:assert/strict';
      import Database from 'better-sqlite3';
      import { join } from 'node:path';
      const oldDb = new Database(join(process.env.DATA_DIR, 'dashylife.sqlite'));
      oldDb.exec("CREATE TABLE todos (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, completed INTEGER NOT NULL DEFAULT 0, due_date TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
      oldDb.prepare("INSERT INTO todos (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)").run('legacy', 'Tarefa antiga', '2026-01-01', '2026-01-01');
      oldDb.close();
      const { app } = await import('./dist/app.js');
      const { db } = await import('./dist/db.js');
      const items = (await app.inject('/api/todos')).json();
      assert.equal(items[0].title, 'Tarefa antiga');
      const columns = db.prepare('PRAGMA table_info(todos)').all().map((column) => column.name);
      assert.ok(columns.includes('start_time') && columns.includes('end_time'));
      assert.ok(columns.includes('repetition_type') && columns.includes('repetition_interval'));
      await app.close();
      db.close();
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, NODE_ENV: 'production', DATA_DIR: legacyDir },
      encoding: 'utf8',
    });
    assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  } finally {
    rmSync(legacyDir, { recursive: true, force: true });
  }
});

test('weekly task repetition advances through selected weekdays and skips inactive weeks', async () => {
  const response = await app.inject({ method: 'POST', url: '/api/todos', payload: {
    title: 'Dias alternados', dueDate: '2026-11-16', startTime: '08:00', endTime: '09:00',
    repetition: { type: 'weeks', interval: 2, weekdays: [1, 3, 5] },
  } });
  assert.equal(response.statusCode, 201);
  let todo = response.json();
  assert.deepEqual(todo.repetition.weekdays, [1, 3, 5]);
  const saved = (await app.inject('/api/todos')).json().find(item => item.id === todo.id);
  assert.deepEqual(saved.repetition.weekdays, [1, 3, 5]);
  for (const date of ['2026-11-18', '2026-11-20', '2026-11-30', '2026-12-02']) {
    const completed = await updateViaWeb(todo.id, { completed: true });
    assert.equal(completed.statusCode, 200);
    todo = completed.json().next;
    assert.equal(todo.dueDate.slice(0, 10), date);
    assert.deepEqual(todo.repetition.weekdays, [1, 3, 5]);
    assert.equal(todo.startTime, '08:00');
  }
  const changed = await updateViaWeb(todo.id, { repetition: { type: 'weeks', interval: 1, weekdays: [0, 1] } });
  assert.deepEqual(changed.json().repetition.weekdays, [0, 1]);
  const cleared = await updateViaWeb(todo.id, { repetition: null });
  assert.equal(cleared.json().repetition, undefined);
});

test('weekly task repetition validates weekdays and preserves legacy single-day schedules', async () => {
  for (const repetition of [
    { type: 'weeks', interval: 1, weekdays: [] },
    { type: 'weeks', interval: 1, weekdays: [7] },
    { type: 'weeks', interval: 1, weekdays: [1, 1] },
    { type: 'days', interval: 1, weekdays: [1] },
    { type: 'weeks', interval: 0, weekdays: [1] },
  ]) {
    assert.equal((await app.inject({ method: 'POST', url: '/api/todos', payload: { title: 'Inválida', dueDate: '2026-11-16', repetition } })).statusCode, 400);
  }
  const missingDate = await app.inject({ method: 'POST', url: '/api/todos', payload: { title: 'Sem data', repetition: { type: 'weeks', interval: 1, weekdays: [1] } } });
  assert.equal(missingDate.statusCode, 400);
  const old = await app.inject({ method: 'POST', url: '/api/todos', payload: { title: 'Sem dias explícitos', dueDate: '2026-11-16', repetition: { type: 'weeks', interval: 2 } } });
  const completed = await updateViaWeb(old.json().id, { completed: true });
  assert.equal(completed.json().next.dueDate.slice(0, 10), '2026-11-30');
  const weekend = await app.inject({ method: 'POST', url: '/api/todos', payload: { title: 'Fim da semana', dueDate: '2026-11-21', repetition: { type: 'weeks', interval: 2, weekdays: [0, 1] } } });
  const sunday = await updateViaWeb(weekend.json().id, { completed: true });
  assert.equal(sunday.json().next.dueDate.slice(0, 10), '2026-11-29');
  const monday = await updateViaWeb(sunday.json().next.id, { completed: true });
  assert.equal(monday.json().next.dueDate.slice(0, 10), '2026-11-30');
});


test('two selected weekdays stay together in each active fortnight', async () => {
  const created = await app.inject({ method: 'POST', url: '/api/todos', payload: {
    title: 'Sexta e domingo', dueDate: '2026-11-15', repetition: { type: 'weeks', interval: 2, weekdays: [5, 0] },
  } });
  assert.equal(created.statusCode, 201);
  let todo = created.json();
  for (const date of ['2026-11-20', '2026-11-29', '2026-12-04', '2026-12-13']) {
    const response = await updateViaWeb(todo.id, { completed: true });
    assert.equal(response.statusCode, 200);
    todo = response.json().next;
    assert.equal(todo.dueDate.slice(0, 10), date);
  }
  const activity = await app.inject({ method: 'POST', url: '/api/routine/activities', payload: {
    title: 'Sexta e domingo atividade', startDate: '2026-11-15', recurrence: { frequency: 'weekly', interval: 2, weekdays: [5, 0] },
  } });
  const id = activity.json().id;
  const listed = await app.inject('/api/routine/activities?start=2026-11-15&end=2026-12-06');
  assert.deepEqual(listed.json().filter(item => item.id === id).map(item => item.occurrenceDate), ['2026-11-15', '2026-11-20', '2026-11-29', '2026-12-04']);
});

test('edits and reschedules an individual occurrence while retaining its original series identity', async () => {
  const created = await app.inject({ method: 'POST', url: '/api/routine/activities', payload: {
    title: 'Treino individual', description: 'Descrição da série', startDate: '2026-11-01', startTime: '09:00', endTime: '10:00',
    recurrence: { frequency: 'weekly', interval: 1, weekdays: [0] },
  } });
  const { id } = created.json();
  const change = (date, payload) => app.inject({ method: 'PUT', url: `/api/routine/activities/${id}/occurrences/${date}`, payload });
  const list = async (start, end) => (await app.inject(`/api/routine/activities?start=${start}&end=${end}`)).json().filter(item => item.id === id);
  const moved = await change('2026-11-08', { title: 'Treino especial', occurrenceDate: '2026-12-06', startTime: '11:00', endTime: '12:00' });
  assert.equal(moved.statusCode, 200);
  assert.equal(moved.json().originalDate, '2026-11-08');
  assert.equal(moved.json().occurrenceDate, '2026-12-06');
  assert.equal(moved.json().id, id);
  assert.deepEqual((await list('2026-11-08', '2026-11-08')).map(item => item.occurrenceDate), []);
  const collision = await list('2026-12-06', '2026-12-06');
  assert.equal(collision.length, 2);
  assert.deepEqual(collision.map(item => item.originalDate).sort(), ['2026-11-08', '2026-12-06']);
  const changedAgain = await change('2026-11-08', { occurrenceDate: '2026-10-20', description: 'Alteração' });
  assert.equal(changedAgain.statusCode, 200);
  assert.equal((await list('2026-12-06', '2026-12-06')).length, 1);
  assert.equal((await list('2026-10-20', '2026-10-20'))[0].title, 'Treino especial');
  const invalid = await change('2026-11-15', { startTime: '16:00', endTime: '15:00' });
  assert.equal(invalid.statusCode, 400);
  assert.equal((await list('2026-11-15', '2026-11-15')).length, 1);
  assert.equal((await change('2026-11-09', { title: 'Inexistente' })).statusCode, 404);
  const seriesUpdate = await app.inject({ method: 'PUT', url: `/api/routine/activities/${id}`, payload: { description: 'Nova descrição' } });
  assert.equal(seriesUpdate.statusCode, 200);
  const exception = (await list('2026-10-20', '2026-10-20'))[0];
  assert.equal(exception.description, 'Alteração');
  assert.equal((await list('2026-11-15', '2026-11-15'))[0].description, 'Nova descrição');
  const deleted = await app.inject({ method: 'DELETE', url: `/api/routine/activities/${id}?scope=occurrence&date=2026-11-08` });
  assert.equal(deleted.statusCode, 200);
  assert.equal((await list('2026-10-20', '2026-10-20')).length, 0);
  assert.equal((await list('2026-11-08', '2026-11-08')).length, 0);
});

test('future and series deletion remove linked exceptions using original dates', async () => {
  const created = await app.inject({ method: 'POST', url: '/api/routine/activities', payload: { title: 'Série com exceções', startDate: '2026-11-01', recurrence: { frequency: 'weekly', interval: 1, weekdays: [0] } } });
  const { id } = created.json();
  const change = (date, occurrenceDate) => app.inject({ method: 'PUT', url: `/api/routine/activities/${id}/occurrences/${date}`, payload: { occurrenceDate } });
  await change('2026-11-08', '2026-12-01');
  await change('2026-11-15', '2026-10-15');
  const deleted = await app.inject({ method: 'DELETE', url: `/api/routine/activities/${id}?scope=future&date=2026-11-15` });
  assert.equal(deleted.statusCode, 200);
  let list = (await app.inject('/api/routine/activities?start=2026-10-01&end=2026-12-31')).json().filter(item => item.id === id);
  assert.deepEqual(list.map(item => item.occurrenceDate), ['2026-11-01', '2026-12-01']);
  await app.inject({ method: 'DELETE', url: `/api/routine/activities/${id}?scope=series` });
  list = (await app.inject('/api/routine/activities?start=2026-10-01&end=2026-12-31')).json().filter(item => item.id === id);
  assert.equal(list.length, 0);
});

test('exceptions survive series changes and deleted categories are not resurrected', async () => {
  const category = (await app.inject({ method: 'POST', url: '/api/routine/categories', payload: { name: 'Categoria excepcional', color: '#123456' } })).json();
  const series = (await app.inject({ method: 'POST', url: '/api/routine/activities', payload: { title: 'Série original', startDate: '2026-11-01', recurrence: { frequency: 'weekly', interval: 1, weekdays: [0] } } })).json();
  const exception = await app.inject({ method: 'PUT', url: `/api/routine/activities/${series.id}/occurrences/2026-11-08`, payload: { categoryId: category.id, occurrenceDate: '2026-10-30' } });
  assert.equal(exception.statusCode, 200);
  await app.inject({ method: 'DELETE', url: `/api/routine/categories/${category.id}` });
  const changed = await app.inject({ method: 'PUT', url: `/api/routine/activities/${series.id}`, payload: { title: 'Série atualizada', startDate: '2026-12-01', recurrence: null } });
  assert.equal(changed.statusCode, 200);
  const rows = (await app.inject('/api/routine/activities?start=2026-10-30&end=2026-10-30')).json().filter(item => item.id === series.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, 'Série atualizada');
  assert.equal(rows[0].categoryId, undefined);
  assert.equal(rows[0].originalDate, '2026-11-08');
  const edited = await app.inject({ method: 'PUT', url: `/api/routine/activities/${series.id}/occurrences/2026-11-08`, payload: { title: 'Nova exceção' } });
  assert.equal(edited.statusCode, 200);
  assert.equal(edited.json().title, 'Nova exceção');
});
