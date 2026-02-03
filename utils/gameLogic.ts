
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
    2: ['#667EEA', '#764BA2'],
    4: ['#F093FB', '#F5576C'],
    8: ['#4FACFE', '#00F2FE'],
    16: ['#43E97B', '#38F9D7'],
    32: ['#FA709A', '#FEE140'],
    64: ['#30CFD0', '#330867'],
    128: ['#A8EDEA', '#FED6E3'],
    256: ['#FF9A56', '#FF6A88'],
    512: ['#FBC2EB', '#A6C1EE'],
    1024: ['#FFD89B', '#19547B'],
    2048: ['#FDC830', '#F37335'],
    4096: ['#FF512F', '#DD2476'],
    8192: ['#DA22FF', '#9733EE'],
    16384: ['#17EAD9', '#6078EA'],
    32768: ['#F4D03F', '#16A085'],
    65536: ['#D66D75', '#E29587'],
  };
  
  if (colorMap[value]) {
    return { gradientColors: colorMap[value] };
  }
  
  const hue1 = (Math.log2(value) * 30) % 360;
  const hue2 = (hue1 + 60) % 360;
  return { 
    gradientColors: [
      `hsl(${hue1}, 80%, 60%)`,
      `hsl(${hue2}, 80%, 50%)`
    ]
  };
}

export function getMinimumTileValue(maxTileValue: number): number {
  if (maxTileValue >= 16384) return 32;
  if (maxTileValue >= 8192) return 16;
  if (maxTileValue >= 4096) return 8;
  if (maxTileValue >= 2048) return 4;
  return 2;
}

export function generateNewTileValue(maxBoardValue: number, minTileValue: number): number {
  const random = Math.random();
  
  const possibleValues: number[] = [];
  if (minTileValue <= 2) possibleValues.push(2);
  if (minTileValue <= 4) possibleValues.push(4);
  if (minTileValue <= 8) possibleValues.push(8);
  if (minTileValue <= 16) possibleValues.push(16);
  
  if (possibleValues.length === 0) return minTileValue;
  
  if (maxBoardValue < 64) {
    if (possibleValues.includes(2) && random < 0.7) return 2;
    if (possibleValues.includes(4) && random < 0.95) return 4;
    return possibleValues[possibleValues.length - 1];
  } else if (maxBoardValue < 256) {
    if (possibleValues.includes(2) && random < 0.5) return 2;
    if (possibleValues.includes(4) && random < 0.8) return 4;
    return possibleValues[possibleValues.length - 1];
  } else {
    if (possibleValues.includes(2) && random < 0.3) return 2;
    if (possibleValues.includes(4) && random < 0.6) return 4;
    if (possibleValues.includes(8) && random < 0.85) return 8;
    return possibleValues[possibleValues.length - 1];
  }
}

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

