
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '@/types/game';
import { GRID_CONFIG } from './gameLogic';

const GAME_STATE_KEY = '@game_state';

export async function saveGameState(state: GameState): Promise<void> {
  try {
    console.log('Saving game state to storage');
    const jsonValue = JSON.stringify(state);
    await AsyncStorage.setItem(GAME_STATE_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving game state:', error);
  }
}

export async function loadGameState(): Promise<GameState | null> {
  try {
    console.log('Loading game state from storage');
    const jsonValue = await AsyncStorage.getItem(GAME_STATE_KEY);
    
    if (jsonValue === null) {
      console.log('No saved game state found');
      return null;
    }
    
    const state = JSON.parse(jsonValue) as GameState;
    console.log('Saved game state:', JSON.stringify(state));
    
    // Validate grid dimensions - if mismatch, return null to start fresh
    if (state.grid.length !== GRID_CONFIG.ROWS) {
      console.warn(`Grid row mismatch: saved has ${state.grid.length} rows, expected ${GRID_CONFIG.ROWS}. Starting fresh game.`);
      await clearGameState();
      return null;
    }
    
    for (let row = 0; row < state.grid.length; row++) {
      if (state.grid[row].length !== GRID_CONFIG.COLS) {
        console.warn(`Grid column mismatch at row ${row}: saved has ${state.grid[row].length} cols, expected ${GRID_CONFIG.COLS}. Starting fresh game.`);
        await clearGameState();
        return null;
      }
    }
    
    return state;
  } catch (error) {
    console.error('Error loading game state:', error);
    return null;
  }
}

export async function clearGameState(): Promise<void> {
  try {
    console.log('Clearing game state from storage');
    await AsyncStorage.removeItem(GAME_STATE_KEY);
  } catch (error) {
    console.error('Error clearing game state:', error);
  }
}
