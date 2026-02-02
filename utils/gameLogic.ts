
import { Tile, GameSnapshot } from '@/types/game';

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

// Generate a new tile with weighted randomness (favor low values)
// Mostly 2, then some 4, fewer 8
export function generateNewTileValue(): number {
  const random = Math.random();
  if (random < 0.7) return 2;  // 70% chance for 2
  if (random < 0.9) return 4;  // 20% chance for 4
  return 8;                     // 10% chance for 8
}

// Create initial grid - always full
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
  // Rule 1: Must have at least 2 tiles
  if (tiles.length < 2) {
    console.log('❌ Chain validation failed: Must have at least 2 tiles');
    return false;
  }
  
  // Check adjacency for all consecutive tiles
  for (let i = 1; i < tiles.length; i++) {
    if (!areAdjacent(tiles[i - 1].row, tiles[i - 1].col, tiles[i].row, tiles[i].col)) {
      console.log('❌ Chain validation failed: Tiles not adjacent at index', i);
      return false;
    }
  }
  
  // Check for duplicate tiles (same tile visited twice)
  const visited = new Set<string>();
  for (const tile of tiles) {
    const key = `${tile.row},${tile.col}`;
    if (visited.has(key)) {
      console.log('❌ Chain validation failed: Tile visited twice');
      return false;
    }
    visited.add(key);
  }
  
  // Rule 2: The first two tiles MUST have identical values
  if (tiles[0].value !== tiles[1].value) {
    console.log('❌ Chain validation failed: First two tiles must be identical:', tiles[0].value, '!==', tiles[1].value);
    return false;
  }
  
  // Rule 3: After the first two identical tiles, each subsequent tile must be
  // either the SAME value as the immediately previous tile, OR
  // EXACTLY DOUBLE the immediately previous tile
  for (let i = 2; i < tiles.length; i++) {
    const prevValue = tiles[i - 1].value;
    const currentValue = tiles[i].value;
    
    // Must be same as previous OR exactly double
    if (currentValue !== prevValue && currentValue !== prevValue * 2) {
      console.log('❌ Chain validation failed at index', i, ':', currentValue, 'is not equal to or double of', prevValue);
      return false;
    }
  }
  
  console.log('✅ Chain validation passed:', tiles.map(t => t.value).join(' → '));
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

// Fill empty cells with new tiles (weighted randomness)
// Grid should always be full after this
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

// Check if any valid moves exist (any possible chain of length >= 2)
// A valid move exists if we can find at least one pair of adjacent identical tiles
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
          // If we find two adjacent tiles with the same value, a valid chain is possible
          if (tile2 && tile1.value === tile2.value) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

// Remove a single tile (Hammer power-up) and refill
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
  
  // Try to extend the chain by finding an adjacent tile with the same value
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

