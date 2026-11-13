import { Todo, Repetition, Game, GameListSettings } from '@dashylife/shared';

const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';
const API_KEY_STORAGE = 'dashylife-api-key';

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = (key?: string) => {
    const headers = new Headers(init.headers);
    if (key) headers.set('Authorization', `Bearer ${key}`);
    return fetch(`${API_URL}${path}`, { ...init, headers });
  };

  let key = window.localStorage.getItem(API_KEY_STORAGE) || undefined;
  let response = await send(key);
  if (response.status !== 401) return response;

  const enteredKey = window.prompt('O DashyLife exige uma chave de API. Informe a chave configurada no servidor:')?.trim();
  if (!enteredKey) return response;
  window.localStorage.setItem(API_KEY_STORAGE, enteredKey);
  key = enteredKey;
  response = await send(key);
  if (response.status === 401) window.localStorage.removeItem(API_KEY_STORAGE);
  return response;
}

export async function fetchTodos(): Promise<Todo[]> {
  const res = await apiFetch('/todos');
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

export async function updateTodo(id: string, input: { title?: string; description?: string; completed?: boolean; dueDate?: string; repetition?: Repetition }): Promise<Todo> {
  const res = await apiFetch(`/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to update todo');
  return res.json();
}

export async function deleteTodo(id: string): Promise<void> {
  const res = await apiFetch(`/todos/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete todo');
}

export async function fetchGames(): Promise<Game[]> {
  const res = await apiFetch('/games');
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

export async function fetchSettings(): Promise<GameListSettings> {
  const res = await apiFetch('/settings');
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings: GameListSettings): Promise<GameListSettings> {
  const res = await apiFetch('/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}
