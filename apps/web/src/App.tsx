import { useRef, useState } from 'react';
import { ClipboardList, Gamepad2, Home, Settings } from 'lucide-react';
import { GameList } from './components/GameList';
import { TodoList } from './components/TodoList';
import { GameListHomeSummary } from './components/home/GameListHomeSummary';
import { TodoListHomeSummary } from './components/home/TodoListHomeSummary';
import { BottomNav, type MenuItem, type SectionType } from './components/layout/BottomNav';
import { MobileHeader } from './components/layout/MobileHeader';
import { Sidebar } from './components/layout/Sidebar';
import { ImportModal, ImportReviewModal } from './components/settings/ImportModals';
import {
  GamelistSettingsPanel,
  ServicesPanel,
  ServicesSettingsCard,
} from './components/settings/SettingsPanels';
import { useAppSettings } from './hooks/useAppSettings';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';
import { useGameImport } from './hooks/useGameImport';

function App() {
  const [activeSection, setActiveSection] = useState<SectionType>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newPlatform, setNewPlatform] = useState('');
  const mainRef = useRef<HTMLElement>(null);

  const {
    settings,
    updateGamelistSettings,
    updateTodolistEnabled,
    togglePlatformVisibility,
    removePlatform,
    addPlatform,
  } = useAppSettings();

  const {
    importModalOpen,
    importFile,
    importErrors,
    showImportReview,
    validImports,
    setImportModalOpen,
    setImportFile,
    processImport,
    applyValidImports,
    resetImport,
    closeImportModal,
  } = useGameImport();

  useBodyScrollLock(importModalOpen || showImportReview);

  const handleSectionChange = (section: SectionType) => {
    setActiveSection(section);
    mainRef.current?.scrollTo({ top: 0 });
  };

  const handleAddPlatform = () => {
    if (addPlatform(newPlatform)) setNewPlatform('');
  };

  const menuItems: MenuItem[] = [
    { id: 'home', label: 'Home', Icon: Home },
    ...(settings.todolist.enabled ? [{ id: 'todo' as SectionType, label: 'Tarefas', Icon: ClipboardList }] : []),
    ...(settings.gamelist.enabled ? [{ id: 'gamelist' as SectionType, label: 'GameList', Icon: Gamepad2 }] : []),
    { id: 'settings', label: 'Configurações', Icon: Settings },
  ];

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden">
      <MobileHeader />
      <Sidebar
        menuItems={menuItems}
        activeSection={activeSection}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelect={handleSectionChange}
      />

      <main ref={mainRef} className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto pb-24 md:pb-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {activeSection === 'home' && (
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
              {settings.todolist.enabled && <TodoListHomeSummary />}
              {settings.gamelist.enabled && <GameListHomeSummary />}
              <ServicesPanel settings={settings} />
            </div>
          )}

          {activeSection === 'todo' && <TodoList />}
          {activeSection === 'gamelist' && <GameList />}

          {activeSection === 'settings' && (
            <div className="max-w-4xl mx-auto">
              <div className="space-y-4 sm:space-y-6">
                <ServicesSettingsCard
                  settings={settings}
                  onToggleGamelist={(enabled) =>
                    updateGamelistSettings((prev) => ({ ...prev, enabled }))
                  }
                  onToggleTodolist={updateTodolistEnabled}
                />

                {settings.gamelist.enabled && (
                  <GamelistSettingsPanel
                    settings={settings}
                    newPlatform={newPlatform}
                    onNewPlatformChange={setNewPlatform}
                    onAddPlatform={handleAddPlatform}
                    onTogglePlatform={togglePlatformVisibility}
                    onRemovePlatform={removePlatform}
                    onImportClick={() => setImportModalOpen(true)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav menuItems={menuItems} activeSection={activeSection} onSelect={handleSectionChange} />

      {importModalOpen && (
        <ImportModal
          file={importFile}
          onFileChange={setImportFile}
          onClose={closeImportModal}
          onProcess={processImport}
        />
      )}

      {showImportReview && (
        <ImportReviewModal errors={importErrors} validImports={validImports} onClose={resetImport} onApply={applyValidImports} />
      )}
    </div>
  );
}

export default App;
