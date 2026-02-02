
import React, { useState, useEffect, useRef } from 'react';
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

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const GRID_PADDING = 12;
const TILE_GAP = 4;
const GRID_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
const TILE_SIZE = (GRID_WIDTH - TILE_GAP * (GRID_CONFIG.COLS - 1)) / GRID_CONFIG.COLS;

export default function GameScreen() {
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
  
  const gridRef = useRef<View>(null);
  const shakeAnim = useSharedValue(0);
  
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
  
  async function loadSavedData() {
    const savedState = await loadGameState();
    
    if (savedState) {
      console.log('Loaded saved game state');
      setGameState(savedState);
    }
  }
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      
      onPanResponderGrant: (evt) => {
        console.log('User started dragging at position:', evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        const locationX = evt.nativeEvent.locationX;
        const locationY = evt.nativeEvent.locationY;
        const tile = getTileAtPosition(locationX, locationY);
        
        if (tile) {
          console.log('Selected first tile at row:', tile.row, 'col:', tile.col, 'value:', tile.value);
          const newSelection = [tile];
          setSelectedTiles(newSelection);
          selectedTilesRef.current = newSelection;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          console.log('No tile found at touch position');
        }
      },
      
      onPanResponderMove: (evt) => {
        const locationX = evt.nativeEvent.locationX;
        const locationY = evt.nativeEvent.locationY;
        const tile = getTileAtPosition(locationX, locationY);
        
        if (tile && selectedTilesRef.current.length > 0) {
          const currentSelection = selectedTilesRef.current;
          const lastTile = currentSelection[currentSelection.length - 1];
          
          // Check if this is the same tile as the last one (no action needed)
          if (tile.row === lastTile.row && tile.col === lastTile.col) {
            return;
          }
          
          // Check if this is the previous tile (backtracking)
          if (currentSelection.length >= 2) {
            const previousTile = currentSelection[currentSelection.length - 2];
            if (tile.row === previousTile.row && tile.col === previousTile.col) {
              console.log('Backtracking: removing last tile from chain');
              const newSelection = currentSelection.slice(0, -1);
              setSelectedTiles(newSelection);
              selectedTilesRef.current = newSelection;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              return;
            }
          }
          
          // Check if tile is already in the chain (can't reuse tiles)
          const alreadySelected = currentSelection.some(
            t => t.row === tile.row && t.col === tile.col
          );
          
          if (!alreadySelected) {
            // Check if tile is adjacent to the last tile
            const rowDiff = Math.abs(tile.row - lastTile.row);
            const colDiff = Math.abs(tile.col - lastTile.col);
            const isAdjacent = rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
            
            if (isAdjacent) {
              let canAdd = false;
              
              // First two tiles must be the same value
              if (currentSelection.length === 1) {
                if (tile.value === currentSelection[0].value) {
                  canAdd = true;
                  console.log('Extended chain to second tile (matching first):', tile);
                }
              } else {
                // After first two, can add same value or double
                const prevValue = lastTile.value;
                if (tile.value === prevValue || tile.value === prevValue * 2) {
                  canAdd = true;
                  console.log('Extended chain (same or double):', tile, 'Chain length now:', currentSelection.length + 1);
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
        }
      },
      
      onPanResponderRelease: () => {
        const finalSelection = selectedTilesRef.current;
        console.log('User released drag, final chain length:', finalSelection.length);
        handleChainRelease(finalSelection);
      },
    })
  ).current;
  
  function getTileAtPosition(x: number, y: number): SelectedTile | null {
    // Account for grid padding - subtract it from the touch coordinates
    const adjustedX = x - GRID_PADDING;
    const adjustedY = y - GRID_PADDING;
    
    // Calculate which tile was touched
    // Each tile takes up (TILE_SIZE + TILE_GAP) space, except the last one in each row/column
    const col = Math.floor(adjustedX / (TILE_SIZE + TILE_GAP));
    const row = Math.floor(adjustedY / (TILE_SIZE + TILE_GAP));
    
    console.log('Touch at x:', x, 'y:', y, '-> adjusted x:', adjustedX, 'y:', adjustedY, '-> row:', row, 'col:', col);
    
    // Verify the touch is actually within the tile bounds (not in the gap)
    if (row >= 0 && row < GRID_CONFIG.ROWS && col >= 0 && col < GRID_CONFIG.COLS) {
      const tileStartX = col * (TILE_SIZE + TILE_GAP);
      const tileStartY = row * (TILE_SIZE + TILE_GAP);
      const tileEndX = tileStartX + TILE_SIZE;
      const tileEndY = tileStartY + TILE_SIZE;
      
      // Check if touch is within the tile (not in the gap between tiles)
      if (adjustedX >= tileStartX && adjustedX <= tileEndX && 
          adjustedY >= tileStartY && adjustedY <= tileEndY) {
        const tile = gameState.grid[row][col];
        if (tile) {
          return { row, col, value: tile.value };
        }
      }
    }
    
    return null;
  }
  
  function handleChainRelease(chainTiles: SelectedTile[]) {
    if (chainTiles.length < 2) {
      console.log('Chain too short, canceling');
      setSelectedTiles([]);
      selectedTilesRef.current = [];
      return;
    }
    
    if (!isValidChain(chainTiles)) {
      console.log('Invalid chain, shaking');
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
    
    console.log('Valid chain, resolving merge');
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
    
    // Check if we hit a milestone and need to raise minimum tile value
    const newMinTileValue = getMinimumTileValue(mergedValue);
    let currentMinTileValue = gameState.minTileValue;
    
    if (newMinTileValue > currentMinTileValue) {
      console.log(`Milestone reached! Merged value: ${mergedValue}. Raising minimum tile value from ${currentMinTileValue} to ${newMinTileValue}`);
      currentMinTileValue = newMinTileValue;
      
      // Remove all tiles below the new minimum
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
    console.log('Game over triggered');
    setGameState(prev => ({
      ...prev,
      preGameOverSnapshot: { grid, score, minTileValue },
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
      continueUsed: false,
      preGameOverSnapshot: null,
      minTileValue: 2,
    });
  }
  
  function handleContinue() {
    console.log('User used continue');
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
          title: 'Number Link',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
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
          ref={gridRef}
          style={[styles.gridContainer, shakeStyle]}
          {...panResponder.panHandlers}
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
              x={fs.x}
              y={fs.y}
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
    paddingTop: Platform.OS === 'android' ? 8 : 0,
  },
  scoreBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 24,
    color: colors.text,
    fontWeight: 'bold',
  },
  bestScoreValue: {
    fontSize: 24,
    color: colors.accent,
    fontWeight: 'bold',
  },
  minTileLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 8,
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
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  newGameText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
