export type RepetitionType = 'hours' | 'days' | 'weeks';

export interface Repetition {
  type: RepetitionType;
  interval: number;
  /** Dias selecionados para repetição semanal: 0 = domingo, 6 = sábado. */
  weekdays?: number[];
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  startTime?: string;
  endTime?: string;
  repetition?: Repetition;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  dueDate?: string;
  startTime?: string;
  endTime?: string;
  repetition?: Repetition;
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  description?: string;
  completed?: boolean;
  dueDate?: string;
  startTime?: string | null;
  endTime?: string | null;
  repetition?: Repetition | null;
}

export interface TodoCompletionResult {
  updated: Todo;
  next?: Todo;
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

export interface GameImportItem {
  requestId: string;
  game: CreateGameInput;
}

export type GameImportResult =
  | { requestId: string; gameId: string }
  | { requestId: string; error: string };

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

export interface RoutineSettings {
  enabled: boolean;
}

export interface AppSettings {
  gamelist: GameListSettings;
  todolist: TodoListSettings;
  routine: RoutineSettings;
}

export interface RoutineCategory {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  /** 0 = domingo; 6 = sábado. */
  weekdays?: number[];
  endDate?: string;
}

export interface RoutineActivity {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  startDate: string;
  startTime?: string;
  endTime?: string;
  recurrence?: RoutineRecurrence;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineOccurrence extends RoutineActivity {
  /** Data atual da ocorrência no calendário. */
  occurrenceDate: string;
  /** Data original na série, mesmo após reagendamento. */
  originalDate: string;
  isException?: boolean;
}

export interface UpdateRoutineOccurrenceInput {
  title?: string;
  description?: string | null;
  categoryId?: string | null;
  occurrenceDate?: string;
  startTime?: string | null;
  endTime?: string | null;
}

export interface CreateRoutineActivityInput {
  title: string;
  description?: string | null;
  categoryId?: string | null;
  startDate: string;
  startTime?: string | null;
  endTime?: string | null;
  recurrence?: RoutineRecurrence | null;
}

export type UpdateRoutineActivityInput = Partial<CreateRoutineActivityInput>;
export type RoutineDeleteScope = 'occurrence' | 'future' | 'series';

export interface ImportedGameRaw {
  name?: string;
  launcher?: string;
  status?: string;
  date?: string;
  description?: string;
  tags?: string[];
}
