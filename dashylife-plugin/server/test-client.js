import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const serverPath = fileURLToPath(new URL('./index.js', import.meta.url));
const client = new Client({ name: 'dashylife-protocol-smoke', version: '1.0.0' }, { capabilities: {} });
const transport = new StdioClientTransport({
  command: 'node',
  args: [serverPath],
  env: {
    DASHYLIFE_URL: process.env.DASHYLIFE_URL || 'http://127.0.0.1:3000',
    DASHYLIFE_MCP_API_KEY: process.env.DASHYLIFE_MCP_API_KEY || 'protocol-test-key',
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
    'create_game', 'create_todo', 'delete_game', 'delete_todo',
    'list_games', 'list_todos', 'update_game', 'update_todo',
  ]);
  process.stdout.write(`MCP stdio handshake passed; discovered ${tools.length} tools.\n`);
} finally {
  await client.close();
}
