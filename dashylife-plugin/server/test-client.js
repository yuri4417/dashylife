import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const serverPath = fileURLToPath(new URL('./index.js', import.meta.url));
const mockFetchPath = fileURLToPath(new URL('./test-fetch.js', import.meta.url));
const client = new Client({ name: 'dashylife-protocol-smoke', version: '1.0.0' }, { capabilities: {} });
const transport = new StdioClientTransport({
  command: 'node',
  args: ['--import', mockFetchPath, serverPath],
  env: {
    DASHYLIFE_URL: 'https://dashylife.test/',
    DASHYLIFE_MCP_API_KEY: 'protocol-test-key',
  },
  stderr: 'pipe',
});
transport.stderr?.on('data', (chunk) => process.stderr.write(chunk));
transport.onerror = (error) => process.stderr.write(`Test client transport error: ${error.message}\n`);

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const names = tools.map(({ name }) => name).sort();
  assert.deepEqual(names, [
    'create_game', 'create_routine_activity', 'create_routine_category', 'create_todo',
    'delete_game', 'delete_routine_activity', 'delete_routine_category', 'delete_todo',
    'list_games', 'list_routine_activities', 'list_routine_categories', 'list_todos',
    'update_game', 'update_routine_activity', 'update_routine_category', 'update_routine_occurrence', 'update_todo',
  ]);

  const cases = [
    ['list_routine_categories', {}],
    ['create_routine_category', { name: 'Saúde', color: '#aabbCC' }],
    ['update_routine_category', { id: 'category-1', name: 'Bem-estar', color: '#112233' }],
    ['delete_routine_category', { id: 'category-1' }],
    ['list_routine_activities', { start: '2026-11-01', end: '2026-11-30' }],
    ['create_routine_activity', {
      title: 'Caminhada', description: 'No parque', categoryId: 'category-1', startDate: '2026-11-16',
      startTime: '08:00', endTime: '09:00',
      recurrence: { frequency: 'weekly', interval: 2, weekdays: [1, 3], endDate: '2027-01-31' },
    }],
    ['create_routine_activity', { title: 'Evento único', startDate: '2026-11-16', recurrence: null }],
    ['update_routine_activity', {
      id: 'activity-1', description: null, categoryId: null, startTime: null, endTime: null, recurrence: null,
    }],
    ['update_routine_occurrence', { id: 'activity-1', originalDate: '2026-11-16', occurrenceDate: '2026-11-17', title: 'Reagendada' }],
    ['delete_routine_activity', { id: 'activity-1', scope: 'occurrence', date: '2026-11-16' }],
    ['delete_routine_activity', { id: 'activity-1', scope: 'future', date: '2026-11-16' }],
    ['delete_routine_activity', { id: 'activity-1', scope: 'series' }],
    ['create_todo', { title: 'Consulta', dueDate: '2026-11-16', startTime: '09:00', endTime: '10:00', repetition: { type: 'weeks', interval: 2, weekdays: [1, 3, 5] } }],
    ['update_todo', { id: 'todo-1', startTime: null, endTime: null }],
  ];
  for (const [name, args] of cases) {
    const result = await client.callTool({ name, arguments: args });
    assert.notEqual(result.isError, true, `${name}: ${JSON.stringify(result.content)}`);
    assert.deepEqual(JSON.parse(result.content[0].text), { tool: name, args });
  }

  for (const [name, args] of [
    ['create_routine_category', { name: 'Inválida', color: '#123' }],
    ['create_routine_activity', { title: 'Inválida', startDate: '16/11/2026' }],
    ['create_routine_activity', { title: 'Inválida', startDate: '2026-11-16', recurrence: { frequency: 'weekly', interval: 1, weekdays: [7] } }],
    ['create_todo', { title: 'Inválida', startTime: '24:00', endTime: '25:00' }],
    ['delete_routine_activity', { id: 'activity-1', scope: 'invalid' }],
  ]) {
    const result = await client.callTool({ name, arguments: args });
    assert.equal(result.isError, true, `${name} should reject invalid arguments`);
  }
  process.stdout.write(`MCP stdio handshake and tool forwarding passed; discovered ${tools.length} tools.\n`);
} finally {
  await client.close();
}
