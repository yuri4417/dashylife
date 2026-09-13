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
        <article key={game.id} className="bg-surface border border-border-subtle rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-primary truncate">{game.title}</h4>
              <p className="text-xs text-tertiary mt-0.5">
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
          <div className="flex items-center justify-end gap-1 mt-2">
            <button
              onClick={() => onEdit(game)}
              className="text-tertiary hover:text-primary transition-colors w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-active"
              aria-label="Editar jogo"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => onDelete(game.id)}
              className="text-tertiary hover:text-danger transition-colors w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-active"
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
