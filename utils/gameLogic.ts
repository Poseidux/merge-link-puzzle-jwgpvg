
export const GRID_CONFIG = {
  COLS: 5,
  ROWS: 8,
};

export interface Tile {
  id: string;
  value: number;
  row: number;
  col: number;
}

function generateTileId(): string {
  return `tile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateNewTileValue(spawnProgression: number): number {
  const rand = Math.random();
  
  if (spawnProgression < 10) {
    return rand < 0.7 ? 2 : 4;
  } else if (spawnProgression < 30) {
    if (rand < 0.5) return 2;
    if (rand < 0.8) return 4;
    return 8;
  } else if (spawnProgression < 60) {
    if (rand < 0.3) return 2;
    if (rand < 0.6) return 4;
    if (rand < 0.85) return 8;
    return 16;
  } else {
    if (rand < 0.2) return 4;
    if (rand < 0.5) return 8;
    if (rand < 0.75) return 16;
    return 32;
  }
}

export function createInitialGrid(): Tile[][] {
  const grid: Tile[][] = [];
  for (let r = 0; r < GRID_CONFIG.ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < GRID_CONFIG.COLS; c++) {
      grid[r][c] = {
        id: generateTileId(),
        value: generateNewTileValue(0),
        row: r,
        col: c,
      };
    }
  }
  return grid;
}

/**
 * Rebuild grid from saved numbers.
 * This ensures the tile.value is the single source of truth.
 */
export function rebuildGridFromNumbers(gridNumbers: number[][]): Tile[][] {
  const grid: Tile[][] = [];
  for (let r = 0; r < GRID_CONFIG.ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < GRID_CONFIG.COLS; c++) {
      const value = gridNumbers[r] && gridNumbers[r][c] ? gridNumbers[r][c] : 2;
      grid[r][c] = {
        id: generateTileId(),
        value: value,
        row: r,
        col: c,
      };
    }
  }
  return grid;
}

/**
 * Convert grid to plain numbers for saving.
 * This keeps saved data minimal and consistent.
 */
export function gridToNumbers(grid: Tile[][]): number[][] {
  return grid.map(row => row.map(tile => tile ? tile.value : 0));
}

export function areTilesAdjacent(tile1: { row: number; col: number }, tile2: { row: number; col: number }): boolean {
  const dr = Math.abs(tile1.row - tile2.row);
  const dc = Math.abs(tile1.col - tile2.col);
  return dr <= 1 && dc <= 1 && (dr !== 0 || dc !== 0);
}

export function isValidChain(chain: { row: number; col: number; value: number }[]): boolean {
  if (chain.length < 2) {
    return false;
  }
  
  if (chain[0].value !== chain[1].value) {
    return false;
  }
  
  for (let i = 1; i < chain.length; i++) {
    const prevTile = chain[i - 1];
    const currentTile = chain[i];
    
    if (!areTilesAdjacent(prevTile, currentTile)) {
      return false;
    }
    
    if (currentTile.value !== prevTile.value && currentTile.value !== prevTile.value * 2) {
      return false;
    }
  }
  
  return true;
}

/**
 * Resolve chain and return the complete final board state.
 * This calculates merge + gravity + spawn in memory and returns the final result.
 * The caller should update the grid ONCE with this result to avoid flashing.
 */
export function resolveChainComplete(
  grid: Tile[][],
  chain: { row: number; col: number; value: number }[],
  spawnProgression: number
): { 
  finalGrid: Tile[][]; 
  scoreAdded: number; 
  finalValue: number;
  newSpawnProgression: number;
} {
  // Step 1: Merge
  const newGrid = grid.map(row => [...row]);
  
  let scoreAdded = 0;
  let highestValue = 0;
  
  chain.forEach(tile => {
    scoreAdded += tile.value;
    if (tile.value > highestValue) {
      highestValue = tile.value;
    }
  });
  
  // Clear all tiles except the last one
  for (let i = 0; i < chain.length - 1; i++) {
    const tile = chain[i];
    newGrid[tile.row][tile.col] = null as any;
  }
  
  const lastTile = chain[chain.length - 1];
  const finalValue = highestValue * 2;
  
  newGrid[lastTile.row][lastTile.col] = {
    id: generateTileId(),
    value: finalValue,
    row: lastTile.row,
    col: lastTile.col,
  };
  
  // Step 2: Apply gravity
  const afterGravity = applyGravity(newGrid);
  
  // Step 3: Spawn new tiles
  const newSpawnProgression = spawnProgression + 1;
  const finalGrid = spawnNewTilesAtTop(afterGravity, newSpawnProgression);
  
  return { finalGrid, scoreAdded, finalValue, newSpawnProgression };
}

export function resolveChain(
  grid: Tile[][],
  chain: { row: number; col: number; value: number }[]
): { newGrid: Tile[][]; scoreAdded: number; finalValue: number } {
  const newGrid = grid.map(row => [...row]);
  
  let scoreAdded = 0;
  let highestValue = 0;
  
  chain.forEach(tile => {
    scoreAdded += tile.value;
    if (tile.value > highestValue) {
      highestValue = tile.value;
    }
  });
  
  for (let i = 0; i < chain.length - 1; i++) {
    const tile = chain[i];
    newGrid[tile.row][tile.col] = null as any;
  }
  
  const lastTile = chain[chain.length - 1];
  const finalValue = highestValue * 2;
  
  newGrid[lastTile.row][lastTile.col] = {
    id: generateTileId(),
    value: finalValue,
    row: lastTile.row,
    col: lastTile.col,
  };
  
  return { newGrid, scoreAdded, finalValue };
}

export function applyGravity(grid: Tile[][]): Tile[][] {
  const newGrid: Tile[][] = Array(GRID_CONFIG.ROWS).fill(null).map(() => Array(GRID_CONFIG.COLS).fill(null));
  
  for (let c = 0; c < GRID_CONFIG.COLS; c++) {
    const column: Tile[] = [];
    
    for (let r = 0; r < GRID_CONFIG.ROWS; r++) {
      if (grid[r][c] !== null) {
        column.push(grid[r][c]);
      }
    }
    
    let writeRow = GRID_CONFIG.ROWS - 1;
    for (let i = column.length - 1; i >= 0; i--) {
      newGrid[writeRow][c] = {
        ...column[i],
        row: writeRow,
        col: c,
      };
      writeRow--;
    }
  }
  
  return newGrid;
}

export function spawnNewTilesAtTop(grid: Tile[][], spawnProgression: number): Tile[][] {
  const newGrid = grid.map(row => [...row]);
  
  for (let c = 0; c < GRID_CONFIG.COLS; c++) {
    for (let r = 0; r < GRID_CONFIG.ROWS; r++) {
      if (newGrid[r][c] === null) {
        newGrid[r][c] = {
          id: generateTileId(),
          value: generateNewTileValue(spawnProgression),
          row: r,
          col: c,
        };
      }
    }
  }
  
  return newGrid;
}

export function hasValidMoves(grid: Tile[][]): boolean {
  for (let r = 0; r < GRID_CONFIG.ROWS; r++) {
    for (let c = 0; c < GRID_CONFIG.COLS; c++) {
      const tile = grid[r][c];
      if (!tile) continue;
      
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          
          const nr = r + dr;
          const nc = c + dc;
          
          if (nr >= 0 && nr < GRID_CONFIG.ROWS && nc >= 0 && nc < GRID_CONFIG.COLS) {
            const adjacentTile = grid[nr][nc];
            if (adjacentTile && adjacentTile.value === tile.value) {
              return true;
            }
          }
        }
      }
    }
  }
  
  return false;
}

export function findValidChain(grid: Tile[][]): { row: number; col: number; value: number }[] | null {
  for (let r = 0; r < GRID_CONFIG.ROWS; r++) {
    for (let c = 0; c < GRID_CONFIG.COLS; c++) {
      const tile = grid[r][c];
      if (!tile) continue;
      
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          
          const nr = r + dr;
          const nc = c + dc;
          
          if (nr >= 0 && nr < GRID_CONFIG.ROWS && nc >= 0 && nc < GRID_CONFIG.COLS) {
            const adjacentTile = grid[nr][nc];
            if (adjacentTile && adjacentTile.value === tile.value) {
              return [
                { row: r, col: c, value: tile.value },
                { row: nr, col: nc, value: adjacentTile.value },
              ];
            }
          }
        }
      }
    }
  }
  
  return null;
}

export function removeTile(grid: Tile[][], row: number, col: number): Tile[][] {
  const newGrid = grid.map(r => [...r]);
  newGrid[row][col] = null as any;
  return newGrid;
}

export function swapTiles(
  grid: Tile[][],
  tile1: { row: number; col: number },
  tile2: { row: number; col: number }
): Tile[][] {
  const newGrid = grid.map(r => [...r]);
  
  const temp = newGrid[tile1.row][tile1.col];
  newGrid[tile1.row][tile1.col] = newGrid[tile2.row][tile2.col];
  newGrid[tile2.row][tile2.col] = temp;
  
  if (newGrid[tile1.row][tile1.col]) {
    newGrid[tile1.row][tile1.col] = {
      ...newGrid[tile1.row][tile1.col],
      row: tile1.row,
      col: tile1.col,
    };
  }
  
  if (newGrid[tile2.row][tile2.col]) {
    newGrid[tile2.row][tile2.col] = {
      ...newGrid[tile2.row][tile2.col],
      row: tile2.row,
      col: tile2.col,
    };
  }
  
  return newGrid;
}

export function getTileColor(value: number): string {
  const colors: { [key: number]: string } = {
    2: '#FFE5B4',
    4: '#FFD700',
    8: '#FFA500',
    16: '#FF8C00',
    32: '#FF6347',
    64: '#FF4500',
    128: '#DC143C',
    256: '#C71585',
    512: '#9370DB',
    1024: '#8A2BE2',
    2048: '#4B0082',
  };
  
  return colors[value] || '#2E0854';
}
