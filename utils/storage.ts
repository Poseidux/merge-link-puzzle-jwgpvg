
import AsyncStorage from '@react-native-async-storage/async-storage';

const GAME_STATE_KEY = '@merge_puzzle_game_state';
const SETTINGS_KEY = '@merge_puzzle_settings';
const THEME_KEY = '@merge_puzzle_theme';
const MILESTONES_KEY = '@merge_puzzle_milestones';

export interface SavedGameState {
  grid: number[][];
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

export interface GameSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  darkMode: boolean;
  theme: string;
}

export async function saveGameState(state: SavedGameState): Promise<void> {
  try {
    console.log('[Storage] Saving game state');
    const jsonValue = JSON.stringify(state);
    await AsyncStorage.setItem(GAME_STATE_KEY, jsonValue);
  } catch (error) {
    console.error('[Storage] Error saving game state:', error);
  }
}

export async function loadGameState(): Promise<SavedGameState | null> {
  try {
    console.log('[Storage] Loading game state');
    const jsonValue = await AsyncStorage.getItem(GAME_STATE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('[Storage] Error loading game state:', error);
    return null;
  }
}

export async function clearGameState(): Promise<void> {
  try {
    console.log('[Storage] Clearing game state');
    await AsyncStorage.removeItem(GAME_STATE_KEY);
  } catch (error) {
    console.error('[Storage] Error clearing game state:', error);
  }
}

export async function saveSettings(settings: GameSettings): Promise<void> {
  try {
    console.log('[Storage] Saving settings:', settings);
    const jsonValue = JSON.stringify(settings);
    await AsyncStorage.setItem(SETTINGS_KEY, jsonValue);
  } catch (error) {
    console.error('[Storage] Error saving settings:', error);
  }
}

export async function loadSettings(): Promise<GameSettings | null> {
  try {
    console.log('[Storage] Loading settings');
    const jsonValue = await AsyncStorage.getItem(SETTINGS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('[Storage] Error loading settings:', error);
    return null;
  }
}

export async function saveTheme(themeId: string): Promise<void> {
  try {
    console.log('[Storage] Saving theme:', themeId);
    await AsyncStorage.setItem(THEME_KEY, themeId);
  } catch (error) {
    console.error('[Storage] Error saving theme:', error);
  }
}

export async function loadTheme(): Promise<string | null> {
  try {
    console.log('[Storage] Loading theme');
    return await AsyncStorage.getItem(THEME_KEY);
  } catch (error) {
    console.error('[Storage] Error loading theme:', error);
    return null;
  }
}

export async function saveMilestones(milestones: Set<number>): Promise<void> {
  try {
    console.log('[Storage] Saving milestones:', Array.from(milestones));
    const jsonValue = JSON.stringify(Array.from(milestones));
    await AsyncStorage.setItem(MILESTONES_KEY, jsonValue);
  } catch (error) {
    console.error('[Storage] Error saving milestones:', error);
  }
}

export async function loadMilestones(): Promise<Set<number>> {
  try {
    console.log('[Storage] Loading milestones');
    const jsonValue = await AsyncStorage.getItem(MILESTONES_KEY);
    if (jsonValue) {
      const array = JSON.parse(jsonValue);
      return new Set(array);
    }
    return new Set();
  } catch (error) {
    console.error('[Storage] Error loading milestones:', error);
    return new Set();
  }
}

export async function clearMilestones(): Promise<void> {
  try {
    console.log('[Storage] Clearing milestones');
    await AsyncStorage.removeItem(MILESTONES_KEY);
  } catch (error) {
    console.error('[Storage] Error clearing milestones:', error);
  }
}
