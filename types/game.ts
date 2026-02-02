
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
  moveHistory: GameSnapshot[];
  continueUsed: boolean;
  preGameOverSnapshot: GameSnapshot | null;
}

export interface GameSnapshot {
  grid: (Tile | null)[][];
  score: number;
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
