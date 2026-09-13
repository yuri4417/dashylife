import { Gamepad2, Import, Server, Upload, X } from 'lucide-react';
import type { AppSettings } from '@dashylife/shared';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TextInput } from '../ui/FormField';
import { Toggle } from '../ui/Toggle';

interface ServicesPanelProps {
  settings: AppSettings;
  onToggleGamelist: (enabled: boolean) => void;
  onToggleTodolist: (enabled: boolean) => void;
}

export function ServicesPanel({ settings }: { settings: AppSettings }) {
  if (!settings.todolist.enabled && !settings.gamelist.enabled) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-2">
          <Server size={20} className="text-accent" />
          <h3 className="font-display text-lg font-semibold text-primary">Serviços</h3>
        </div>
        <p className="text-tertiary text-sm">
          Nenhum serviço ativo. Vá para a página de Configurações para ativar os módulos disponíveis.
        </p>
      </Card>
    );
  }
  return null;
}

export function ServicesSettingsCard({ settings, onToggleGamelist, onToggleTodolist }: ServicesPanelProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <Server size={20} className="text-accent" />
        <h3 className="font-display text-lg font-semibold text-primary">Serviços</h3>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <Toggle
          checked={settings.gamelist.enabled}
          onChange={(checked) => onToggleGamelist(checked)}
        />
        <span className="text-sm font-medium text-tertiary">Ativar Módulo GameList</span>
      </label>
      <label className="flex items-center gap-3 cursor-pointer">
        <Toggle
          checked={settings.todolist.enabled}
          onChange={(checked) => onToggleTodolist(checked)}
        />
        <span className="text-sm font-medium text-tertiary">Ativar Módulo Tarefas</span>
      </label>
    </Card>
  );
}

interface GamelistSettingsPanelProps {
  settings: AppSettings;
  newPlatform: string;
  onNewPlatformChange: (value: string) => void;
  onAddPlatform: () => void;
  onTogglePlatform: (name: string) => void;
  onRemovePlatform: (name: string) => void;
  onImportClick: () => void;
}

export function GamelistSettingsPanel({
  settings,
  newPlatform,
  onNewPlatformChange,
  onAddPlatform,
  onTogglePlatform,
  onRemovePlatform,
  onImportClick,
}: GamelistSettingsPanelProps) {
  return (
    <Card className="space-y-6">
      <div className="flex items-center gap-3">
        <Gamepad2 size={20} className="text-accent" />
        <h3 className="font-display text-lg font-semibold text-primary">Configurações do GameList</h3>
      </div>

      <div>
        <h4 className="text-sm font-medium text-tertiary mb-3">Plataformas</h4>
        <p className="text-xs text-tertiary mb-4">
          Gerencie as plataformas disponíveis. Desmarque para ocultar do menu de adição e filtros.
        </p>
        <div className="space-y-2">
          {settings.gamelist.platforms.map((platform) => (
            <div
              key={platform.name}
              className="flex items-center gap-3 p-3 bg-surface-active border border-border-subtle rounded-xl"
            >
              <Toggle checked={platform.visible} onChange={() => onTogglePlatform(platform.name)} />
              <span className="flex-1 min-w-0 truncate text-sm text-primary">{platform.name}</span>
              {settings.gamelist.platforms.length > 1 && (
                <button
                  onClick={() => onRemovePlatform(platform.name)}
                  className="text-tertiary hover:text-danger transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-active flex-shrink-0"
                  aria-label={`Remover ${platform.name}`}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        <PlatformAddRow value={newPlatform} onChange={onNewPlatformChange} onAdd={onAddPlatform} />
      </div>

      <div className="border-t border-border/50 pt-6">
        <div className="flex items-center gap-3 mb-3">
          <Import size={16} className="text-accent" />
          <h4 className="text-sm font-medium text-tertiary">Importar Biblioteca</h4>
        </div>
        <p className="text-xs text-tertiary mb-4">
          Importe jogos a partir de um arquivo JSON (formato do teste.json).
        </p>
        <Button variant="secondary" onClick={onImportClick} className="flex items-center gap-2 px-5 py-2.5">
          <Upload size={16} />
          Importar JSON
        </Button>
      </div>
    </Card>
  );
}

function PlatformAddRow({
  value,
  onChange,
  onAdd,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col sm:flex-row gap-2">
      <TextInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onAdd();
        }}
        placeholder="Nova plataforma..."
        className="flex-1 min-w-0 border-border"
      />
      <Button variant="primary" onClick={onAdd} className="px-4 py-3">
        Adicionar
      </Button>
    </div>
  );
}
