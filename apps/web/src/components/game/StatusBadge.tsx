import type { GameStatus } from '@dashylife/shared';
import { getStatusBadgeClass, getStatusLabel } from '../../utils/gameUtils';

export function StatusBadge({ status }: { status: GameStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium ${getStatusBadgeClass(status)}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
