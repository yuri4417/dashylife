import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Exercise the actual stdio server and API with an isolated, disposable database.
const dataDir = mkdtempSync(join(tmpdir(), 'dashylife-mcp-test-'));
process.env.DATA_DIR = dataDir;
process.env.DASHYLIFE_ADMIN_KEY = 'mcp-integration-test-admin';
process.env.NODE_ENV = 'production';
process.env.TZ = 'UTC';
let app;
let db;
let client;

try {
  ({ app } = await import('../../packages/api/dist/app.js'));
  ({ db } = await import('../../packages/api/dist/db.js'));
  const activated = await app.inject({
    method: 'POST', url: '/api/admin/mcp/activate',
    headers: { 'x-dashylife-admin-key': process.env.DASHYLIFE_ADMIN_KEY },
  });
  assert.equal(activated.statusCode, 200);
  const address = await app.listen({ host: '127.0.0.1', port: 0 });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('./index.js', import.meta.url))],
    env: { DASHYLIFE_URL: address, DASHYLIFE_MCP_API_KEY: activated.json().apiKey },
    stderr: 'pipe',
  });
  transport.stderr?.on('data', (chunk) => process.stderr.write(chunk));
  client = new Client({ name: 'dashylife-integration-test', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  async function call(name, args = {}) {
    const result = await client.callTool({ name, arguments: args });
    assert.notEqual(result.isError, true, `${name}: ${JSON.stringify(result.content)}`);
    return JSON.parse(result.content[0].text);
  }

  const category = await call('create_routine_category', { name: 'Saúde', color: '#12abef' });
  assert.deepEqual((await call('list_routine_categories')).map(({ id }) => id), [category.id]);
  assert.equal((await call('update_routine_category', { id: category.id, name: 'Bem-estar' })).name, 'Bem-estar');

  const activity = await call('create_routine_activity', {
    title: 'Caminhada', description: 'No parque', categoryId: category.id, startDate: '2026-11-16',
    startTime: '08:00', endTime: '09:00',
    recurrence: { frequency: 'weekly', interval: 1, weekdays: [1, 3], endDate: '2026-11-30' },
  });
  const list = () => call('list_routine_activities', { start: '2026-11-16', end: '2026-11-30' });
  const dates = async () => (await list()).map(({ occurrenceDate }) => occurrenceDate);
  assert.deepEqual(await dates(), ['2026-11-16', '2026-11-18', '2026-11-23', '2026-11-25', '2026-11-30']);
  const moved = await call('update_routine_occurrence', { id: activity.id, originalDate: '2026-11-18', occurrenceDate: '2026-12-01', title: 'Caminhada especial' });
  assert.equal(moved.originalDate, '2026-11-18');
  assert.equal(moved.occurrenceDate, '2026-12-01');
  const movedList = await call('list_routine_activities', { start: '2026-12-01', end: '2026-12-01' });
  assert.equal(movedList[0].id, activity.id);
  assert.equal(movedList[0].title, 'Caminhada especial');
  assert.equal(movedList[0].originalDate, '2026-11-18');
  await call('delete_routine_activity', { id: activity.id, scope: 'occurrence', date: movedList[0].originalDate });
  await call('delete_routine_activity', { id: activity.id, scope: 'future', date: '2026-11-25' });
  assert.deepEqual(await dates(), ['2026-11-16', '2026-11-23']);

  const updated = await call('update_routine_activity', {
    id: activity.id, description: null, categoryId: null, startTime: null, endTime: null, recurrence: null,
  });
  assert.equal(updated.description, undefined);
  assert.equal(updated.categoryId, undefined);
  assert.equal(updated.startTime, undefined);
  assert.equal(updated.endTime, undefined);
  assert.equal(updated.recurrence, undefined);
  assert.deepEqual(await dates(), ['2026-11-16']);
  await call('update_routine_activity', { id: activity.id, categoryId: category.id });
  await call('delete_routine_category', { id: category.id });
  assert.ok((await list()).every((occurrence) => occurrence.categoryId === undefined));
  assert.deepEqual(await call('list_routine_categories'), []);
  await call('delete_routine_activity', { id: activity.id, scope: 'series' });
  assert.deepEqual(await list(), []);

  const single = await call('create_routine_activity', { title: 'Evento único', startDate: '2026-11-16', recurrence: null });
  await call('delete_routine_activity', { id: single.id, scope: 'occurrence', date: '2026-11-16' });
  assert.deepEqual(await list(), []);

  const todo = await call('create_todo', {
    title: 'Consulta', dueDate: '2026-11-16', startTime: '09:00', endTime: '10:00',
    repetition: { type: 'weeks', interval: 2, weekdays: [1, 3, 5] },
  });
  const completed = await call('update_todo', { id: todo.id, completed: true });
  assert.equal(completed.next.dueDate.slice(0, 10), '2026-11-18');
  assert.deepEqual(completed.next.repetition.weekdays, [1, 3, 5]);
  const nextCompleted = await call('update_todo', { id: completed.next.id, completed: true });
  assert.equal(nextCompleted.next.dueDate.slice(0, 10), '2026-11-20');
  const afterFriday = await call('update_todo', { id: nextCompleted.next.id, completed: true });
  assert.equal(afterFriday.next.dueDate.slice(0, 10), '2026-11-30');
  assert.equal(completed.next.startTime, '09:00');
  assert.equal(completed.next.endTime, '10:00');
  const cleared = await call('update_todo', { id: completed.next.id, startTime: null, endTime: null });
  assert.equal(cleared.startTime, undefined);
  assert.equal(cleared.endTime, undefined);

  const fortnight = await call('create_todo', {
    title: 'Domingo e sexta', dueDate: '2026-11-15',
    repetition: { type: 'weeks', interval: 2, weekdays: [0, 5] },
  });
  const nextFriday = await call('update_todo', { id: fortnight.id, completed: true });
  assert.equal(nextFriday.next.dueDate.slice(0, 10), '2026-11-20');
  const nextSunday = await call('update_todo', { id: nextFriday.next.id, completed: true });
  assert.equal(nextSunday.next.dueDate.slice(0, 10), '2026-11-29');
  const afterSunday = await call('update_todo', { id: nextSunday.next.id, completed: true });
  assert.equal(afterSunday.next.dueDate.slice(0, 10), '2026-12-04');

  const invalid = await client.callTool({
    name: 'list_routine_activities', arguments: { start: '2026-11-30', end: '2026-11-01' },
  });
  assert.equal(invalid.isError, true);
  process.stdout.write('MCP stdio, API and temporary database integration passed.\n');
} finally {
  await client?.close();
  await app?.close();
  db?.close();
  rmSync(dataDir, { recursive: true, force: true });
}
