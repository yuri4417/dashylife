import { Check, Filter } from 'lucide-react';
import type { GameStatus } from '@dashylife/shared';
import { GAME_STATUS_OPTIONS } from '../../utils/gameUtils';

interface GameFiltersProps {
  allPlatforms: string[];
  platformFilter: string[];
  statusFilter: GameStatus[];
  onPlatformChange: (platform: string, checked: boolean) => void;
  onStatusChange: (status: GameStatus, checked: boolean) => void;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-pill text-xs font-medium border transition-colors ${
        active
          ? 'bg-accent/20 text-accent border-accent/30'
          : 'bg-transparent text-tertiary border-border hover:border-border hover:bg-surface-active'
      }`}
    >
      {active && <Check size={10} className="inline mr-1" />}
      {children}
    </button>
  );
}

export function GameFilters({
  allPlatforms,
  platformFilter,
  statusFilter,
  onPlatformChange,
  onStatusChange,
}: GameFiltersProps) {
  return (
    <div className="mb-6 sm:mb-8 bg-surface border border-border-subtle rounded-2xl p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter size={16} className="text-accent" />
        <span className="text-sm font-medium text-tertiary">Filtros</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-medium text-tertiary mb-2">Plataforma</label>
          <div className="flex flex-wrap gap-2">
            {allPlatforms.map((platform) => (
              <FilterChip
                key={platform}
                active={platformFilter.includes(platform)}
                onClick={() => onPlatformChange(platform, !platformFilter.includes(platform))}
              >
                {platform}
              </FilterChip>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-tertiary mb-2">Status</label>
          <div className="flex flex-wrap gap-2">
            {GAME_STATUS_OPTIONS.map((status) => (
              <FilterChip
                key={status.value}
                active={statusFilter.includes(status.value)}
                onClick={() => onStatusChange(status.value, !statusFilter.includes(status.value))}
              >
                {status.label}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
