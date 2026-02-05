
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
  powerUps: {
    undo: number;
    hint: number;
    bomb: number;
    swap: number;
  };
  previousGrid: (Tile | null)[][] | null;
  previousScore: number;
  spawnProgression: number;
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
  theme: string;
}

export interface Theme {
  id: string;
  name: string;
  boardBackground: string;
  emptyCellColor: string;
  accentColor: string;
  tileColors: { [key: number]: string[] };
}
