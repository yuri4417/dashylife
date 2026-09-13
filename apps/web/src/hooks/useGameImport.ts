import { useState } from 'react';
import type { Game, GameStatus } from '@dashylife/shared';
import { createGame } from '../utils/api';
import { normalizeTag } from '../utils/gameUtils';

export interface ImportError {
  index: number;
  game: unknown;
  errors: string[];
}

const VALID_STATUSES: GameStatus[] = ['nao-jogado', 'jogando', 'zerado', 'droppado'];

const RAW_STATUS_MAP: Record<string, GameStatus> = {
  finished: 'zerado',
  completed: 'zerado',
  concluido: 'zerado',
  zerado: 'zerado',
  'concluído': 'zerado',
  playing: 'jogando',
  play: 'jogando',
  ongoing: 'jogando',
  'em andamento': 'jogando',
  endless: 'jogando',
  infinite: 'jogando',
  jogando: 'jogando',
  'nao-jogado': 'nao-jogado',
  'não jogado': 'nao-jogado',
  'not-played': 'nao-jogado',
  unplayed: 'nao-jogado',
  unstarted: 'nao-jogado',
  'never-played': 'nao-jogado',
  dropped: 'droppado',
  abandoned: 'droppado',
  droppado: 'droppado',
  abandonado: 'droppado',
};

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
}

interface RawGame {
  name?: string;
  title?: string;
  launcher?: string;
  platform?: string;
  status?: string;
  date?: string;
  description?: string;
  tags?: string[];
}

function validateItem(item: RawGame, index: number): { game?: Game; error?: ImportError } {
  const itemErrors: string[] = [];
  const title = item.name || item.title;
  if (!title || !title.trim()) itemErrors.push('Título é obrigatório');

  const platform = item.launcher || item.platform;
  if (!platform || !platform.trim()) itemErrors.push('Plataforma é obrigatória');

  const rawStatus = item.status;
  let mappedStatus: GameStatus | undefined;
  if (rawStatus && (VALID_STATUSES as string[]).includes(rawStatus)) {
    mappedStatus = rawStatus as GameStatus;
  } else if (rawStatus) {
    mappedStatus = RAW_STATUS_MAP[rawStatus.toLowerCase()];
  }
  if (!mappedStatus && rawStatus) itemErrors.push(`Status inválido: ${rawStatus}`);

  if (itemErrors.length > 0) {
    return { error: { index, game: item, errors: itemErrors } };
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  return {
    game: {
      id: randomId(),
      title: title!.trim(),
      platform: platform!.trim(),
      status: mappedStatus || 'nao-jogado',
      date: item.date || today,
      description: item.description || '',
      tags: (item.tags || []).map(normalizeTag).filter(Boolean),
      createdAt: now,
      updatedAt: now,
    },
  };
}

export function useGameImport() {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [showImportReview, setShowImportReview] = useState(false);
  const [validImports, setValidImports] = useState<Game[]>([]);

  const resetImport = () => {
    setImportFile(null);
    setImportErrors([]);
    setValidImports([]);
    setShowImportReview(false);
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportFile(null);
  };

  const processImport = async () => {
    if (!importFile) return;
    try {
      const data = JSON.parse(await importFile.text());
      if (!Array.isArray(data)) {
        setImportErrors([{ index: -1, game: null, errors: ['Arquivo JSON deve ser um array'] }]);
        setValidImports([]);
        setShowImportReview(true);
        return;
      }
      const errors: ImportError[] = [];
      const valid: Game[] = [];
      data.forEach((item: RawGame, index: number) => {
        const { game, error } = validateItem(item, index);
        if (error) errors.push(error);
        else if (game) valid.push(game);
      });
      setImportErrors(errors);
      setValidImports(valid);
      setShowImportReview(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao processar arquivo JSON';
      setImportErrors([{ index: -1, game: null, errors: [`Erro interno: ${message}`] }]);
      setValidImports([]);
      setShowImportReview(true);
    }
  };

  const applyValidImports = async () => {
    try {
      for (const game of validImports) {
        await createGame({
          title: game.title,
          platform: game.platform,
          status: game.status,
          date: game.date,
          description: game.description,
          tags: game.tags,
        });
      }
      resetImport();
    } catch (err) {
      console.error('Erro ao importar jogos:', err);
    }
  };

  return {
    importModalOpen,
    importFile,
    importErrors,
    showImportReview,
    validImports,
    setImportModalOpen,
    setImportFile,
    setShowImportReview,
    processImport,
    applyValidImports,
    resetImport,
    closeImportModal,
  };
}
