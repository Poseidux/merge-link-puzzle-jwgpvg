
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
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
} from '@/utils/gameLogic';
import {
  saveGameState,
  loadGameState,
  clearGameState,
} from '@/utils/storage';
import { IconSymbol } from '@/components/IconSymbol';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const GRID_PADDING = 24;
const TILE_GAP = 8;
const HEADER_HEIGHT = 100;
const POWERUP_BAR_HEIGHT = 70;
const BOTTOM_BUTTON_HEIGHT = 80;
const TOP_MARGIN = 20;
const BOTTOM_MARGIN = 20;

const AVAILABLE_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - POWERUP_BAR_HEIGHT - BOTTOM_BUTTON_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;
const AVAILABLE_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;

const TILE_SIZE_BY_WIDTH = (AVAILABLE_WIDTH - TILE_GAP * (GRID_CONFIG.COLS - 1)) / GRID_CONFIG.COLS;
const TILE_SIZE_BY_HEIGHT = (AVAILABLE_HEIGHT - TILE_GAP * (GRID_CONFIG.ROWS - 1)) / GRID_CONFIG.ROWS;

const MAX_TILE_SIZE = 65;
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
  
  const [floatingScores, setFloatingScores] = useState<Array<{ id: string; score: number; x: number; y: number }>>([]);
  const [gameOverVisible, setGameOverVisible] = useState(false);
  const [confirmNewGameVisible, setConfirmNewGameVisible] = useState(false);
  const [gameMenuVisible, setGameMenuVisible] = useState(false);
  
  const [powerUps, setPowerUps] = useState<PowerUp[]>([
    { id: 'undo', name: 'Undo', icon: 'undo', usesLeft: 2, maxUses: 2 },
    { id: 'hammer', name: 'Hammer', icon: 'delete', usesLeft: 2, maxUses: 2 },
    { id: 'swap', name: 'Swap', icon: 'swap-horiz', usesLeft: 2, maxUses: 2 },
    { id: 'hint', name: 'Hint', icon: 'lightbulb', usesLeft: 2, maxUses: 2 },
  ]);
  
  const [animatingTiles, setAnimatingTiles] = useState<Set<string>>(new Set());
  
  const shakeAnim = useSharedValue(0);
  const gridContainerRef = useRef<View>(null);
  const gridOffsetRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  useEffect(() => {
    selectedTilesRef.current = selectedTiles;
  }, [selectedTiles]);
  
  useEffect(() => {
    console.log('GameScreen mounted, checking params:', params);
    if (params.newGame === 'true') {
      console.log('Starting new game from home screen');
      startFreshGame();
    } else {
      loadSavedData();
    }
  }, []);
  
  useEffect(() => {
    console.log('Game state changed, saving to storage');
    saveGameState(gameState);
  }, [gameState]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (gridContainerRef.current) {
        gridContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
          gridOffsetRef.current = { x: pageX, y: pageY, width, height };
          console.log('Grid container measured - pageX:', pageX, 'pageY:', pageY, 'width:', width, 'height:', height);
        });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [gameState.grid]);
  
  async function loadSavedData() {
    const savedState = await loadGameState();
    
    if (savedState) {
      console.log('Loaded saved game state');
      setGameState(savedState);
    }
  }
  
  function startFreshGame() {
    console.log('Starting fresh game');
    setGameState({
      grid: createInitialGrid(),
      score: 0,
      bestScore: gameState.bestScore,
      continueUsed: false,
      preGameOverSnapshot: null,
      minTileValue: 2,
    });
    setPowerUps([
      { id: 'undo', name: 'Undo', icon: 'undo', usesLeft: 2, maxUses: 2 },
      { id: 'hammer', name: 'Hammer', icon: 'delete', usesLeft: 2, maxUses: 2 },
      { id: 'swap', name: 'Swap', icon: 'swap-horiz', usesLeft: 2, maxUses: 2 },
      { id: 'hint', name: 'Hint', icon: 'lightbulb', usesLeft: 2, maxUses: 2 },
    ]);
  }
  
  function getTileAtPosition(x: number, y: number): SelectedTile | null {
    const col = Math.floor(x / (TILE_SIZE + TILE_GAP));
    const row = Math.floor(y / (TILE_SIZE + TILE_GAP));
    
    console.log('getTileAtPosition - x:', x, 'y:', y, 'calculated row:', row, 'col:', col);
    
    if (row < 0 || row >= GRID_CONFIG.ROWS || col < 0 || col >= GRID_CONFIG.COLS) {
      console.log('Touch outside grid bounds');
      return null;
    }
    
    const tileStartX = col * (TILE_SIZE + TILE_GAP);
    const tileStartY = row * (TILE_SIZE + TILE_GAP);
    
    const localX = x - tileStartX;
    const localY = y - tileStartY;
    
    if (localX >= 0 && localX <= TILE_SIZE && localY >= 0 && localY <= TILE_SIZE) {
      const tile = gameState.grid[row][col];
      if (tile) {
        console.log('Selected tile at row:', row, 'col:', col, 'value:', tile.value);
        return { row, col, value: tile.value };
      }
    }
    
    console.log('Touch in gap between tiles');
    return null;
  }
  
  function handleTouchStart(event: any) {
    const touch = event.nativeEvent.touches[0];
    const locationX = touch.pageX - gridOffsetRef.current.x;
    const locationY = touch.pageY - gridOffsetRef.current.y;
    
    console.log('Touch start - pageX:', touch.pageX, 'pageY:', touch.pageY);
    console.log('Grid offset - x:', gridOffsetRef.current.x, 'y:', gridOffsetRef.current.y);
    console.log('Relative location - x:', locationX, 'y:', locationY);
    
    const tile = getTileAtPosition(locationX, locationY);
    
    if (tile) {
      console.log('Started chain with tile value:', tile.value);
      const newSelection = [tile];
      setSelectedTiles(newSelection);
      selectedTilesRef.current = newSelection;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }
  
  function handleTouchMove(event: any) {
    const touch = event.nativeEvent.touches[0];
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
      const isAdjacent = rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
      
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
        const newSelection = [...currentSelection, tile];
        setSelectedTiles(newSelection);
        selectedTilesRef.current = newSelection;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }
  
  function handleTouchEnd() {
    const finalSelection = selectedTilesRef.current;
    console.log('Released with chain length:', finalSelection.length);
    handleChainRelease(finalSelection);
  }
  
  async function handleChainRelease(chainTiles: SelectedTile[]) {
    if (chainTiles.length < 2) {
      console.log('Chain too short');
      setSelectedTiles([]);
      selectedTilesRef.current = [];
      return;
    }
    
    if (!isValidChain(chainTiles)) {
      console.log('Invalid chain');
      shakeAnim.value = withSequence(
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      setSelectedTiles([]);
      selectedTilesRef.current = [];
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    console.log('Valid chain, resolving with pop/explode animation');
    
    // Animate tiles popping one by one (wave effect)
    const tilesToAnimate = chainTiles.slice(0, -1); // All except the last tile
    const lastTile = chainTiles[chainTiles.length - 1];
    
    // Mark tiles as animating
    const animatingIds = new Set<string>();
    tilesToAnimate.forEach(tile => {
      const tileObj = gameState.grid[tile.row][tile.col];
      if (tileObj) {
        animatingIds.add(tileObj.id);
      }
    });
    setAnimatingTiles(animatingIds);
    
    // Wait for pop animation to complete (150ms per tile)
    const animationDuration = tilesToAnimate.length * 150;
    await new Promise(resolve => setTimeout(resolve, animationDuration));
    
    // Now resolve the chain
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
    
    // Clear animating tiles
    setAnimatingTiles(new Set());
    
    // Apply gravity and spawn new tiles
    console.log('Step 1: Applying gravity');
    const afterGravity = applyGravity(newGrid);
    
    console.log('Step 2: Spawning new tiles at top');
    const filledGrid = spawnNewTilesAtTop(afterGravity, currentMinTileValue);
    
    setGameState(prev => ({
      ...prev,
      grid: filledGrid,
      score: newScore,
      bestScore: newBestScore,
      minTileValue: currentMinTileValue,
    }));
    
    setSelectedTiles([]);
    selectedTilesRef.current = [];
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setTimeout(() => {
      if (!hasValidMoves(filledGrid)) {
        console.log('No valid moves, game over');
        handleGameOver(filledGrid, newScore, currentMinTileValue);
      }
    }, 500);
  }
  
  function handleGameOver(grid: any, score: number, minTileValue: number) {
    console.log('Game over');
    setGameState(prev => ({
      ...prev,
      preGameOverSnapshot: { grid, score, minTileValue },
    }));
    setGameOverVisible(true);
  }
  
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
    
    // Decrease uses
    setPowerUps(prev => prev.map(p => 
      p.id === powerUpId 
        ? { ...p, usesLeft: p.usesLeft - 1 }
        : p
    ));
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // TODO: Implement power-up logic
    console.log(`Power-up ${powerUpId} used. Uses left: ${powerUp.usesLeft - 1}`);
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
      
      <View style={styles.gameContainer}>
        <Animated.View
          ref={gridContainerRef}
          style={[styles.gridContainer, shakeStyle]}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
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
                    strokeLinejoin="round"
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
                
                const isAnimating = animatingTiles.has(tile.id);
                const animationIndex = selectedTiles.findIndex(
                  t => t.row === rowIndex && t.col === colIndex
                );
                
                return (
                  <View
                    key={tile.id}
                    style={styles.tileWrapper}
                  >
                    <GameTile
                      value={tile.value}
                      isSelected={isSelected}
                      size={TILE_SIZE}
                      isAnimating={isAnimating}
                      animationDelay={animationIndex * 150}
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
        </Animated.View>
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
    paddingVertical: 16,
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
    fontSize: 28,
    color: colors.text,
    fontWeight: 'bold',
  },
  bestScoreValue: {
    fontSize: 28,
    color: colors.accent,
    fontWeight: 'bold',
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
