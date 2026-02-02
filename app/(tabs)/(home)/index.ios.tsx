
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { colors } from '@/styles/commonStyles';
import GameTile from '@/components/GameTile';
import FloatingScore from '@/components/FloatingScore';
import GameOverModal from '@/components/GameOverModal';
import ConfirmModal from '@/components/ConfirmModal';
import { GameState, SelectedTile } from '@/types/game';
import {
  createInitialGrid,
  isValidChain,
  resolveChain,
  fillEmptyCells,
  hasValidMoves,
  ensureValidMovesAfterContinue,
  getMinimumTileValue,
  removeTilesBelowMinimum,
  GRID_CONFIG,
} from '@/utils/gameLogic';
import {
  saveGameState,
  loadGameState,
} from '@/utils/storage';
import { IconSymbol } from '@/components/IconSymbol';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const GRID_PADDING = 16;
const TILE_GAP = 6;
const GRID_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
const TILE_SIZE = (GRID_WIDTH - TILE_GAP * (GRID_CONFIG.COLS - 1)) / GRID_CONFIG.COLS;

export default function GameScreen() {
  const router = useRouter();
  
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
  
  const shakeAnim = useSharedValue(0);
  const gridContainerRef = useRef<View>(null);
  const gridOffsetRef = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    selectedTilesRef.current = selectedTiles;
  }, [selectedTiles]);
  
  useEffect(() => {
    console.log('GameScreen mounted, loading saved data');
    loadSavedData();
  }, []);
  
  useEffect(() => {
    console.log('Game state changed, saving to storage');
    saveGameState(gameState);
  }, [gameState]);
  
  useEffect(() => {
    if (gridContainerRef.current) {
      gridContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
        gridOffsetRef.current = { x: pageX, y: pageY };
        console.log('Grid container offset:', pageX, pageY);
      });
    }
  }, []);
  
  async function loadSavedData() {
    const savedState = await loadGameState();
    
    if (savedState) {
      console.log('Loaded saved game state');
      setGameState(savedState);
    }
  }
  
  function getTileAtPosition(x: number, y: number): SelectedTile | null {
    const col = Math.floor(x / (TILE_SIZE + TILE_GAP));
    const row = Math.floor(y / (TILE_SIZE + TILE_GAP));
    
    if (row < 0 || row >= GRID_CONFIG.ROWS || col < 0 || col >= GRID_CONFIG.COLS) {
      console.log('Touch outside grid bounds:', row, col);
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
    
    console.log('Touch in gap between tiles');
    return null;
  }
  
  function handleTouchStart(event: any) {
    const touch = event.nativeEvent.touches[0];
    const locationX = touch.pageX - gridOffsetRef.current.x - GRID_PADDING;
    const locationY = touch.pageY - gridOffsetRef.current.y - GRID_PADDING;
    
    console.log('Touch started at:', locationX, locationY);
    
    const tile = getTileAtPosition(locationX, locationY);
    
    if (tile) {
      console.log('Selected first tile:', tile.value);
      const newSelection = [tile];
      setSelectedTiles(newSelection);
      selectedTilesRef.current = newSelection;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }
  
  function handleTouchMove(event: any) {
    const touch = event.nativeEvent.touches[0];
    const locationX = touch.pageX - gridOffsetRef.current.x - GRID_PADDING;
    const locationY = touch.pageY - gridOffsetRef.current.y - GRID_PADDING;
    
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
  
  function handleChainRelease(chainTiles: SelectedTile[]) {
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
    
    console.log('Valid chain, resolving');
    const resolveResult = resolveChain(gameState.grid, chainTiles);
    let newGrid = resolveResult.newGrid;
    const score = resolveResult.score;
    const mergedValue = resolveResult.mergedValue;
    const lastTile = chainTiles[chainTiles.length - 1];
    
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
    
    const filledGrid = fillEmptyCells(newGrid, currentMinTileValue);
    
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
    setGameState({
      grid: createInitialGrid(),
      score: 0,
      bestScore: gameState.bestScore,
      continueUsed: false,
      preGameOverSnapshot: null,
      minTileValue: 2,
    });
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
    setGameState({
      grid: createInitialGrid(),
      score: 0,
      bestScore: gameState.bestScore,
      continueUsed: false,
      preGameOverSnapshot: null,
      minTileValue: 2,
    });
  }
  
  const shakeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeAnim.value }],
    };
  });
  
  const scoreText = `${gameState.score}`;
  const bestScoreText = `${gameState.bestScore}`;
  const minTileText = `Min: ${gameState.minTileValue}`;
  
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Number Merger',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.menuButton}
            >
              <IconSymbol
                ios_icon_name="line.3.horizontal"
                android_material_icon_name="menu"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
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
          <Text style={styles.minTileLabel}>{minTileText}</Text>
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
                
                const x1 = prevTile.col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2 + GRID_PADDING;
                const y1 = prevTile.row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2 + GRID_PADDING;
                const x2 = tile.col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2 + GRID_PADDING;
                const y2 = tile.row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2 + GRID_PADDING;
                
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
                
                return (
                  <View
                    key={tile.id}
                    style={styles.tileWrapper}
                  >
                    <GameTile
                      value={tile.value}
                      isSelected={isSelected}
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
              x={fs.x + GRID_PADDING}
              y={fs.y + GRID_PADDING}
              onComplete={() => {
                setFloatingScores(prev => prev.filter(s => s.id !== fs.id));
              }}
            />
          ))}
        </Animated.View>
      </View>
      
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  menuButton: {
    marginLeft: 16,
    padding: 8,
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
  minTileLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 10,
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    padding: GRID_PADDING,
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
  newGameButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 24,
    marginBottom: 24,
    marginTop: 12,
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
