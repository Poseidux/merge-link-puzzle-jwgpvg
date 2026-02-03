
import { Tile } from '@/types/game';

export const GRID_COLS = 5;
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
  
  // Early game: mostly 2s, some 4s, fewer 8s
  if (maxBoardValue < 64) {
    if (possibleValues.includes(2) && random < 0.7) return 2;
    if (possibleValues.includes(4) && random < 0.95) return 4;
    return possibleValues[possibleValues.length - 1];
  } else if (maxBoardValue < 256) {
    // Mid game: balanced distribution
    if (possibleValues.includes(2) && random < 0.5) return 2;
    if (possibleValues.includes(4) && random < 0.8) return 4;
    return possibleValues[possibleValues.length - 1];
  } else {
    // Late game: more higher values
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
  console.log(`Creating initial grid: ${GRID_ROWS} rows x ${GRID_COLS} cols`);
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
  
  console.log(`Initial grid created with ${grid.length} rows and ${grid[0].length} cols`);
  return grid;
}

// Check if two tiles are adjacent in 8 directions
export function areAdjacent(row1: number, col1: number, row2: number, col2: number): boolean {
  const rowDiff = Math.abs(row1 - row2);
  const colDiff = Math.abs(col1 - col2);
  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

// Validate chain according to exact rules:
// 1. At least 2 tiles
// 2. First two tiles must be the same number
// 3. After that, each next tile must be either the same as previous OR exactly double the previous
// 4. All tiles must be adjacent in 8 directions
// 5. No tile can be used twice
export function isValidChain(tiles: { row: number; col: number; value: number }[]): boolean {
  // Rule 1: At least 2 tiles
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
  
  // Check no tile is used twice
  const visited = new Set<string>();
  for (const tile of tiles) {
    const key = `${tile.row},${tile.col}`;
    if (visited.has(key)) {
      console.log('Chain validation failed: Tile visited twice');
      return false;
    }
    visited.add(key);
  }
  
  // Rule 2: First two tiles must be the same number
  if (tiles[0].value !== tiles[1].value) {
    console.log('Chain validation failed: First two tiles must be identical:', tiles[0].value, '!==', tiles[1].value);
    return false;
  }
  
  // Rule 3: After first two, each next tile must be same or double the previous
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

// Resolve chain according to exact rules:
// 1. Clear all selected tiles EXCEPT the final tile where finger ended
// 2. Final tile becomes merged tile with value = 2× highest value in chain
// 3. Score increases by sum of all tile values in chain
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
  
  // Clear all tiles in the chain EXCEPT the last one
  for (let i = 0; i < selectedTiles.length - 1; i++) {
    const tile = selectedTiles[i];
    console.log(`Clearing tile at (${tile.row}, ${tile.col}) with value ${tile.value}`);
    newGrid[tile.row][tile.col] = null;
  }
  
  // Place the merged tile at the last position (where finger ended)
  console.log(`Placing merged tile with value ${newValue} at (${lastTile.row}, ${lastTile.col})`);
  newGrid[lastTile.row][lastTile.col] = {
    id: generateTileId(),
    value: newValue,
    row: lastTile.row,
    col: lastTile.col,
  };
  
  return { newGrid, score, mergedValue: newValue };
}

// Apply gravity: tiles fall straight down within their column to fill gaps
export function applyGravity(grid: (Tile | null)[][]): (Tile | null)[][] {
  console.log('Applying gravity to grid');
  
  // Create a new grid filled with nulls
  const newGrid: (Tile | null)[][] = Array.from({ length: GRID_ROWS }, () => 
    Array(GRID_COLS).fill(null)
  );
  
  // Process each column independently
  for (let col = 0; col < GRID_COLS; col++) {
    // Collect all non-null tiles in this column from top to bottom
    const tilesInColumn: Tile[] = [];
    
    for (let row = 0; row < GRID_ROWS; row++) {
      const tile = grid[row][col];
      if (tile !== null) {
        tilesInColumn.push(tile);
      }
    }
    
    // Place tiles at the bottom of the column, filling from bottom to top
    let writeRow = GRID_ROWS - 1; // Start at the bottom row
    
    for (let i = tilesInColumn.length - 1; i >= 0; i--) {
      const tile = tilesInColumn[i];
      newGrid[writeRow][col] = {
        ...tile,
        row: writeRow,
        col: col,
      };
      writeRow--; // Move up one row
    }
    
    if (tilesInColumn.length > 0) {
      const emptySpaces = GRID_ROWS - tilesInColumn.length;
      console.log(`Column ${col}: ${tilesInColumn.length} tiles, ${emptySpaces} empty spaces at top (rows 0-${emptySpaces - 1})`);
    }
  }
  
  return newGrid;
}

// Spawn new tiles at the TOP to fill remaining empty cells
export function spawnNewTilesAtTop(grid: (Tile | null)[][], minTileValue: number): (Tile | null)[][] {
  console.log('Spawning new tiles at top of columns');
  
  const newGrid = grid.map(row => [...row]);
  const maxValue = getMaxBoardValue(grid);
  
  let spawnedCount = 0;
  
  // Fill empty cells from top to bottom in each column
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
        spawnedCount++;
        console.log(`Spawned new tile with value ${newValue} at (${row}, ${col})`);
      }
    }
  }
  
  console.log(`Total spawned tiles: ${spawnedCount}`);
  return newGrid;
}

export function fillEmptyCells(grid: (Tile | null)[][], minTileValue: number): (Tile | null)[][] {
  console.warn('fillEmptyCells is deprecated. Use applyGravity + spawnNewTilesAtTop instead.');
  const afterGravity = applyGravity(grid);
  return spawnNewTilesAtTop(afterGravity, minTileValue);
}

// Check for any valid chain of length 2 or more
export function hasValidMoves(grid: (Tile | null)[][]): boolean {
  console.log('Checking for valid moves on the board');
  
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const tile1 = grid[row][col];
      if (!tile1) continue;
      
      // Check all 8 directions for adjacent matching tiles (valid 2-tile chain)
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
            console.log(`Valid move found: (${row}, ${col}) value ${tile1.value} can merge with (${newRow}, ${newCol}) value ${tile2.value}`);
            return true;
          }
        }
      }
    }
  }
  
  console.log('No valid moves found on the board');
  return false;
}

