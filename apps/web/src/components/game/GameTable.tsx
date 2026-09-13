import { Edit3, Trash2 } from 'lucide-react';
import type { Game } from '@dashylife/shared';
import { formatDate } from '../../utils/dateUtils';
import { StatusBadge } from './StatusBadge';
import { TagList } from './TagList';

interface GameTableProps {
  games: Game[];
  sortKey: keyof Game;
  sortDirection: 'asc' | 'desc';
  onSort: (key: keyof Game) => void;
  onEdit: (game: Game) => void;
  onDelete: (id: string) => void;
}

const COLUMNS = [
  { key: 'title', label: 'Título' },
  { key: 'platform', label: 'Plataforma' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Data' },
  { key: 'description', label: 'Descrição' },
  { key: 'tags', label: 'Tags' },
] as const;

export function GameTable({ games, sortKey, sortDirection, onSort, onEdit, onDelete }: GameTableProps) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border-subtle">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                className="cursor-pointer select-none px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-tertiary transition-colors hover:text-primary"
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key && (
                    <span className="text-accent">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </div>
              </th>
            ))}
            <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-tertiary">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {games.map((game) => (
            <tr key={game.id} className="transition-colors hover:bg-surface-active">
              <td className="px-4 py-4 text-sm font-medium text-primary">{game.title}</td>
              <td className="px-4 py-4 text-sm text-primary">{game.platform}</td>
              <td className="px-4 py-4">
                <StatusBadge status={game.status} />
              </td>
              <td className="px-4 py-4 text-sm text-tertiary">{game.date ? formatDate(game.date) : '-'}</td>
              <td className="max-w-xs truncate px-4 py-4 text-sm text-tertiary">{game.description || '-'}</td>
              <td className="px-4 py-4">
                <TagList gameId={game.id} tags={game.tags} />
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(game)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-tertiary transition-colors hover:bg-surface-active hover:text-primary"
                    aria-label="Editar jogo"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(game.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-tertiary transition-colors hover:bg-surface-active hover:text-danger"
                    aria-label="Excluir jogo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
