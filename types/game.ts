
export interface Tile {
  id: string;
  value: number;
  row: number;
  col: number;
}

export interface GameState {
  grid: Tile[][];
  score: number;
  bestScore: number;
  powerUps: {
    undo: number;
    hint: number;
    bomb: number;
    swap: number;
  };
  previousGrid: Tile[][] | null;
  previousScore: number;
  spawnProgression: number;
}
