import { Edit3, Trash2 } from 'lucide-react';
import type { Game } from '@dashylife/shared';
import { formatDate } from '../../utils/dateUtils';
import { StatusBadge } from './StatusBadge';
import { TagList } from './TagList';

interface GameCardsProps {
  games: Game[];
  onEdit: (game: Game) => void;
  onDelete: (id: string) => void;
}

export function GameCards({ games, onEdit, onDelete }: GameCardsProps) {
  return (
    <div className="space-y-3 md:hidden">
      {games.map((game) => (
        <article
          key={game.id}
          className="rounded-xl border border-border-subtle bg-surface p-4 transition-colors hover:border-border"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-semibold text-primary">{game.title}</h4>
              <p className="mt-0.5 text-xs text-tertiary">
                {game.platform}
                {game.date ? ` • ${formatDate(game.date)}` : ''}
              </p>
            </div>
            <span className="flex-shrink-0">
              <StatusBadge status={game.status} />
            </span>
          </div>
          {game.tags.length > 0 && (
            <div className="mt-3">
              <TagList gameId={game.id} tags={game.tags} maxVisible={4} mobile />
            </div>
          )}
          <div className="mt-3 flex items-center justify-end gap-1">
            <button
              onClick={() => onEdit(game)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-tertiary transition-colors hover:bg-surface-active hover:text-primary"
              aria-label="Editar jogo"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => onDelete(game.id)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-tertiary transition-colors hover:bg-surface-active hover:text-danger"
              aria-label="Excluir jogo"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
