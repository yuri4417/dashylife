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
    <div className="overflow-x-auto hidden md:block">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border-subtle">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                className="py-3 px-4 text-xs font-semibold text-tertiary uppercase tracking-wider cursor-pointer hover:text-primary select-none"
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key && <span>{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                </div>
              </th>
            ))}
            <th className="py-3 px-4 text-xs font-semibold text-tertiary uppercase tracking-wider">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {games.map((game) => (
            <tr key={game.id} className="hover:bg-surface-active transition-colors">
              <td className="py-4 px-4 text-sm text-primary font-medium">{game.title}</td>
              <td className="py-4 px-4 text-sm text-primary">{game.platform}</td>
              <td className="py-4 px-4">
                <StatusBadge status={game.status} />
              </td>
              <td className="py-4 px-4 text-sm text-tertiary">{game.date ? formatDate(game.date) : '-'}</td>
              <td className="py-4 px-4 text-sm text-tertiary max-w-xs truncate">{game.description || '-'}</td>
              <td className="py-4 px-4">
                <TagList gameId={game.id} tags={game.tags} />
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(game)}
                    className="text-tertiary hover:text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active"
                    aria-label="Editar jogo"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(game.id)}
                    className="text-tertiary hover:text-danger transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active"
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
