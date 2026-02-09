
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Line } from 'react-native-svg';
import { colors, THEMES } from '@/styles/commonStyles';
import GameTile from '@/components/GameTile';
import FloatingScore, { MilestoneBanner } from '@/components/FloatingScore';
import GameOverModal from '@/components/GameOverModal';
import ConfirmModal from '@/components/ConfirmModal';
import SettingsModal from '@/components/SettingsModal';
import PowerUpBar, { PowerUp } from '@/components/PowerUpBar';
import GameMenu from '@/components/GameMenu';
import { GameState, Tile } from '@/types/game';
import { IconSymbol } from '@/components/IconSymbol';
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
  formatTileValue,
  getMaxBoardValue,
} from '@/utils/gameLogic';
import {
  saveGameState,
  loadGameState,
  clearGameState,
  SavedGameState,
  saveTheme,
  loadTheme,
  saveMilestones,
  loadMilestones,
  clearMilestones,
  saveChainHighlightColor,
  loadChainHighlightColor,
} from '@/utils/storage';

const TIMING = {
  MOVE_MS: 0,
  DROP_MS: 0,
  MERGE_MS: 50,
  CHAIN_DELAY_MS: 50,
  GAME_OVER_CHECK: 100,
};

const SWIPE_THRESHOLD = 12;

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Layout constants - optimized for better spacing
const GRID_PADDING = 18;
const TILE_GAP = 7;
const HEADER_HEIGHT = 56;
const POWERUP_BAR_HEIGHT = 80;
const BOARD_CARD_PADDING = 16;
const VERTICAL_SPACING = 12;

// Calculate available space more accurately
const SAFE_AREA_ESTIMATE = 44; // Typical notch height
const AVAILABLE_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - POWERUP_BAR_HEIGHT - SAFE_AREA_ESTIMATE - (VERTICAL_SPACING * 3) - (BOARD_CARD_PADDING * 2);
const AVAILABLE_WIDTH = SCREEN_WIDTH - (GRID_PADDING * 2) - (BOARD_CARD_PADDING * 2);

const TILE_SIZE_BY_WIDTH = (AVAILABLE_WIDTH - TILE_GAP * (GRID_CONFIG.COLS - 1)) / GRID_CONFIG.COLS;
const TILE_SIZE_BY_HEIGHT = (AVAILABLE_HEIGHT - TILE_GAP * (GRID_CONFIG.ROWS - 1)) / GRID_CONFIG.ROWS;

