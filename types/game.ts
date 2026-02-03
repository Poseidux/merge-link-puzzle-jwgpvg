
export interface Tile {
  id: string;
  value: number;
  row: number;
  col: number;
}

export interface GameState {
  grid: (Tile | null)[][];
  score: number;
  bestScore: number;
  continueUsed: boolean;
  preGameOverSnapshot: GameSnapshot | null;
  minTileValue: number; // Progressive minimum tile value
}

export interface GameSnapshot {
  grid: (Tile | null)[][];
  score: number;
  minTileValue: number;
}

export interface SelectedTile {
  row: number;
  col: number;
  value: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  darkMode: boolean;
}
