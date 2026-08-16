export type RepetitionType = 'hours' | 'days' | 'weeks';

export interface Repetition {
  type: RepetitionType;
  interval: number;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  repetition?: Repetition;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  dueDate?: string;
  repetition?: Repetition;
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  description?: string;
  completed?: boolean;
  dueDate?: string;
  repetition?: Repetition;
}

export type GameStatus = 'nao-jogado' | 'jogando' | 'zerado' | 'droppado';
export type GamePlatform = string;

export interface Game {
  id: string;
  title: string;
  platform: GamePlatform;
  status: GameStatus;
  date?: string;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameInput {
  title: string;
  platform: GamePlatform;
  status: GameStatus;
  date?: string;
  description?: string;
  tags?: string[];
}

export interface UpdateGameInput {
  title?: string;
  platform?: GamePlatform;
  status?: GameStatus;
  date?: string;
  description?: string;
  tags?: string[];
}

export type GameStatusLabel = 'Não jogado' | 'Jogando' | 'Zerado' | 'Droppado';

export interface GameStatusOption {
  value: GameStatus;
  label: GameStatusLabel;
}

export interface GameListSettings {
  enabled: boolean;
  platforms: {
    name: string;
    visible: boolean;
  }[];
}

export interface TodoListSettings {
  enabled: boolean;
}

export interface AppSettings {
  gamelist: GameListSettings;
  todolist: TodoListSettings;
}

export interface ImportedGameRaw {
  name?: string;
  launcher?: string;
  status?: string;
  date?: string;
  description?: string;
  tags?: string[];
}