const MAX_TILE_SIZE = 72;
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
  const insets = useSafeAreaInsets();
  
  const [gameState, setGameState] = useState<GameState>({
    grid: createInitialGrid(),
    score: 0,
    bestScore: 0,
    powerUps: {
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
  const [settingsVisible, setSettingsVisible] = useState(false);
  
  const [highlightedTiles, setHighlightedTiles] = useState<Set<string>>(new Set());
  const [activePowerUp, setActivePowerUp] = useState<string | null>(null);
  const [selectedPowerUpTiles, setSelectedPowerUpTiles] = useState<SelectedTile[]>([]);
  
  const [currentTheme, setCurrentTheme] = useState('classic');
  const [chainHighlightColor, setChainHighlightColor] = useState('#FFD700');
  const [milestonesReached, setMilestonesReached] = useState<Set<number>>(new Set());
  const [currentMilestone, setCurrentMilestone] = useState<number | null>(null);
  
  const gridContainerRef = useRef<View>(null);
  const gridOffsetRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const [gridMeasured, setGridMeasured] = useState(false);
  
  const hasLoadedInitialState = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  
  const theme = THEMES[currentTheme as keyof typeof THEMES] || THEMES.classic;
  
  useEffect(() => {
    selectedTilesRef.current = selectedTiles;
  }, [selectedTiles]);
  
  useEffect(() => {
    const loadThemeAndMilestones = async () => {
      const savedTheme = await loadTheme();
      if (savedTheme && THEMES[savedTheme as keyof typeof THEMES]) {
        console.log('[Game] Loaded theme:', savedTheme);
        setCurrentTheme(savedTheme);
      }
      
      const savedHighlightColor = await loadChainHighlightColor();
      if (savedHighlightColor) {
        console.log('[Game] Loaded chain highlight color:', savedHighlightColor);
        setChainHighlightColor(savedHighlightColor);
      }
      
      const savedMilestones = await loadMilestones();
      console.log('[Game] Loaded milestones:', Array.from(savedMilestones));
      setMilestonesReached(savedMilestones);
    };
    
    loadThemeAndMilestones();
  }, []);
  
  const startFreshGame = useCallback(() => {
    console.log('[Game] Starting fresh game');
    const newGrid = createInitialGrid();
    const newState: GameState = {
      grid: newGrid,
      score: 0,
      bestScore: gameState.bestScore,
      powerUps: {
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
    setMilestonesReached(new Set());
    clearMilestones();
    
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
    
    touchStartRef.current = { x: locationX, y: locationY };
    
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
    
    const deltaX = Math.abs(locationX - touchStartRef.current.x);
    const deltaY = Math.abs(locationY - touchStartRef.current.y);
    
    if (deltaX < SWIPE_THRESHOLD && deltaY < SWIPE_THRESHOLD && selectedTilesRef.current.length === 0) {
      return;
    }
    
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
    
    const maxTileValue = getMaxBoardValue(result.finalGrid);
    const milestones = [256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
    const newMilestone = milestones.find(m => m === maxTileValue && !milestonesReached.has(m));
    
    if (newMilestone) {
      console.log('[Game] New milestone reached:', newMilestone);
      setCurrentMilestone(newMilestone);
      const updatedMilestones = new Set(milestonesReached);
      updatedMilestones.add(newMilestone);
      setMilestonesReached(updatedMilestones);
      saveMilestones(updatedMilestones);
    }
    
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
    }, TIMING.GAME_OVER_CHECK);
  }, [activePowerUp, gameState, gridMeasured, milestonesReached]);
  
  function handleRestart() {
    console.log('[Game] Restart game');
    setGameOverVisible(false);
    startFreshGame();
  }
  
  function handleNewGame() {
    console.log('[Game] New game requested from menu');
    setGameMenuVisible(false);
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
  
  function handleMenuPress() {
    console.log('[Game] Menu button pressed - showing Android modal');
    setGameMenuVisible(true);
  }
  
  function handleResumeGame() {
    console.log('[Game] Resume game');
    setGameMenuVisible(false);
  }
  
  function handleBackToHome() {
    console.log('[Game] Back to home - navigating to root with replace');
    setGameMenuVisible(false);
    router.replace('/');
  }
  
  function handleSettingsPress() {
    console.log('[Game] Settings button pressed');
    setSettingsVisible(true);
  }
  
  function handleThemeChange(themeId: string) {
    console.log('[Game] Theme changed to:', themeId);
    setCurrentTheme(themeId);
    saveTheme(themeId);
  }
  
  function handleChainHighlightColorChange(color: string) {
    console.log('[Game] Chain highlight color changed to:', color);
    setChainHighlightColor(color);
    saveChainHighlightColor(color);
  }
  
  const scoreText = formatTileValue(gameState.score);
  const bestScoreText = formatTileValue(gameState.bestScore);
  
  const powerUpModeText = activePowerUp === 'bomb' ? 'Tap a tile to remove it' : activePowerUp === 'swap' ? `Tap ${selectedPowerUpTiles.length === 0 ? 'first' : 'second'} tile to swap` : '';
  
  const hintUsesLeft = gameState.powerUps.hint;
  const bombUsesLeft = gameState.powerUps.bomb;
  const swapUsesLeft = gameState.powerUps.swap;
  
  const powerUpsArray: PowerUp[] = [
    {
      id: 'hint',
      name: 'Hint',
      icon: 'lightbulb',
      usesLeft: hintUsesLeft,
      maxUses: 2,
    },
    {
      id: 'bomb',
      name: 'Bomb',
      icon: 'delete',
      usesLeft: bombUsesLeft,
      maxUses: 2,
    },
    {
      id: 'swap',
      name: 'Swap',
      icon: 'swap-horiz',
      usesLeft: swapUsesLeft,
      maxUses: 2,
    },
  ];
  
  const headerPaddingTop = insets.top;
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.boardBackground }]} edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleMenuPress}
        >
          <IconSymbol
            ios_icon_name="line.horizontal.3"
            android_material_icon_name="menu"
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>
        
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>{scoreText}</Text>
          </View>
          
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Best</Text>
            <Text style={[styles.statValue, { color: theme.accentColor }]}>{bestScoreText}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleSettingsPress}
        >
          <IconSymbol
            ios_icon_name="gear"
            android_material_icon_name="settings"
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>
      
      {activePowerUp && (
        <View style={[styles.powerUpModeBar, { backgroundColor: theme.accentColor }]}>
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
        {currentMilestone && (
          <MilestoneBanner
            value={currentMilestone}
            onComplete={() => setCurrentMilestone(null)}
          />
        )}
        
        {activePowerUp && (
          <View style={styles.powerUpOverlay} pointerEvents="none" />
        )}
        
        <View style={[styles.boardCard, { backgroundColor: theme.boardBackground }]}>
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
                      stroke={chainHighlightColor}
                      strokeWidth={4}
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
                        tileColors={theme.tileColors}
                        accentColor={chainHighlightColor}
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
      </View>
      
      <View style={{ paddingBottom: insets.bottom + 4 }}>
        <PowerUpBar
          powerUps={powerUpsArray}
          onPowerUpPress={handlePowerUpPress}
          onSettingsPress={handleSettingsPress}
        />
      </View>
      
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
        onNewGame={handleNewGame}
      />
      
      <SettingsModal
        visible={settingsVisible}
        currentTheme={currentTheme}
        chainHighlightColor={chainHighlightColor}
        onClose={() => setSettingsVisible(false)}
        onThemeChange={handleThemeChange}
        onChainHighlightColorChange={handleChainHighlightColorChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
    position: 'relative',
  },
  menuButton: {
    position: 'absolute',
    left: 16,
    padding: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statChip: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '800',
  },
  powerUpModeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 12,
  },
  powerUpModeText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: VERTICAL_SPACING,
    position: 'relative',
  },
  powerUpOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    zIndex: 0,
  },
  boardCard: {
    borderRadius: 20,
    padding: BOARD_CARD_PADDING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    zIndex: 1,
  },
  gridContainer: {
    position: 'relative',
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
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
