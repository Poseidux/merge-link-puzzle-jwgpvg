
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
const GRID_PADDING = 20;
const TILE_GAP = 8;
const HEADER_HEIGHT = 180;
const POWERUP_BAR_HEIGHT = 80;
const BOTTOM_MARGIN = 20;

const AVAILABLE_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - POWERUP_BAR_HEIGHT - BOTTOM_MARGIN - 40;
const AVAILABLE_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;

const TILE_SIZE_BY_WIDTH = (AVAILABLE_WIDTH - TILE_GAP * (GRID_CONFIG.COLS - 1)) / GRID_CONFIG.COLS;
const TILE_SIZE_BY_HEIGHT = (AVAILABLE_HEIGHT - TILE_GAP * (GRID_CONFIG.ROWS - 1)) / GRID_CONFIG.ROWS;

const MAX_TILE_SIZE = 70;
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
    console.log('[Game] Back to home - navigating to / with push');
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
                    stroke={colors.accent}
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
        onNewGame={handleNewGame}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 100 : 0,
  },
  scoreBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
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
