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
  return 'bg-gray-400';
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
        <p className="text-tertiary text-sm">Carregando...</p>
      </Card>
    );
  }

  return (
    <Card>
      <SummaryTitle />
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard label="Total" value={todos.length} />
        <StatCard label="Pendentes" value={pendingTodos.length} />
        <StatCard label="Vencidas" value={overdueTodos.length} />
      </div>
      {upcomingTodos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-tertiary">
            Nenhuma tarefa programada para os próximos dias. Aproveite seu tempo livre!
          </p>
        </div>
      ) : (
        <div>
          <h4 className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">
            Próximas tarefas
          </h4>
          <ul className="space-y-3 max-h-40 overflow-y-auto pr-2">
            {upcomingTodos.map((todo) => {
              const label = getDueDateLabel(todo.dueDate);
              return (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 p-3 bg-surface-active border border-border-subtle rounded-xl transition-colors hover:border-border"
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${getDotColor(label)} flex-shrink-0`} />
                  <span className="text-sm text-primary truncate flex-1 min-w-0">{todo.title}</span>
                  <span className="text-xs text-tertiary whitespace-nowrap px-2 py-0.5 bg-border/60 rounded-pill">
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
    <div className="flex items-center gap-3 mb-6">
      <CheckSquare size={20} className="text-accent" />
      <h3 className="font-display text-lg font-semibold text-primary">Tarefas - Resumo</h3>
    </div>
  );
}