export function ensureValidMovesAfterContinue(grid: (Tile | null)[][], minTileValue: number): (Tile | null)[][] {
  let newGrid = grid.map(row => [...row]);
  let attempts = 0;
  const maxAttempts = 20;
  
  console.log('Ensuring valid moves after continue');
  
  while (!hasValidMoves(newGrid) && attempts < maxAttempts) {
    const randomRow = Math.floor(Math.random() * GRID_ROWS);
    const randomCol = Math.floor(Math.random() * GRID_COLS);
    const newValue = minTileValue;
    
    console.log(`Attempt ${attempts + 1}: Placing tile with value ${newValue} at (${randomRow}, ${randomCol})`);
    
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
</write file>

Now let me verify the GameTile component displays the exact same value used by game logic:Good! The GameTile component displays the value directly from the tile data. Now let me check if there are any issues with the touch handling logic. The main issue I see is that the current code already implements the rules correctly, but let me make sure the resolveChain function is clearing all tiles except the last one properly:

Looking at the code again, I see the issue! In `resolveChain`, the current implementation clears all tiles including the last one, then places a new merged tile. But according to the rules, we should clear all tiles EXCEPT the final tile, and that final tile becomes the merged tile. Let me verify this is correct in my updated version - yes, I already fixed it in the gameLogic.ts file I just wrote.

Now let me update both platform-specific game screen files to ensure they work correctly:

<write file="app/(tabs)/(home)/index.tsx">
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Line } from 'react-native-svg';
import { colors } from '@/styles/commonStyles';
import GameTile from '@/components/GameTile';
import FloatingScore from '@/components/FloatingScore';
import GameOverModal from '@/components/GameOverModal';
import ConfirmModal from '@/components/ConfirmModal';
import PowerUpBar, { PowerUp } from '@/components/PowerUpBar';
import GameMenu from '@/components/GameMenu';
import { GameState, SelectedTile, Tile } from '@/types/game';
import {
  createInitialGrid,
  isValidChain,
  resolveChain,
  applyGravity,
  spawnNewTilesAtTop,
  hasValidMoves,
  ensureValidMovesAfterContinue,
  getMinimumTileValue,
  removeTilesBelowMinimum,
  GRID_CONFIG,
  findValidChain,
  swapTiles,
  shuffleTiles,
} from '@/utils/gameLogic';
import {
  saveGameState,
  loadGameState,
} from '@/utils/storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const GRID_PADDING = 40;
const TILE_GAP = 12;
const HEADER_HEIGHT = 180;
const POWERUP_BAR_HEIGHT = 70;
const BOTTOM_BUTTON_HEIGHT = 80;
const TOP_MARGIN = 16;
const BOTTOM_MARGIN = 16;

const AVAILABLE_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - POWERUP_BAR_HEIGHT - BOTTOM_BUTTON_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;
const AVAILABLE_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;

const TILE_SIZE_BY_WIDTH = (AVAILABLE_WIDTH - TILE_GAP * (GRID_CONFIG.COLS - 1)) / GRID_CONFIG.COLS;
const TILE_SIZE_BY_HEIGHT = (AVAILABLE_HEIGHT - TILE_GAP * (GRID_CONFIG.ROWS - 1)) / GRID_CONFIG.ROWS;

const MAX_TILE_SIZE = 85;
const TILE_SIZE = Math.min(TILE_SIZE_BY_WIDTH, TILE_SIZE_BY_HEIGHT, MAX_TILE_SIZE);

const GRID_WIDTH = GRID_CONFIG.COLS * TILE_SIZE + (GRID_CONFIG.COLS - 1) * TILE_GAP;
const GRID_HEIGHT = GRID_CONFIG.ROWS * TILE_SIZE + (GRID_CONFIG.ROWS - 1) * TILE_GAP;

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [gameState, setGameState] = useState<GameState>({
    grid: createInitialGrid(),
    score: 0,
    bestScore: 0,
    continueUsed: false,
    preGameOverSnapshot: null,
    minTileValue: 2,
  });
  
  const [selectedTiles, setSelectedTiles] = useState<SelectedTile[]>([]);
  const selectedTilesRef = useRef<SelectedTile[]>([]);
  
  const [floatingScores, setFloatingScores] = useState<{ id: string; score: number; x: number; y: number }[]>([]);
  const [gameOverVisible, setGameOverVisible] = useState(false);
  const [confirmNewGameVisible, setConfirmNewGameVisible] = useState(false);
  const [gameMenuVisible, setGameMenuVisible] = useState(false);
  
  const [powerUps, setPowerUps] = useState<PowerUp[]>([
    { id: 'hint', name: 'Hint', icon: 'lightbulb', usesLeft: 2, maxUses: 2 },
    { id: 'bomb', name: 'Bomb', icon: 'delete', usesLeft: 2, maxUses: 2 },
    { id: 'swap', name: 'Swap', icon: 'swap-horiz', usesLeft: 2, maxUses: 2 },
    { id: 'shuffle', name: 'Shuffle', icon: 'shuffle', usesLeft: 2, maxUses: 2 },
  ]);
  
  const [highlightedTiles, setHighlightedTiles] = useState<Set<string>>(new Set());
  const [activePowerUp, setActivePowerUp] = useState<string | null>(null);
  const [selectedPowerUpTiles, setSelectedPowerUpTiles] = useState<SelectedTile[]>([]);
  const [isProcessingChain, setIsProcessingChain] = useState(false);
  const chainQueueRef = useRef<SelectedTile[][]>([]);
  
  const gridContainerRef = useRef<View>(null);
  const gridOffsetRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [gridMeasured, setGridMeasured] = useState(false);
  
  useEffect(() => {
    selectedTilesRef.current = selectedTiles;
  }, [selectedTiles]);
  
  const startFreshGame = useCallback(() => {
    console.log('Starting fresh game');
    setGameState(prev => ({
      grid: createInitialGrid(),
      score: 0,
      bestScore: prev.bestScore,
      continueUsed: false,
      preGameOverSnapshot: null,
      minTileValue: 2,
    }));
    setPowerUps([
      { id: 'hint', name: 'Hint', icon: 'lightbulb', usesLeft: 2, maxUses: 2 },
      { id: 'bomb', name: 'Bomb', icon: 'delete', usesLeft: 2, maxUses: 2 },
      { id: 'swap', name: 'Swap', icon: 'swap-horiz', usesLeft: 2, maxUses: 2 },
      { id: 'shuffle', name: 'Shuffle', icon: 'shuffle', usesLeft: 2, maxUses: 2 },
    ]);
    setHighlightedTiles(new Set());
    setActivePowerUp(null);
    setSelectedPowerUpTiles([]);
  }, []);
  
  const loadSavedData = useCallback(async () => {
    const savedState = await loadGameState();
    
    if (savedState) {
      console.log('Loaded saved game state');
      setGameState(savedState);
    }
  }, []);
  
  useEffect(() => {
    console.log('GameScreen mounted on platform:', Platform.OS);
    if (params.newGame === 'true') {
      console.log('Starting new game from home screen');
      startFreshGame();
    } else {
      console.log('Loading game state from storage');
      loadSavedData();
    }
  }, [params, startFreshGame, loadSavedData]);
  
  useEffect(() => {
    console.log('Game state changed, saving to storage');
    saveGameState(gameState);
  }, [gameState]);
  
  // Measure grid only once on mount, not on every grid change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (gridContainerRef.current && !gridMeasured) {
        gridContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
          gridOffsetRef.current = { x: pageX, y: pageY, width, height };
          setGridMeasured(true);
          console.log('Grid measured - pageX:', pageX, 'pageY:', pageY, 'width:', width, 'height:', height);
        });
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only run once on mount
  
  const getTileAtPosition = useCallback((x: number, y: number): SelectedTile | null => {
    const col = Math.floor(x / (TILE_SIZE + TILE_GAP));
    const row = Math.floor(y / (TILE_SIZE + TILE_GAP));
    
    if (row < 0 || row >= GRID_CONFIG.ROWS || col < 0 || col >= GRID_CONFIG.COLS) {
      return null;
    }
    
    const tileStartX = col * (TILE_SIZE + TILE_GAP);
    const tileStartY = row * (TILE_SIZE + TILE_GAP);
    
    const localX = x - tileStartX;
    const localY = y - tileStartY;
    
    if (localX >= 0 && localX <= TILE_SIZE && localY >= 0 && localY <= TILE_SIZE) {
      const tile = gameState.grid[row][col];
      if (tile) {
        console.log('Found tile at row:', row, 'col:', col, 'value:', tile.value);
        return { row, col, value: tile.value };
      }
    }
    
    return null;
  }, [gameState.grid]);
  
  const handlePowerUpTileSelection = useCallback((event: any) => {
    console.log('Power-up tile selection');
    const touch = event.nativeEvent.touches[0];
    if (!touch) {
      console.log('No touch data available');
      return;
    }
    
    const locationX = touch.pageX - gridOffsetRef.current.x;
    const locationY = touch.pageY - gridOffsetRef.current.y;
    
    const tile = getTileAtPosition(locationX, locationY);
    
    if (!tile) {
      console.log('No tile found for power-up selection');
      return;
    }
    
    if (activePowerUp === 'bomb') {
      console.log('Bomb power-up: removing tile at', tile.row, tile.col);
      let newGrid = gameState.grid.map(row => [...row]);
      newGrid[tile.row][tile.col] = null;
      
      const afterGravity = applyGravity(newGrid);
      const filledGrid = spawnNewTilesAtTop(afterGravity, gameState.minTileValue);
      
      setGameState(prev => ({
        ...prev,
        grid: filledGrid,
      }));
      
      setPowerUps(prev => prev.map(p => 
        p.id === 'bomb' ? { ...p, usesLeft: p.usesLeft - 1 } : p
      ));
      
      setActivePowerUp(null);
      setSelectedPowerUpTiles([]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (activePowerUp === 'swap') {
      console.log('Swap power-up: selecting tile', selectedPowerUpTiles.length + 1);
      const newSelected = [...selectedPowerUpTiles, tile];
      setSelectedPowerUpTiles(newSelected);
      
      if (newSelected.length === 2) {
        console.log('Swapping tiles');
        const swappedGrid = swapTiles(gameState.grid, newSelected[0], newSelected[1]);
        setGameState(prev => ({
          ...prev,
          grid: swappedGrid,
        }));
        
        setPowerUps(prev => prev.map(p => 
          p.id === 'swap' ? { ...p, usesLeft: p.usesLeft - 1 } : p
        ));
        
        setActivePowerUp(null);
        setSelectedPowerUpTiles([]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [activePowerUp, gameState.grid, gameState.minTileValue, selectedPowerUpTiles, getTileAtPosition]);
  
  const handleTouchStart = useCallback((event: any) => {
    console.log('Touch start - gridMeasured:', gridMeasured, 'activePowerUp:', activePowerUp);
    
    if (!gridMeasured) {
      console.log('Grid not measured yet, measuring now...');
      if (gridContainerRef.current) {
        gridContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
          gridOffsetRef.current = { x: pageX, y: pageY, width, height };
          setGridMeasured(true);
          console.log('Grid measured immediately - pageX:', pageX, 'pageY:', pageY);
        });
      }
      return;
    }
    
    if (activePowerUp) {
      console.log('Active power-up mode:', activePowerUp);
      handlePowerUpTileSelection(event);
      return;
    }
    
    const touch = event.nativeEvent.touches[0];
    if (!touch) {
      console.log('No touch data in event');
      return;
    }
    
    const locationX = touch.pageX - gridOffsetRef.current.x;
    const locationY = touch.pageY - gridOffsetRef.current.y;
    
    console.log('Touch start at pageX:', touch.pageX, 'pageY:', touch.pageY);
    console.log('Grid offset x:', gridOffsetRef.current.x, 'y:', gridOffsetRef.current.y);
    console.log('Local position x:', locationX, 'y:', locationY);
    
    const tile = getTileAtPosition(locationX, locationY);
    
    if (tile) {
      console.log('User started chain with tile at row:', tile.row, 'col:', tile.col, 'value:', tile.value);
      const newSelection = [tile];
      setSelectedTiles(newSelection);
      selectedTilesRef.current = newSelection;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      console.log('No tile found at touch start position');
    }
  }, [activePowerUp, getTileAtPosition, handlePowerUpTileSelection, gridMeasured]);
  
  const handleTouchMove = useCallback((event: any) => {
    if (!gridMeasured || activePowerUp) {
      return;
    }
    
    const touch = event.nativeEvent.touches[0];
    if (!touch) {
      return;
    }
    
    const locationX = touch.pageX - gridOffsetRef.current.x;
    const locationY = touch.pageY - gridOffsetRef.current.y;
    
    const tile = getTileAtPosition(locationX, locationY);
    
    if (tile && selectedTilesRef.current.length > 0) {
      const currentSelection = selectedTilesRef.current;
      const lastTile = currentSelection[currentSelection.length - 1];
      
      // Same tile - ignore
      if (tile.row === lastTile.row && tile.col === lastTile.col) {
        return;
      }
      
      // Backtracking: if dragging back to previous tile, remove last tile from chain
      if (currentSelection.length >= 2) {
        const previousTile = currentSelection[currentSelection.length - 2];
        if (tile.row === previousTile.row && tile.col === previousTile.col) {
          console.log('User backtracked in chain');
          const newSelection = currentSelection.slice(0, -1);
          setSelectedTiles(newSelection);
          selectedTilesRef.current = newSelection;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        }
      }
      
      // Check if tile already in chain (no duplicates)
      const alreadySelected = currentSelection.some(
        t => t.row === tile.row && t.col === tile.col
      );
      
      if (alreadySelected) {
        return;
      }
      
      // Check adjacency (8 directions)
      const rowDiff = Math.abs(tile.row - lastTile.row);
      const colDiff = Math.abs(tile.col - lastTile.col);
      const isAdjacent = rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
      
      if (!isAdjacent) {
        return;
      }
      
      // Check value rules
      let canAdd = false;
      
      if (currentSelection.length === 1) {
        // Second tile must match first tile
        if (tile.value === currentSelection[0].value) {
          canAdd = true;
        }
      } else {
        // After second tile, must be same or double previous
        const prevValue = lastTile.value;
        if (tile.value === prevValue || tile.value === prevValue * 2) {
          canAdd = true;
        }
      }
      
      if (canAdd) {
        console.log('Adding tile to chain - value:', tile.value);
        const newSelection = [...currentSelection, tile];
        setSelectedTiles(newSelection);
        selectedTilesRef.current = newSelection;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [activePowerUp, getTileAtPosition, gridMeasured]);
  
  const processChainQueue = useCallback(async () => {
    if (isProcessingChain || chainQueueRef.current.length === 0) {
      return;
    }
    
    setIsProcessingChain(true);
    
    while (chainQueueRef.current.length > 0) {
      const chainTiles = chainQueueRef.current.shift()!;
      
      if (chainTiles.length < 2) {
        console.log('Chain too short');
        continue;
      }
      
      if (!isValidChain(chainTiles)) {
        console.log('Invalid chain');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        continue;
      }
      
      console.log('Valid chain, resolving');
      
      const lastTile = chainTiles[chainTiles.length - 1];
      
      const resolveResult = resolveChain(gameState.grid, chainTiles);
      let newGrid = resolveResult.newGrid;
      const score = resolveResult.score;
      const mergedValue = resolveResult.mergedValue;
      
      const scoreId = `score_${Date.now()}`;
      const scoreX = lastTile.col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
      const scoreY = lastTile.row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
      setFloatingScores(prev => [...prev, { id: scoreId, score, x: scoreX, y: scoreY }]);
      
      const newScore = gameState.score + score;
      const newBestScore = Math.max(newScore, gameState.bestScore);
      
      const newMinTileValue = getMinimumTileValue(mergedValue);
      let currentMinTileValue = gameState.minTileValue;
      
      if (newMinTileValue > currentMinTileValue) {
        console.log('Raising minimum tile value to', newMinTileValue);
        currentMinTileValue = newMinTileValue;
        newGrid = removeTilesBelowMinimum(newGrid, newMinTileValue);
      }
      
      console.log('Applying gravity before spawning');
      const afterGravity = applyGravity(newGrid);
      
      console.log('Spawning new tiles at top');
      const filledGrid = spawnNewTilesAtTop(afterGravity, currentMinTileValue);
      
      // Update state in a single batch to prevent multiple re-renders
      setGameState(prev => ({
        ...prev,
        grid: filledGrid,
        score: newScore,
        bestScore: newBestScore,
        minTileValue: currentMinTileValue,
      }));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Check for game over after refilling
      setTimeout(() => {
        if (!hasValidMoves(filledGrid)) {
          console.log('No valid moves, game over');
          setGameState(prev => ({
            ...prev,
            preGameOverSnapshot: { grid: filledGrid, score: newScore, minTileValue: currentMinTileValue },
          }));
          setGameOverVisible(true);
        }
      }, 100);
    }
    
    setIsProcessingChain(false);
  }, [isProcessingChain, gameState.grid, gameState.score, gameState.bestScore, gameState.minTileValue]);
  
  const handleTouchEnd = useCallback(() => {
    console.log('Touch end - gridMeasured:', gridMeasured, 'activePowerUp:', activePowerUp);
    
    if (!gridMeasured) {
      return;
    }
    
    if (activePowerUp) {
      return;
    }
    
    const finalSelection = selectedTilesRef.current;
    console.log('User released chain with length:', finalSelection.length);
    
    setSelectedTiles([]);
    selectedTilesRef.current = [];
    
    if (finalSelection.length >= 2) {
      console.log('Processing chain with', finalSelection.length, 'tiles');
      chainQueueRef.current.push(finalSelection);
      processChainQueue();
    } else {
      console.log('Chain too short, not processing');
    }
  }, [activePowerUp, processChainQueue, gridMeasured]);
  
  function handleRestart() {
    console.log('Restart game');
    setGameOverVisible(false);
    startFreshGame();
  }
  
  function handleContinue() {
    console.log('Continue game');
    if (gameState.preGameOverSnapshot) {
      const restoredGrid = gameState.preGameOverSnapshot.grid;
      const minTileValue = gameState.preGameOverSnapshot.minTileValue;
      const gridWithMoves = ensureValidMovesAfterContinue(restoredGrid, minTileValue);
      
      setGameState(prev => ({
        ...prev,
        grid: gridWithMoves,
        score: prev.preGameOverSnapshot!.score,
        minTileValue: prev.preGameOverSnapshot!.minTileValue,
        continueUsed: true,
      }));
      setGameOverVisible(false);
    }
  }
  
  function handleNewGame() {
    console.log('New game requested');
    setConfirmNewGameVisible(true);
  }
  
  function confirmNewGame() {
    console.log('New game confirmed');
    setConfirmNewGameVisible(false);
    startFreshGame();
  }
  
  function handlePowerUpPress(powerUpId: string) {
    console.log('Power-up pressed:', powerUpId);
    
    const powerUp = powerUps.find(p => p.id === powerUpId);
    if (!powerUp || powerUp.usesLeft === 0) {
      return;
    }
    
    if (powerUpId === 'hint') {
      const validChain = findValidChain(gameState.grid);
      if (validChain) {
        const highlightIds = new Set<string>();
        validChain.forEach(tile => {
          const tileObj = gameState.grid[tile.row][tile.col];
          if (tileObj) {
            highlightIds.add(tileObj.id);
          }
        });
        setHighlightedTiles(highlightIds);
        
        setTimeout(() => {
          setHighlightedTiles(new Set());
        }, 2000);
        
        setPowerUps(prev => prev.map(p => 
          p.id === powerUpId ? { ...p, usesLeft: p.usesLeft - 1 } : p
        ));
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } else if (powerUpId === 'bomb' || powerUpId === 'swap') {
      setActivePowerUp(powerUpId);
      setSelectedPowerUpTiles([]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (powerUpId === 'shuffle') {
      const shuffledGrid = shuffleTiles(gameState.grid);
      setGameState(prev => ({
        ...prev,
        grid: shuffledGrid,
      }));
      
      setPowerUps(prev => prev.map(p => 
        p.id === powerUpId ? { ...p, usesLeft: p.usesLeft - 1 } : p
      ));
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }
  
  function handleSettingsPress() {
    console.log('Settings button pressed');
    setGameMenuVisible(true);
  }
  
  function handleResumeGame() {
    console.log('Resume game');
    setGameMenuVisible(false);
  }
  
  function handleBackToHome() {
    console.log('Back to home');
    setGameMenuVisible(false);
    router.push('/');
  }
  
  const scoreText = `${gameState.score}`;
  const bestScoreText = `${gameState.bestScore}`;
  const minTileText = `Min: ${gameState.minTileValue}`;
  
  const powerUpModeText = activePowerUp === 'bomb' ? 'Tap a tile to delete it' : activePowerUp === 'swap' ? `Tap ${selectedPowerUpTiles.length === 0 ? 'first' : 'second'} tile to swap` : '';
  
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={styles.scoreBar}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{scoreText}</Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Best</Text>
          <Text style={styles.bestScoreValue}>{bestScoreText}</Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.minTileValue}>{minTileText}</Text>
        </View>
      </View>
      
      {activePowerUp && (
        <View style={styles.powerUpModeBar}>
          <Text style={styles.powerUpModeText}>{powerUpModeText}</Text>
          <TouchableOpacity
            onPress={() => {
              console.log('Cancelling power-up mode');
              setActivePowerUp(null);
              setSelectedPowerUpTiles([]);
            }}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.gameContainer}>
        <View
          ref={gridContainerRef}
          style={styles.gridContainer}
          onStartShouldSetResponder={() => {
            console.log('onStartShouldSetResponder called - returning true');
            return true;
          }}
          onMoveShouldSetResponder={() => {
            console.log('onMoveShouldSetResponder called - returning true');
            return true;
          }}
          onResponderGrant={handleTouchStart}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
          onResponderTerminationRequest={() => {
            console.log('onResponderTerminationRequest - returning false to keep responder');
            return false;
          }}
        >
          {selectedTiles.length > 1 && !activePowerUp && (
            <Svg style={styles.svgOverlay} pointerEvents="none">
              {selectedTiles.map((tile, index) => {
                if (index === 0) return null;
                const prevTile = selectedTiles[index - 1];
                
                const x1 = prevTile.col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
                const y1 = prevTile.row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
                const x2 = tile.col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
                const y2 = tile.row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
                
                return (
                  <Line
                    key={`line-${index}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={colors.accent}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </Svg>
          )}
          
          {gameState.grid.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((tile, colIndex) => {
                if (!tile) return <View key={`empty-${rowIndex}-${colIndex}`} style={styles.tileWrapper} />;
                
                const isSelected = selectedTiles.some(
                  t => t.row === rowIndex && t.col === colIndex
                );
                
                const isHighlighted = highlightedTiles.has(tile.id);
                
                const isPowerUpSelected = selectedPowerUpTiles.some(
                  t => t.row === rowIndex && t.col === colIndex
                );
                
                return (
                  <View
                    key={tile.id}
                    style={styles.tileWrapper}
                  >
                    <GameTile
                      value={tile.value}
                      isSelected={isSelected || isHighlighted || isPowerUpSelected}
                      size={TILE_SIZE}
                    />
                  </View>
                );
              })}
            </View>
          ))}
          
          {floatingScores.map(fs => (
            <FloatingScore
              key={fs.id}
              score={fs.score}
              x={fs.x}
              y={fs.y}
              onComplete={() => {
                setFloatingScores(prev => prev.filter(s => s.id !== fs.id));
              }}
            />
          ))}
        </View>
      </View>
      
      <PowerUpBar
        powerUps={powerUps}
        onPowerUpPress={handlePowerUpPress}
        onSettingsPress={handleSettingsPress}
      />
      
      <TouchableOpacity
        style={styles.newGameButton}
        onPress={handleNewGame}
      >
        <Text style={styles.newGameText}>New Game</Text>
      </TouchableOpacity>
      
      <GameOverModal
        visible={gameOverVisible}
        score={gameState.score}
        bestScore={gameState.bestScore}
        canContinue={!gameState.continueUsed}
        onRestart={handleRestart}
        onContinue={handleContinue}
      />
      
      <ConfirmModal
        visible={confirmNewGameVisible}
        title="New Game"
        message="Are you sure you want to start a new game? Your current progress will be lost."
        confirmText="New Game"
        cancelText="Cancel"
        onConfirm={confirmNewGame}
        onCancel={() => setConfirmNewGameVisible(false)}
      />
      
      <GameMenu
        visible={gameMenuVisible}
        onResumeGame={handleResumeGame}
        onBackToHome={handleBackToHome}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scoreBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 16,
    paddingTop: 48,
    backgroundColor: colors.background,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 32,
    color: colors.text,
    fontWeight: 'bold',
  },
  bestScoreValue: {
    fontSize: 32,
    color: colors.accent,
    fontWeight: 'bold',
  },
  minTileValue: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 8,
  },
  powerUpModeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  powerUpModeText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '700',
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: TOP_MARGIN,
  },
  gridContainer: {
    position: 'relative',
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    backgroundColor: 'transparent',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    zIndex: 1,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: TILE_GAP,
  },
  tileWrapper: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    marginRight: TILE_GAP,
    zIndex: 2,
  },
  newGameButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 24,
    marginBottom: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  newGameText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
</write file>

Now let me update the iOS version with the same logic:

<write file="app/(tabs)/(home)/index.ios.tsx">
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Line } from 'react-native-svg';
import { colors } from '@/styles/commonStyles';
import GameTile from '@/components/GameTile';
import FloatingScore from '@/components/FloatingScore';
import GameOverModal from '@/components/GameOverModal';
import ConfirmModal from '@/components/ConfirmModal';
import PowerUpBar, { PowerUp } from '@/components/PowerUpBar';
import GameMenu from '@/components/GameMenu';
import { GameState, SelectedTile, Tile } from '@/types/game';
import {
  createInitialGrid,
  isValidChain,
  resolveChain,
  applyGravity,
  spawnNewTilesAtTop,
  hasValidMoves,
  ensureValidMovesAfterContinue,
  getMinimumTileValue,
  removeTilesBelowMinimum,
  GRID_CONFIG,
  findValidChain,
  swapTiles,
  shuffleTiles,
} from '@/utils/gameLogic';
import {
  saveGameState,
  loadGameState,
} from '@/utils/storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const GRID_PADDING = 40;
const TILE_GAP = 12;
const HEADER_HEIGHT = 180;
const POWERUP_BAR_HEIGHT = 70;
const BOTTOM_BUTTON_HEIGHT = 80;
const TOP_MARGIN = 16;
const BOTTOM_MARGIN = 16;

const AVAILABLE_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - POWERUP_BAR_HEIGHT - BOTTOM_BUTTON_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;
const AVAILABLE_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;

const TILE_SIZE_BY_WIDTH = (AVAILABLE_WIDTH - TILE_GAP * (GRID_CONFIG.COLS - 1)) / GRID_CONFIG.COLS;
const TILE_SIZE_BY_HEIGHT = (AVAILABLE_HEIGHT - TILE_GAP * (GRID_CONFIG.ROWS - 1)) / GRID_CONFIG.ROWS;

const MAX_TILE_SIZE = 85;
const TILE_SIZE = Math.min(TILE_SIZE_BY_WIDTH, TILE_SIZE_BY_HEIGHT, MAX_TILE_SIZE);

const GRID_WIDTH = GRID_CONFIG.COLS * TILE_SIZE + (GRID_CONFIG.COLS - 1) * TILE_GAP;
const GRID_HEIGHT = GRID_CONFIG.ROWS * TILE_SIZE + (GRID_CONFIG.ROWS - 1) * TILE_GAP;

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [gameState, setGameState] = useState<GameState>({
    grid: createInitialGrid(),
    score: 0,
    bestScore: 0,
    continueUsed: false,
    preGameOverSnapshot: null,
    minTileValue: 2,
  });
  
  const [selectedTiles, setSelectedTiles] = useState<SelectedTile[]>([]);
  const selectedTilesRef = useRef<SelectedTile[]>([]);
  
  const [floatingScores, setFloatingScores] = useState<{ id: string; score: number; x: number; y: number }[]>([]);
  const [gameOverVisible, setGameOverVisible] = useState(false);
  const [confirmNewGameVisible, setConfirmNewGameVisible] = useState(false);
  const [gameMenuVisible, setGameMenuVisible] = useState(false);
  
  const [powerUps, setPowerUps] = useState<PowerUp[]>([
    { id: 'hint', name: 'Hint', icon: 'lightbulb', usesLeft: 2, maxUses: 2 },
    { id: 'bomb', name: 'Bomb', icon: 'delete', usesLeft: 2, maxUses: 2 },
    { id: 'swap', name: 'Swap', icon: 'swap-horiz', usesLeft: 2, maxUses: 2 },
    { id: 'shuffle', name: 'Shuffle', icon: 'shuffle', usesLeft: 2, maxUses: 2 },
  ]);
  
  const [highlightedTiles, setHighlightedTiles] = useState<Set<string>>(new Set());
  const [activePowerUp, setActivePowerUp] = useState<string | null>(null);
  const [selectedPowerUpTiles, setSelectedPowerUpTiles] = useState<SelectedTile[]>([]);
  const [isProcessingChain, setIsProcessingChain] = useState(false);
  const chainQueueRef = useRef<SelectedTile[][]>([]);
  
  const gridContainerRef = useRef<View>(null);
  const gridOffsetRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [gridMeasured, setGridMeasured] = useState(false);
  
  useEffect(() => {
    selectedTilesRef.current = selectedTiles;
  }, [selectedTiles]);
  
  const startFreshGame = useCallback(() => {
    console.log('Starting fresh game');
    setGameState(prev => ({
      grid: createInitialGrid(),
      score: 0,
      bestScore: prev.bestScore,
      continueUsed: false,
      preGameOverSnapshot: null,
      minTileValue: 2,
    }));
    setPowerUps([
      { id: 'hint', name: 'Hint', icon: 'lightbulb', usesLeft: 2, maxUses: 2 },
      { id: 'bomb', name: 'Bomb', icon: 'delete', usesLeft: 2, maxUses: 2 },
      { id: 'swap', name: 'Swap', icon: 'swap-horiz', usesLeft: 2, maxUses: 2 },
      { id: 'shuffle', name: 'Shuffle', icon: 'shuffle', usesLeft: 2, maxUses: 2 },
    ]);
    setHighlightedTiles(new Set());
    setActivePowerUp(null);
    setSelectedPowerUpTiles([]);
  }, []);
  
  const loadSavedData = useCallback(async () => {
    const savedState = await loadGameState();
    
    if (savedState) {
      console.log('Loaded saved game state');
      setGameState(savedState);
    }
  }, []);
  
  useEffect(() => {
    console.log('GameScreen mounted on platform:', Platform.OS);
    if (params.newGame === 'true') {
      console.log('Starting new game from home screen');
      startFreshGame();
    } else {
      console.log('Loading game state from storage');
      loadSavedData();
    }
  }, [params, startFreshGame, loadSavedData]);
  
  useEffect(() => {
    console.log('Game state changed, saving to storage');
    saveGameState(gameState);
  }, [gameState]);
  
  // Measure grid only once on mount, not on every grid change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (gridContainerRef.current && !gridMeasured) {
        gridContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
          gridOffsetRef.current = { x: pageX, y: pageY, width, height };
          setGridMeasured(true);
          console.log('Grid measured - pageX:', pageX, 'pageY:', pageY, 'width:', width, 'height:', height);
        });
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only run once on mount
  
  const getTileAtPosition = useCallback((x: number, y: number): SelectedTile | null => {
    const col = Math.floor(x / (TILE_SIZE + TILE_GAP));
    const row = Math.floor(y / (TILE_SIZE + TILE_GAP));
    
    if (row < 0 || row >= GRID_CONFIG.ROWS || col < 0 || col >= GRID_CONFIG.COLS) {
      return null;
    }
    
    const tileStartX = col * (TILE_SIZE + TILE_GAP);
    const tileStartY = row * (TILE_SIZE + TILE_GAP);
    
    const localX = x - tileStartX;
    const localY = y - tileStartY;
    
    if (localX >= 0 && localX <= TILE_SIZE && localY >= 0 && localY <= TILE_SIZE) {
      const tile = gameState.grid[row][col];
      if (tile) {
        console.log('Found tile at row:', row, 'col:', col, 'value:', tile.value);
        return { row, col, value: tile.value };
      }
    }
    
    return null;
  }, [gameState.grid]);
  
  const handlePowerUpTileSelection = useCallback((event: any) => {
    console.log('Power-up tile selection');
    const touch = event.nativeEvent.touches[0];
    if (!touch) {
      console.log('No touch data available');
      return;
    }
    
    const locationX = touch.pageX - gridOffsetRef.current.x;
    const locationY = touch.pageY - gridOffsetRef.current.y;
    
    const tile = getTileAtPosition(locationX, locationY);
    
    if (!tile) {
      console.log('No tile found for power-up selection');
      return;
    }
    
    if (activePowerUp === 'bomb') {
      console.log('Bomb power-up: removing tile at', tile.row, tile.col);
      let newGrid = gameState.grid.map(row => [...row]);
      newGrid[tile.row][tile.col] = null;
      
      const afterGravity = applyGravity(newGrid);
      const filledGrid = spawnNewTilesAtTop(afterGravity, gameState.minTileValue);
      
      setGameState(prev => ({
        ...prev,
        grid: filledGrid,
      }));
      
      setPowerUps(prev => prev.map(p => 
        p.id === 'bomb' ? { ...p, usesLeft: p.usesLeft - 1 } : p
      ));
      
      setActivePowerUp(null);
      setSelectedPowerUpTiles([]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (activePowerUp === 'swap') {
      console.log('Swap power-up: selecting tile', selectedPowerUpTiles.length + 1);
      const newSelected = [...selectedPowerUpTiles, tile];
      setSelectedPowerUpTiles(newSelected);
      
      if (newSelected.length === 2) {
        console.log('Swapping tiles');
        const swappedGrid = swapTiles(gameState.grid, newSelected[0], newSelected[1]);
        setGameState(prev => ({
          ...prev,
          grid: swappedGrid,
        }));
        
        setPowerUps(prev => prev.map(p => 
          p.id === 'swap' ? { ...p, usesLeft: p.usesLeft - 1 } : p
        ));
        
        setActivePowerUp(null);
        setSelectedPowerUpTiles([]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [activePowerUp, gameState.grid, gameState.minTileValue, selectedPowerUpTiles, getTileAtPosition]);
  
  const handleTouchStart = useCallback((event: any) => {
    console.log('Touch start - gridMeasured:', gridMeasured, 'activePowerUp:', activePowerUp);
    
    if (!gridMeasured) {
      console.log('Grid not measured yet, measuring now...');
      if (gridContainerRef.current) {
        gridContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
          gridOffsetRef.current = { x: pageX, y: pageY, width, height };
          setGridMeasured(true);
          console.log('Grid measured immediately - pageX:', pageX, 'pageY:', pageY);
        });
      }
      return;
    }
    
    if (activePowerUp) {
      console.log('Active power-up mode:', activePowerUp);
      handlePowerUpTileSelection(event);
      return;
    }
    
    const touch = event.nativeEvent.touches[0];
    if (!touch) {
      console.log('No touch data in event');
      return;
    }
    
    const locationX = touch.pageX - gridOffsetRef.current.x;
    const locationY = touch.pageY - gridOffsetRef.current.y;
    
    console.log('Touch start at pageX:', touch.pageX, 'pageY:', touch.pageY);
    console.log('Grid offset x:', gridOffsetRef.current.x, 'y:', gridOffsetRef.current.y);
    console.log('Local position x:', locationX, 'y:', locationY);
    
    const tile = getTileAtPosition(locationX, locationY);
    
    if (tile) {
      console.log('User started chain with tile at row:', tile.row, 'col:', tile.col, 'value:', tile.value);
      const newSelection = [tile];
      setSelectedTiles(newSelection);
      selectedTilesRef.current = newSelection;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      console.log('No tile found at touch start position');
    }
  }, [activePowerUp, getTileAtPosition, handlePowerUpTileSelection, gridMeasured]);
  
  const handleTouchMove = useCallback((event: any) => {
    if (!gridMeasured || activePowerUp) {
      return;
    }
    
    const touch = event.nativeEvent.touches[0];
    if (!touch) {
      return;
    }
    
    const locationX = touch.pageX - gridOffsetRef.current.x;
    const locationY = touch.pageY - gridOffsetRef.current.y;
    
    const tile = getTileAtPosition(locationX, locationY);
    
    if (tile && selectedTilesRef.current.length > 0) {
      const currentSelection = selectedTilesRef.current;
      const lastTile = currentSelection[currentSelection.length - 1];
      
      // Same tile - ignore
      if (tile.row === lastTile.row && tile.col === lastTile.col) {
        return;
      }
      
      // Backtracking: if dragging back to previous tile, remove last tile from chain
      if (currentSelection.length >= 2) {
        const previousTile = currentSelection[currentSelection.length - 2];
        if (tile.row === previousTile.row && tile.col === previousTile.col) {
          console.log('User backtracked in chain');
          const newSelection = currentSelection.slice(0, -1);
          setSelectedTiles(newSelection);
          selectedTilesRef.current = newSelection;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        }
      }
      
      // Check if tile already in chain (no duplicates)
      const alreadySelected = currentSelection.some(
        t => t.row === tile.row && t.col === tile.col
      );
      
      if (alreadySelected) {
        return;
      }
      
      // Check adjacency (8 directions)
      const rowDiff = Math.abs(tile.row - lastTile.row);
      const colDiff = Math.abs(tile.col - lastTile.col);
      const isAdjacent = rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
      
      if (!isAdjacent) {
        return;
      }
      
      // Check value rules
      let canAdd = false;
      
      if (currentSelection.length === 1) {
        // Second tile must match first tile
        if (tile.value === currentSelection[0].value) {
          canAdd = true;
        }
      } else {
        // After second tile, must be same or double previous
        const prevValue = lastTile.value;
        if (tile.value === prevValue || tile.value === prevValue * 2) {
          canAdd = true;
        }
      }
      
      if (canAdd) {
        console.log('Adding tile to chain - value:', tile.value);
        const newSelection = [...currentSelection, tile];
        setSelectedTiles(newSelection);
        selectedTilesRef.current = newSelection;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [activePowerUp, getTileAtPosition, gridMeasured]);
  
  const processChainQueue = useCallback(async () => {
    if (isProcessingChain || chainQueueRef.current.length === 0) {
      return;
    }
    
    setIsProcessingChain(true);
    
    while (chainQueueRef.current.length > 0) {
      const chainTiles = chainQueueRef.current.shift()!;
      
      if (chainTiles.length < 2) {
        console.log('Chain too short');
        continue;
      }
      
      if (!isValidChain(chainTiles)) {
        console.log('Invalid chain');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        continue;
      }
      
      console.log('Valid chain, resolving');
      
      const lastTile = chainTiles[chainTiles.length - 1];
      
      const resolveResult = resolveChain(gameState.grid, chainTiles);
      let newGrid = resolveResult.newGrid;
      const score = resolveResult.score;
      const mergedValue = resolveResult.mergedValue;
      
      const scoreId = `score_${Date.now()}`;
      const scoreX = lastTile.col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
      const scoreY = lastTile.row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
      setFloatingScores(prev => [...prev, { id: scoreId, score, x: scoreX, y: scoreY }]);
      
      const newScore = gameState.score + score;
      const newBestScore = Math.max(newScore, gameState.bestScore);
      
      const newMinTileValue = getMinimumTileValue(mergedValue);
      let currentMinTileValue = gameState.minTileValue;
      
      if (newMinTileValue > currentMinTileValue) {
        console.log('Raising minimum tile value to', newMinTileValue);
        currentMinTileValue = newMinTileValue;
        newGrid = removeTilesBelowMinimum(newGrid, newMinTileValue);
      }
      
      console.log('Applying gravity before spawning');
      const afterGravity = applyGravity(newGrid);
      
      console.log('Spawning new tiles at top');
      const filledGrid = spawnNewTilesAtTop(afterGravity, currentMinTileValue);
      
      // Update state in a single batch to prevent multiple re-renders
      setGameState(prev => ({
        ...prev,
        grid: filledGrid,
        score: newScore,
        bestScore: newBestScore,
        minTileValue: currentMinTileValue,
      }));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Check for game over after refilling
      setTimeout(() => {
        if (!hasValidMoves(filledGrid)) {
          console.log('No valid moves, game over');
          setGameState(prev => ({
            ...prev,
            preGameOverSnapshot: { grid: filledGrid, score: newScore, minTileValue: currentMinTileValue },
          }));
          setGameOverVisible(true);
        }
      }, 100);
    }
    
    setIsProcessingChain(false);
  }, [isProcessingChain, gameState.grid, gameState.score, gameState.bestScore, gameState.minTileValue]);
  
  const handleTouchEnd = useCallback(() => {
    console.log('Touch end - gridMeasured:', gridMeasured, 'activePowerUp:', activePowerUp);
    
    if (!gridMeasured) {
      return;
    }
    
    if (activePowerUp) {
      return;
    }
    
    const finalSelection = selectedTilesRef.current;
    console.log('User released chain with length:', finalSelection.length);
    
    setSelectedTiles([]);
    selectedTilesRef.current = [];
    
    if (finalSelection.length >= 2) {
      console.log('Processing chain with', finalSelection.length, 'tiles');
      chainQueueRef.current.push(finalSelection);
      processChainQueue();
    } else {
      console.log('Chain too short, not processing');
    }
  }, [activePowerUp, processChainQueue, gridMeasured]);
  
  function handleRestart() {
    console.log('Restart game');
    setGameOverVisible(false);
    startFreshGame();
  }
  
  function handleContinue() {
    console.log('Continue game');
    if (gameState.preGameOverSnapshot) {
      const restoredGrid = gameState.preGameOverSnapshot.grid;
      const minTileValue = gameState.preGameOverSnapshot.minTileValue;
      const gridWithMoves = ensureValidMovesAfterContinue(restoredGrid, minTileValue);
      
      setGameState(prev => ({
        ...prev,
        grid: gridWithMoves,
        score: prev.preGameOverSnapshot!.score,
        minTileValue: prev.preGameOverSnapshot!.minTileValue,
        continueUsed: true,
      }));
      setGameOverVisible(false);
    }
  }
  
  function handleNewGame() {
    console.log('New game requested');
    setConfirmNewGameVisible(true);
  }
  
  function confirmNewGame() {
    console.log('New game confirmed');
    setConfirmNewGameVisible(false);
    startFreshGame();
  }
  
  function handlePowerUpPress(powerUpId: string) {
    console.log('Power-up pressed:', powerUpId);
    
    const powerUp = powerUps.find(p => p.id === powerUpId);
    if (!powerUp || powerUp.usesLeft === 0) {
      return;
    }
    
    if (powerUpId === 'hint') {
      const validChain = findValidChain(gameState.grid);
      if (validChain) {
        const highlightIds = new Set<string>();
        validChain.forEach(tile => {
          const tileObj = gameState.grid[tile.row][tile.col];
          if (tileObj) {
            highlightIds.add(tileObj.id);
          }
        });
        setHighlightedTiles(highlightIds);
        
        setTimeout(() => {
          setHighlightedTiles(new Set());
        }, 2000);
        
        setPowerUps(prev => prev.map(p => 
          p.id === powerUpId ? { ...p, usesLeft: p.usesLeft - 1 } : p
        ));
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } else if (powerUpId === 'bomb' || powerUpId === 'swap') {
      setActivePowerUp(powerUpId);
      setSelectedPowerUpTiles([]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (powerUpId === 'shuffle') {
      const shuffledGrid = shuffleTiles(gameState.grid);
      setGameState(prev => ({
        ...prev,
        grid: shuffledGrid,
      }));
      
      setPowerUps(prev => prev.map(p => 
        p.id === powerUpId ? { ...p, usesLeft: p.usesLeft - 1 } : p
      ));
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }
  
  function handleSettingsPress() {
    console.log('Settings button pressed');
    setGameMenuVisible(true);
  }
  
  function handleResumeGame() {
    console.log('Resume game');
    setGameMenuVisible(false);
  }
  
  function handleBackToHome() {
    console.log('Back to home');
    setGameMenuVisible(false);
    router.push('/');
  }
  
  const scoreText = `${gameState.score}`;
  const bestScoreText = `${gameState.bestScore}`;
  const minTileText = `Min: ${gameState.minTileValue}`;
  
  const powerUpModeText = activePowerUp === 'bomb' ? 'Tap a tile to delete it' : activePowerUp === 'swap' ? `Tap ${selectedPowerUpTiles.length === 0 ? 'first' : 'second'} tile to swap` : '';
  
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={styles.scoreBar}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{scoreText}</Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Best</Text>
          <Text style={styles.bestScoreValue}>{bestScoreText}</Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.minTileValue}>{minTileText}</Text>
        </View>
      </View>
      
      {activePowerUp && (
        <View style={styles.powerUpModeBar}>
          <Text style={styles.powerUpModeText}>{powerUpModeText}</Text>
          <TouchableOpacity
            onPress={() => {
              console.log('Cancelling power-up mode');
              setActivePowerUp(null);
              setSelectedPowerUpTiles([]);
            }}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.gameContainer}>
        <View
          ref={gridContainerRef}
          style={styles.gridContainer}
          onStartShouldSetResponder={() => {
            console.log('onStartShouldSetResponder called - returning true');
            return true;
          }}
          onMoveShouldSetResponder={() => {
            console.log('onMoveShouldSetResponder called - returning true');
            return true;
          }}
          onResponderGrant={handleTouchStart}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
          onResponderTerminationRequest={() => {
            console.log('onResponderTerminationRequest - returning false to keep responder');
            return false;
          }}
        >
          {selectedTiles.length > 1 && !activePowerUp && (
            <Svg style={styles.svgOverlay} pointerEvents="none">
              {selectedTiles.map((tile, index) => {
                if (index === 0) return null;
                const prevTile = selectedTiles[index - 1];
                
                const x1 = prevTile.col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
                const y1 = prevTile.row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
                const x2 = tile.col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
                const y2 = tile.row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
                
                return (
                  <Line
                    key={`line-${index}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={colors.accent}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </Svg>
          )}
          
          {gameState.grid.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((tile, colIndex) => {
                if (!tile) return <View key={`empty-${rowIndex}-${colIndex}`} style={styles.tileWrapper} />;
                
                const isSelected = selectedTiles.some(
                  t => t.row === rowIndex && t.col === colIndex
                );
                
                const isHighlighted = highlightedTiles.has(tile.id);
                
                const isPowerUpSelected = selectedPowerUpTiles.some(
                  t => t.row === rowIndex && t.col === colIndex
                );
                
                return (
                  <View
                    key={tile.id}
                    style={styles.tileWrapper}
                  >
                    <GameTile
                      value={tile.value}
                      isSelected={isSelected || isHighlighted || isPowerUpSelected}
                      size={TILE_SIZE}
                    />
                  </View>
                );
              })}
            </View>
          ))}
          
          {floatingScores.map(fs => (
            <FloatingScore
              key={fs.id}
              score={fs.score}
              x={fs.x}
              y={fs.y}
              onComplete={() => {
                setFloatingScores(prev => prev.filter(s => s.id !== fs.id));
              }}
            />
          ))}
        </View>
      </View>
      
      <PowerUpBar
        powerUps={powerUps}
        onPowerUpPress={handlePowerUpPress}
        onSettingsPress={handleSettingsPress}
      />
      
      <TouchableOpacity
        style={styles.newGameButton}
        onPress={handleNewGame}
      >
        <Text style={styles.newGameText}>New Game</Text>
      </TouchableOpacity>
      
      <GameOverModal
        visible={gameOverVisible}
        score={gameState.score}
        bestScore={gameState.bestScore}
        canContinue={!gameState.continueUsed}
        onRestart={handleRestart}
        onContinue={handleContinue}
      />
      
      <ConfirmModal
        visible={confirmNewGameVisible}
        title="New Game"
        message="Are you sure you want to start a new game? Your current progress will be lost."
        confirmText="New Game"
        cancelText="Cancel"
        onConfirm={confirmNewGame}
        onCancel={() => setConfirmNewGameVisible(false)}
      />
      
      <GameMenu
        visible={gameMenuVisible}
        onResumeGame={handleResumeGame}
        onBackToHome={handleBackToHome}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 48,
  },
  scoreBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 16,
    paddingTop: 48,
    backgroundColor: colors.background,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 32,
    color: colors.text,
    fontWeight: 'bold',
  },
  bestScoreValue: {
    fontSize: 32,
    color: colors.accent,
    fontWeight: 'bold',
  },
  minTileValue: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 8,
  },
  powerUpModeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  powerUpModeText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '700',
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: TOP_MARGIN,
  },
  gridContainer: {
    position: 'relative',
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    backgroundColor: 'transparent',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    zIndex: 1,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: TILE_GAP,
  },
  tileWrapper: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    marginRight: TILE_GAP,
    zIndex: 2,
  },
  newGameButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 24,
    marginBottom: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  newGameText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
