import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod/v4';

const endpoint = (process.env.DASHYLIFE_URL || '').replace(/\/+$/, '');
const apiKey = process.env.DASHYLIFE_MCP_API_KEY || '';
const serverInfo = { name: 'dashylife', version: '0.2.0' };

async function callApi(tool, args = {}) {
  if (!endpoint) throw new Error('Configure DASHYLIFE_URL com a URL base do DashyLife.');
  if (!apiKey) throw new Error('O MCP está ativo, mas DASHYLIFE_MCP_API_KEY não foi configurada. Gere uma chave na aba Configurações.');

  const startedAt = performance.now();
  try {
    const response = await fetch(`${endpoint}/api/mcp/tools/${encodeURIComponent(tool)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(args),
    });
    const text = await response.text();
    const result = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(result?.error || `DashyLife respondeu HTTP ${response.status}.`);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(JSON.stringify({
      event: 'dashylife_mcp_transport_error',
      tool,
      durationMs: Math.round(performance.now() - startedAt),
      error: message,
    }));
    throw error;
  }
}

function createServer() {
  const server = new McpServer(serverInfo);
  const register = (name, description, inputSchema) => {
    server.registerTool(name, { description, inputSchema }, async (args) => {
      const result = await callApi(name, args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });
  };

  register('list_todos', 'Lista tarefas cadastradas no DashyLife.', z.object({}));
  register('create_todo', 'Cria uma tarefa.', z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    repetition: z.object({ type: z.enum(['hours', 'days', 'weeks']), interval: z.number().int().positive() }).optional(),
  }));
  register('update_todo', 'Atualiza uma tarefa pelo ID.', z.object({
    id: z.string().min(1),
    title: z.string().optional(),
    description: z.string().optional(),
    completed: z.boolean().optional(),
    dueDate: z.string().optional(),
    repetition: z.object({ type: z.enum(['hours', 'days', 'weeks']), interval: z.number().int().positive() }).optional(),
  }));
  register('delete_todo', 'Remove uma tarefa pelo ID.', z.object({ id: z.string().min(1) }));
  register('list_games', 'Lista jogos cadastrados no DashyLife.', z.object({}));
  register('create_game', 'Adiciona um jogo à biblioteca.', z.object({
    title: z.string().min(1),
    platform: z.string().min(1),
    status: z.enum(['nao-jogado', 'jogando', 'zerado', 'droppado']),
    date: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }));
  register('update_game', 'Atualiza dados de um jogo pelo ID.', z.object({
    id: z.string().min(1),
    title: z.string().optional(),
    platform: z.string().optional(),
    status: z.enum(['nao-jogado', 'jogando', 'zerado', 'droppado']).optional(),
    date: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }));
  register('delete_game', 'Remove um jogo pelo ID.', z.object({ id: z.string().min(1) }));
  return server;
}

console.error(JSON.stringify({ event: 'dashylife_mcp_started' }));
void serveStdio(createServer);
