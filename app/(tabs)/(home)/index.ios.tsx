
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
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
  GRID_CONFIG,
} from '@/utils/gameLogic';
import {
  saveGameState,
  loadGameState,
} from '@/utils/storage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 16;
const TILE_GAP = 8;
const GRID_WIDTH = SCREEN_WIDTH - GRID_PADDING * 2;
const TILE_SIZE = (GRID_WIDTH - TILE_GAP * (GRID_CONFIG.COLS - 1)) / GRID_CONFIG.COLS;

export default function GameScreen() {
  const [gameState, setGameState] = useState<GameState>({
    grid: createInitialGrid(),
    score: 0,
    bestScore: 0,
    continueUsed: false,
    preGameOverSnapshot: null,
  });
  
  const [selectedTiles, setSelectedTiles] = useState<SelectedTile[]>([]);
  const [floatingScores, setFloatingScores] = useState<Array<{ id: string; score: number; x: number; y: number }>>([]);
  const [gameOverVisible, setGameOverVisible] = useState(false);
  const [confirmNewGameVisible, setConfirmNewGameVisible] = useState(false);
  
  const gridRef = useRef<View>(null);
  const shakeAnim = useSharedValue(0);
  
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
      
      onPanResponderGrant: (evt) => {
        console.log('User started dragging');
        const locationX = evt.nativeEvent.locationX;
        const locationY = evt.nativeEvent.locationY;
        const tile = getTileAtPosition(locationX, locationY);
        
        if (tile) {
          console.log('Selected first tile:', tile);
          setSelectedTiles([tile]);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      
      onPanResponderMove: (evt) => {
        const locationX = evt.nativeEvent.locationX;
        const locationY = evt.nativeEvent.locationY;
        const tile = getTileAtPosition(locationX, locationY);
        
        if (tile && selectedTiles.length > 0) {
          const lastTile = selectedTiles[selectedTiles.length - 1];
          
          const alreadySelected = selectedTiles.some(
            t => t.row === tile.row && t.col === tile.col
          );
          
          if (!alreadySelected) {
            const isAdjacent = Math.abs(tile.row - lastTile.row) <= 1 && 
                              Math.abs(tile.col - lastTile.col) <= 1 &&
                              !(tile.row === lastTile.row && tile.col === lastTile.col);
            
            if (isAdjacent) {
              if (selectedTiles.length === 1) {
                if (tile.value === selectedTiles[0].value) {
                  console.log('Extended chain to second tile:', tile);
                  setSelectedTiles([...selectedTiles, tile]);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              } else {
                const prevValue = lastTile.value;
                if (tile.value === prevValue || tile.value === prevValue * 2) {
                  console.log('Extended chain:', tile);
                  setSelectedTiles([...selectedTiles, tile]);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    console.log('Valid chain, resolving merge');
    const resolveResult = resolveChain(gameState.grid, selectedTiles);
    const newGrid = resolveResult.newGrid;
    const score = resolveResult.score;
    const lastTile = selectedTiles[selectedTiles.length - 1];
    
    const scoreId = `score_${Date.now()}`;
    const scoreX = lastTile.col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
    const scoreY = lastTile.row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
    setFloatingScores(prev => [...prev, { id: scoreId, score, x: scoreX, y: scoreY }]);
    
    const newScore = gameState.score + score;
    const newBestScore = Math.max(newScore, gameState.bestScore);
    
    const filledGrid = fillEmptyCells(newGrid);
    
    setGameState(prev => ({
      ...prev,
      grid: filledGrid,
      score: newScore,
      bestScore: newBestScore,
    }));
    
    setSelectedTiles([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
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
  newGameButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 24,
    marginBottom: 24,
    marginTop: 'auto',
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
