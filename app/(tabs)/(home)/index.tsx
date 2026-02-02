
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
  const [floatingScores, setFloatingScores] = useState<{ id: string; score: number; x: number; y: number }[]>([]);
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
          const alreadySelected = selectedTiles.some(
            t => t.row === tile.row && t.col === tile.col
          );
          
          if (!alreadySelected) {
            const isAdjacent = Math.abs(tile.row - lastTile.row) <= 1 && 
                              Math.abs(tile.col - lastTile.col) <= 1 &&
                              !(tile.row === lastTile.row && tile.col === lastTile.col);
            
            if (isAdjacent) {
              const newChain = [...selectedTiles, tile];
              if (isValidChain(newChain)) {
                console.log('Extended chain to:', tile);
                setSelectedTiles(newChain);
                if (settings.hapticsEnabled) {
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
