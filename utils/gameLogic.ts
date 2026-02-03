
import { Tile } from '@/types/game';

export const GRID_COLS = 5; // Changed from 6 to 5 columns
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
export function formatTileValue(value: number | undefined | null): string {
  // Handle undefined, null, or invalid values
  if (value === undefined || value === null || typeof value !== 'number' || isNaN(value)) {
    console.warn('formatTileValue received invalid value:', value);
    return '';
  }
  
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

// Get tile gradient colors based on value - ENHANCED VIBRANT GRADIENTS
export function getTileColor(value: number): { gradientColors: string[] } {
  const colorMap: { [key: number]: string[] } = {
    2: ['#667EEA', '#764BA2'],       // Purple gradient
    4: ['#F093FB', '#F5576C'],       // Pink gradient
    8: ['#4FACFE', '#00F2FE'],       // Cyan gradient
    16: ['#43E97B', '#38F9D7'],      // Green gradient
    32: ['#FA709A', '#FEE140'],      // Pink-yellow gradient
    64: ['#30CFD0', '#330867'],      // Teal-purple gradient
    128: ['#A8EDEA', '#FED6E3'],     // Pastel gradient
    256: ['#FF9A56', '#FF6A88'],     // Orange-pink gradient
    512: ['#FBC2EB', '#A6C1EE'],     // Lavender gradient
    1024: ['#FFD89B', '#19547B'],    // Gold-blue gradient
    2048: ['#FDC830', '#F37335'],    // Gold-orange gradient
    4096: ['#FF512F', '#DD2476'],    // Red-pink gradient
    8192: ['#DA22FF', '#9733EE'],    // Purple gradient
    16384: ['#17EAD9', '#6078EA'],   // Cyan-blue gradient
    32768: ['#F4D03F', '#16A085'],   // Yellow-teal gradient
    65536: ['#D66D75', '#E29587'],   // Rose gradient
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

// Remove a single tile (for Bomb power-up)
export function removeTile(
  grid: (Tile | null)[][],
  row: number,
  col: number
): (Tile | null)[][] {
  const newGrid = grid.map(r => [...r]);
  newGrid[row][col] = null;
  console.log(`Removed tile at (${row}, ${col})`);
  return newGrid;
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

// ATOMIC CHAIN RESOLUTION - Merge + Gravity + Spawn in one operation
export function resolveChainComplete(
  grid: (Tile | null)[][],
  selectedTiles: { row: number; col: number; value: number }[],
  spawnProgression: number
): { finalGrid: (Tile | null)[][]; scoreAdded: number; newSpawnProgression: number } {
  console.log('[GameLogic] Atomic chain resolution starting');
  
  // Step 1: Resolve chain (merge tiles)
  const { newGrid: afterMerge, score } = resolveChain(grid, selectedTiles);
  
  // Step 2: Apply gravity
  const afterGravity = applyGravity(afterMerge);
  
  // Step 3: Spawn new tiles
  const minTileValue = getMinimumTileValue(getMaxBoardValue(afterGravity));
  const finalGrid = spawnNewTilesAtTop(afterGravity, minTileValue);
  
  console.log('[GameLogic] Atomic chain resolution complete - Score added:', score);
  
  return {
    finalGrid,
    scoreAdded: score,
    newSpawnProgression: spawnProgression + 1,
  };
}

// Rebuild grid from saved number array (for loading saved games)
export function rebuildGridFromNumbers(numbersGrid: number[][]): (Tile | null)[][] {
  console.log('[GameLogic] Rebuilding grid from saved numbers');
  return numbersGrid.map((row, r) =>
    row.map((value, c) => ({
      id: generateTileId(),
      value,
      row: r,
      col: c,
    }))
  );
}

// Convert grid to number array (for saving games)
export function gridToNumbers(grid: (Tile | null)[][]): number[][] {
  return grid.map((row) => row.map((tile) => tile ? tile.value : 0));
}
</write file>

<write file="components/GameTile.tsx">
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getTileColor, formatTileValue } from '@/utils/gameLogic';

interface GameTileProps {
  value: number | undefined | null;
  isSelected: boolean;
  size: number;
  isAnimating?: boolean;
  animationDelay?: number;
}

export default function GameTile({ value, isSelected, size }: GameTileProps) {
  // Handle invalid values gracefully
  const safeValue = (value !== undefined && value !== null && typeof value === 'number' && !isNaN(value)) ? value : 2;
  
  const tileColorData = getTileColor(safeValue);
  const displayValue = formatTileValue(safeValue);
  const isGlowing = safeValue >= 1024;
  
  const getFontSize = () => {
    const baseSize = size * 0.4;
    if (displayValue.length >= 4) return baseSize * 0.7;
    if (displayValue.length === 3) return baseSize * 0.85;
    return baseSize;
  };
  
  const fontSize = getFontSize();
  
  return (
    <View
      style={[
        styles.tileContainer,
        {
          width: size,
          height: size,
        },
        isGlowing && styles.glowContainer,
      ]}
    >
      <LinearGradient
        colors={tileColorData.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderWidth: isSelected ? 5 : 0,
            borderColor: isSelected ? '#FFD700' : 'transparent',
            transform: isSelected ? [{ scale: 1.05 }] : [{ scale: 1 }],
          },
        ]}
      >
        <Text 
          style={[
            styles.tileText, 
            { fontSize }
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {displayValue}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  tileContainer: {
    position: 'relative',
  },
  glowContainer: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 15,
    elevation: 15,
  },
  tile: {
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 10,
  },
  tileText: {
    color: '#FFFFFF',
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: -0.5,
  },
});
</write file>

Now let me update the game screens with improved styling and optimized touch handling:

<write file="app/game.tsx">
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
import { GameState, Tile } from '@/types/game';
import {
  createInitialGrid,
  isValidChain,
  resolveChainComplete,
  applyGravity,
  spawnNewTilesAtTop,
  hasValidMoves,
  GRID_CONFIG,
  findValidChain,
  removeTile,
  swapTiles,
  rebuildGridFromNumbers,
  gridToNumbers,
} from '@/utils/gameLogic';
import {
  saveGameState,
  loadGameState,
  clearGameState,
  SavedGameState,
} from '@/utils/storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const GRID_PADDING = 16;
const TILE_GAP = 6;
const HEADER_HEIGHT = 120;
const POWERUP_BAR_HEIGHT = 80;
const BOTTOM_MARGIN = 20;

const AVAILABLE_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - POWERUP_BAR_HEIGHT - BOTTOM_MARGIN - 40;
const AVAILABLE_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;

const TILE_SIZE_BY_WIDTH = (AVAILABLE_WIDTH - TILE_GAP * (GRID_CONFIG.COLS - 1)) / GRID_CONFIG.COLS;
const TILE_SIZE_BY_HEIGHT = (AVAILABLE_HEIGHT - TILE_GAP * (GRID_CONFIG.ROWS - 1)) / GRID_CONFIG.ROWS;

const MAX_TILE_SIZE = 75;
const TILE_SIZE = Math.min(TILE_SIZE_BY_WIDTH, TILE_SIZE_BY_HEIGHT, MAX_TILE_SIZE);

const GRID_WIDTH = GRID_CONFIG.COLS * TILE_SIZE + (GRID_CONFIG.COLS - 1) * TILE_GAP;
const GRID_HEIGHT = GRID_CONFIG.ROWS * TILE_SIZE + (GRID_CONFIG.ROWS - 1) * TILE_GAP;

interface SelectedTile {
  row: number;
  col: number;
  value: number;
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [gameState, setGameState] = useState<GameState>({
    grid: createInitialGrid(),
    score: 0,
    bestScore: 0,
    powerUps: {
      undo: 2,
      hint: 2,
      bomb: 2,
      swap: 2,
    },
    previousGrid: null,
    previousScore: 0,
    spawnProgression: 0,
  });
  
  const [selectedTiles, setSelectedTiles] = useState<SelectedTile[]>([]);
  const selectedTilesRef = useRef<SelectedTile[]>([]);
  
  const [floatingScores, setFloatingScores] = useState<{ id: string; score: number; x: number; y: number }[]>([]);
  const [gameOverVisible, setGameOverVisible] = useState(false);
  const [confirmNewGameVisible, setConfirmNewGameVisible] = useState(false);
  const [gameMenuVisible, setGameMenuVisible] = useState(false);
  
  const [highlightedTiles, setHighlightedTiles] = useState<Set<string>>(new Set());
  const [activePowerUp, setActivePowerUp] = useState<string | null>(null);
  const [selectedPowerUpTiles, setSelectedPowerUpTiles] = useState<SelectedTile[]>([]);
  
  const gridContainerRef = useRef<View>(null);
  const gridOffsetRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [gridMeasured, setGridMeasured] = useState(false);
  
  const hasLoadedInitialState = useRef(false);
  
  useEffect(() => {
    selectedTilesRef.current = selectedTiles;
  }, [selectedTiles]);
  
  const startFreshGame = useCallback(() => {
    console.log('[Game] Starting fresh game');
    const newGrid = createInitialGrid();
    const newState: GameState = {
      grid: newGrid,
      score: 0,
      bestScore: gameState.bestScore,
      powerUps: {
        undo: 2,
        hint: 2,
        bomb: 2,
        swap: 2,
      },
      previousGrid: null,
      previousScore: 0,
      spawnProgression: 0,
    };
    
    setGameState(newState);
    setHighlightedTiles(new Set());
    setActivePowerUp(null);
    setSelectedPowerUpTiles([]);
    setGameOverVisible(false);
    
    const savedState: SavedGameState = {
      grid: gridToNumbers(newGrid),
      score: 0,
      bestScore: newState.bestScore,
      powerUps: newState.powerUps,
      spawnProgression: 0,
    };
    saveGameState(savedState);
  }, [gameState.bestScore]);
  
  const loadSavedData = useCallback(async () => {
    try {
      console.log('[Game] Loading saved game state');
      const savedState = await loadGameState();
      
      if (savedState) {
        console.log('[Game] Rebuilding grid from saved numbers');
        const rebuiltGrid = rebuildGridFromNumbers(savedState.grid);
        
        setGameState({
          grid: rebuiltGrid,
          score: savedState.score,
          bestScore: savedState.bestScore,
          powerUps: savedState.powerUps,
          previousGrid: null,
          previousScore: 0,
          spawnProgression: savedState.spawnProgression,
        });
        
        console.log('[Game] Loaded saved game - Score:', savedState.score);
      } else {
        console.log('[Game] No saved game found, starting fresh');
        startFreshGame();
      }
    } catch (error) {
      console.error('[Game] Failed to load saved game, starting fresh');
      console.error('[Game] Error:', error instanceof Error ? error.message : String(error));
      startFreshGame();
    }
  }, [startFreshGame]);
  
  useEffect(() => {
    if (hasLoadedInitialState.current) {
      return;
    }
    
    hasLoadedInitialState.current = true;
    console.log('[Game] GameScreen mounted on platform:', Platform.OS);
    
    if (params.newGame === 'true') {
      console.log('[Game] Starting new game from home screen');
      clearGameState();
      startFreshGame();
    } else {
      console.log('[Game] Loading game state from storage');
      loadSavedData();
    }
  }, [params, startFreshGame, loadSavedData]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (gridContainerRef.current && !gridMeasured) {
        gridContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
          gridOffsetRef.current = { x: pageX, y: pageY, width, height };
          setGridMeasured(true);
          console.log('[Game] Grid measured - pageX:', pageX, 'pageY:', pageY);
        });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [gridMeasured]);
  
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
        return { row, col, value: tile.value };
      }
    }
    
    return null;
  }, [gameState.grid]);
  
  const handlePowerUpTileSelection = useCallback((event: any) => {
    console.log('[Game] Power-up tile selection');
    const touch = event.nativeEvent.touches[0];
    if (!touch) {
      return;
    }
    
    const locationX = touch.pageX - gridOffsetRef.current.x;
    const locationY = touch.pageY - gridOffsetRef.current.y;
    
    const tile = getTileAtPosition(locationX, locationY);
    
    if (!tile) {
      return;
    }
    
    if (activePowerUp === 'bomb') {
      console.log('[Game] Bomb power-up: removing tile at', tile.row, tile.col);
      let newGrid = removeTile(gameState.grid, tile.row, tile.col);
      
      const afterGravity = applyGravity(newGrid);
      const filledGrid = spawnNewTilesAtTop(afterGravity, gameState.spawnProgression);
      
      const newState: GameState = {
        ...gameState,
        grid: filledGrid,
        powerUps: {
          ...gameState.powerUps,
          bomb: gameState.powerUps.bomb - 1,
        },
      };
      
      setGameState(newState);
      setActivePowerUp(null);
      setSelectedPowerUpTiles([]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      const savedState: SavedGameState = {
        grid: gridToNumbers(filledGrid),
        score: newState.score,
        bestScore: newState.bestScore,
        powerUps: newState.powerUps,
        spawnProgression: newState.spawnProgression,
      };
      saveGameState(savedState);
    } else if (activePowerUp === 'swap') {
      console.log('[Game] Swap power-up: selecting tile', selectedPowerUpTiles.length + 1);
      const newSelected = [...selectedPowerUpTiles, tile];
      setSelectedPowerUpTiles(newSelected);
      
      if (newSelected.length === 2) {
        console.log('[Game] Swapping tiles');
        const swappedGrid = swapTiles(gameState.grid, newSelected[0], newSelected[1]);
        
        const newState: GameState = {
          ...gameState,
          grid: swappedGrid,
          powerUps: {
            ...gameState.powerUps,
            swap: gameState.powerUps.swap - 1,
          },
        };
        
        setGameState(newState);
        setActivePowerUp(null);
        setSelectedPowerUpTiles([]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        
        const savedState: SavedGameState = {
          grid: gridToNumbers(swappedGrid),
          score: newState.score,
          bestScore: newState.bestScore,
          powerUps: newState.powerUps,
          spawnProgression: newState.spawnProgression,
        };
        saveGameState(savedState);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [activePowerUp, gameState, selectedPowerUpTiles, getTileAtPosition]);
  
  const handleTouchStart = useCallback((event: any) => {
    if (!gridMeasured) {
      if (gridContainerRef.current) {
        gridContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
          gridOffsetRef.current = { x: pageX, y: pageY, width, height };
          setGridMeasured(true);
        });
      }
      return;
    }
    
    if (activePowerUp) {
      handlePowerUpTileSelection(event);
      return;
    }
    
    const touch = event.nativeEvent.touches[0];
    if (!touch) {
      return;
    }
    
    const locationX = touch.pageX - gridOffsetRef.current.x;
    const locationY = touch.pageY - gridOffsetRef.current.y;
    
    const tile = getTileAtPosition(locationX, locationY);
    
    if (tile) {
      console.log('[Game] User started chain with tile at row:', tile.row, 'col:', tile.col, 'value:', tile.value);
      const newSelection = [tile];
      setSelectedTiles(newSelection);
      selectedTilesRef.current = newSelection;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      
      if (tile.row === lastTile.row && tile.col === lastTile.col) {
        return;
      }
      
      if (currentSelection.length >= 2) {
        const previousTile = currentSelection[currentSelection.length - 2];
        if (tile.row === previousTile.row && tile.col === previousTile.col) {
          console.log('[Game] User backtracked in chain');
          const newSelection = currentSelection.slice(0, -1);
          setSelectedTiles(newSelection);
          selectedTilesRef.current = newSelection;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return;
        }
      }
      
      const alreadySelected = currentSelection.some(
        t => t.row === tile.row && t.col === tile.col
      );
      
      if (alreadySelected) {
        return;
      }
      
      const rowDiff = Math.abs(tile.row - lastTile.row);
      const colDiff = Math.abs(tile.col - lastTile.col);
      const isAdjacent = rowDiff <= 1 && colDiff <= 1;
      
      if (!isAdjacent) {
        return;
      }
      
      let canAdd = false;
      
      if (currentSelection.length === 1) {
        if (tile.value === currentSelection[0].value) {
          canAdd = true;
        }
      } else {
        const prevValue = lastTile.value;
        if (tile.value === prevValue || tile.value === prevValue * 2) {
          canAdd = true;
        }
      }
      
      if (canAdd) {
        console.log('[Game] Adding tile to chain - value:', tile.value);
        const newSelection = [...currentSelection, tile];
        setSelectedTiles(newSelection);
        selectedTilesRef.current = newSelection;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [activePowerUp, getTileAtPosition, gridMeasured]);
  
  const handleTouchEnd = useCallback(() => {
    console.log('[Game] Touch end');
    
    if (!gridMeasured || activePowerUp) {
      return;
    }
    
    const finalSelection = selectedTilesRef.current;
    console.log('[Game] User released chain with length:', finalSelection.length);
    
    setSelectedTiles([]);
    selectedTilesRef.current = [];
    
    if (finalSelection.length < 2) {
      console.log('[Game] Chain too short');
      return;
    }
    
    if (!isValidChain(finalSelection)) {
      console.log('[Game] Invalid chain');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    console.log('[Game] Valid chain, resolving atomically (merge + gravity + spawn)');
    
    const lastTile = finalSelection[finalSelection.length - 1];
    
    const result = resolveChainComplete(
      gameState.grid,
      finalSelection,
      gameState.spawnProgression
    );
    
    const scoreId = `score_${Date.now()}`;
    const scoreX = lastTile.col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
    const scoreY = lastTile.row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
    setFloatingScores(prev => [...prev, { id: scoreId, score: result.scoreAdded, x: scoreX, y: scoreY }]);
    
    const newScore = gameState.score + result.scoreAdded;
    const newBestScore = Math.max(newScore, gameState.bestScore);
    
    const newState: GameState = {
      grid: result.finalGrid,
      score: newScore,
      bestScore: newBestScore,
      spawnProgression: result.newSpawnProgression,
      previousGrid: gameState.grid,
      previousScore: gameState.score,
      powerUps: gameState.powerUps,
    };
    
    setGameState(newState);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const savedState: SavedGameState = {
      grid: gridToNumbers(result.finalGrid),
      score: newScore,
      bestScore: newBestScore,
      powerUps: newState.powerUps,
      spawnProgression: result.newSpawnProgression,
    };
    saveGameState(savedState);
    
    setTimeout(() => {
      if (!hasValidMoves(result.finalGrid)) {
        console.log('[Game] No valid moves, game over');
        setGameOverVisible(true);
      }
    }, 300);
  }, [activePowerUp, gameState, gridMeasured]);
  
  function handleRestart() {
    console.log('[Game] Restart game');
    setGameOverVisible(false);
    startFreshGame();
  }
  
  function handleNewGame() {
    console.log('[Game] New game requested');
    setConfirmNewGameVisible(true);
  }
  
  function confirmNewGame() {
    console.log('[Game] New game confirmed');
    setConfirmNewGameVisible(false);
    startFreshGame();
  }
  
  function handlePowerUpPress(powerUpId: string) {
    console.log('[Game] Power-up pressed:', powerUpId);
    
    const usesLeft = gameState.powerUps[powerUpId as keyof typeof gameState.powerUps];
    if (usesLeft === 0) {
      return;
    }
    
    if (powerUpId === 'undo') {
      if (gameState.previousGrid) {
        console.log('[Game] Undo: restoring previous grid');
        const newState: GameState = {
          ...gameState,
          grid: gameState.previousGrid,
          score: gameState.previousScore,
          powerUps: {
            ...gameState.powerUps,
            undo: gameState.powerUps.undo - 1,
          },
          previousGrid: null,
        };
        
        setGameState(newState);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        const savedState: SavedGameState = {
          grid: gridToNumbers(gameState.previousGrid),
          score: gameState.previousScore,
          bestScore: newState.bestScore,
          powerUps: newState.powerUps,
          spawnProgression: newState.spawnProgression,
        };
        saveGameState(savedState);
      }
    } else if (powerUpId === 'hint') {
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
        
        const newState: GameState = {
          ...gameState,
          powerUps: {
            ...gameState.powerUps,
            hint: gameState.powerUps.hint - 1,
          },
        };
        
        setGameState(newState);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        const savedState: SavedGameState = {
          grid: gridToNumbers(gameState.grid),
          score: newState.score,
          bestScore: newState.bestScore,
          powerUps: newState.powerUps,
          spawnProgression: newState.spawnProgression,
        };
        saveGameState(savedState);
      }
    } else if (powerUpId === 'bomb' || powerUpId === 'swap') {
      setActivePowerUp(powerUpId);
      setSelectedPowerUpTiles([]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }
  
  function handleSettingsPress() {
    console.log('[Game] Settings button pressed');
    setGameMenuVisible(true);
  }
  
  function handleResumeGame() {
    console.log('[Game] Resume game');
    setGameMenuVisible(false);
  }
  
  function handleBackToHome() {
    console.log('[Game] Back to home');
    setGameMenuVisible(false);
    router.push('/');
  }
  
  const scoreText = `${gameState.score}`;
  const bestScoreText = `${gameState.bestScore}`;
  
  const powerUpModeText = activePowerUp === 'bomb' ? 'Tap a tile to remove it' : activePowerUp === 'swap' ? `Tap ${selectedPowerUpTiles.length === 0 ? 'first' : 'second'} tile to swap` : '';
  
  const powerUps: PowerUp[] = [
    { id: 'undo', name: 'Undo', icon: 'undo', usesLeft: gameState.powerUps.undo, maxUses: 2 },
    { id: 'hint', name: 'Hint', icon: 'lightbulb', usesLeft: gameState.powerUps.hint, maxUses: 2 },
    { id: 'bomb', name: 'Bomb', icon: 'delete', usesLeft: gameState.powerUps.bomb, maxUses: 2 },
    { id: 'swap', name: 'Swap', icon: 'swap-horiz', usesLeft: gameState.powerUps.swap, maxUses: 2 },
  ];
  
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
      </View>
      
      {activePowerUp && (
        <View style={styles.powerUpModeBar}>
          <Text style={styles.powerUpModeText}>{powerUpModeText}</Text>
          <TouchableOpacity
            onPress={() => {
              console.log('[Game] Cancelling power-up mode');
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
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouchStart}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
          onResponderTerminationRequest={() => false}
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
                    stroke="#FFD700"
                    strokeWidth={5}
                    strokeLinecap="round"
                  />
                );
              })}
            </Svg>
          )}
          
          {gameState.grid.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((tile, colIndex) => {
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
      
      <GameOverModal
        visible={gameOverVisible}
        score={gameState.score}
        bestScore={gameState.bestScore}
        onRestart={handleRestart}
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
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  scoreBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 36,
    color: colors.primary,
    fontWeight: '900',
  },
  bestScoreValue: {
    fontSize: 36,
    color: colors.accent,
    fontWeight: '900',
  },
  powerUpModeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  powerUpModeText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
  },
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '800',
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
