
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const GAME_STATE_KEY = '@number_merge_game_state';

// Minimal saved state - only plain numbers and essential data
export interface SavedGameState {
  grid: number[][]; // Just the values, not full Tile objects
  score: number;
  bestScore: number;
  powerUps: {
    undo: number;
    hint: number;
    bomb: number;
    swap: number;
  };
  spawnProgression: number;
}

/**
 * Save game state to storage.
 * ONLY call this at safe times:
 * - After a move fully completes (merge + gravity + spawn)
 * - When starting a new game
 * DO NOT call on every render or during drag gestures.
 */
export async function saveGameState(state: SavedGameState): Promise<void> {
  try {
    console.log('[Storage] Saving game state - Score:', state.score, 'Platform:', Platform.OS);
    const jsonValue = JSON.stringify(state);
    await AsyncStorage.setItem(GAME_STATE_KEY, jsonValue);
    console.log('[Storage] Game state saved successfully');
  } catch (error) {
    // Log full error details but don't crash
    console.error('[Storage] FAILED to save game state');
    console.error('[Storage] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Storage] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // Continue running - saving failure should not crash the game
  }
}

/**
 * Load game state from storage.
 * ONLY call this once when the app opens.
 * Returns null if no saved game exists or if loading fails.
 */
export async function loadGameState(): Promise<SavedGameState | null> {
  try {
    console.log('[Storage] Loading game state from storage - Platform:', Platform.OS);
    const jsonValue = await AsyncStorage.getItem(GAME_STATE_KEY);
    
    if (jsonValue === null) {
      console.log('[Storage] No saved game state found');
      return null;
    }
    
    const state = JSON.parse(jsonValue) as SavedGameState;
    
    // Validate the loaded state
    if (!state.grid || !Array.isArray(state.grid) || state.grid.length === 0) {
      console.error('[Storage] Invalid saved state - grid is missing or empty');
      return null;
    }
    
    console.log('[Storage] Game state loaded successfully - Score:', state.score);
    return state;
  } catch (error) {
    // Log full error details but don't crash
    console.error('[Storage] FAILED to load game state');
    console.error('[Storage] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Storage] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // Return null to start a fresh game instead of crashing
    return null;
  }
}

/**
 * Clear saved game state from storage.
 * Call this when starting a new game.
 */
export async function clearGameState(): Promise<void> {
  try {
    console.log('[Storage] Clearing game state from storage');
    await AsyncStorage.removeItem(GAME_STATE_KEY);
    console.log('[Storage] Game state cleared successfully');
  } catch (error) {
    // Log full error details but don't crash
    console.error('[Storage] FAILED to clear game state');
    console.error('[Storage] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Storage] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // Continue running - clearing failure should not crash the game
  }
}
