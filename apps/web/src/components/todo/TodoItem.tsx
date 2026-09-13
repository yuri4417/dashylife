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
      className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 bg-surface rounded-2xl border border-border-subtle hover:border-border ${
        highlight === 'overdue' ? 'border-l-3 border-danger' : ''
      } ${highlight === 'due-soon' ? 'border-l-3 border-warning' : ''}`}
    >
      <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
        <input
          type="checkbox"
          className="appearance-none w-5 h-5 border-2 border-border rounded cursor-pointer transition-colors checked:bg-accent checked:border-accent peer"
          onChange={() => onComplete(todo.id)}
          aria-label="Concluir tarefa"
        />
        <Check
          className="w-3.5 h-3.5 text-white absolute left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
          strokeWidth={3}
        />
      </div>
      <div onClick={() => onEdit(todo)} className="flex-1 min-w-0 cursor-pointer">
        <span className="flex-1 text-sm text-primary">{todo.title}</span>
        {todo.description && (
          <span className="text-xs text-tertiary flex-shrink-0 max-w-[200px] truncate">
            {todo.description}
          </span>
        )}
      </div>
      {todo.dueDate && (
        <span
          className={`text-xs flex-shrink-0 hidden min-[400px]:inline ${
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
          className="text-xs text-tertiary flex-shrink-0 hidden sm:flex items-center gap-1"
          title={`Repete a cada ${todo.repetition.interval} ${todo.repetition.type === 'hours' ? 'horas' : todo.repetition.type === 'days' ? 'dias' : 'semanas'}`}
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
        className="text-tertiary hover:text-danger transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active flex-shrink-0"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
