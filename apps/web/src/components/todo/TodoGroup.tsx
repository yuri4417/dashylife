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
      <div className="flex items-center gap-3">
        <span className="whitespace-nowrap text-sm font-semibold text-primary">
          {formatGroupDate(group.date)}
        </span>
        <div className="h-px flex-1 bg-border-subtle" />
      </div>
      <ul className="space-y-3">
        {group.todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onEdit={onEdit}
            onComplete={onComplete}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
}
