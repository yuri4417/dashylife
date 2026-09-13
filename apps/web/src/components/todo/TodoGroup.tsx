import type { Todo } from '@dashylife/shared';
import { formatGroupDate, type TodoGroup as TodoGroupData } from '../../utils/todoUtils';
import { TodoItem } from './TodoItem';

interface TodoGroupProps {
  group: TodoGroupData;
  onEdit: (todo: Todo) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TodoGroup({ group, onEdit, onComplete, onDelete }: TodoGroupProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex-1 h-0.5 bg-border-subtle rounded-full" />
        <span className="text-sm sm:text-lg font-bold text-primary whitespace-nowrap px-2 sm:px-3 text-center">
          {formatGroupDate(group.date)}
        </span>
        <div className="flex-1 h-0.5 bg-border-subtle rounded-full" />
      </div>
      <ul className="space-y-3">
        {group.todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onEdit={onEdit} onComplete={onComplete} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  );
}
