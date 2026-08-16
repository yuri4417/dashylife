import { Game } from '@dashylife/shared';
import {
  getAllGames,
  getGameById,
  createGame as dbCreateGame,
  updateGame as dbUpdateGame,
  deleteGame as dbDeleteGame,
} from '../db.js';

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

  update(id: string, input: Partial<Pick<Game, 'title' | 'platform' | 'status' | 'date' | 'description' | 'tags'>>): Game | undefined {
    return dbUpdateGame(id, input);
  }

  delete(id: string): boolean {
    return dbDeleteGame(id);
  }
}
