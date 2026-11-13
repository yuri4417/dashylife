const endpoint = (process.env.DASHYLIFE_URL || '').replace(/\/+$/, '');
const apiKey = process.env.DASHYLIFE_API_KEY || '';

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function error(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

const tools = [
  { name: 'list_todos', description: 'Lista tarefas cadastradas no DashyLife.', inputSchema: { type: 'object', properties: {} } },
  { name: 'create_todo', description: 'Cria uma tarefa. Informe título e, opcionalmente, descrição e data limite (YYYY-MM-DD).', inputSchema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, dueDate: { type: 'string' } }, required: ['title'] } },
  { name: 'update_todo', description: 'Atualiza título, descrição, conclusão ou data limite de uma tarefa pelo ID.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, completed: { type: 'boolean' }, dueDate: { type: 'string' } }, required: ['id'] } },
  { name: 'delete_todo', description: 'Remove uma tarefa pelo ID.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'list_games', description: 'Lista jogos cadastrados no DashyLife.', inputSchema: { type: 'object', properties: {} } },
  { name: 'create_game', description: 'Adiciona um jogo à biblioteca. Status aceitos: backlog, playing, completed, abandoned, on-hold.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, platform: { type: 'string' }, status: { type: 'string' }, date: { type: 'string' }, description: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['title', 'platform', 'status'] } },
  { name: 'update_game', description: 'Atualiza dados de um jogo pelo ID.', inputSchema: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, platform: { type: 'string' }, status: { type: 'string' }, date: { type: 'string' }, description: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['id'] } },
  { name: 'delete_game', description: 'Remove um jogo pelo ID.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } }
];

async function api(path, method = 'GET', body) {
  if (!endpoint) throw new Error('Configure DASHYLIFE_URL com a URL base do servidor, por exemplo http://192.168.1.50:8081.');
  const headers = { 'content-type': 'application/json' };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const response = await fetch(`${endpoint}/api${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  if (!response.ok) throw new Error(`DashyLife respondeu HTTP ${response.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : { success: true };
}

async function callTool(name, args) {
  switch (name) {
    case 'list_todos': return api('/todos');
    case 'create_todo': return api('/todos', 'POST', args);
    case 'update_todo': { const { id, ...body } = args; return api(`/todos/${encodeURIComponent(id)}`, 'PUT', body); }
    case 'delete_todo': return api(`/todos/${encodeURIComponent(args.id)}`, 'DELETE');
    case 'list_games': return api('/games');
    case 'create_game': return api('/games', 'POST', args);
    case 'update_game': { const { id, ...body } = args; return api(`/games/${encodeURIComponent(id)}`, 'PUT', body); }
    case 'delete_game': return api(`/games/${encodeURIComponent(args.id)}`, 'DELETE');
    default: throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.method === 'notifications/initialized' || msg.method?.startsWith('notifications/')) continue;
    if (msg.method === 'initialize') {
      respond(msg.id, { protocolVersion: msg.params?.protocolVersion || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'dashylife', version: '0.1.0' } });
    } else if (msg.method === 'ping') respond(msg.id, {});
    else if (msg.method === 'tools/list') respond(msg.id, { tools });
    else if (msg.method === 'tools/call') {
      callTool(msg.params?.name, msg.params?.arguments || {}).then(value => respond(msg.id, { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] })).catch(e => respond(msg.id, { isError: true, content: [{ type: 'text', text: e.message }] }));
    } else if (msg.id !== undefined) error(msg.id, -32601, `Método não suportado: ${msg.method}`);
  }
});
