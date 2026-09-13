import { Todo } from '@dashylife/shared';
import { formatDate, getDueStatus } from './dateUtils';

export type TodoHighlight = '' | 'overdue' | 'due-soon';

export function getTodoHighlight(todo: Todo): TodoHighlight {
  if (!todo.dueDate) return '';
  const status = getDueStatus(todo.dueDate);
  if (status === 'overdue') return 'overdue';
  if (status === 'due-soon') return 'due-soon';
  return '';
}

export function getDueDateDisplay(todo: Todo): string {
  if (!todo.dueDate) return '';
  const status = getDueStatus(todo.dueDate);
  if (status === 'overdue') return `Vencida em ${formatDate(todo.dueDate)}`;
  if (status === 'due-soon') return `Vence em ${formatDate(todo.dueDate)}`;
  return formatDate(todo.dueDate);
}

export function formatGroupDate(dateKey: string): string {
  if (dateKey === 'sem-data') return 'Sem data';
  const date = new Date(dateKey);
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return `${days[date.getUTCDay()]}, ${date.getUTCDate()} de ${months[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

export function filterTodos(todos: Todo[], searchQuery: string): Todo[] {
  const query = searchQuery.trim().toLowerCase();
  return todos
    .filter((todo) => !todo.completed)
    .filter((todo) => {
      if (!query) return true;
      return (
        todo.title.toLowerCase().includes(query) ||
        (todo.description?.toLowerCase().includes(query) ?? false)
      );
    });
}

export interface TodoGroup {
  date: string;
  todos: Todo[];
}

export function groupTodosByDate(filtered: Todo[]): TodoGroup[] {
  const groups: Record<string, Todo[]> = {};
  for (const todo of filtered) {
    const key = todo.dueDate || 'sem-data';
    (groups[key] ??= []).push(todo);
  }
  return Object.keys(groups)
    .sort((a, b) => {
      if (a === 'sem-data') return -1;
      if (b === 'sem-data') return 1;
      return a.localeCompare(b);
    })
    .map((key) => ({ date: key, todos: groups[key] }));
}
