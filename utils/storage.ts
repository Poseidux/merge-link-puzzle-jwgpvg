
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, GameSettings } from '@/types/game';

const GAME_STATE_KEY = '@merge_puzzle_game_state';
const SETTINGS_KEY = '@merge_puzzle_settings';
const TUTORIAL_KEY = '@merge_puzzle_tutorial_shown';

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
    return jsonValue != null ? JSON.parse(jsonValue) : null;
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

export async function saveSettings(settings: GameSettings): Promise<void> {
  try {
    console.log('Saving settings to storage:', settings);
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(SETTINGS_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

export async function loadSettings(): Promise<GameSettings | null> {
  try {
    console.log('Loading settings from storage');
    const jsonValue = await AsyncStorage.getItem(SETTINGS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
}

export async function markTutorialShown(): Promise<void> {
  try {
    console.log('Marking tutorial as shown');
    await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
  } catch (error) {
    console.error('Error marking tutorial shown:', error);
  }
}

export async function hasTutorialBeenShown(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(TUTORIAL_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking tutorial status:', error);
    return false;
  }
}
