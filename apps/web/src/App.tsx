import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Home, ClipboardList, Settings, Gamepad2, ChevronLeft, ChevronRight, Server, Import, Upload, FileJson, X, CheckSquare } from 'lucide-react';
import { Game, GameStatus, GameListSettings, AppSettings } from '@dashylife/shared';
import { fetchGames, updateSettings } from './utils/api';
import { GameList } from './components/GameList';
import { TodoList } from './components/TodoList';
import { Toggle } from './components/Toggle';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

type SectionType = 'home' | 'todo' | 'gamelist' | 'settings';

function App() {
  const [activeSection, setActiveSection] = useState<SectionType>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const [settings, setSettings] = useState<AppSettings>({
    gamelist: {
      enabled: true,
      platforms: [
        { name: 'EA App', visible: true },
        { name: 'Epic Games', visible: true },
        { name: 'GOG', visible: true },
        { name: 'Steam', visible: true },
        { name: 'Ubisoft Connect', visible: true },
      ],
    },
    todolist: {
      enabled: true,
    },
  });

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [newPlatform, setNewPlatform] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<{ index: number; game: any; errors: string[] }[]>([]);
  const [showImportReview, setShowImportReview] = useState(false);
  const [validImports, setValidImports] = useState<Game[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSectionChange = (section: SectionType) => {
    setActiveSection(section);
    mainRef.current?.scrollTo({ top: 0 });
  };

  const handleSettingsSave = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await updateSettings(newSettings.gamelist);
  };

  const updateGamelistSettings = (updater: (prev: GameListSettings) => GameListSettings) => {
    const newSettings = { ...settings, gamelist: updater(settings.gamelist) };
    setSettings(newSettings);
    handleSettingsSave(newSettings);
  };

  const updateTodolistSettings = (updater: (prev: { enabled: boolean }) => { enabled: boolean }) => {
    const newSettings = { ...settings, todolist: updater(settings.todolist) };
    setSettings(newSettings);
    handleSettingsSave(newSettings);
  };

  const processImport = async () => {
    if (!importFile) return;
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) {
        setImportErrors([{ index: -1, game: null, errors: ['Arquivo JSON deve ser um array'] }]);
        setShowImportReview(true);
        return;
      }
      const errors: { index: number; game: any; errors: string[] }[] = [];
      const valid: Game[] = [];
      const validStatuses: GameStatus[] = ['nao-jogado', 'jogando', 'zerado', 'droppado'];
      const rawStatusMap: Record<string, string> = {
        'finished': 'zerado', 'completed': 'zerado', 'concluido': 'zerado', 'zerado': 'zerado', 'concluído': 'zerado',
        'playing': 'jogando', 'play': 'jogando', 'ongoing': 'jogando', 'em andamento': 'jogando', 'endless': 'jogando', 'infinite': 'jogando', 'jogando': 'jogando',
        'nao-jogado': 'nao-jogado', 'não jogado': 'nao-jogado', 'not-played': 'nao-jogado',
        'dropped': 'droppado', 'abandoned': 'droppado', 'droppado': 'droppado', 'abandonado': 'droppado',
        'unplayed': 'nao-jogado', 'unstarted': 'nao-jogado', 'never-played': 'nao-jogado',
      };
      data.forEach((item: any, index: number) => {
        const itemErrors: string[] = [];
        const title = item.name || item.title;
        if (!title || !title.trim()) {
          itemErrors.push('Título é obrigatório');
        }
        const platform = item.launcher || item.platform;
        if (!platform || !platform.trim()) {
          itemErrors.push('Plataforma é obrigatória');
        }
        const rawStatus = item.status;
        let mappedStatus: GameStatus | undefined;
        if (rawStatus && validStatuses.includes(rawStatus as GameStatus)) {
          mappedStatus = rawStatus as GameStatus;
        } else if (rawStatus) {
          mappedStatus = rawStatusMap[rawStatus.toLowerCase()] as GameStatus | undefined;
        }
        if (!mappedStatus && rawStatus) {
          itemErrors.push(`Status inválido: ${rawStatus}`);
        }
        if (itemErrors.length > 0) {
          errors.push({ index, game: item, errors: itemErrors });
        } else {
          const today = new Date().toISOString().split('T')[0];
          valid.push({
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            title: title.trim(),
            platform: platform.trim(),
            status: (mappedStatus || 'nao-jogado') as GameStatus,
            date: item.date || today,
            description: item.description || '',
            tags: (item.tags || []).map((tag: string) => {
              const trimmed = tag.trim().toLowerCase();
              if (!trimmed) return '';
              return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
            }).filter(Boolean),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      });
      setImportErrors(errors);
      setValidImports(valid);
      setShowImportReview(true);
    } catch (err: any) {
      console.error('Erro na importação:', err);
      setImportErrors([{ index: -1, game: null, errors: [`Erro interno: ${err.message || 'Falha ao processar arquivo JSON'}`] }]);
      setShowImportReview(true);
    }
  };

  const applyValidImports = async () => {
    try {
      for (const game of validImports) {
        await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: game.title,
            platform: game.platform,
            status: game.status,
            date: game.date,
            description: game.description,
            tags: game.tags,
          }),
        });
      }
      setValidImports([]);
      setShowImportReview(false);
      setImportFile(null);
      setImportErrors([]);
    } catch (err) {
      console.error('Erro ao importar jogos:', err);
    }
  };

  const loadGamesForHome = useCallback(async (): Promise<Game[]> => {
    try {
      return await fetchGames();
    } catch {
      return [];
    }
  }, []);

  const loadTodosForHome = useCallback(async (): Promise<any[]> => {
    try {
      const response = await fetch('/api/todos');
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  }, []);

  const menuItems = [
    { id: 'home' as SectionType, label: 'Home', Icon: Home },
    ...(settings.todolist.enabled ? [{ id: 'todo' as SectionType, label: 'Tarefas', Icon: ClipboardList }] : []),
    ...(settings.gamelist.enabled ? [{ id: 'gamelist' as SectionType, label: 'GameList', Icon: Gamepad2 }] : []),
    { id: 'settings' as SectionType, label: 'Configurações', Icon: Settings },
  ];

  return (
    <div className="h-dvh flex flex-col md:flex-row bg-bg overflow-hidden">
      {/* Header mobile (topo) — visível só em telas < md */}
      <header className="md:hidden flex items-center gap-2 h-14 px-4 flex-shrink-0 bg-surface border-b border-border-subtle">
        <svg className="w-6 h-6 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        <h1 className="text-lg font-semibold tracking-tight text-primary">DashyLife</h1>
      </header>

      {/* Sidebar desktop — oculta em telas < md */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 bg-surface border-r border-border-subtle transition-all duration-200 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-border-subtle">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <h1 className="text-xl font-semibold tracking-tight text-primary">DashyLife</h1>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-full hover:bg-surface-active text-tertiary hover:text-primary transition-colors"
            aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-pill text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? 'bg-surface-active text-primary'
                  : 'text-tertiary hover:text-primary hover:bg-surface-active'
              }`}
              title={sidebarCollapsed ? item.label : ''}
            >
              <span className="flex-shrink-0 flex items-center justify-center"><item.Icon size={18} /></span>
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              {activeSection === item.id && !sidebarCollapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </aside>

      <main ref={mainRef} className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto pb-24 md:pb-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {activeSection === 'home' && (
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
              {settings.todolist.enabled && (
                <TodoListHomeSummary loadTodos={loadTodosForHome} />
              )}
              {settings.gamelist.enabled && (
                <GameListHomeSummary loadGames={loadGamesForHome} />
              )}
              {!settings.todolist.enabled && !settings.gamelist.enabled && (
                <div className="bg-surface border border-border/50 rounded-2xl p-4 sm:p-8">
                  <div className="flex items-center gap-3 mb-2">
                    <Server size={20} className="text-accent" />
                    <h3 className="text-lg font-semibold text-primary">Serviços</h3>
                  </div>
                  <p className="text-tertiary text-sm">Nenhum serviço ativo. Vá para a página de Configurações para ativar os módulos disponíveis.</p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'todo' && (
            <TodoList />
          )}

          {activeSection === 'gamelist' && (
            <GameList />
          )}

          {activeSection === 'settings' && (
            <div className="max-w-4xl mx-auto">
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-surface border border-border/50 rounded-2xl p-4 sm:p-6 md:p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <Server size={20} className="text-accent" />
                    <h3 className="text-lg font-semibold text-primary">Serviços</h3>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Toggle
                      checked={settings.gamelist.enabled}
                      onChange={(checked) => updateGamelistSettings(prev => ({ ...prev, enabled: checked }))}
                    />
                    <span className="text-sm font-medium text-tertiary">Ativar Módulo GameList</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Toggle
                      checked={settings.todolist.enabled}
                      onChange={(checked) => updateTodolistSettings(prev => ({ ...prev, enabled: checked }))}
                    />
                    <span className="text-sm font-medium text-tertiary">Ativar Módulo Tarefas</span>
                  </label>
                </div>

                {settings.gamelist.enabled && (
                  <div className="bg-surface border border-border/50 rounded-2xl p-4 sm:p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <Gamepad2 size={20} className="text-accent" />
                      <h3 className="text-lg font-semibold text-primary">Configurações do GameList</h3>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-tertiary mb-3">Plataformas</h4>
                      <p className="text-xs text-tertiary mb-4">Gerencie as plataformas disponíveis. Desmarque para ocultar do menu de adição e filtros.</p>
                      <div className="space-y-2">
                        {settings.gamelist.platforms.map((platform) => (
                          <div key={platform.name} className="flex items-center gap-3 p-3 bg-surface-active border border-border/50 rounded-xl">
                            <Toggle
                              checked={platform.visible}
                              onChange={() => {
                                const newPlatforms = settings.gamelist.platforms.map(p =>
                                  p.name === platform.name ? { ...p, visible: !p.visible } : p
                                );
                                updateGamelistSettings(prev => ({ ...prev, platforms: newPlatforms }));
                              }}
                            />
                            <span className="flex-1 min-w-0 truncate text-sm text-primary">{platform.name}</span>
                            {settings.gamelist.platforms.length > 1 && (
                              <button
                                onClick={() => {
                                  const newPlatforms = settings.gamelist.platforms.filter(p => p.name !== platform.name);
                                  updateGamelistSettings(prev => ({ ...prev, platforms: newPlatforms }));
                                }}
                                className="text-tertiary hover:text-danger transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active flex-shrink-0"
                                aria-label={`Remover ${platform.name}`}
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={newPlatform}
                          onChange={(e) => setNewPlatform(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const trimmed = newPlatform.trim();
                              if (!trimmed) return;
                              if (settings.gamelist.platforms.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return;
                              const newPlatforms = [...settings.gamelist.platforms, { name: trimmed, visible: true }];
                              updateGamelistSettings(prev => ({ ...prev, platforms: newPlatforms }));
                              setNewPlatform('');
                            }
                          }}
                          placeholder="Nova plataforma..."
                          className="flex-1 min-w-0 px-4 py-3 text-sm bg-surface border border-border text-primary focus:outline-none focus:border-accent rounded-lg"
                        />
                        <button
                          onClick={() => {
                            const trimmed = newPlatform.trim();
                            if (!trimmed) return;
                            if (settings.gamelist.platforms.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return;
                            const newPlatforms = [...settings.gamelist.platforms, { name: trimmed, visible: true }];
                            updateGamelistSettings(prev => ({ ...prev, platforms: newPlatforms }));
                            setNewPlatform('');
                          }}
                          className="px-4 py-3 text-sm font-medium text-action-text bg-action hover:opacity-90 transition-opacity rounded-lg"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Import size={16} className="text-accent" />
                        <h4 className="text-sm font-medium text-tertiary">Importar Biblioteca</h4>
                      </div>
                      <p className="text-xs text-tertiary mb-4">Importe jogos a partir de um arquivo JSON (formato do teste.json).</p>
                      <button
                        onClick={() => setImportModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-primary bg-surface border border-border hover:bg-surface-active transition-colors rounded-pill"
                      >
                        <Upload size={16} />
                        Importar JSON
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom navigation bar mobile — visível só em telas < md */}
      <nav
        aria-label="Navegação principal"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-border-subtle"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${menuItems.length}, minmax(0, 1fr))` }}>
          {menuItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 px-1 pt-2.5 pb-2 min-h-[60px] text-[10px] font-medium transition-colors ${
                  active ? 'text-primary' : 'text-tertiary'
                }`}
              >
                <span
                  className={`absolute top-0 h-0.5 w-10 rounded-full transition-opacity ${
                    active ? 'bg-accent opacity-100' : 'opacity-0'
                  }`}
                />
                <item.Icon size={22} strokeWidth={active ? 2.25 : 2} />
                <span className="truncate max-w-full leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={() => { setImportModalOpen(false); setImportFile(null); }}>
          <div className="bg-surface border border-border/50 rounded-2xl w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-8">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div className="flex items-center gap-3">
                  <FileJson size={20} className="text-accent" />
                  <h3 className="text-lg font-semibold text-primary">Importar Biblioteca</h3>
                </div>
                <button onClick={() => { setImportModalOpen(false); setImportFile(null); }} className="text-tertiary hover:text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active"><X size={18} /></button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-tertiary mb-1.5">Arquivo JSON</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setImportFile(file);
                    }}
                    className="hidden"
                    id="import-json-file"
                  />
                  <label
                    htmlFor="import-json-file"
                    className="flex items-center justify-center gap-2 w-full px-4 py-8 text-sm bg-surface border border-border border-dashed text-tertiary hover:text-primary hover:border-accent/30 hover:bg-surface-active cursor-pointer rounded-lg transition-colors"
                  >
                    <Upload size={20} />
                    <span className="truncate">{importFile ? importFile.name : 'Clique para selecionar o arquivo JSON'}</span>
                  </label>
                  {importFile && (
                    <div className="mt-2 flex items-center justify-between p-2 bg-surface-active border border-border/50 rounded-xl">
                      <span className="text-sm text-primary truncate mr-2 flex items-center gap-2">
                        <FileJson size={14} className="flex-shrink-0" />
                        {importFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          setImportFile(null);
                        }}
                        className="text-tertiary hover:text-danger transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-active"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-tertiary">Formato esperado: array de objetos com name, launcher, status, date, description, tags</p>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8">
                <button onClick={() => { setImportModalOpen(false); setImportFile(null); }} className="px-5 py-2.5 text-sm font-medium text-tertiary hover:text-primary transition-colors rounded-pill">Cancelar</button>
                <button onClick={processImport} disabled={!importFile} className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-action-text bg-action hover:opacity-90 transition-opacity rounded-pill disabled:opacity-50"><Upload size={16} /> Processar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportReview && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={() => { setShowImportReview(false); setImportFile(null); setValidImports([]); setImportErrors([]); }}>
          <div className="bg-surface border border-border/50 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-8">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h3 className="text-lg font-semibold text-primary">Revisar Importação</h3>
                <button onClick={() => { setShowImportReview(false); setImportFile(null); setValidImports([]); setImportErrors([]); }} className="text-tertiary hover:text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active"><X size={18} /></button>
              </div>
              {importErrors.length > 0 && (
                <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <h4 className="text-sm font-medium text-red-400 mb-2">Itens com erro ({importErrors.length})</h4>
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {importErrors.map((err) => (
                      <li key={err.index >= 0 ? `error-${err.index}` : `error-${Math.random()}`} className="text-xs text-red-300">
                        {err.index >= 0 ? `Item ${err.index + 1}: ` : ''}{err.errors.join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {validImports.length > 0 && (
                <div className="mb-5 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <h4 className="text-sm font-medium text-green-400 mb-2">Itens válidos ({validImports.length})</h4>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {validImports.map((g, idx) => (
                      <li key={idx} className="text-xs text-primary">{g.title} ({g.platform}) - {g.status}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <button onClick={() => { setShowImportReview(false); setImportFile(null); setValidImports([]); setImportErrors([]); }} className="px-5 py-2.5 text-sm font-medium text-tertiary hover:text-primary transition-colors rounded-pill">Ignorar tudo</button>
                <button onClick={applyValidImports} disabled={validImports.length === 0} className="px-5 py-2.5 text-sm font-medium text-action-text bg-action hover:opacity-90 transition-opacity rounded-pill disabled:opacity-50">Importar válidos ({validImports.length})</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GameListHomeSummary({ loadGames }: { loadGames: () => Promise<Game[]> }) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames().then((data) => {
      setGames(data);
      setLoading(false);
    });
  }, [loadGames]);

  const statusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    const statusLabels: Record<string, string> = {
      'nao-jogado': 'Não Jogado',
      'jogando': 'Jogando',
      'zerado': 'Zerado',
      'droppado': 'Droppado',
    };
    games.forEach((game) => {
      statusCounts[game.status] = (statusCounts[game.status] || 0) + 1;
    });
    return Object.entries(statusLabels).map(([value, name]) => ({
      name,
      value: statusCounts[value] || 0,
    }));
  }, [games]);

  const platformData = useMemo(() => {
    const platformCounts: Record<string, number> = {};
    games.forEach((game) => {
      platformCounts[game.platform] = (platformCounts[game.platform] || 0) + 1;
    });
    return Object.entries(platformCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [games]);

  const playingGames = useMemo(() => games.filter(g => g.status === 'jogando'), [games]);

  const COLORS = ['#6366F1', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4', '#F97318', '#EC4899'];

  if (loading) {
    return (
      <div className="bg-surface border border-border/50 rounded-2xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Gamepad2 size={20} className="text-accent" />
          <h3 className="text-lg font-semibold text-primary">GameList - Resumo</h3>
        </div>
        <p className="text-tertiary text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border/50 rounded-2xl p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Gamepad2 size={20} className="text-accent" />
        <h3 className="text-lg font-semibold text-primary">GameList - Resumo</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label="Total" value={games.length} />
        <StatCard label="Jogando" value={playingGames.length} />
        <StatCard label="Não Jogado" value={games.filter(g => g.status === 'nao-jogado').length} />
        <StatCard label="Zerado" value={games.filter(g => g.status === 'zerado').length} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h4 className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-3 text-center">Por Status</h4>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={statusData}
                innerRadius={50}
                outerRadius={65}
                dataKey="value"
                paddingAngle={4}
                stroke="none"
              >
                {statusData.map((_, index) => (
                  <Cell key={`cell-status-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#18181B', borderColor: '#262626', color: '#FFF', borderRadius: '8px' }}
                itemStyle={{ color: '#A3A3A3' }}
                wrapperStyle={{ zIndex: 100 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-1">
          <h4 className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-3 text-center">Por Plataforma</h4>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={platformData}
                innerRadius={50}
                outerRadius={65}
                dataKey="value"
                paddingAngle={4}
                stroke="none"
              >
                {platformData.map((_, index) => (
                  <Cell key={`cell-platform-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#18181B', borderColor: '#262626', color: '#FFF', borderRadius: '8px' }}
                itemStyle={{ color: '#A3A3A3' }}
                wrapperStyle={{ zIndex: 100 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-1 sm:col-span-2">
          <h4 className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">Jogando agora</h4>
          {playingGames.length > 0 ? (
            <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {playingGames.slice(0, 6).map((game) => (
                <li key={game.id} className="flex items-center gap-3 p-3 bg-surface-active border border-border/50 rounded-xl transition-colors hover:border-border">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-sm text-primary truncate flex-1 min-w-0">{game.title}</span>
                  <span className="text-xs text-tertiary whitespace-nowrap px-2 py-0.5 bg-border/50 rounded-pill">{game.platform}</span>
                </li>
              ))}
              {playingGames.length > 6 && (
                <li className="text-xs text-tertiary text-center py-2">+{playingGames.length - 6} mais...</li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-tertiary text-center py-8">Nenhum jogo em andamento</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TodoListHomeSummary({ loadTodos }: { loadTodos: () => Promise<any[]> }) {
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodos().then((data) => {
      setTodos(data);
      setLoading(false);
    });
  }, [loadTodos]);

  const getDueDateLabel = (dueDate?: string) => {
    if (!dueDate) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays === -1) return 'Ontem';
    if (diffDays > 1) return `Em ${diffDays} dias`;
    return `Atrasada`;
  };

  const upcomingTodos = todos
    .filter(todo => !todo.completed && todo.dueDate)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  const overdueTodos = todos.filter(todo => !todo.completed && todo.dueDate && new Date(todo.dueDate) < new Date(new Date().toDateString()));
  const pendingTodos = todos.filter(todo => !todo.completed);

  if (loading) {
    return (
      <div className="bg-surface border border-border/50 rounded-2xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <CheckSquare size={20} className="text-accent" />
          <h3 className="text-lg font-semibold text-primary">Tarefas - Resumo</h3>
        </div>
        <p className="text-tertiary text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border/50 rounded-2xl p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <CheckSquare size={20} className="text-accent" />
        <h3 className="text-lg font-semibold text-primary">Tarefas - Resumo</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard label="Total" value={todos.length} />
        <StatCard label="Pendentes" value={pendingTodos.length} />
        <StatCard label="Vencidas" value={overdueTodos.length} />
      </div>
      {upcomingTodos.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">Próximas tarefas</h4>
          <ul className="space-y-3 max-h-40 overflow-y-auto pr-2">
            {upcomingTodos.map((todo) => {
              const label = getDueDateLabel(todo.dueDate);
              const dotColor = label === 'Hoje' ? 'bg-orange-400' : label === 'Amanhã' ? 'bg-blue-400' : 'bg-gray-400';
              return (
                <li key={todo.id} className="flex items-center gap-3 p-3 bg-surface-active border border-border/50 rounded-xl transition-colors hover:border-border">
                  <div className={`w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0`} />
                  <span className="text-sm text-primary truncate flex-1 min-w-0">{todo.title}</span>
                  <span className="text-xs text-tertiary whitespace-nowrap px-2 py-0.5 bg-border/50 rounded-pill">{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {upcomingTodos.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-tertiary">Nenhuma tarefa programada para os próximos dias. Aproveite seu tempo livre!</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 sm:p-6 bg-surface-active border border-border/50 rounded-2xl min-w-0">
      <p className="text-[11px] sm:text-xs font-semibold text-tertiary uppercase tracking-wider mb-1 sm:mb-2 truncate">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}

export default App;