// Ensure valid moves after Continue by spawning low-value tiles
export function ensureValidMovesAfterContinue(grid: (Tile | null)[][]): (Tile | null)[][] {
  let newGrid = grid.map(row => [...row]);
  let attempts = 0;
  const maxAttempts = 20;
  
  while (!hasValidMoves(newGrid) && attempts < maxAttempts) {
    // Pick a random tile and replace it with a low value (2 or 4)
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
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  PanResponder,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import GameTile from '@/components/GameTile';
import FloatingScore from '@/components/FloatingScore';
import GameOverModal from '@/components/GameOverModal';
import TutorialOverlay from '@/components/TutorialOverlay';
import SettingsModal from '@/components/SettingsModal';
import ConfirmModal from '@/components/ConfirmModal';
import { GameState, GameSettings, SelectedTile } from '@/types/game';
import {
  createInitialGrid,
  isValidChain,
  resolveChain,
  fillEmptyCells,
  hasValidMoves,
  removeTile,
  swapTiles,
  findHint,
  ensureValidMovesAfterContinue,
  GRID_CONFIG,
} from '@/utils/gameLogic';
import {
  saveGameState,
  loadGameState,
  clearGameState,
  saveSettings,
  loadSettings,
  hasTutorialBeenShown,
  markTutorialShown,
} from '@/utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const TILE_GAP = 8;
const GRID_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
const TILE_SIZE = (GRID_WIDTH - TILE_GAP * (GRID_CONFIG.COLS - 1)) / GRID_CONFIG.COLS;

export default function GameScreen() {
  const [gameState, setGameState] = useState<GameState>({
    grid: createInitialGrid(),
    score: 0,
    bestScore: 0,
    moveHistory: [],
    continueUsed: false,
    preGameOverSnapshot: null,
  });
  
  const [selectedTiles, setSelectedTiles] = useState<SelectedTile[]>([]);
  const [floatingScores, setFloatingScores] = useState<Array<{ id: string; score: number; x: number; y: number }>>([]);
  const [gameOverVisible, setGameOverVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [confirmNewGameVisible, setConfirmNewGameVisible] = useState(false);
  
  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    hapticsEnabled: true,
    darkMode: true,
  });
  
  const [swapMode, setSwapMode] = useState(false);
  const [swapFirstTile, setSwapFirstTile] = useState<{ row: number; col: number } | null>(null);
  const [hammerMode, setHammerMode] = useState(false);
  const [hintTiles, setHintTiles] = useState<{ row: number; col: number }[]>([]);
  
  const gridRef = useRef<View>(null);
  const shakeAnim = useSharedValue(0);
  
  // Load game state and settings on mount
  useEffect(() => {
    console.log('GameScreen mounted, loading saved data');
    loadSavedData();
  }, []);
  
  // Save game state whenever it changes
  useEffect(() => {
    console.log('Game state changed, saving to storage');
    saveGameState(gameState);
  }, [gameState]);
  
  // Check for tutorial on first launch
  useEffect(() => {
    checkTutorial();
  }, []);
  
  async function loadSavedData() {
    const savedState = await loadGameState();
    const savedSettings = await loadSettings();
    
    if (savedState) {
      console.log('Loaded saved game state');
      setGameState(savedState);
    }
    
    if (savedSettings) {
      console.log('Loaded saved settings');
      setSettings(savedSettings);
    }
  }
  
  async function checkTutorial() {
    const shown = await hasTutorialBeenShown();
    if (!shown) {
      console.log('First launch, showing tutorial');
      setTutorialVisible(true);
    }
  }
  
  function handleTutorialClose() {
    console.log('User closed tutorial');
    setTutorialVisible(false);
    markTutorialShown();
  }
  
  function handleSettingChange(key: keyof GameSettings, value: boolean) {
    console.log('Setting changed:', key, value);
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  }
  
  // Pan responder for drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !swapMode && !hammerMode,
      onMoveShouldSetPanResponder: () => !swapMode && !hammerMode,
      
      onPanResponderGrant: (evt) => {
        console.log('User started dragging');
        const { locationX, locationY } = evt.nativeEvent;
        const tile = getTileAtPosition(locationX, locationY);
        
        if (tile) {
          console.log('Selected first tile:', tile);
          setSelectedTiles([tile]);
          if (settings.hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      },
      
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const tile = getTileAtPosition(locationX, locationY);
        
        if (tile && selectedTiles.length > 0) {
          const lastTile = selectedTiles[selectedTiles.length - 1];
          
          // Check if tile is already in the chain
          const alreadySelected = selectedTiles.some(
            t => t.row === tile.row && t.col === tile.col
          );
          
          if (!alreadySelected) {
            // Check if adjacent to last tile
            const isAdjacent = Math.abs(tile.row - lastTile.row) <= 1 && 
                              Math.abs(tile.col - lastTile.col) <= 1 &&
                              !(tile.row === lastTile.row && tile.col === lastTile.col);
            
            if (isAdjacent) {
              const newChain = [...selectedTiles, tile];
              
              // Only add if it would still be valid
              // For first tile, any adjacent tile works
              // For second tile, must be identical to first
              // For subsequent tiles, must be same or double previous
              if (selectedTiles.length === 1) {
                // Second tile - must be identical to first
                if (tile.value === selectedTiles[0].value) {
                  console.log('Extended chain to second tile:', tile);
                  setSelectedTiles(newChain);
                  if (settings.hapticsEnabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }
              } else {
                // Third+ tile - must be same or double previous
                const prevValue = lastTile.value;
                if (tile.value === prevValue || tile.value === prevValue * 2) {
                  console.log('Extended chain:', tile);
                  setSelectedTiles(newChain);
                  if (settings.hapticsEnabled) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }
              }
            }
          }
        }
      },
      
      onPanResponderRelease: () => {
        console.log('User released drag, chain length:', selectedTiles.length);
        handleChainRelease();
      },
    })
  ).current;
  
  function getTileAtPosition(x: number, y: number): SelectedTile | null {
    const col = Math.floor(x / (TILE_SIZE + TILE_GAP));
    const row = Math.floor(y / (TILE_SIZE + TILE_GAP));
    
    if (row >= 0 && row < GRID_CONFIG.ROWS && col >= 0 && col < GRID_CONFIG.COLS) {
      const tile = gameState.grid[row][col];
      if (tile) {
        return { row, col, value: tile.value };
      }
    }
    
    return null;
  }
  
  function handleChainRelease() {
    if (selectedTiles.length < 2) {
      console.log('Chain too short, canceling');
      setSelectedTiles([]);
      return;
    }
    
    if (!isValidChain(selectedTiles)) {
      console.log('Invalid chain, shaking');
      shakeAnim.value = withSequence(
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      setSelectedTiles([]);
      if (settings.hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }
    
    console.log('Valid chain, resolving merge');
    const { newGrid, score } = resolveChain(gameState.grid, selectedTiles);
    const lastTile = selectedTiles[selectedTiles.length - 1];
    
    // Add floating score
    const scoreId = `score_${Date.now()}`;
    const scoreX = lastTile.col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
    const scoreY = lastTile.row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
    setFloatingScores(prev => [...prev, { id: scoreId, score, x: scoreX, y: scoreY }]);
    
    // Update game state
    const newScore = gameState.score + score;
    const newBestScore = Math.max(newScore, gameState.bestScore);
    
    // Save snapshot before filling
    const snapshot = { grid: gameState.grid, score: gameState.score };
    
    // Fill empty cells
    const filledGrid = fillEmptyCells(newGrid);
    
    setGameState(prev => ({
      ...prev,
      grid: filledGrid,
      score: newScore,
      bestScore: newBestScore,
      moveHistory: [...prev.moveHistory.slice(-9), snapshot],
    }));
    
    setSelectedTiles([]);
    
    if (settings.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Check for game over
    setTimeout(() => {
      if (!hasValidMoves(filledGrid)) {
        console.log('No valid moves, game over');
        handleGameOver(filledGrid, newScore);
      }
    }, 500);
  }
  
  function handleGameOver(grid: any, score: number) {
    console.log('Game over triggered');
    setGameState(prev => ({
      ...prev,
      preGameOverSnapshot: { grid, score },
    }));
    setGameOverVisible(true);
  }
  
  function handleRestart() {
    console.log('User restarted game');
    setGameOverVisible(false);
    setGameState({
      grid: createInitialGrid(),
      score: 0,
      bestScore: gameState.bestScore,
      moveHistory: [],
      continueUsed: false,
      preGameOverSnapshot: null,
    });
  }
  
  function handleContinue() {
    console.log('User used continue');
    if (gameState.preGameOverSnapshot) {
      const restoredGrid = gameState.preGameOverSnapshot.grid;
      const gridWithMoves = ensureValidMovesAfterContinue(restoredGrid);
      
      setGameState(prev => ({
        ...prev,
        grid: gridWithMoves,
        score: prev.preGameOverSnapshot!.score,
        continueUsed: true,
      }));
      setGameOverVisible(false);
    }
  }
  
  function handleUndo() {
    console.log('User pressed undo');
    if (gameState.moveHistory.length > 0) {
      const lastSnapshot = gameState.moveHistory[gameState.moveHistory.length - 1];
      setGameState(prev => ({
        ...prev,
        grid: lastSnapshot.grid,
        score: lastSnapshot.score,
        moveHistory: prev.moveHistory.slice(0, -1),
      }));
      if (settings.hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }
  
  function handleHammer() {
    console.log('User activated hammer mode');
    setHammerMode(true);
    setSwapMode(false);
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }
  
  function handleSwap() {
    console.log('User activated swap mode');
    setSwapMode(true);
    setHammerMode(false);
    setSwapFirstTile(null);
    if (settings.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }
  
  function handleHint() {
    console.log('User requested hint');
    const hint = findHint(gameState.grid);
    if (hint) {
      console.log('Showing hint tiles:', hint);
      setHintTiles(hint);
      setTimeout(() => setHintTiles([]), 2000);
      if (settings.hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }
  
  function handleTilePress(row: number, col: number) {
    if (hammerMode) {
      console.log('Hammer used on tile:', row, col);
      const snapshot = { grid: gameState.grid, score: gameState.score };
      const newGrid = removeTile(gameState.grid, row, col);
      setGameState(prev => ({
        ...prev,
        grid: newGrid,
        moveHistory: [...prev.moveHistory.slice(-9), snapshot],
      }));
      setHammerMode(false);
      if (settings.hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else if (swapMode) {
      if (!swapFirstTile) {
        console.log('Selected first tile for swap:', row, col);
        setSwapFirstTile({ row, col });
      } else {
        console.log('Swapping tiles:', swapFirstTile, 'with', row, col);
        const snapshot = { grid: gameState.grid, score: gameState.score };
        const newGrid = swapTiles(gameState.grid, swapFirstTile.row, swapFirstTile.col, row, col);
        setGameState(prev => ({
          ...prev,
          grid: newGrid,
          moveHistory: [...prev.moveHistory.slice(-9), snapshot],
        }));
        setSwapMode(false);
        setSwapFirstTile(null);
        if (settings.hapticsEnabled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    }
  }
  
  function handleNewGame() {
    console.log('User requested new game');
    setConfirmNewGameVisible(true);
  }
  
  function confirmNewGame() {
    console.log('User confirmed new game');
    setConfirmNewGameVisible(false);
    setGameState({
      grid: createInitialGrid(),
      score: 0,
      bestScore: gameState.bestScore,
      moveHistory: [],
      continueUsed: false,
      preGameOverSnapshot: null,
    });
  }
  
  const shakeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeAnim.value }],
    };
  });
  
  const scoreText = `${gameState.score}`;
  const bestScoreText = `${gameState.bestScore}`;
  
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Number Link',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.headerButton}>
              <IconSymbol
                ios_icon_name="gear"
                android_material_icon_name="settings"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />
      
      {/* Score Bar */}
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
      
      {/* Game Grid */}
      <Animated.View
        ref={gridRef}
        style={[styles.gridContainer, shakeStyle]}
        {...panResponder.panHandlers}
      >
        {/* Connector Lines */}
        {selectedTiles.length > 1 && (
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
                />
              );
            })}
          </Svg>
        )}
        
        {gameState.grid.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map((tile, colIndex) => {
              if (!tile) return null;
              
              const isSelected = selectedTiles.some(
                t => t.row === rowIndex && t.col === colIndex
              );
              const isHinted = hintTiles.some(
                t => t.row === rowIndex && t.col === colIndex
              );
              const isSwapSelected = swapFirstTile?.row === rowIndex && swapFirstTile?.col === colIndex;
              
              return (
                <TouchableOpacity
                  key={tile.id}
                  onPress={() => handleTilePress(rowIndex, colIndex)}
                  activeOpacity={0.8}
                  style={[
                    styles.tileWrapper,
                    isHinted && styles.hintedTile,
                    isSwapSelected && styles.swapSelectedTile,
                  ]}
                >
                  <GameTile
                    value={tile.value}
                    isSelected={isSelected}
                    size={TILE_SIZE}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        
        {/* Floating Scores */}
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
      </Animated.View>
      
      {/* Control Bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleUndo}
          disabled={gameState.moveHistory.length === 0}
        >
          <IconSymbol
            ios_icon_name="arrow.uturn.backward"
            android_material_icon_name="undo"
            size={28}
            color={gameState.moveHistory.length === 0 ? colors.textSecondary : colors.text}
          />
          <Text style={[styles.controlLabel, gameState.moveHistory.length === 0 && styles.disabledLabel]}>
            Undo
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, hammerMode && styles.activeControl]}
          onPress={handleHammer}
        >
          <IconSymbol
            ios_icon_name="hammer"
            android_material_icon_name="build"
            size={28}
            color={hammerMode ? colors.accent : colors.text}
          />
          <Text style={[styles.controlLabel, hammerMode && styles.activeLabel]}>
            Hammer
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, swapMode && styles.activeControl]}
          onPress={handleSwap}
        >
          <IconSymbol
            ios_icon_name="arrow.swap"
            android_material_icon_name="swap-horiz"
            size={28}
            color={swapMode ? colors.accent : colors.text}
          />
          <Text style={[styles.controlLabel, swapMode && styles.activeLabel]}>
            Swap
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleHint}
        >
          <IconSymbol
            ios_icon_name="lightbulb"
            android_material_icon_name="lightbulb"
            size={28}
            color={colors.text}
          />
          <Text style={styles.controlLabel}>
            Hint
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* New Game Button */}
      <TouchableOpacity
        style={styles.newGameButton}
        onPress={handleNewGame}
      >
        <Text style={styles.newGameText}>New Game</Text>
      </TouchableOpacity>
      
      {/* Modals */}
      <GameOverModal
        visible={gameOverVisible}
        score={gameState.score}
        bestScore={gameState.bestScore}
        canContinue={!gameState.continueUsed}
        onRestart={handleRestart}
        onContinue={handleContinue}
      />
      
      <TutorialOverlay
        visible={tutorialVisible}
        onClose={handleTutorialClose}
      />
      
      <SettingsModal
        visible={settingsVisible}
        settings={settings}
        onClose={() => setSettingsVisible(false)}
        onSettingChange={handleSettingChange}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
  },
  headerButton: {
    marginRight: 16,
  },
  scoreBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 24,
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
    fontSize: 28,
    color: colors.text,
    fontWeight: 'bold',
  },
  bestScoreValue: {
    fontSize: 28,
    color: colors.accent,
    fontWeight: 'bold',
  },
  gridContainer: {
    padding: GRID_PADDING,
    alignSelf: 'center',
    position: 'relative',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: TILE_GAP,
  },
  tileWrapper: {
    marginRight: TILE_GAP,
    zIndex: 2,
  },
  hintedTile: {
    borderWidth: 3,
    borderColor: colors.accent,
    borderRadius: 12,
  },
  swapSelectedTile: {
    borderWidth: 3,
    borderColor: colors.secondary,
    borderRadius: 12,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: 'auto',
  },
  controlButton: {
    alignItems: 'center',
    padding: 8,
  },
  activeControl: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  controlLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  activeLabel: {
    color: colors.accent,
  },
  disabledLabel: {
    opacity: 0.5,
  },
  newGameButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  newGameText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
