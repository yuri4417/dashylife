import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppSettings, GameListSettings } from '@dashylife/shared';
import { fetchSettings, updateSettings } from '../utils/api';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      setSettings(await fetchSettings());
    } catch {
      setError('Não foi possível carregar as configurações dos módulos.');
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const persist = async (patch: Partial<AppSettings>): Promise<boolean> => {
    if (!settings || busy.current) return false;
    busy.current = true;
    setSaving(true);
    try {
      setSettings(await updateSettings(patch));
      return true;
    } catch {
      setSettings(null);
      setError('O salvamento não foi confirmado. Recarregue as configurações para tentar novamente.');
      return false;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const updateGamelistSettings = (updater: (prev: GameListSettings) => GameListSettings) => {
    return settings && persist({ gamelist: updater(settings.gamelist) });
  };

  const updateTodolistEnabled = (enabled: boolean) => {
    void persist({ todolist: { enabled } });
  };

  const togglePlatformVisibility = (name: string) => {
    void updateGamelistSettings((prev) => ({
      ...prev,
      platforms: prev.platforms.map((p) => (p.name === name ? { ...p, visible: !p.visible } : p)),
    }));
  };

  const removePlatform = (name: string) => {
    void updateGamelistSettings((prev) => ({
      ...prev,
      platforms: prev.platforms.filter((p) => p.name !== name),
    }));
  };

  const addPlatform = async (name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!settings || !trimmed) return false;
    if (settings.gamelist.platforms.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }
    return persist({ gamelist: {
      ...settings.gamelist,
      platforms: [...settings.gamelist.platforms, { name: trimmed, visible: true }],
    } });
  };

  return {
    settings,
    error,
    saving,
    load,
    updateGamelistSettings,
    updateTodolistEnabled,
    togglePlatformVisibility,
    removePlatform,
    addPlatform,
  };
}
