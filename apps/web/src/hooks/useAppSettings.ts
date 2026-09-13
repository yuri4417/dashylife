import { useState } from 'react';
import type { AppSettings, GameListSettings } from '@dashylife/shared';
import { updateSettings } from '../utils/api';

const DEFAULT_SETTINGS: AppSettings = {
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
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const persist = async (next: AppSettings) => {
    setSettings(next);
    await updateSettings(next.gamelist);
  };

  const updateGamelistSettings = (updater: (prev: GameListSettings) => GameListSettings) => {
    const next = { ...settings, gamelist: updater(settings.gamelist) };
    void persist(next);
  };

  const updateTodolistEnabled = (enabled: boolean) => {
    void persist({ ...settings, todolist: { enabled } });
  };

  const togglePlatformVisibility = (name: string) => {
    updateGamelistSettings((prev) => ({
      ...prev,
      platforms: prev.platforms.map((p) => (p.name === name ? { ...p, visible: !p.visible } : p)),
    }));
  };

  const removePlatform = (name: string) => {
    updateGamelistSettings((prev) => ({
      ...prev,
      platforms: prev.platforms.filter((p) => p.name !== name),
    }));
  };

  const addPlatform = (name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (settings.gamelist.platforms.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }
    updateGamelistSettings((prev) => ({
      ...prev,
      platforms: [...prev.platforms, { name: trimmed, visible: true }],
    }));
    return true;
  };

  return {
    settings,
    updateGamelistSettings,
    updateTodolistEnabled,
    togglePlatformVisibility,
    removePlatform,
    addPlatform,
  };
}
