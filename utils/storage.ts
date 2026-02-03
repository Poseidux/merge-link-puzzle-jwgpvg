
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '@/types/game';

const GAME_STATE_KEY = '@number_merge_game_state';

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
    console.log('Loaded game state with score:', state.score);
    
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
