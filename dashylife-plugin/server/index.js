import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod/v4';

const endpoint = (process.env.DASHYLIFE_URL || '').replace(/\/+$/, '');
const apiKey = process.env.DASHYLIFE_MCP_API_KEY || '';
const serverInfo = { name: 'dashylife', version: '0.2.0' };
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data no formato AAAA-MM-DD.');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use um horário no formato HH:mm.');
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB.');
const recurrence = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']).describe('Frequência diária, semanal ou mensal.'),
  interval: z.number().int().positive().describe('Intervalo positivo entre repetições.'),
  weekdays: z.array(z.number().int().min(0).max(6)).optional()
    .describe('Somente para repetição semanal: dias da semana de 0 (domingo) a 6 (sábado).'),
  endDate: date.optional().describe('Último dia permitido para a repetição, inclusive.'),
});

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
    startTime: time.optional().describe('Horário inicial HH:mm; informe junto com endTime. Sem horários, a tarefa ocupa o dia inteiro.'),
    endTime: time.optional().describe('Horário final HH:mm, posterior a startTime.'),
    repetition: z.object({ type: z.enum(['hours', 'days', 'weeks']), interval: z.number().int().positive() }).optional(),
  }));
  register('update_todo', 'Atualiza uma tarefa pelo ID.', z.object({
    id: z.string().min(1),
    title: z.string().optional(),
    description: z.string().optional(),
    completed: z.boolean().optional(),
    dueDate: z.string().optional(),
    startTime: time.nullable().optional().describe('Horário inicial HH:mm; use null nos dois horários para removê-los.'),
    endTime: time.nullable().optional().describe('Horário final HH:mm; use null nos dois horários para removê-los.'),
    repetition: z.object({ type: z.enum(['hours', 'days', 'weeks']), interval: z.number().int().positive() }).optional(),
  }));
  register('delete_todo', 'Remove uma tarefa pelo ID.', z.object({ id: z.string().min(1) }));
  register('list_routine_categories', 'Lista as categorias de atividades da rotina.', z.object({}));
  register('create_routine_category', 'Cria uma categoria de atividades da rotina.', z.object({
    name: z.string().min(1),
    color: color.describe('Cor da categoria no formato hexadecimal #RRGGBB.'),
  }));
  register('update_routine_category', 'Atualiza uma categoria de atividades da rotina pelo ID.', z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    color: color.optional().describe('Cor da categoria no formato hexadecimal #RRGGBB.'),
  }));
  register('delete_routine_category', 'Remove uma categoria pelo ID e mantém suas atividades sem categoria.', z.object({
    id: z.string().min(1),
  }));
  register('list_routine_activities', 'Lista as ocorrências de atividades da rotina em um intervalo de até cinco anos.', z.object({
    start: date.describe('Primeiro dia do intervalo, inclusive, no formato AAAA-MM-DD.'),
    end: date.describe('Último dia do intervalo, inclusive, no formato AAAA-MM-DD.'),
  }));
  register('create_routine_activity', 'Cria uma atividade única ou recorrente na rotina.', z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    categoryId: z.string().min(1).optional(),
    startDate: date.describe('Data da primeira ocorrência no formato AAAA-MM-DD.'),
    startTime: time.optional().describe('Horário inicial HH:mm; informe junto com endTime. Sem horários, a atividade ocupa o dia inteiro.'),
    endTime: time.optional().describe('Horário final HH:mm, posterior a startTime.'),
    recurrence: recurrence.nullable().optional().describe('Omitir ou usar null para uma atividade única.'),
  }));
  register('update_routine_activity', 'Atualiza uma atividade pelo ID; a alteração afeta a série inteira.', z.object({
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional().describe('Use null para remover a descrição.'),
    categoryId: z.string().min(1).nullable().optional().describe('Use null para remover a categoria.'),
    startDate: date.optional().describe('Data da primeira ocorrência no formato AAAA-MM-DD.'),
    startTime: time.nullable().optional().describe('Horário inicial HH:mm; use null nos dois horários para removê-los.'),
    endTime: time.nullable().optional().describe('Horário final HH:mm; use null nos dois horários para removê-los.'),
    recurrence: recurrence.nullable().optional().describe('Use null para tornar a atividade única.'),
  }));
  register('delete_routine_activity', 'Remove uma ocorrência, as ocorrências a partir de uma data ou a série inteira.', z.object({
    id: z.string().min(1).describe('ID da série da atividade.'),
    scope: z.enum(['occurrence', 'future', 'series']).describe('occurrence: apenas a ocorrência; future: a ocorrência e as futuras; series: toda a série.'),
    date: date.optional().describe('Data da ocorrência em AAAA-MM-DD; obrigatória para occurrence e future.'),
  }));
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
