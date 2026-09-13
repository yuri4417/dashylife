import { getTagColor } from '../../utils/gameUtils';

interface TagListProps {
  gameId: string;
  tags: string[];
  maxVisible?: number;
  mobile?: boolean;
}

export function TagList({ gameId, tags, maxVisible, mobile = false }: TagListProps) {
  if (tags.length === 0) {
    return mobile ? null : <span className="text-tertiary text-xs">-</span>;
  }

  const visible = maxVisible ? tags.slice(0, maxVisible) : tags;
  const remainder = maxVisible ? tags.length - maxVisible : 0;
  const keyPrefix = mobile ? `${gameId}-m` : gameId;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag, idx) => (
        <span
          key={`${keyPrefix}-${idx}`}
          className={`inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-medium border ${getTagColor(tag)}`}
        >
          {tag}
        </span>
      ))}
      {remainder > 0 && <span className="text-xs text-tertiary">+{remainder}</span>}
    </div>
  );
}
