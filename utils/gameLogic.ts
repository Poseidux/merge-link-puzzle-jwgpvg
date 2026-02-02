
import { Tile } from '@/types/game';

export const GRID_COLS = 6;
export const GRID_ROWS = 8;

export const GRID_CONFIG = {
  COLS: GRID_COLS,
  ROWS: GRID_ROWS,
};

// Generate a unique ID for tiles
export function generateTileId(): string {
  return `tile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Format tile value for display (K for thousands, M for millions)
export function formatTileValue(value: number): string {
  if (value >= 1000000) {
    const millions = value / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  if (value >= 1000) {
    const thousands = value / 1000;
    return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
  }
  return value.toString();
}

// Get tile gradient colors based on value - MATT GLOSSY GRADIENT COLORS
export function getTileColor(value: number): { gradientColors: string[] } {
  const colorMap: { [key: number]: string[] } = {
    2: ['#667EEA', '#764BA2'],      // Purple Blue
    4: ['#F093FB', '#F5576C'],      // Pink Red
    8: ['#4FACFE', '#00F2FE'],      // Cyan Blue
    16: ['#43E97B', '#38F9D7'],     // Green Cyan
    32: ['#FA709A', '#FEE140'],     // Pink Yellow
    64: ['#30CFD0', '#330867'],     // Cyan Purple
    128: ['#A8EDEA', '#FED6E3'],    // Mint Pink
    256: ['#FF9A56', '#FF6A88'],    // Orange Pink
    512: ['#FBC2EB', '#A6C1EE'],    // Pink Blue
    1024: ['#FFD89B', '#19547B'],   // Gold Blue (Glow)
    2048: ['#FDC830', '#F37335'],   // Gold Orange (Glow)
    4096: ['#FF512F', '#DD2476'],   // Red Pink (Glow)
    8192: ['#DA22FF', '#9733EE'],   // Purple Magenta (Glow)
    16384: ['#17EAD9', '#6078EA'],  // Cyan Blue (Glow)
    32768: ['#F4D03F', '#16A085'],  // Yellow Teal (Glow)
    65536: ['#D66D75', '#E29587'],  // Rose (Glow)
  };
  
  // For values beyond the map, generate a gradient
  if (colorMap[value]) {
    return { gradientColors: colorMap[value] };
  }
  
  // Generate a gradient for very high values
  const hue1 = (Math.log2(value) * 30) % 360;
  const hue2 = (hue1 + 60) % 360;
  return { 
    gradientColors: [
      `hsl(${hue1}, 80%, 60%)`,
      `hsl(${hue2}, 80%, 50%)`
    ]
  };
}

// Calculate minimum tile value based on max tile achieved
// Once 2048 is reached, minimum becomes 4 (no more 2s)
// Once 4096 is reached, minimum becomes 8 (no more 4s)
// And so on...
export function getMinimumTileValue(maxTileValue: number): number {
  if (maxTileValue >= 16384) return 32;
  if (maxTileValue >= 8192) return 16;
  if (maxTileValue >= 4096) return 8;
  if (maxTileValue >= 2048) return 4;
  return 2;
}

// Adaptive weighted randomness for spawning tiles
// Respects minimum tile value based on progression
export function generateNewTileValue(maxBoardValue: number, minTileValue: number): number {
  const random = Math.random();
  
  // Filter out values below minimum
  const possibleValues: number[] = [];
  if (minTileValue <= 2) possibleValues.push(2);
  if (minTileValue <= 4) possibleValues.push(4);
  if (minTileValue <= 8) possibleValues.push(8);
  if (minTileValue <= 16) possibleValues.push(16);
  
  // If no valid values (shouldn't happen), default to minTileValue
  if (possibleValues.length === 0) return minTileValue;
  
  // Adaptive weights based on game progression
  if (maxBoardValue < 64) {
    // Early game: favor lowest values
    if (possibleValues.includes(2) && random < 0.7) return 2;
    if (possibleValues.includes(4) && random < 0.95) return 4;
    return possibleValues[possibleValues.length - 1];
  } else if (maxBoardValue < 256) {
    // Mid game: balanced distribution
    if (possibleValues.includes(2) && random < 0.5) return 2;
    if (possibleValues.includes(4) && random < 0.8) return 4;
    return possibleValues[possibleValues.length - 1];
  } else {
    // Late game: favor higher values
    if (possibleValues.includes(2) && random < 0.3) return 2;
    if (possibleValues.includes(4) && random < 0.6) return 4;
    if (possibleValues.includes(8) && random < 0.85) return 8;
    return possibleValues[possibleValues.length - 1];
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

// Remove tiles below minimum value from grid
export function removeTilesBelowMinimum(grid: (Tile | null)[][], minValue: number): (Tile | null)[][] {
  const newGrid = grid.map(row => [...row]);
  
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const tile = newGrid[row][col];
      if (tile && tile.value < minValue) {
        console.log(`Removing tile with value ${tile.value} at (${row}, ${col}) - below minimum ${minValue}`);
        newGrid[row][col] = null;
      }
    }
  }
  
  return newGrid;
}

// Create initial grid - always full
export function createInitialGrid(): (Tile | null)[][] {
  const grid: (Tile | null)[][] = [];
  
  for (let row = 0; row < GRID_ROWS; row++) {
    const rowArray: (Tile | null)[] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      const value = generateNewTileValue(0, 2); // Start with low values, minimum 2
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
): { newGrid: (Tile | null)[][]; score: number; mergedValue: number } {
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
  
  return { newGrid, score, mergedValue: newValue };
}

// Fill empty cells with new tiles (adaptive weighted randomness)
// Grid should always be full after this
// Respects minimum tile value based on progression
export function fillEmptyCells(grid: (Tile | null)[][], minTileValue: number): (Tile | null)[][] {
  const newGrid = grid.map(row => [...row]);
  const maxValue = getMaxBoardValue(grid);
  
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (newGrid[row][col] === null) {
        newGrid[row][col] = {
          id: generateTileId(),
          value: generateNewTileValue(maxValue, minTileValue),
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
export function ensureValidMovesAfterContinue(grid: (Tile | null)[][], minTileValue: number): (Tile | null)[][] {
  let newGrid = grid.map(row => [...row]);
  let attempts = 0;
  const maxAttempts = 20;
  
  while (!hasValidMoves(newGrid) && attempts < maxAttempts) {
    const randomRow = Math.floor(Math.random() * GRID_ROWS);
    const randomCol = Math.floor(Math.random() * GRID_COLS);
    const newValue = minTileValue;
    
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
