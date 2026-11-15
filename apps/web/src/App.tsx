import { useRef, useState, type CSSProperties } from 'react';
import { ClipboardList, Gamepad2, Home, Settings } from 'lucide-react';
import { GameList } from './components/GameList';
import { TodoList } from './components/TodoList';
import { Dashboard } from './components/home/Dashboard';
import { BottomNav, type MenuItem, type SectionType } from './components/layout/BottomNav';
import { MobileHeader } from './components/layout/MobileHeader';
import { Sidebar } from './components/layout/Sidebar';
import { ImportModal, ImportReviewModal } from './components/settings/ImportModals';
import { ErrorState, LoadingState } from './components/ui/States';
import {
  GamelistSettingsPanel,
  McpSettingsPanel,
  ServicesSettingsCard,
} from './components/settings/SettingsPanels';
import { useAppSettings } from './hooks/useAppSettings';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';
import { useCollection } from './hooks/useCollection';
import { useGameImport } from './hooks/useGameImport';
import { fetchGames, fetchTodos } from './utils/api';

function App() {
  const [appearance, setAppearance] = useState<'warm' | 'minimal'>(() => localStorage.getItem('dashylife-appearance') === 'minimal' ? 'minimal' : 'warm');
  const [colors, setColors] = useState<Record<'warm' | 'minimal', string>>(() => {
    const read = (key: string, fallback: string) => { const value = localStorage.getItem(key); return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback; };
    return { warm: read('dashylife-accent-warm', '#c4df9b'), minimal: read('dashylife-accent-minimal', '#e4e6e4') };
  });
  const accent = colors[appearance];
  const channels = [1, 3, 5].map((offset) => parseInt(accent.slice(offset, offset + 2), 16));
  const luminance = (values: number[]) => values.map((channel) => { const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const accentText = luminance(channels) > 0.179 ? '#000000' : '#ffffff';
  let readableChannels = channels;
  while (luminance(readableChannels) < 0.48) readableChannels = readableChannels.map((channel) => Math.min(255, channel + 1));
  const readableAccent = `#${readableChannels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  const [selectedSection, setSelectedSection] = useState<SectionType>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newPlatform, setNewPlatform] = useState('');
  const mainRef = useRef<HTMLElement>(null);

  const {
    settings,
    error: settingsError,
    saving: savingSettings,
    load: loadSettings,
    updateGamelistSettings,
    updateTodolistEnabled,
    togglePlatformVisibility,
    removePlatform,
    addPlatform,
  } = useAppSettings();

  const activeSection = (selectedSection === 'todo' && !settings?.todolist.enabled)
    || (selectedSection === 'gamelist' && !settings?.gamelist.enabled) ? 'home' : selectedSection;

  const todos = useCollection(fetchTodos, settings?.todolist.enabled === true, 'Não foi possível carregar as tarefas.');
  const games = useCollection(fetchGames, settings?.gamelist.enabled === true, 'Não foi possível carregar os jogos.');

  const {
    importModalOpen,
    importFile,
    importErrors,
    showImportReview,
    validImports,
    inProgress: importing,
    setImportModalOpen,
    setImportFile,
    processImport,
    applyValidImports,
    resetImport,
    closeImportModal,
  } = useGameImport(games.refresh);

  useBodyScrollLock(importModalOpen || showImportReview);

  const handleSectionChange = (section: SectionType) => {
    setSelectedSection(section);
    mainRef.current?.scrollTo({ top: 0 });
  };

  const handleAddPlatform = async () => {
    if (await addPlatform(newPlatform)) setNewPlatform('');
  };

  const menuItems: MenuItem[] = [
    { id: 'home', label: 'Home', Icon: Home },
    ...(settings?.todolist.enabled ? [{ id: 'todo' as SectionType, label: 'Tarefas', Icon: ClipboardList }] : []),
    ...(settings?.gamelist.enabled ? [{ id: 'gamelist' as SectionType, label: 'GameList', Icon: Gamepad2 }] : []),
    { id: 'settings', label: 'Configurações', Icon: Settings },
  ];

  return (
    <div data-appearance={appearance} style={{ '--color-accent': readableAccent, '--accent-chosen': accent, '--color-action': accent, '--color-action-text': accentText } as CSSProperties} className="app-shell h-dvh flex flex-col md:flex-row overflow-hidden">
      <MobileHeader />
      <Sidebar
        appearance={appearance}
        menuItems={menuItems}
        activeSection={activeSection}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelect={handleSectionChange}
      />

      <main ref={mainRef} className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto pb-24 md:pb-0">
        <header className="concept-topbar"><div><span className="concept-eyebrow">SEU ESPAÇO PESSOAL</span><p>DashyLife <span>/</span> <strong>{menuItems.find(item => item.id === activeSection)?.label}</strong></p></div></header>
        <div className="concept-content" key={activeSection}>
          {activeSection === 'home' && (
            <Dashboard settings={settings} settingsError={settingsError} loadSettings={loadSettings} todos={todos} games={games} onNavigate={handleSectionChange} />
          )}

          {activeSection === 'todo' && settings?.todolist.enabled && <TodoList collection={todos} />}
          {activeSection === 'gamelist' && settings?.gamelist.enabled && <GameList collection={games} settings={settings.gamelist} />}

          {activeSection === 'settings' && (
            <div className="settings-page mx-auto max-w-6xl"><div className="page-heading"><div><span className="concept-eyebrow">DEIXE COM A SUA CARA</span><h1>Configurações</h1><p>Ajuste seu espaço do seu jeito.</p></div></div>
              <div className="settings-layout">
                <section className="rounded-xl border border-border-subtle bg-surface p-5 sm:p-6">
                  <h2 className="font-display text-lg font-semibold">Aparência</h2>
                  <p className="mt-1 text-sm text-tertiary">Escolha o visual deste dispositivo.</p>
                  <div className="mt-4 flex gap-2" role="group" aria-label="Aparência">
                    {([['warm', 'Acolhedor'], ['minimal', 'Minimalista']] as const).map(([value, label]) => (
                      <button key={value} type="button" aria-pressed={appearance === value} onClick={() => { setAppearance(value); localStorage.setItem('dashylife-appearance', value); }} className="appearance-option rounded-lg border border-border px-4 py-2 text-sm">{label}</button>
                    ))}
                  </div>
                  <label className="mt-5 flex items-center gap-3 text-sm text-secondary">
                    Cor de destaque para {appearance === 'warm' ? 'Acolhedor' : 'Minimalista'}
                    <input type="color" value={colors[appearance]} onChange={(event) => { const value = event.target.value; setColors((current) => ({ ...current, [appearance]: value })); localStorage.setItem(`dashylife-accent-${appearance}`, value); }} />
                  </label>
                </section>
                <McpSettingsPanel />
                {settings ? (
                  <>
                    <ServicesSettingsCard
                      settings={settings}
                      saving={savingSettings}
                      onToggleGamelist={(enabled) => void updateGamelistSettings((prev) => ({ ...prev, enabled }))}
                      onToggleTodolist={updateTodolistEnabled}
                    />

                    {settings.gamelist.enabled && (
                      <GamelistSettingsPanel
                        settings={settings}
                        saving={savingSettings}
                        newPlatform={newPlatform}
                        onNewPlatformChange={setNewPlatform}
                        onAddPlatform={handleAddPlatform}
                        onTogglePlatform={togglePlatformVisibility}
                        onRemovePlatform={removePlatform}
                        onImportClick={() => setImportModalOpen(true)}
                      />
                    )}
                  </>
                ) : settingsError ? <ErrorState message={settingsError} onRetry={loadSettings} /> : <LoadingState />}
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav menuItems={menuItems} activeSection={activeSection} onSelect={handleSectionChange} />

      {importModalOpen && (
        <ImportModal
          file={importFile}
          inProgress={importing}
          onFileChange={setImportFile}
          onClose={closeImportModal}
          onProcess={processImport}
        />
      )}

      {showImportReview && (
        <ImportReviewModal errors={importErrors} validImports={validImports} inProgress={importing} onClose={resetImport} onApply={applyValidImports} />
      )}
    </div>
  );
}

export default App;
