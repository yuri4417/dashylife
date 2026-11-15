import { useRef, useState } from 'react';
import type { GameImportItem, GameStatus } from '@dashylife/shared';
import { importGames } from '../utils/api';
import { normalizeTag } from '../utils/gameUtils';

export interface ImportError {
  index: number;
  game: unknown;
  errors: string[];
}

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

export interface ReviewedGame extends GameImportItem {
  index: number;
}

function validateItem(item: unknown, index: number): ReviewedGame | ImportError {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return { index, game: item, errors: ['O item deve ser um objeto.'] };
  }

  const itemErrors: string[] = [];
  const { name, title: rawTitle, launcher, platform: rawPlatform, status, date, description, tags } = item as Record<string, unknown>;
  const title = name || rawTitle;
  const platform = launcher || rawPlatform;
  const statusKey = typeof status === 'string' ? status.toLowerCase() : '';
  const mappedStatus = Object.prototype.hasOwnProperty.call(RAW_STATUS_MAP, statusKey) ? RAW_STATUS_MAP[statusKey] : undefined;
  if (typeof title !== 'string' || !title.trim()) itemErrors.push('Título é obrigatório');
  if (typeof platform !== 'string' || !platform.trim()) itemErrors.push('Plataforma é obrigatória');
  if (status != null && status !== '' && !mappedStatus) itemErrors.push('Status inválido');
  if (date != null && typeof date !== 'string') itemErrors.push('Data deve ser um texto');
  if (description != null && typeof description !== 'string') itemErrors.push('Descrição deve ser um texto');
  if (tags != null && (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string'))) {
    itemErrors.push('Tags devem ser uma lista de textos');
  }

  if (itemErrors.length > 0) {
    return { index, game: item, errors: itemErrors };
  }

  const requestId = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return {
    index,
    requestId,
    game: {
      title: (title as string).trim(),
      platform: (platform as string).trim(),
      status: mappedStatus || 'nao-jogado',
      date: (date as string | undefined) || new Date().toISOString().slice(0, 10),
      description: (description as string | undefined) || '',
      tags: Array.isArray(tags) ? tags.map(normalizeTag).filter(Boolean) : [],
    },
  };
}

function* batches(items: ReviewedGame[]): Generator<GameImportItem[]> {
  const encoder = new TextEncoder();
  let batch: GameImportItem[] = [];
  let size = 2;
  for (const { requestId, game } of items) {
    const item = { requestId, game };
    const bytes = encoder.encode(JSON.stringify(item)).length + 1;
    if (batch.length === 100 || (batch.length > 0 && size + bytes > 900 * 1024)) {
      yield batch;
      batch = [];
      size = 2;
    }
    batch.push(item);
    size += bytes;
  }
  if (batch.length > 0) yield batch;
}

export function useGameImport(onGamesChanged: () => void) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [showImportReview, setShowImportReview] = useState(false);
  const [validImports, setValidImports] = useState<ReviewedGame[]>([]);
  const [submissionErrors, setSubmissionErrors] = useState<ImportError[]>([]);
  const [inProgress, setInProgress] = useState(false);
  const busy = useRef(false);

  const resetImport = () => {
    if (busy.current) return;
    setImportFile(null);
    setImportErrors([]);
    setSubmissionErrors([]);
    setValidImports([]);
    setShowImportReview(false);
  };

  const closeImportModal = () => {
    if (busy.current) return;
    setImportModalOpen(false);
    setImportFile(null);
  };

  const processImport = async () => {
    if (!importFile || busy.current) return;
    busy.current = true;
    setInProgress(true);
    setSubmissionErrors([]);
    try {
      const data: unknown = JSON.parse(await importFile.text());
      if (!Array.isArray(data)) {
        setImportErrors([{ index: -1, game: null, errors: ['Arquivo JSON deve ser um array'] }]);
        setValidImports([]);
        return;
      }
      const errors: ImportError[] = [];
      const valid: ReviewedGame[] = [];
      data.forEach((item, index) => {
        const result = validateItem(item, index);
        if ('errors' in result) errors.push(result);
        else valid.push(result);
      });
      setImportErrors(errors);
      setValidImports(valid);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao processar arquivo JSON';
      setImportErrors([{ index: -1, game: null, errors: [`Erro interno: ${message}`] }]);
      setValidImports([]);
    } finally {
      busy.current = false;
      setInProgress(false);
      setImportModalOpen(false);
      setShowImportReview(true);
    }
  };

  const applyValidImports = async () => {
    if (!validImports.length || busy.current) return;
    busy.current = true;
    setInProgress(true);
    setSubmissionErrors([]);
    const items = new Map(validImports.map((item) => [item.requestId, item]));
    const confirmed = new Set<string>();
    const errors: ImportError[] = [];
    try {
      for (const batch of batches(validImports)) {
        const results = await importGames(batch);
        for (const result of results) {
          const item = items.get(result.requestId);
          if (!item) continue;
          if ('gameId' in result) confirmed.add(result.requestId);
          else errors.push({ index: item.index, game: item.game, errors: [result.error] });
        }
      }
    } catch {
      errors.push({ index: -1, game: null, errors: ['O envio foi interrompido. Tente importar os itens pendentes novamente.'] });
    } finally {
      busy.current = false;
      setInProgress(false);
      onGamesChanged();
    }

    if (confirmed.size === validImports.length) resetImport();
    else {
      setValidImports(validImports.filter((item) => !confirmed.has(item.requestId)));
      setSubmissionErrors(errors);
    }
  };

  return {
    importModalOpen,
    importFile,
    importErrors: [...importErrors, ...submissionErrors],
    showImportReview,
    validImports,
    setImportModalOpen,
    setImportFile,
    inProgress,
    processImport,
    applyValidImports,
    resetImport,
    closeImportModal,
  };
}
