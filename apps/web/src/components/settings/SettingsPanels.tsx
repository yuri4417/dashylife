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
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-active text-accent">
            <Server size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold tracking-tight text-primary">Serviços</h3>
            <p className="truncate text-[10px] font-medium uppercase tracking-widest text-tertiary">
              Módulos do painel
            </p>
          </div>
        </div>
        <p className="text-sm text-tertiary">
          Nenhum serviço ativo. Vá para a página de Configurações para ativar os módulos disponíveis.
        </p>
      </Card>
    );
  }
  return null;
}

export function ServicesSettingsCard({ settings, onToggleGamelist, onToggleTodolist }: ServicesPanelProps) {
  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-active text-accent">
          <Server size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold tracking-tight text-primary">Serviços</h3>
          <p className="truncate text-[10px] font-medium uppercase tracking-widest text-tertiary">
            Ative ou desative os módulos
          </p>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-3">
        <Toggle checked={settings.gamelist.enabled} onChange={(checked) => onToggleGamelist(checked)} />
        <span className="text-sm font-medium text-tertiary">Ativar Módulo GameList</span>
      </label>
      <label className="flex cursor-pointer items-center gap-3">
        <Toggle checked={settings.todolist.enabled} onChange={(checked) => onToggleTodolist(checked)} />
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
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-active text-accent">
          <Gamepad2 size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold tracking-tight text-primary">
            Configurações do GameList
          </h3>
          <p className="truncate text-[10px] font-medium uppercase tracking-widest text-tertiary">
            Gerencie as plataformas
          </p>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-medium text-tertiary">Plataformas</h4>
        <p className="mb-4 text-xs text-tertiary">
          Gerencie as plataformas disponíveis. Desmarque para ocultar do menu de adição e filtros.
        </p>
        <div className="space-y-2">
          {settings.gamelist.platforms.map((platform) => (
            <div
              key={platform.name}
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2.5 transition-colors hover:border-border"
            >
              <Toggle checked={platform.visible} onChange={() => onTogglePlatform(platform.name)} />
              <span className="min-w-0 flex-1 truncate text-sm text-primary">{platform.name}</span>
              {settings.gamelist.platforms.length > 1 && (
                <button
                  onClick={() => onRemovePlatform(platform.name)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-tertiary transition-colors hover:bg-surface-active hover:text-danger"
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

      <div className="border-t border-border-subtle pt-6">
        <div className="mb-3 flex items-center gap-3">
          <Import size={16} className="text-accent" />
          <h4 className="text-sm font-medium text-tertiary">Importar Biblioteca</h4>
        </div>
        <p className="mb-4 text-xs text-tertiary">
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
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
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
