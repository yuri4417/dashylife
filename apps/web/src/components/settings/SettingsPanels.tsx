import { useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Gamepad2, Import, KeyRound, RefreshCw, Server, ShieldCheck, Upload, X } from 'lucide-react';
import type { AppSettings } from '@dashylife/shared';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Field, TextInput } from '../ui/FormField';
import { Toggle } from '../ui/Toggle';
import {
  activateMcp,
  deactivateMcp,
  fetchMcpActionLogs,
  fetchMcpAdminStatus,
  rotateMcpKey,
  type McpActionLogs,
} from '../../utils/api';

export function McpSettingsPanel() {
  const [adminKey, setAdminKey] = useState('');
  const [connected, setConnected] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [logs, setLogs] = useState<McpActionLogs | null>(null);
  const [offset, setOffset] = useState(0);
  const [newApiKey, setNewApiKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadLogs = async (key: string, nextOffset = 0) => {
    const result = await fetchMcpActionLogs(key, nextOffset);
    setLogs(result);
    setOffset(nextOffset);
  };

  const connectAdmin = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const status = await fetchMcpAdminStatus(adminKey);
      setEnabled(status.enabled);
      await loadLogs(adminKey);
      setConnected(true);
    } catch (cause) {
      setConnected(false);
      setError(cause instanceof Error ? cause.message : 'Não foi possível conectar à administração do MCP.');
    } finally {
      setLoading(false);
    }
  };

  const runAdminAction = async (action: 'activate' | 'rotate' | 'deactivate') => {
    setLoading(true);
    setError('');
    setMessage('');
    setNewApiKey('');
    try {
      if (action === 'activate') {
        const result = await activateMcp(adminKey);
        setEnabled(result.enabled);
        setNewApiKey(result.apiKey);
        setMessage('MCP ativado. Copie a chave agora; ela não poderá ser consultada novamente.');
      } else if (action === 'rotate') {
        const result = await rotateMcpKey(adminKey);
        setNewApiKey(result.apiKey);
        setMessage('Chave rotacionada. A chave anterior foi revogada; copie a nova chave agora.');
      } else {
        const result = await deactivateMcp(adminKey);
        setEnabled(result.enabled);
        setMessage('MCP desativado e chave revogada.');
      }
      await loadLogs(adminKey, 0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a configuração do MCP.');
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(newApiKey);
      setMessage('Chave copiada. Guarde-a no cliente MCP.');
    } catch {
      setError('Não foi possível copiar automaticamente. Selecione e copie a chave exibida.');
    }
  };

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-active text-accent">
          <KeyRound size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold tracking-tight text-primary">Acesso do MCP</h3>
          <p className="text-xs text-tertiary">Gerencie o acesso ao servidor e consulte os registros.</p>
        </div>
      </div>

      {!connected ? (
        <div className="mcp-connection-state space-y-4">
          <p className="mcp-status-badge" role="status"><span aria-hidden="true" /> Administração desconectada</p>
          <p className="text-sm text-tertiary">
            Conecte-se usando a chave mestre configurada no servidor em <code>DASHYLIFE_ADMIN_KEY</code>. Ela permite gerenciar o MCP e consultar os registros de ações.
          </p>
          <div className="mcp-connection-form flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Chave mestre do servidor">
              <TextInput type="password" autoComplete="current-password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} placeholder="Informe a chave mestre" />
            </Field>
            <Button variant="secondary" disabled={loading || !adminKey.trim()} onClick={connectAdmin}>
              {loading ? 'Conectando…' : 'Conectar à administração'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <ShieldCheck size={18} className="text-accent" /> Administração conectada
            </div>
            <div className="flex flex-wrap gap-2">
              {!enabled ? (
                <Button disabled={loading} onClick={() => void runAdminAction('activate')}>Ativar MCP</Button>
              ) : (
                <>
                  <Button variant="secondary" disabled={loading} onClick={() => void runAdminAction('rotate')}>
                    <span className="inline-flex items-center gap-2"><RefreshCw size={14} /> Rotacionar chave</span>
                  </Button>
                  <Button variant="secondary" disabled={loading} onClick={() => window.confirm('Desativar o MCP e revogar a chave atual?') && void runAdminAction('deactivate')}>
                    Desativar
                  </Button>
                </>
              )}
              <Button variant="ghost" disabled={loading} onClick={() => { setConnected(false); setAdminKey(''); setLogs(null); setNewApiKey(''); }}>
                Desconectar
              </Button>
            </div>
          </div>

          <p className={`mcp-status-badge ${enabled ? 'is-enabled' : 'is-disabled'}`} role="status">
            <span aria-hidden="true" /> MCP {enabled ? 'ativo. A chave MCP é obrigatória nas chamadas.' : 'desativado.'}
          </p>

          {newApiKey && (
            <div className="space-y-2 rounded-lg border border-accent/30 bg-surface-active p-4">
              <p className="text-sm font-medium text-primary">Chave MCP — exibida somente agora</p>
              <div className="flex gap-2">
                <TextInput readOnly value={newApiKey} className="font-mono text-xs" />
                <Button variant="secondary" aria-label="Copiar chave MCP" onClick={() => void copyApiKey()}>
                  <Copy size={16} />
                </Button>
              </div>
              <p className="text-xs text-tertiary">Configure-a como <code>DASHYLIFE_MCP_API_KEY</code> no processo MCP.</p>
            </div>
          )}
        </>
      )}

      {message && <p role="status" className="text-sm text-accent">{message}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {connected && (
        <div className="space-y-3 border-t border-border-subtle pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-primary">Log de ações MCP</h4>
              <p className="text-xs text-tertiary">Armazena operação, resultado e erro técnico; nunca os dados enviados.</p>
            </div>
            <Button variant="ghost" disabled={loading} onClick={() => void loadLogs(adminKey, 0)}>
              <span className="inline-flex items-center gap-2"><RefreshCw size={14} /> Atualizar</span>
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-surface-active text-tertiary">
                <tr><th className="px-3 py-2">Data</th><th className="px-3 py-2">Ferramenta</th><th className="px-3 py-2">Resultado</th><th className="px-3 py-2">Tempo</th><th className="px-3 py-2">Erro técnico</th></tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {logs?.items.map((entry) => (
                  <tr key={entry.id} className="text-primary">
                    <td className="whitespace-nowrap px-3 py-2">{new Date(entry.createdAt).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2 font-mono">{entry.tool}</td>
                    <td className={`px-3 py-2 ${entry.status < 400 ? 'text-accent' : 'text-danger'}`}>{entry.status}</td>
                    <td className="whitespace-nowrap px-3 py-2">{entry.durationMs} ms</td>
                    <td className="max-w-sm break-words px-3 py-2 text-tertiary">{entry.error || '—'}</td>
                  </tr>
                ))}
                {!logs?.items.length && <tr><td className="px-3 py-6 text-center text-tertiary" colSpan={5}>Nenhuma chamada registrada.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-xs text-tertiary">
            <span>{logs ? `${logs.total} registro(s)` : 'Carregando registros…'}</span>
            <div className="flex gap-2">
              <Button variant="secondary" aria-label="Página anterior dos logs" disabled={loading || offset === 0} onClick={() => void loadLogs(adminKey, Math.max(0, offset - (logs?.limit || 25)))}><ChevronLeft size={16} /></Button>
              <Button variant="secondary" aria-label="Próxima página dos logs" disabled={loading || !logs || offset + logs.limit >= logs.total} onClick={() => void loadLogs(adminKey, offset + (logs?.limit || 25))}><ChevronRight size={16} /></Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

interface ServicesPanelProps {
  settings: AppSettings;
  saving: boolean;
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

export function ServicesSettingsCard({ settings, saving, onToggleGamelist, onToggleTodolist }: ServicesPanelProps) {
  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-active text-accent">
          <Server size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold tracking-tight text-primary">Módulos</h3>
          <p className="truncate text-xs text-tertiary">
            Ative os módulos que deseja usar.
          </p>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-3">
        <Toggle checked={settings.gamelist.enabled} disabled={saving} onChange={onToggleGamelist} />
        <span className={`settings-module-label text-sm font-medium ${settings.gamelist.enabled ? 'is-enabled' : 'is-disabled'}`}>GameList</span>
      </label>
      <label className="flex cursor-pointer items-center gap-3">
        <Toggle checked={settings.todolist.enabled} disabled={saving} onChange={onToggleTodolist} />
        <span className={`settings-module-label text-sm font-medium ${settings.todolist.enabled ? 'is-enabled' : 'is-disabled'}`}>Tarefas</span>
      </label>
    </Card>
  );
}

interface GamelistSettingsPanelProps {
  settings: AppSettings;
  saving: boolean;
  newPlatform: string;
  onNewPlatformChange: (value: string) => void;
  onAddPlatform: () => void;
  onTogglePlatform: (name: string) => void;
  onRemovePlatform: (name: string) => void;
  onImportClick: () => void;
}

export function GamelistSettingsPanel({
  settings,
  saving,
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
              <Toggle checked={platform.visible} disabled={saving} onChange={() => onTogglePlatform(platform.name)} />
              <span className="min-w-0 flex-1 truncate text-sm text-primary">{platform.name}</span>
              {settings.gamelist.platforms.length > 1 && (
                <button
                  onClick={() => onRemovePlatform(platform.name)}
                  disabled={saving}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-tertiary transition-colors hover:bg-surface-active hover:text-danger"
                  aria-label={`Remover ${platform.name}`}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        <PlatformAddRow value={newPlatform} disabled={saving} onChange={onNewPlatformChange} onAdd={onAddPlatform} />
      </div>

      <div className="border-t border-border-subtle pt-6">
        <div className="mb-3 flex items-center gap-3">
          <Import size={16} className="text-accent" />
          <h4 className="text-sm font-medium text-tertiary">Importar Biblioteca</h4>
        </div>
        <p className="mb-4 text-xs text-tertiary">
          Importe jogos a partir de um arquivo JSON (formato do teste.json).
        </p>
        <Button variant="secondary" onClick={onImportClick} disabled={saving} className="flex items-center gap-2 px-5 py-2.5">
          <Upload size={16} />
          Importar JSON
        </Button>
      </div>
    </Card>
  );
}

function PlatformAddRow({
  value,
  disabled,
  onChange,
  onAdd,
}: {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <TextInput
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onAdd();
        }}
        placeholder="Nova plataforma..."
        className="flex-1 min-w-0 border-border"
      />
      <Button variant="primary" onClick={onAdd} disabled={disabled} className="px-4 py-3">
        Adicionar
      </Button>
    </div>
  );
}
