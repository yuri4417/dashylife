import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Game, GameStatus } from '@dashylife/shared';
import {
  createGame,
  deleteGame as apiDeleteGame,
  fetchGames,
  fetchSettings,
  updateGame,
} from '../utils/api';
import { DEFAULT_PLATFORMS, parseTags, serializeTags } from '../utils/gameUtils';
import { useBodyScrollLock } from './useBodyScrollLock';

export interface GameFormData {
  title: string;
  platform: string;
  status: GameStatus;
  date: string;
  description: string;
  tags: string;
}

interface LocalGameListSettings {
  enabled: boolean;
  platforms: { name: string; visible: boolean }[];
}

const EMPTY_FORM: GameFormData = {
  title: '',
  platform: 'Steam',
  status: 'nao-jogado',
  date: '',
  description: '',
  tags: '',
};

type SortKey = keyof Game;

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<GameFormData>(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'title',
    direction: 'asc',
  });
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<GameStatus[]>([]);
  const [settings, setSettings] = useState<LocalGameListSettings>({
    enabled: true,
    platforms: DEFAULT_PLATFORMS.map((name) => ({ name, visible: true })),
  });
  const [modalError, setModalError] = useState('');
  const [errorField, setErrorField] = useState<keyof GameFormData | null>(null);

  const isEditing = editingId !== null;
  const visiblePlatforms = useMemo(
    () => settings.platforms.filter((p) => p.visible).map((p) => p.name).sort(),
    [settings.platforms],
  );
  const allPlatforms = useMemo(
    () => settings.platforms.map((p) => p.name).sort(),
    [settings.platforms],
  );

  const loadGames = useCallback(async () => {
    try {
      setLoading(true);
      setGames(await fetchGames());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar jogos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings().then(setSettings).catch(() => {});
    loadGames();
  }, [loadGames]);

  useBodyScrollLock(modalOpen);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setModalError('');
    setErrorField(null);
  }, []);

  const openEditModal = useCallback((game: Game) => {
    setEditingId(game.id);
    setFormData({
      title: game.title,
      platform: game.platform,
      status: game.status,
      date: game.date || '',
      description: game.description || '',
      tags: serializeTags(game.tags),
    });
    setModalOpen(true);
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingId(null);
    setFormData({
      title: '',
      platform: visiblePlatforms[0] || 'Steam',
      status: 'nao-jogado',
      date: new Date().toISOString().split('T')[0],
      description: '',
      tags: '',
    });
    setModalOpen(true);
  }, [visiblePlatforms]);

  const updateForm = useCallback((field: keyof GameFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const saveGame = useCallback(async () => {
    if (!formData.title.trim()) {
      setModalError('O título é obrigatório.');
      setErrorField('title');
      return;
    }

    try {
      const gameData = {
        title: formData.title,
        platform: formData.platform,
        status: formData.status,
        date: formData.date || undefined,
        description: formData.description || undefined,
        tags: parseTags(formData.tags),
      };

      if (isEditing && editingId) {
        const updated = await updateGame(editingId, gameData);
        setGames((prev) => prev.map((g) => (g.id === editingId ? updated : g)));
      } else {
        const created = await createGame(gameData);
        setGames((prev) => [created, ...prev]);
      }
      closeModal();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : isEditing ? 'Erro ao atualizar jogo' : 'Erro ao criar jogo',
      );
    }
  }, [formData, isEditing, editingId, closeModal]);

  const deleteGame = useCallback(async (id: string) => {
    try {
      await apiDeleteGame(id);
      setGames((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error('Erro ao excluir jogo:', err);
    }
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const toggleInList = useCallback(
    <T,>(setter: Dispatch<SetStateAction<T[]>>, value: T, active: boolean) => {
      setter((prev) => (active ? [...prev, value] : prev.filter((v) => v !== value)));
    },
    [],
  );

  const handlePlatformFilterChange = useCallback(
    (platform: string, checked: boolean) => toggleInList(setPlatformFilter, platform, checked),
    [toggleInList],
  );

  const handleStatusFilterChange = useCallback(
    (status: GameStatus, checked: boolean) => toggleInList(setStatusFilter, status, checked),
    [toggleInList],
  );

  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const result = games.filter((game) => {
      if (query && !game.title.toLowerCase().includes(query) && !game.description?.toLowerCase().includes(query)) {
        return false;
      }
      if (platformFilter.length > 0 && !platformFilter.includes(game.platform)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(game.status)) return false;
      return true;
    });

    return [...result].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [games, searchQuery, platformFilter, statusFilter, sortConfig]);

  const handleExportFilteredJSON = useCallback(() => {
    const jsonString = JSON.stringify(filteredGames, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamelist-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredGames]);

  return {
    games,
    loading,
    error,
    modalOpen,
    isEditing,
    formData,
    searchQuery,
    sortConfig,
    platformFilter,
    statusFilter,
    settings,
    modalError,
    errorField,
    visiblePlatforms,
    allPlatforms,
    filteredGames,
    loadGames,
    setSearchQuery,
    openCreateModal,
    openEditModal,
    closeModal,
    updateForm,
    saveGame,
    deleteGame,
    handleSort,
    handlePlatformFilterChange,
    handleStatusFilterChange,
    handleExportFilteredJSON,
  };
}

export type UseGamesReturn = ReturnType<typeof useGames>;
