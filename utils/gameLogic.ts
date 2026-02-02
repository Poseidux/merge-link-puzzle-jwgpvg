
import { Tile } from '@/types/game';

export const GRID_COLS = 8;
export const GRID_ROWS = 5;

export const GRID_CONFIG = {
  COLS: GRID_COLS,
  ROWS: GRID_ROWS,
};

// Generate a unique ID for tiles
export function generateTileId(): string {
  return `tile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get tile color based on value
export function getTileColor(value: number): string {
  const colorMap: { [key: number]: string } = {
    2: '#FF6B6B',
    4: '#FF8E53',
    8: '#FFD93D',
    16: '#6BCF7F',
    32: '#4ECDC4',
    64: '#5DADE2',
    128: '#A569BD',
    256: '#EC7063',
    512: '#F8B739',
    1024: '#48C9B0',
    2048: '#AF7AC5',
  };
  
  return colorMap[value] || '#2C3E50';
}

// Adaptive weighted randomness for spawning tiles
// Early game: mostly 2s and 4s
// As max board value increases, spawn higher values
export function generateNewTileValue(maxBoardValue: number): number {
  const random = Math.random();
  
  if (maxBoardValue < 64) {
    // Early game: 70% 2s, 25% 4s, 5% 8s
    if (random < 0.7) return 2;
    if (random < 0.95) return 4;
    return 8;
  } else if (maxBoardValue < 256) {
    // Mid game: 50% 2s, 30% 4s, 20% 8s
    if (random < 0.5) return 2;
    if (random < 0.8) return 4;
    return 8;
  } else {
    // Late game: 30% 2s, 40% 4s, 30% 8s
    if (random < 0.3) return 2;
    if (random < 0.7) return 4;
    return 8;
  }
}

// Get max value on the board
export function getMaxBoardValue(grid: (Tile | null)[][]): number {
  let max = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const tile = grid[row][col];
      if (tile && tile.value > max) {
        max = tile.value;
      }
    }
  }
  return max;
}

// Create initial grid - always full
export function createInitialGrid(): (Tile | null)[][] {
  const grid: (Tile | null)[][] = [];
  
  for (let row = 0; row < GRID_ROWS; row++) {
    const rowArray: (Tile | null)[] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      const value = generateNewTileValue(0); // Start with low values
      rowArray.push({
        id: generateTileId(),
        value,
        row,
        col,
      });
    }
    grid.push(rowArray);
  }
  
  return grid;
}

// Check if two tiles are adjacent (including diagonals - all 8 directions)
export function areAdjacent(row1: number, col1: number, row2: number, col2: number): boolean {
  const rowDiff = Math.abs(row1 - row2);
  const colDiff = Math.abs(col1 - col2);
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

// CRITICAL: Validate a chain of tiles according to the exact rules
// Rule 1: Chain must have at least 2 tiles
// Rule 2: First two tiles MUST be identical
// Rule 3: After first two, each tile must be SAME or EXACTLY DOUBLE the previous
export function isValidChain(tiles: { row: number; col: number; value: number }[]): boolean {
  if (tiles.length < 2) {
    console.log('Chain validation failed: Must have at least 2 tiles');
    return false;
  }
  
  // Check adjacency for all consecutive tiles
  for (let i = 1; i < tiles.length; i++) {
    if (!areAdjacent(tiles[i - 1].row, tiles[i - 1].col, tiles[i].row, tiles[i].col)) {
      console.log('Chain validation failed: Tiles not adjacent at index', i);
      return false;
    }
  }
  
  // Check for duplicate tiles (same tile visited twice)
  const visited = new Set<string>();
  for (const tile of tiles) {
    const key = `${tile.row},${tile.col}`;
    if (visited.has(key)) {
      console.log('Chain validation failed: Tile visited twice');
      return false;
    }
    visited.add(key);
  }
  
  // Rule 2: The first two tiles MUST have identical values
  if (tiles[0].value !== tiles[1].value) {
    console.log('Chain validation failed: First two tiles must be identical:', tiles[0].value, '!==', tiles[1].value);
    return false;
  }
  
  // Rule 3: After the first two identical tiles, each subsequent tile must be
  // either the SAME value as the immediately previous tile, OR
  // EXACTLY DOUBLE the immediately previous tile
  for (let i = 2; i < tiles.length; i++) {
    const prevValue = tiles[i - 1].value;
    const currentValue = tiles[i].value;
    
    if (currentValue !== prevValue && currentValue !== prevValue * 2) {
      console.log('Chain validation failed at index', i, ':', currentValue, 'is not equal to or double of', prevValue);
      return false;
    }
  }
  
  console.log('Chain validation passed:', tiles.map(t => t.value).join(' → '));
  return true;
}

// Calculate score from a chain (sum of all tile values)
export function calculateChainScore(tiles: { value: number }[]): number {
  return tiles.reduce((sum, tile) => sum + tile.value, 0);
}

// Get the highest value in a chain
export function getHighestValue(tiles: { value: number }[]): number {
  return Math.max(...tiles.map(t => t.value));
}

// Resolve a valid chain: clear tiles and create new merged tile
// Clear all selected tiles EXCEPT the final tile position
// Final tile becomes: 2 × (highest value in chain)
export function resolveChain(
  grid: (Tile | null)[][],
  selectedTiles: { row: number; col: number; value: number }[]
): { newGrid: (Tile | null)[][]; score: number } {
  const newGrid = grid.map(row => [...row]);
  const lastTile = selectedTiles[selectedTiles.length - 1];
  const highestValue = getHighestValue(selectedTiles);
  const newValue = highestValue * 2;
  const score = calculateChainScore(selectedTiles);
  
  console.log('Resolving chain: highest value =', highestValue, ', new value =', newValue, ', score =', score);
  
  // Clear all selected tiles except the last one
  for (let i = 0; i < selectedTiles.length - 1; i++) {
    const tile = selectedTiles[i];
    newGrid[tile.row][tile.col] = null;
  }
  
  // Update the last tile with the new merged value
  newGrid[lastTile.row][lastTile.col] = {
    id: generateTileId(),
    value: newValue,
    row: lastTile.row,
    col: lastTile.col,
  };
  
  return { newGrid, score };
}

// Fill empty cells with new tiles (adaptive weighted randomness)
// Grid should always be full after this
export function fillEmptyCells(grid: (Tile | null)[][]): (Tile | null)[][] {
  const newGrid = grid.map(row => [...row]);
  const maxValue = getMaxBoardValue(grid);
  
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (newGrid[row][col] === null) {
        newGrid[row][col] = {
          id: generateTileId(),
          value: generateNewTileValue(maxValue),
          row,
          col,
        };
      }
    }
  }
  
  return newGrid;
}

// Check if any valid moves exist (any possible chain of length >= 2)
export function hasValidMoves(grid: (Tile | null)[][]): boolean {
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const tile1 = grid[row][col];
      if (!tile1) continue;
      
      // Check all 8 directions
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ];
      
      for (const [dRow, dCol] of directions) {
        const newRow = row + dRow;
        const newCol = col + dCol;
        
        if (newRow >= 0 && newRow < GRID_ROWS && newCol >= 0 && newCol < GRID_COLS) {
          const tile2 = grid[newRow][newCol];
          if (tile2 && tile1.value === tile2.value) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

// Ensure valid moves after Continue by spawning low-value tiles
export function ensureValidMovesAfterContinue(grid: (Tile | null)[][]): (Tile | null)[][] {
  let newGrid = grid.map(row => [...row]);
  let attempts = 0;
  const maxAttempts = 20;
  
  while (!hasValidMoves(newGrid) && attempts < maxAttempts) {
    const randomRow = Math.floor(Math.random() * GRID_ROWS);
    const randomCol = Math.floor(Math.random() * GRID_COLS);
    const newValue = Math.random() < 0.7 ? 2 : 4;
    
    newGrid[randomRow][randomCol] = {
      id: generateTileId(),
      value: newValue,
      row: randomRow,
      col: randomCol,
    };
    
    attempts++;
  }
  
  console.log('Ensured valid moves after', attempts, 'attempts');
  return newGrid;
}
