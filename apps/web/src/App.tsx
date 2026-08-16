import { useState, useRef, useEffect, useCallback } from 'react';
import { Home, ClipboardList, Settings, Gamepad2, ChevronLeft, ChevronRight, Server, Import, Upload, FileJson, X, CheckSquare } from 'lucide-react';
import { Game, GameStatus, GameListSettings, AppSettings } from '@dashylife/shared';
import { fetchGames, updateSettings } from './utils/api';
import { GameList } from './components/GameList';
import { TodoList } from './components/TodoList';
import { Toggle } from './components/Toggle';

type SectionType = 'home' | 'todo' | 'gamelist' | 'settings';

function App() {
  const [activeSection, setActiveSection] = useState<SectionType>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
            id: crypto.randomUUID(),
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
    } catch (err) {
      setImportErrors([{ index: -1, game: null, errors: ['Erro ao processar arquivo JSON'] }]);
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
    { id: 'home' as SectionType, label: 'Home', icon: <Home size={18} /> },
    ...(settings.todolist.enabled ? [{ id: 'todo' as SectionType, label: 'Tarefas', icon: <ClipboardList size={18} /> }] : []),
    ...(settings.gamelist.enabled ? [{ id: 'gamelist' as SectionType, label: 'GameList', icon: <Gamepad2 size={18} /> }] : []),
    { id: 'settings' as SectionType, label: 'Configurações', icon: <Settings size={18} /> },
  ];

  return (
    <div className="h-screen flex bg-bg overflow-hidden">
      <aside
        className={`flex flex-col flex-shrink-0 bg-surface border-r border-border-subtle transition-all duration-200 ${
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
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-pill text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? 'bg-surface-active text-primary'
                  : 'text-tertiary hover:text-primary hover:bg-surface-active'
              }`}
              title={sidebarCollapsed ? item.label : ''}
            >
              <span className="flex-shrink-0 flex items-center justify-center">{item.icon}</span>
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              {activeSection === item.id && !sidebarCollapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-6">
          {activeSection === 'home' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {settings.todolist.enabled && (
                <TodoListHomeSummary loadTodos={loadTodosForHome} />
              )}
              {settings.gamelist.enabled && (
                <GameListHomeSummary loadGames={loadGamesForHome} />
              )}
              {!settings.todolist.enabled && !settings.gamelist.enabled && (
                <div className="bg-surface border border-border-subtle rounded-xl p-6">
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
                <div className="space-y-6">
                  <div className="bg-surface border border-border-subtle rounded-xl p-6 space-y-4">
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
                    <div className="bg-surface border border-border-subtle rounded-xl p-6 space-y-6">
                      <div className="flex items-center gap-3">
                        <Gamepad2 size={20} className="text-accent" />
                        <h3 className="text-lg font-semibold text-primary">Configurações do GameList</h3>
                      </div>

                  <div>
                    <h4 className="text-sm font-medium text-tertiary mb-3">Plataformas</h4>
                    <p className="text-xs text-tertiary mb-4">Gerencie as plataformas disponíveis. Desmarque para ocultar do menu de adição e filtros.</p>
                    <div className="space-y-2">
                      {settings.gamelist.platforms.map((platform) => (
                        <div key={platform.name} className="flex items-center gap-3 p-3 bg-surface-active border border-border-subtle rounded-lg">
                          <Toggle
                            checked={platform.visible}
                            onChange={() => {
                              const newPlatforms = settings.gamelist.platforms.map(p =>
                                p.name === platform.name ? { ...p, visible: !p.visible } : p
                              );
                              updateGamelistSettings(prev => ({ ...prev, platforms: newPlatforms }));
                            }}
                          />
                          <span className="flex-1 text-sm text-primary">{platform.name}</span>
                          {settings.gamelist.platforms.length > 1 && (
                            <button
                              onClick={() => {
                                const newPlatforms = settings.gamelist.platforms.filter(p => p.name !== platform.name);
                                updateGamelistSettings(prev => ({ ...prev, platforms: newPlatforms }));
                              }}
                              className="text-tertiary hover:text-danger transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active"
                              aria-label={`Remover ${platform.name}`}
                            >
                              <X size={16} />
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
                        className="flex-1 px-4 py-3 text-sm bg-surface border border-border text-primary focus:outline-none focus:border-accent rounded-lg"
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

                  <div className="border-t border-border-subtle pt-6">
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

      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setImportModalOpen(false); setImportFile(null); }}>
          <div className="bg-surface border border-border-subtle rounded-xl w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <FileJson size={20} className="text-accent" />
                  <h3 className="text-lg font-semibold text-primary">Importar Biblioteca</h3>
                </div>
                <button onClick={() => { setImportModalOpen(false); setImportFile(null); }} className="text-tertiary hover:text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active"><X size={18} /></button>
              </div>
              <div className="space-y-4">
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
                    <span>{importFile ? importFile.name : 'Clique para selecionar o arquivo JSON'}</span>
                  </label>
                  {importFile && (
                    <div className="mt-2 flex items-center justify-between p-2 bg-surface-active border border-border rounded-lg">
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
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setImportModalOpen(false); setImportFile(null); }} className="px-5 py-2.5 text-sm font-medium text-tertiary hover:text-primary transition-colors rounded-pill">Cancelar</button>
                <button onClick={processImport} disabled={!importFile} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-action-text bg-action hover:opacity-90 transition-opacity rounded-pill disabled:opacity-50"><Upload size={16} /> Processar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setShowImportReview(false); setImportFile(null); setValidImports([]); setImportErrors([]); }}>
          <div className="bg-surface border border-border-subtle rounded-xl w-full max-w-2xl mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-primary">Revisar Importação</h3>
                <button onClick={() => { setShowImportReview(false); setImportFile(null); setValidImports([]); setImportErrors([]); }} className="text-tertiary hover:text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active"><X size={18} /></button>
              </div>
              {importErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
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
                <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <h4 className="text-sm font-medium text-green-400 mb-2">Itens válidos ({validImports.length})</h4>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {validImports.map((g, idx) => (
                      <li key={idx} className="text-xs text-primary">{g.title} ({g.platform}) - {g.status}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end gap-3">
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

  if (loading) {
    return (
      <div className="bg-surface border border-border-subtle rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Gamepad2 size={20} className="text-accent" />
          <h3 className="text-lg font-semibold text-primary">GameList - Resumo</h3>
        </div>
        <p className="text-tertiary text-sm">Carregando...</p>
      </div>
    );
  }

  const playingGames = games.filter(g => g.status === 'jogando');
  const notPlayedGames = games.filter(g => g.status === 'nao-jogado');
  const finishedGames = games.filter(g => g.status === 'zerado');

  return (
    <div className="bg-surface border border-border-subtle rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Gamepad2 size={20} className="text-accent" />
        <h3 className="text-lg font-semibold text-primary">GameList - Resumo</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total na biblioteca" value={games.length} />
        <StatCard label="Jogos em andamento" value={playingGames.length} />
        <StatCard label="Não jogado" value={notPlayedGames.length} />
        <StatCard label="Zerado" value={finishedGames.length} />
      </div>
      {playingGames.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-tertiary mb-2">Jogando agora:</h4>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {playingGames.slice(0, 5).map((game) => (
              <li key={game.id} className="flex items-center gap-2 text-sm text-primary">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="truncate">{game.title}</span>
                <span className="text-xs text-tertiary whitespace-nowrap">({game.platform})</span>
              </li>
            ))}
            {playingGames.length > 5 && (
              <li className="text-xs text-tertiary">+{playingGames.length - 5} mais...</li>
            )}
          </ul>
        </div>
      )}
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
      <div className="bg-surface border border-border-subtle rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckSquare size={20} className="text-accent" />
          <h3 className="text-lg font-semibold text-primary">Tarefas - Resumo</h3>
        </div>
        <p className="text-tertiary text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-subtle rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <CheckSquare size={20} className="text-accent" />
        <h3 className="text-lg font-semibold text-primary">Tarefas - Resumo</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total de tarefas" value={todos.length} />
        <StatCard label="Tarefas pendentes" value={pendingTodos.length} />
        <StatCard label="Vencidas" value={overdueTodos.length} />
      </div>
      {upcomingTodos.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-tertiary mb-2">Próximas tarefas:</h4>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {upcomingTodos.map((todo) => {
              const label = getDueDateLabel(todo.dueDate);
              const dotColor = label === 'Hoje' ? 'bg-orange-400' : label === 'Amanhã' ? 'bg-blue-400' : 'bg-gray-400';
              return (
                <li key={todo.id} className="flex items-center gap-2 text-sm text-primary">
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  <span className="truncate">{todo.title}</span>
                  <span className="text-xs text-tertiary whitespace-nowrap">({label})</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {upcomingTodos.length === 0 && (
        <div className="mt-4">
          <p className="text-sm text-tertiary">Nenhuma tarefa programada para os próximos dias. Aproveite seu tempo livre!</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-5 bg-surface border border-border-subtle rounded-xl">
      <p className="text-tertiary text-xs uppercase tracking-wider mb-1.5">{label}</p>
      <p className="text-3xl font-semibold text-primary">{value}</p>
    </div>
  );
}

export default App;
