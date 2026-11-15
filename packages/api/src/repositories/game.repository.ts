import type { CreateGameInput, Game, GameImportResult } from '@dashylife/shared';
import {
  getAllGames,
  getGameById,
  createGame as dbCreateGame,
  createImportedGame,
  db,
  updateGame as dbUpdateGame,
  deleteGame as dbDeleteGame,
} from '../db.js';

function isGameImportInput(value: unknown): value is CreateGameInput {
  if (!value || typeof value !== 'object') return false;
  const { title, platform, status, date, description, tags } = value as Record<string, unknown>;
  return typeof title === 'string' && !!title.trim()
    && typeof platform === 'string' && !!platform.trim()
    && typeof status === 'string' && ['nao-jogado', 'jogando', 'zerado', 'droppado'].includes(status)
    && (date === undefined || typeof date === 'string')
    && (description === undefined || typeof description === 'string')
    && (tags === undefined || (Array.isArray(tags) && tags.every((tag) => typeof tag === 'string')));
}

export class GameRepository {
  findAll(): Game[] {
    return getAllGames();
  }

  findById(id: string): Game | undefined {
    return getGameById(id);
  }

  create(input: Omit<Game, 'id'>): Game {
    return dbCreateGame(input);
  }

  readonly importBatch = db.transaction((items: { requestId: string; game?: unknown }[]): GameImportResult[] => {
    return items.map(({ requestId, game }) => {
      if (!isGameImportInput(game)) return { requestId, error: 'Dados do jogo inválidos.' };

      try {
        const now = new Date().toISOString();
        const gameId = createImportedGame(requestId, { ...game, tags: game.tags ?? [], createdAt: now, updatedAt: now });
        return { requestId, gameId };
      } catch (error) {
        console.error('Erro ao gravar jogo importado:', error);
        return { requestId, error: 'Não foi possível gravar o jogo.' };
      }
    });
  });

  update(id: string, input: Partial<Pick<Game, 'title' | 'platform' | 'status' | 'date' | 'description' | 'tags'>>): Game | undefined {
    return dbUpdateGame(id, input);
  }

  delete(id: string): boolean {
    return dbDeleteGame(id);
  }
}
