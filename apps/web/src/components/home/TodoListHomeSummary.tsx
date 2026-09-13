import { useEffect, useState } from 'react';
import { CheckSquare } from 'lucide-react';
import type { Todo } from '@dashylife/shared';
import { fetchTodos } from '../../utils/api';
import { Card, StatCard } from '../ui/Card';

function getDueDateLabel(dueDate?: string): string {
  if (!dueDate) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays === -1) return 'Ontem';
  if (diffDays > 1) return `Em ${diffDays} dias`;
  return 'Atrasada';
}

function getDotColor(label: string): string {
  if (label === 'Hoje') return 'bg-orange-400';
  if (label === 'Amanhã') return 'bg-blue-400';
  return 'bg-zinc-500';
}

export function TodoListHomeSummary() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodos()
      .then(setTodos)
      .catch(() => setTodos([]))
      .finally(() => setLoading(false));
  }, []);

  // Estado derivado calculado durante a renderização
  const pendingTodos = todos.filter((todo) => !todo.completed);
  const overdueTodos = todos.filter(
    (todo) => !todo.completed && todo.dueDate && new Date(todo.dueDate) < new Date(new Date().toDateString()),
  );
  const upcomingTodos = todos
    .filter((todo) => !todo.completed && todo.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3);

  if (loading) {
    return (
      <Card>
        <SummaryTitle />
        <p className="text-sm text-tertiary">Carregando...</p>
      </Card>
    );
  }

  return (
    <Card>
      <SummaryTitle />
      <div className="mb-5 grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Total" value={todos.length} />
        <StatCard label="Pendentes" value={pendingTodos.length} />
        <StatCard label="Vencidas" value={overdueTodos.length} />
      </div>
      {upcomingTodos.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-tertiary">
            Nenhuma tarefa programada para os próximos dias. Aproveite seu tempo livre!
          </p>
        </div>
      ) : (
        <div>
          <h4 className="mb-3 text-[10px] font-medium uppercase tracking-widest text-tertiary">
            Próximas tarefas
          </h4>
          <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
            {upcomingTodos.map((todo) => {
              const label = getDueDateLabel(todo.dueDate);
              return (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2.5 transition-colors hover:border-border"
                >
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${getDotColor(label)}`} />
                  <span className="min-w-0 flex-1 truncate text-sm text-primary">{todo.title}</span>
                  <span className="flex-shrink-0 rounded-pill bg-surface-active px-2 py-0.5 text-xs text-tertiary">
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

function SummaryTitle() {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-active text-accent">
        <CheckSquare size={18} />
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-lg font-semibold tracking-tight text-primary">Tarefas</h3>
        <p className="truncate text-[10px] font-medium uppercase tracking-widest text-tertiary">
          Resumo do módulo
        </p>
      </div>
    </div>
  );
}
