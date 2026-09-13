import { GameStatus, GameStatusOption } from '@dashylife/shared';

export const DEFAULT_PLATFORMS = ['EA App', 'Epic Games', 'GOG', 'Steam', 'Ubisoft Connect'];

export const GAME_STATUS_OPTIONS: GameStatusOption[] = [
  { value: 'nao-jogado', label: 'Não jogado' },
  { value: 'jogando', label: 'Jogando' },
  { value: 'zerado', label: 'Zerado' },
  { value: 'droppado', label: 'Droppado' },
];

const TAG_COLORS = [
  'bg-red-500/20 text-red-400 border-red-500/30',
  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'bg-green-500/20 text-green-400 border-green-500/30',
  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
];

export function normalizeTag(tag: string): string {
  const trimmed = tag.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function parseTags(tagsString: string): string[] {
  if (!tagsString.trim()) return [];
  return tagsString.split(',').map(normalizeTag).filter(Boolean);
}

export function serializeTags(tags: string[]): string {
  return tags.join(', ');
}

export function getStatusLabel(status: GameStatus): string {
  return GAME_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

export function getStatusBadgeClass(status: GameStatus): string {
  switch (status) {
    case 'jogando':
      return 'bg-blue-500/20 text-blue-400';
    case 'zerado':
      return 'bg-green-500/20 text-green-400';
    case 'droppado':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-tertiary/20 text-tertiary';
  }
}
