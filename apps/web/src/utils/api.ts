import type { AppSettings, Game, GameImportItem, GameImportResult, Repetition, Todo, TodoCompletionResult, UpdateTodoInput } from '@dashylife/shared';

const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, init);
}

export interface McpAdminStatus { enabled: boolean; }
export interface McpActionLog {
  id: number;
  createdAt: string;
  tool: string;
  status: number;
  durationMs: number;
  error: string | null;
}
export interface McpActionLogs {
  items: McpActionLog[];
  total: number;
  limit: number;
  offset: number;
}

async function mcpAdminFetch(path: string, adminKey: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('X-Dashylife-Admin-Key', adminKey);
  return fetch(`${API_URL}/admin/mcp${path}`, { ...init, headers });
}

async function readAdminResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Falha na administração do MCP (HTTP ${response.status}).`);
  return payload as T;
}

export async function fetchMcpAdminStatus(adminKey: string): Promise<McpAdminStatus> {
  return readAdminResponse(await mcpAdminFetch('', adminKey));
}

export async function activateMcp(adminKey: string): Promise<McpAdminStatus & { apiKey: string }> {
  return readAdminResponse(await mcpAdminFetch('/activate', adminKey, { method: 'POST' }));
}

export async function rotateMcpKey(adminKey: string): Promise<McpAdminStatus & { apiKey: string }> {
  return readAdminResponse(await mcpAdminFetch('/rotate-key', adminKey, { method: 'POST' }));
}

export async function deactivateMcp(adminKey: string): Promise<McpAdminStatus> {
  return readAdminResponse(await mcpAdminFetch('/deactivate', adminKey, { method: 'POST' }));
}

export async function fetchMcpActionLogs(adminKey: string, offset: number, limit = 25): Promise<McpActionLogs> {
  const query = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  return readAdminResponse(await mcpAdminFetch(`/logs?${query}`, adminKey));
}

export async function fetchTodos(): Promise<Todo[]> {
  const res = await apiFetch('/todos', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch todos');
  return res.json();
}

export async function createTodo(input: { title: string; description?: string; dueDate?: string; repetition?: Repetition }): Promise<Todo> {
  const res = await apiFetch('/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create todo');
  return res.json();
}

export async function updateTodo(id: string, input: Omit<UpdateTodoInput, 'id'>): Promise<TodoCompletionResult> {
  const res = await apiFetch(`/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Não foi possível atualizar a tarefa.');
  const result: Todo | TodoCompletionResult = await res.json();
  return 'updated' in result ? result : { updated: result };
}

export async function deleteTodo(id: string): Promise<void> {
  const res = await apiFetch(`/todos/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete todo');
}

export async function fetchGames(): Promise<Game[]> {
  const res = await apiFetch('/games', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch games');
  return res.json();
}

export async function createGame(input: { title: string; platform: string; status: string; date?: string; description?: string; tags?: string[] }): Promise<Game> {
  const res = await apiFetch('/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create game');
  return res.json();
}

export async function importGames(items: GameImportItem[]): Promise<GameImportResult[]> {
  const res = await apiFetch('/games/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  if (!res.ok) throw new Error(`Falha ao importar jogos (HTTP ${res.status}).`);
  const { results }: { results: GameImportResult[] } = await res.json();
  return results;
}

export async function updateGame(id: string, input: { title?: string; platform?: string; status?: string; date?: string; description?: string; tags?: string[] }): Promise<Game> {
  const res = await apiFetch(`/games/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to update game');
  return res.json();
}

export async function deleteGame(id: string): Promise<void> {
  const res = await apiFetch(`/games/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete game');
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await apiFetch('/app-settings', { cache: 'no-store' });
  if (!res.ok) throw new Error('Não foi possível carregar as configurações dos módulos.');
  return res.json();
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const res = await apiFetch('/app-settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Não foi possível salvar as configurações dos módulos.');
  return res.json();
}
