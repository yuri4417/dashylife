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
      className={`rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-accent/40 bg-accent/10 text-accent'
          : 'border-border-subtle text-tertiary hover:border-border hover:bg-surface-active'
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
    <div className="mb-6 rounded-xl border border-border-subtle bg-surface p-4 sm:mb-8 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Filter size={16} className="text-accent" />
        <span className="text-sm font-medium text-tertiary">Filtros</span>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-tertiary">
            Plataforma
          </label>
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
          <label className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-tertiary">
            Status
          </label>
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
