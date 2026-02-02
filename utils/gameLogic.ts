
import { Tile, GameSnapshot } from '@/types/game';

const GRID_COLS = 8;
const GRID_ROWS = 5;

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

// Generate a new tile with weighted randomness (favor low values)
export function generateNewTileValue(): number {
  const random = Math.random();
  if (random < 0.7) return 2;
  if (random < 0.9) return 4;
  return 8;
}

// Create initial grid
export function createInitialGrid(): (Tile | null)[][] {
  const grid: (Tile | null)[][] = [];
  
  for (let row = 0; row < GRID_ROWS; row++) {
    const rowArray: (Tile | null)[] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      const value = generateNewTileValue();
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

// Check if two tiles are adjacent (including diagonals)
export function areAdjacent(row1: number, col1: number, row2: number, col2: number): boolean {
  const rowDiff = Math.abs(row1 - row2);
  const colDiff = Math.abs(col1 - col2);
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

// Validate a chain of tiles
export function isValidChain(tiles: { row: number; col: number; value: number }[]): boolean {
  if (tiles.length < 2) return false;
  
  // Check adjacency
  for (let i = 1; i < tiles.length; i++) {
    if (!areAdjacent(tiles[i - 1].row, tiles[i - 1].col, tiles[i].row, tiles[i].col)) {
      return false;
    }
  }
  
  // CRITICAL RULE: The first two tiles MUST have identical values
  if (tiles[0].value !== tiles[1].value) {
    console.log('Chain validation failed: First two tiles must be identical', tiles[0].value, '!==', tiles[1].value);
    return false;
  }
  
  // After the first two identical tiles, subsequent tiles can be same OR double the previous
  for (let i = 2; i < tiles.length; i++) {
    const prevValue = tiles[i - 1].value;
    const currentValue = tiles[i].value;
    
    // Must be same as previous value OR exactly double it
    if (currentValue !== prevValue && currentValue !== prevValue * 2) {
      console.log('Chain validation failed at index', i, ':', currentValue, 'is not equal to or double of', prevValue);
      return false;
    }
  }
  
  console.log('Chain validation passed:', tiles.map(t => t.value).join(' → '));
  return true;
}

// Calculate score from a chain
export function calculateChainScore(tiles: { value: number }[]): number {
  return tiles.reduce((sum, tile) => sum + tile.value, 0);
}

// Get the highest value in a chain
export function getHighestValue(tiles: { value: number }[]): number {
  return Math.max(...tiles.map(t => t.value));
}

// Resolve a valid chain: clear tiles and create new merged tile
export function resolveChain(
  grid: (Tile | null)[][],
  selectedTiles: { row: number; col: number; value: number }[]
): { newGrid: (Tile | null)[][]; score: number } {
  const newGrid = grid.map(row => [...row]);
  const lastTile = selectedTiles[selectedTiles.length - 1];
  const highestValue = getHighestValue(selectedTiles);
  const newValue = highestValue * 2;
  const score = calculateChainScore(selectedTiles);
  
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

// Fill empty cells with new tiles
export function fillEmptyCells(grid: (Tile | null)[][]): (Tile | null)[][] {
  const newGrid = grid.map(row => [...row]);
  
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (newGrid[row][col] === null) {
        newGrid[row][col] = {
          id: generateTileId(),
          value: generateNewTileValue(),
          row,
          col,
        };
      }
    }
  }
  
  return newGrid;
}

// Check if any valid moves exist
export function hasValidMoves(grid: (Tile | null)[][]): boolean {
  // Check all possible pairs of adjacent tiles
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

// Remove a single tile (Hammer power-up)
export function removeTile(grid: (Tile | null)[][], row: number, col: number): (Tile | null)[][] {
  const newGrid = grid.map(r => [...r]);
  newGrid[row][col] = null;
  return fillEmptyCells(newGrid);
}

// Swap two tiles
export function swapTiles(
  grid: (Tile | null)[][],
  row1: number,
  col1: number,
  row2: number,
  col2: number
): (Tile | null)[][] {
  const newGrid = grid.map(r => [...r]);
  const temp = newGrid[row1][col1];
  newGrid[row1][col1] = newGrid[row2][col2];
  newGrid[row2][col2] = temp;
  
  // Update positions
  if (newGrid[row1][col1]) {
    newGrid[row1][col1] = { ...newGrid[row1][col1]!, row: row1, col: col1 };
  }
  if (newGrid[row2][col2]) {
    newGrid[row2][col2] = { ...newGrid[row2][col2]!, row: row2, col: col2 };
  }
  
  return newGrid;
}

// Find a hint (strong chain opportunity)
export function findHint(grid: (Tile | null)[][]): { row: number; col: number }[] | null {
  let bestChain: { row: number; col: number; value: number }[] = [];
  
  // Try to find chains starting from each tile
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const tile = grid[row][col];
      if (!tile) continue;
      
      // Try building chains from this tile
      const chain = findChainFromTile(grid, row, col);
      if (chain.length > bestChain.length) {
        bestChain = chain;
      }
    }
  }
  
  return bestChain.length >= 2 ? bestChain : null;
}

// Helper to find a chain starting from a specific tile
function findChainFromTile(
  grid: (Tile | null)[][],
  startRow: number,
  startCol: number
): { row: number; col: number; value: number }[] {
  const startTile = grid[startRow][startCol];
  if (!startTile) return [];
  
  const chain: { row: number; col: number; value: number }[] = [
    { row: startRow, col: startCol, value: startTile.value }
  ];
  
  // Try to extend the chain
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];
  
  for (const [dRow, dCol] of directions) {
    const newRow = startRow + dRow;
    const newCol = startCol + dCol;
    
    if (newRow >= 0 && newRow < GRID_ROWS && newCol >= 0 && newCol < GRID_COLS) {
      const nextTile = grid[newRow][newCol];
      if (nextTile && nextTile.value === startTile.value) {
        chain.push({ row: newRow, col: newCol, value: nextTile.value });
        return chain;
      }
    }
  }
  
  return chain;
}

export const GRID_CONFIG = {
  COLS: GRID_COLS,
  ROWS: GRID_ROWS,
};
