import { Check, Repeat2, Trash2 } from 'lucide-react';
import type { Todo } from '@dashylife/shared';
import { getDueDateDisplay, getTodoHighlight } from '../../utils/todoUtils';

interface TodoItemProps {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onEdit, onComplete, onDelete }: TodoItemProps) {
  const highlight = getTodoHighlight(todo);

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-border-subtle bg-surface px-4 py-3.5 transition-colors hover:border-border sm:gap-4 sm:px-5 sm:py-4 ${
        highlight === 'overdue' ? 'border-l-3 border-l-danger' : ''
      } ${highlight === 'due-soon' ? 'border-l-3 border-l-warning' : ''}`}
    >
      <div className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center">
        <input
          type="checkbox"
          className="peer h-5 w-5 appearance-none cursor-pointer rounded-md border-2 border-border transition-colors checked:border-accent checked:bg-accent"
          onChange={() => onComplete(todo.id)}
          aria-label="Concluir tarefa"
        />
        <Check
          className="pointer-events-none absolute left-0.5 top-0.5 h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
          strokeWidth={3}
        />
      </div>
      <div onClick={() => onEdit(todo)} className="min-w-0 flex-1 cursor-pointer">
        <span className="block truncate text-sm text-primary">{todo.title}</span>
        {todo.description && (
          <span className="mt-0.5 block max-w-[200px] truncate text-xs text-tertiary">
            {todo.description}
          </span>
        )}
      </div>
      {todo.dueDate && (
        <span
          className={`hidden text-xs flex-shrink-0 min-[400px]:inline ${
            highlight === 'overdue'
              ? 'text-danger'
              : highlight === 'due-soon'
                ? 'text-warning'
                : 'text-tertiary'
          }`}
        >
          {getDueDateDisplay(todo)}
        </span>
      )}
      {todo.repetition && (
        <span
          className="hidden items-center gap-1 text-xs text-tertiary flex-shrink-0 sm:flex"
          title={`Repete a cada ${todo.repetition.interval} ${
            todo.repetition.type === 'hours' ? 'horas' : todo.repetition.type === 'days' ? 'dias' : 'semanas'
          }`}
        >
          <Repeat2 size={12} /> {todo.repetition.interval}x{' '}
          {todo.repetition.type === 'hours' ? 'h' : todo.repetition.type === 'days' ? 'd' : 'sem'}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(todo.id);
        }}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-tertiary transition-colors hover:bg-surface-active hover:text-danger"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