export function createInitialGrid(): (Tile | null)[][] {
  const grid: (Tile | null)[][] = [];
  
  for (let row = 0; row < GRID_ROWS; row++) {
    const rowArray: (Tile | null)[] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      const value = generateNewTileValue(0, 2);
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

export function areAdjacent(row1: number, col1: number, row2: number, col2: number): boolean {
  const rowDiff = Math.abs(row1 - row2);
  const colDiff = Math.abs(col1 - col2);
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

export function isValidChain(tiles: { row: number; col: number; value: number }[]): boolean {
  if (tiles.length < 2) {
    console.log('Chain validation failed: Must have at least 2 tiles');
    return false;
  }
  
  for (let i = 1; i < tiles.length; i++) {
    if (!areAdjacent(tiles[i - 1].row, tiles[i - 1].col, tiles[i].row, tiles[i].col)) {
      console.log('Chain validation failed: Tiles not adjacent at index', i);
      return false;
    }
  }
  
  const visited = new Set<string>();
  for (const tile of tiles) {
    const key = `${tile.row},${tile.col}`;
    if (visited.has(key)) {
      console.log('Chain validation failed: Tile visited twice');
      return false;
    }
    visited.add(key);
  }
  
  if (tiles[0].value !== tiles[1].value) {
    console.log('Chain validation failed: First two tiles must be identical:', tiles[0].value, '!==', tiles[1].value);
    return false;
  }
  
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

export function calculateChainScore(tiles: { value: number }[]): number {
  return tiles.reduce((sum, tile) => sum + tile.value, 0);
}

export function getHighestValue(tiles: { value: number }[]): number {
  return Math.max(...tiles.map(t => t.value));
}

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
  
  for (let i = 0; i < selectedTiles.length - 1; i++) {
    const tile = selectedTiles[i];
    newGrid[tile.row][tile.col] = null;
  }
  
  newGrid[lastTile.row][lastTile.col] = {
    id: generateTileId(),
    value: newValue,
    row: lastTile.row,
    col: lastTile.col,
  };
  
  return { newGrid, score, mergedValue: newValue };
}

export function applyGravity(grid: (Tile | null)[][]): (Tile | null)[][] {
  const newGrid: (Tile | null)[][] = Array.from({ length: GRID_ROWS }, () => 
    Array(GRID_COLS).fill(null)
  );
  
  console.log('Applying gravity to grid');
  
  for (let col = 0; col < GRID_COLS; col++) {
    const tilesInColumn: Tile[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      const tile = grid[row][col];
      if (tile !== null) {
        tilesInColumn.push(tile);
      }
    }
    
    let targetRow = GRID_ROWS - 1;
    for (let i = tilesInColumn.length - 1; i >= 0; i--) {
      const tile = tilesInColumn[i];
      newGrid[targetRow][col] = {
        ...tile,
        row: targetRow,
        col: col,
      };
      targetRow--;
    }
    
    console.log(`Column ${col}: ${tilesInColumn.length} tiles fell down`);
  }
  
  return newGrid;
}

export function spawnNewTilesAtTop(grid: (Tile | null)[][], minTileValue: number): (Tile | null)[][] {
  const newGrid = grid.map(row => [...row]);
  const maxValue = getMaxBoardValue(grid);
  
  console.log('Spawning new tiles at top of columns');
  
  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (newGrid[row][col] === null) {
        const newValue = generateNewTileValue(maxValue, minTileValue);
        newGrid[row][col] = {
          id: generateTileId(),
          value: newValue,
          row,
          col,
        };
        console.log(`Spawned new tile with value ${newValue} at (${row}, ${col})`);
      }
    }
  }
  
  return newGrid;
}

export function fillEmptyCells(grid: (Tile | null)[][], minTileValue: number): (Tile | null)[][] {
  console.warn('fillEmptyCells is deprecated. Use applyGravity + spawnNewTilesAtTop instead.');
  const afterGravity = applyGravity(grid);
  return spawnNewTilesAtTop(afterGravity, minTileValue);
}

export function hasValidMoves(grid: (Tile | null)[][]): boolean {
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const tile1 = grid[row][col];
      if (!tile1) continue;
      
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

// POWER-UP FUNCTIONS

// Find one valid chain on the board (for Hint power-up)
export function findValidChain(grid: (Tile | null)[][]): { row: number; col: number; value: number }[] | null {
  console.log('Finding valid chain for hint');
  
  // Try to find a chain of at least 3 tiles
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const tile1 = grid[row][col];
      if (!tile1) continue;
      
      // Check all 8 directions for adjacent matching tiles
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
            // Found two matching tiles, try to extend the chain
            const chain = [
              { row, col, value: tile1.value },
              { row: newRow, col: newCol, value: tile2.value }
            ];
            
            // Try to find a third tile
            for (const [dRow2, dCol2] of directions) {
              const newRow2 = newRow + dRow2;
              const newCol2 = newCol + dCol2;
              
              if (newRow2 >= 0 && newRow2 < GRID_ROWS && newCol2 >= 0 && newCol2 < GRID_COLS) {
                if (newRow2 === row && newCol2 === col) continue; // Skip the first tile
                
                const tile3 = grid[newRow2][newCol2];
                if (tile3 && (tile3.value === tile2.value || tile3.value === tile2.value * 2)) {
                  chain.push({ row: newRow2, col: newCol2, value: tile3.value });
                  console.log('Found valid chain:', chain.map(t => t.value).join(' → '));
                  return chain;
                }
              }
            }
            
            // If no third tile, return the pair
            console.log('Found valid pair:', chain.map(t => t.value).join(' → '));
            return chain;
          }
        }
      }
    }
  }
  
  console.log('No valid chain found');
  return null;
}

// Swap two tiles (for Swap power-up)
export function swapTiles(
  grid: (Tile | null)[][],
  tile1: { row: number; col: number },
  tile2: { row: number; col: number }
): (Tile | null)[][] {
  const newGrid = grid.map(row => [...row]);
  
  const temp = newGrid[tile1.row][tile1.col];
  newGrid[tile1.row][tile1.col] = newGrid[tile2.row][tile2.col];
  newGrid[tile2.row][tile2.col] = temp;
  
  // Update row/col properties
  if (newGrid[tile1.row][tile1.col]) {
    newGrid[tile1.row][tile1.col] = {
      ...newGrid[tile1.row][tile1.col]!,
      row: tile1.row,
      col: tile1.col,
    };
  }
  
  if (newGrid[tile2.row][tile2.col]) {
    newGrid[tile2.row][tile2.col] = {
      ...newGrid[tile2.row][tile2.col]!,
      row: tile2.row,
      col: tile2.col,
    };
  }
  
  console.log(`Swapped tiles at (${tile1.row}, ${tile1.col}) and (${tile2.row}, ${tile2.col})`);
  return newGrid;
}

// Shuffle all tile values randomly (for Shuffle power-up)
export function shuffleTiles(grid: (Tile | null)[][]): (Tile | null)[][] {
  const newGrid = grid.map(row => [...row]);
  
  // Collect all tile values
  const values: number[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const tile = newGrid[row][col];
      if (tile) {
        values.push(tile.value);
      }
    }
  }
  
  // Shuffle values using Fisher-Yates algorithm
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  
  // Reassign shuffled values to tiles
  let valueIndex = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (newGrid[row][col]) {
        newGrid[row][col] = {
          id: generateTileId(),
          value: values[valueIndex],
          row,
          col,
        };
        valueIndex++;
      }
    }
  }
  
  console.log('Shuffled all tile values');
  return newGrid;
}
