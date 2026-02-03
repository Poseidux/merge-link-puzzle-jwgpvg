
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
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
    console.log('HomeScreen mounted, checking for saved game');
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
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (gridContainerRef.current) {
        gridContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
          gridOffsetRef.current = { x: pageX, y: pageY, width, height };
          setGridMeasured(true);
          console.log('Grid container measured - pageX:', pageX, 'pageY:', pageY, 'width:', width, 'height:', height);
        });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [gameState.grid]);
  
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
    if (!gridMeasured) {
      console.log('Grid not measured yet, skipping touch');
      return;
    }
    
    console.log('Touch start event');
    
    if (activePowerUp) {
      console.log('Active power-up mode:', activePowerUp);
      handlePowerUpTileSelection(event);
      return;
    }
    
    const touch = event.nativeEvent.touches[0];
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
          console.log('User backtracked in chain');
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
      
      console.log('Applying gravity');
      const afterGravity = applyGravity(newGrid);
      
      console.log('Spawning new tiles');
      const filledGrid = spawnNewTilesAtTop(afterGravity, currentMinTileValue);
      
      setGameState(prev => ({
        ...prev,
        grid: filledGrid,
        score: newScore,
        bestScore: newBestScore,
        minTileValue: currentMinTileValue,
      }));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
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
    if (!gridMeasured) {
      return;
    }
    
    console.log('Touch end event');
    
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
