import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Game, GameStatus, GameStatusOption } from '@dashylife/shared';
import { fetchGames, createGame, updateGame, deleteGame as apiDeleteGame, fetchSettings } from '../utils/api';
import { formatDate } from '../utils/dateUtils';
import { Plus, Search, Trash2, Edit3, Filter, Check, X, Download } from 'lucide-react';

const DEFAULT_PLATFORMS = ['EA App', 'Epic Games', 'GOG', 'Steam', 'Ubisoft Connect'];

const GAME_STATUS_OPTIONS: GameStatusOption[] = [
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

function normalizeTag(tag: string): string {
  const trimmed = tag.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function parseTags(tagsString: string): string[] {
  if (!tagsString.trim()) return [];
  return tagsString.split(',').map(normalizeTag).filter(Boolean);
}

function serializeTags(tags: string[]): string {
  return tags.join(', ');
}

interface GameFormData {
  title: string;
  platform: string;
  status: GameStatus;
  date: string;
  description: string;
  tags: string;
}

interface GameListSettings {
  enabled: boolean;
  platforms: { name: string; visible: boolean }[];
}

export function GameList() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<GameFormData>({
    title: '',
    platform: 'Steam',
    status: 'nao-jogado',
    date: '',
    description: '',
    tags: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Game; direction: 'asc' | 'desc' }>({ key: 'title', direction: 'asc' });
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<GameStatus[]>([]);
  const [settings, setSettings] = useState<GameListSettings>({ enabled: true, platforms: DEFAULT_PLATFORMS.map(name => ({ name, visible: true })) });
  const [modalError, setModalError] = useState('');
  const [errorField, setErrorField] = useState<keyof GameFormData | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isEditing = editingId !== null;

  const visiblePlatforms = useMemo(() => settings.platforms.filter(p => p.visible).map(p => p.name).sort(), [settings.platforms]);
  const allPlatforms = useMemo(() => settings.platforms.map(p => p.name).sort(), [settings.platforms]);

  const loadGames = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchGames();
      setGames(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar jogos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings().then((s) => setSettings(s)).catch(() => {});
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormData({ title: '', platform: 'Steam', status: 'nao-jogado', date: '', description: '', tags: '' });
    setModalError('');
    setErrorField(null);
  };

  const openEditModal = (game: Game) => {
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
  };

  const openCreateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingId(null);
    setFormData({
      title: '',
      platform: visiblePlatforms[0] || 'Steam',
      status: 'nao-jogado',
      date: today,
      description: '',
      tags: '',
    });
    setModalOpen(true);
  };

  const updateForm = (field: keyof GameFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveGame = async () => {
    let error: string | null = null;
    let errorField: keyof GameFormData | null = null;

    if (!formData.title.trim()) {
      error = 'O título é obrigatório.';
      errorField = 'title';
    }

    if (error) {
      setModalError(error);
      setErrorField(errorField!);
      return;
    }

    try {
      const tags = parseTags(formData.tags);
      const gameData = {
        title: formData.title,
        platform: formData.platform,
        status: formData.status,
        date: formData.date || undefined,
        description: formData.description || undefined,
        tags,
      };

      if (isEditing && editingId) {
        const updated = await updateGame(editingId, gameData);
        setGames((prev) => prev.map((g) => (g.id === editingId ? updated : g)));
      } else {
        const newGame = await createGame(gameData);
        setGames((prev) => [newGame, ...prev]);
      }
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : isEditing ? 'Erro ao atualizar jogo' : 'Erro ao criar jogo');
    }
  };

  const deleteGame = async (id: string) => {
    try {
      await apiDeleteGame(id);
      setGames((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error('Erro ao excluir jogo:', err);
    }
  };

  const handleSort = (key: keyof Game) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredGames = useMemo(() => {
    let result = games;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((game) =>
        game.title.toLowerCase().includes(query) ||
        (game.description && game.description.toLowerCase().includes(query))
      );
    }

    if (platformFilter.length > 0) {
      result = result.filter((game) => platformFilter.includes(game.platform));
    }

    if (statusFilter.length > 0) {
      result = result.filter((game) => statusFilter.includes(game.status));
    }

    result = [...result].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [games, searchQuery, platformFilter, statusFilter, sortConfig]);

  const handlePlatformFilterChange = (platform: string, checked: boolean) => {
    setPlatformFilter((prev) => checked ? [...prev, platform] : prev.filter((p) => p !== platform));
  };

  const handleStatusFilterChange = (status: GameStatus, checked: boolean) => {
    setStatusFilter((prev) => checked ? [...prev, status] : prev.filter((s) => s !== status));
  };

  const handleExportFilteredJSON = () => {
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
  };

  if (!settings.enabled) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <h3 className="text-xl sm:text-2xl font-semibold text-primary">GameList</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportFilteredJSON}
            className="flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 rounded-pill text-sm font-medium text-tertiary border border-border hover:text-primary hover:border-border-subtle transition-colors"
            title="Exportar jogos filtrados"
          >
            <Download size={16} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 sm:py-2 rounded-pill font-medium text-sm bg-action text-action-text hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Novo Jogo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-tertiary text-sm">Carregando...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-danger text-sm mb-2">{error}</p>
          <button
            onClick={loadGames}
            className="px-4 py-2 text-sm font-medium text-primary bg-surface border border-border rounded-pill hover:bg-surface-active transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
        <div className="relative mb-6 sm:mb-8">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar jogos pelo título..."
            className="w-full pl-11 pr-4 py-3 text-sm bg-surface border border-border text-primary placeholder-tertiary focus:outline-none focus:border-accent rounded-pill"
          />
        </div>

        <div className="mb-6 sm:mb-8 bg-surface border border-border/50 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-accent" />
            <span className="text-sm font-medium text-tertiary">Filtros</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-tertiary mb-2">Plataforma</label>
              <div className="flex flex-wrap gap-2">
                {allPlatforms.map((platform) => {
                  const isActive = platformFilter.includes(platform);
                  return (
                    <button
                      key={platform}
                      onClick={() => handlePlatformFilterChange(platform, !isActive)}
                      className={`px-3 py-1.5 rounded-pill text-xs font-medium border transition-colors ${
                        isActive
                          ? 'bg-accent/20 text-accent border-accent/30'
                          : 'bg-transparent text-tertiary border-border hover:border-border hover:bg-surface-active'
                      }`}
                    >
                      {isActive && <Check size={10} className="inline mr-1" />}
                      {platform}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-tertiary mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {GAME_STATUS_OPTIONS.map((status) => {
                  const isActive = statusFilter.includes(status.value);
                  return (
                    <button
                      key={status.value}
                      onClick={() => handleStatusFilterChange(status.value, !isActive)}
                      className={`px-3 py-1.5 rounded-pill text-xs font-medium border transition-colors ${
                        isActive
                          ? 'bg-accent/20 text-accent border-accent/30'
                          : 'bg-transparent text-tertiary border-border hover:border-border hover:bg-surface-active'
                      }`}
                    >
                      {isActive && <Check size={10} className="inline mr-1" />}
                      {status.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {filteredGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-tertiary text-sm">
              {searchQuery || platformFilter.length > 0 || statusFilter.length > 0
                ? 'Nenhum jogo encontrado com esses filtros.'
                : 'Nenhum jogo encontrado. Crie seu primeiro jogo!'}
            </p>
          </div>
        ) : (
          <>
          <div className="space-y-3 md:hidden">
            {filteredGames.map((game) => (
              <article key={game.id} className="bg-surface border border-border/50 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-primary truncate">{game.title}</h4>
                    <p className="text-xs text-tertiary mt-0.5">{game.platform}{game.date ? ` • ${formatDate(game.date)}` : ''}</p>
                  </div>
                  <span className={`inline-flex flex-shrink-0 items-center px-2.5 py-0.5 rounded-pill text-xs font-medium ${
                    game.status === 'jogando' ? 'bg-blue-500/20 text-blue-400' :
                    game.status === 'zerado' ? 'bg-green-500/20 text-green-400' :
                    game.status === 'droppado' ? 'bg-red-500/20 text-red-400' :
                    'bg-tertiary/20 text-tertiary'
                  }`}>
                    {GAME_STATUS_OPTIONS.find(s => s.value === game.status)?.label || game.status}
                  </span>
                </div>
                {game.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {game.tags.slice(0, 4).map((tag, idx) => (
                      <span
                        key={`${game.id}-m-${idx}`}
                        className={`inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-medium border ${getTagColor(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                    {game.tags.length > 4 && (
                      <span className="text-xs text-tertiary">+{game.tags.length - 4}</span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-end gap-1 mt-2">
                  <button
                    onClick={() => openEditModal(game)}
                    className="text-tertiary hover:text-primary transition-colors w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-active"
                    aria-label="Editar jogo"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => deleteGame(game.id)}
                    className="text-tertiary hover:text-danger transition-colors w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-active"
                    aria-label="Excluir jogo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-subtle">
                  {(['title', 'platform', 'status', 'date', 'description', 'tags'] as const).map((key) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="py-3 px-4 text-xs font-semibold text-tertiary uppercase tracking-wider cursor-pointer hover:text-primary select-none"
                    >
                      <div className="flex items-center gap-1">
                        {key === 'title' && 'Título'}
                        {key === 'platform' && 'Plataforma'}
                        {key === 'status' && 'Status'}
                        {key === 'date' && 'Data'}
                        {key === 'description' && 'Descrição'}
                        {key === 'tags' && 'Tags'}
                        {sortConfig.key === key && (
                          <span>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-xs font-semibold text-tertiary uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredGames.map((game) => (
                  <tr key={game.id} className="hover:bg-surface-active transition-colors">
                    <td className="py-4 px-4 text-sm text-primary font-medium">{game.title}</td>
                    <td className="py-4 px-4 text-sm text-primary">{game.platform}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium ${
                        game.status === 'jogando' ? 'bg-blue-500/20 text-blue-400' :
                        game.status === 'zerado' ? 'bg-green-500/20 text-green-400' :
                        game.status === 'droppado' ? 'bg-red-500/20 text-red-400' :
                        'bg-tertiary/20 text-tertiary'
                      }`}>
                        {GAME_STATUS_OPTIONS.find(s => s.value === game.status)?.label || game.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-tertiary">
                      {game.date ? formatDate(game.date) : '-'}
                    </td>
                    <td className="py-4 px-4 text-sm text-tertiary max-w-xs truncate">
                      {game.description || '-'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {game.tags.map((tag, idx) => (
                          <span
                            key={`${game.id}-${idx}`}
                            className={`inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-medium border ${getTagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                        {game.tags.length === 0 && <span className="text-tertiary text-xs">-</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(game)}
                          className="text-tertiary hover:text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active"
                          aria-label="Editar jogo"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deleteGame(game.id)}
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
          </>
        )}

        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
            onClick={closeModal}
          >
            <div
              ref={modalRef}
              className="bg-surface border border-border/50 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-8">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <h3 className="text-lg font-semibold text-primary">{isEditing ? 'Editar Jogo' : 'Novo Jogo'}</h3>
                  <button
                    onClick={closeModal}
                    className="text-tertiary hover:text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-tertiary mb-1.5">Título</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => updateForm('title', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveGame()}
                      placeholder="Título do jogo..."
                      className={`w-full px-4 py-3 text-sm bg-surface border text-primary placeholder-tertiary focus:outline-none focus:border-accent rounded-lg ${
                        errorField === 'title' ? 'border-danger' : 'border-border'
                      }`}
                    />
                    {errorField === 'title' && (
                      <p className="mt-1.5 text-xs text-danger">{modalError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-tertiary mb-1.5">Plataforma</label>
                    <select
                      value={formData.platform}
                      onChange={(e) => updateForm('platform', e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-surface border border-border text-primary focus:outline-none focus:border-accent rounded-lg"
                    >
                      {visiblePlatforms.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-tertiary mb-1.5">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => updateForm('status', e.target.value as GameStatus)}
                      className="w-full px-4 py-3 text-sm bg-surface border border-border text-primary focus:outline-none focus:border-accent rounded-lg"
                    >
                      {GAME_STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-tertiary mb-1.5">Data</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => updateForm('date', e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-surface border border-border text-primary focus:outline-none focus:border-accent rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-tertiary mb-1.5">Descrição (opcional)</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateForm('description', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveGame()}
                      placeholder="Adicione uma descrição..."
                      rows={3}
                      maxLength={500}
                      className={`w-full px-4 py-3 text-sm bg-surface border text-primary placeholder-tertiary focus:outline-none focus:border-accent rounded-lg resize-none ${
                        errorField === 'description' ? 'border-danger' : 'border-border'
                      }`}
                    />
                    <div className="mt-1.5 text-right">
                      <span className={`text-xs font-medium ${formData.description.length > 450 ? 'text-danger' : 'text-tertiary'}`}>
                        {formData.description.length}/500
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-tertiary mb-1.5">Tags (opcional, separadas por vírgula)</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => updateForm('tags', e.target.value)}
                      placeholder="Ex: RPG, Ação, Multiplayer, Favorito"
                      className="w-full px-4 py-3 text-sm bg-surface border border-border text-primary focus:outline-none focus:border-accent rounded-lg"
                    />
                    <p className="mt-1.5 text-xs text-tertiary">As tags serão normalizadas (primeira letra maiúscula) e duplicatas removidas.</p>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="px-5 py-2.5 text-sm font-medium text-tertiary hover:text-primary transition-colors rounded-pill"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveGame}
                    className="px-5 py-2.5 text-sm font-medium text-action-text bg-action hover:opacity-90 transition-opacity rounded-pill"
                  >
                    {isEditing ? 'Salvar Alterações' : 'Criar Jogo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}

export function GameListSettingsPanel({ settings, onSave, onImportClick }: { settings: GameListSettings; onSave: (s: GameListSettings) => void; onImportClick: () => void }) {
  const [platforms, setPlatforms] = useState(settings.platforms);
  const [newPlatform, setNewPlatform] = useState('');

  const handleAddPlatform = () => {
    const trimmed = newPlatform.trim();
    if (!trimmed) return;
    if (platforms.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return;
    setPlatforms([...platforms, { name: trimmed, visible: true }]);
    setNewPlatform('');
  };

  const handleRemovePlatform = (name: string) => {
    if (platforms.length <= 1) return;
    setPlatforms(platforms.filter(p => p.name !== name));
  };

  const handleToggleVisibility = (name: string) => {
    setPlatforms(platforms.map(p => p.name === name ? { ...p, visible: !p.visible } : p));
  };

  const handleSave = () => {
    onSave({ ...settings, platforms });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">Configurações do GameList</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative flex items-center justify-center w-5 h-5">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => onSave({ ...settings, enabled: e.target.checked })}
              className="appearance-none w-5 h-5 border-2 border-border rounded cursor-pointer transition-colors checked:bg-accent checked:border-accent peer"
            />
            <Check className="w-3.5 h-3.5 text-white absolute left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
          </div>
          <span className="text-sm font-medium text-tertiary">Módulo Ativo</span>
        </label>
      </div>

      <div className="border-t border-border-subtle pt-6">
        <h4 className="text-sm font-medium text-tertiary mb-3">Plataformas</h4>
        <p className="text-xs text-tertiary mb-4">Gerencie as plataformas disponíveis. Desmarque para ocultar do menu de adição e filtros.</p>
        <div className="space-y-2">
          {platforms.map((platform) => (
            <div key={platform.name} className="flex items-center gap-3 p-3 bg-surface border border-border-subtle rounded-lg">
              <div className="relative flex items-center justify-center w-5 h-5">
                <input
                  type="checkbox"
                  checked={platform.visible}
                  onChange={() => handleToggleVisibility(platform.name)}
                  className="appearance-none w-5 h-5 border-2 border-border rounded cursor-pointer transition-colors checked:bg-accent checked:border-accent peer"
                />
                <Check className="w-3.5 h-3.5 text-white absolute left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
              </div>
              <span className="flex-1 text-sm text-primary">{platform.name}</span>
              {platforms.length > 1 && (
                <button
                  onClick={() => handleRemovePlatform(platform.name)}
                  className="text-tertiary hover:text-danger transition-colors text-lg leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active"
                  aria-label={`Remover ${platform.name}`}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={newPlatform}
            onChange={(e) => setNewPlatform(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlatform()}
            placeholder="Nova plataforma..."
            className="flex-1 px-4 py-3 text-sm bg-surface border border-border text-primary focus:outline-none focus:border-accent rounded-lg"
          />
          <button onClick={handleAddPlatform} className="px-4 py-3 text-sm font-medium text-action-text bg-action hover:opacity-90 transition-opacity rounded-lg">Adicionar</button>
        </div>
      </div>

      <div className="border-t border-border-subtle pt-6">
        <h4 className="text-sm font-medium text-tertiary mb-3">Importar Biblioteca</h4>
        <p className="text-xs text-tertiary mb-4">Importe jogos a partir de um arquivo JSON (formato do teste.json).</p>
        <button
          data-import-trigger
          onClick={onImportClick}
          className="px-5 py-2.5 text-sm font-medium text-primary bg-surface border border-border hover:bg-surface-active transition-colors rounded-pill"
        >
          Importar JSON
        </button>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
        <button onClick={handleSave} className="px-5 py-2.5 text-sm font-medium text-action-text bg-action hover:opacity-90 transition-opacity rounded-pill">Salvar Configurações</button>
      </div>
    </div>
  );
}
