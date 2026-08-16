import { Todo, Repetition, Game, GameListSettings } from '@dashylife/shared';

const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

export async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch(`${API_URL}/todos`);
  if (!res.ok) throw new Error('Failed to fetch todos');
  return res.json();
}

export async function createTodo(input: { title: string; description?: string; dueDate?: string; repetition?: Repetition }): Promise<Todo> {
  const res = await fetch(`${API_URL}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create todo');
  return res.json();
}

export async function updateTodo(id: string, input: { title?: string; description?: string; completed?: boolean; dueDate?: string; repetition?: Repetition }): Promise<Todo> {
  const res = await fetch(`${API_URL}/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to update todo');
  return res.json();
}

export async function deleteTodo(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/todos/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete todo');
}

export async function fetchGames(): Promise<Game[]> {
  const res = await fetch(`${API_URL}/games`);
  if (!res.ok) throw new Error('Failed to fetch games');
  return res.json();
}

export async function createGame(input: { title: string; platform: string; status: string; date?: string; description?: string; tags?: string[] }): Promise<Game> {
  const res = await fetch(`${API_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create game');
  return res.json();
}

export async function updateGame(id: string, input: { title?: string; platform?: string; status?: string; date?: string; description?: string; tags?: string[] }): Promise<Game> {
  const res = await fetch(`${API_URL}/games/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to update game');
  return res.json();
}

export async function deleteGame(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/games/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete game');
}

export async function fetchSettings(): Promise<GameListSettings> {
  const res = await fetch(`${API_URL}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings: GameListSettings): Promise<GameListSettings> {
  const res = await fetch(`${API_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}
