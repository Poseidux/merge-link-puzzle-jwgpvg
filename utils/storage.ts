
import AsyncStorage from '@react-native-async-storage/async-storage';

const GAME_STATE_KEY = '@merge_puzzle_game_state';
const SETTINGS_KEY = '@merge_puzzle_settings';
const THEME_KEY = '@merge_puzzle_theme';
const MILESTONES_KEY = '@merge_puzzle_milestones';
const STATS_KEY = '@merge_puzzle_lifetime_stats';

export interface SavedGameState {
  grid: number[][];
  score: number;
  bestScore: number;
  powerUps: {
    hint: number;
    bomb: number;
    swap: number;
    scoreBoost: number;
  };
  spawnProgression: number;
  scoreBoostActive: boolean;
}

export interface GameSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  darkMode: boolean;
  theme: string;
}

export interface LifetimeStats {
  highestTileEver: number;
  gamesPlayed: number;
  longestChain: number;
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
    if (jsonValue != null) {
      const parsed = JSON.parse(jsonValue);
      
      // Migration: Remove undo from old saved states
      if (parsed.powerUps && 'undo' in parsed.powerUps) {
        console.log('[Storage] Migrating old save data - removing undo power-up');
        const { undo, ...restPowerUps } = parsed.powerUps;
        parsed.powerUps = restPowerUps;
      }
      
      // Migration: Add scoreBoost if missing
      if (parsed.powerUps && !('scoreBoost' in parsed.powerUps)) {
        console.log('[Storage] Migrating old save data - adding scoreBoost power-up');
        parsed.powerUps.scoreBoost = 1;
      }
      
      // Migration: Add scoreBoostActive if missing
      if (!('scoreBoostActive' in parsed)) {
        parsed.scoreBoostActive = false;
      }
      
      return parsed;
    }
    return null;
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

export async function saveLifetimeStats(stats: LifetimeStats): Promise<void> {
  try {
    console.log('[Storage] Saving lifetime stats:', stats);
    const jsonValue = JSON.stringify(stats);
    await AsyncStorage.setItem(STATS_KEY, jsonValue);
  } catch (error) {
    console.error('[Storage] Error saving lifetime stats:', error);
  }
}

export async function loadLifetimeStats(): Promise<LifetimeStats> {
  try {
    console.log('[Storage] Loading lifetime stats');
    const jsonValue = await AsyncStorage.getItem(STATS_KEY);
    if (jsonValue) {
      return JSON.parse(jsonValue);
    }
    return {
      highestTileEver: 0,
      gamesPlayed: 0,
      longestChain: 0,
    };
  } catch (error) {
    console.error('[Storage] Error loading lifetime stats:', error);
    return {
      highestTileEver: 0,
      gamesPlayed: 0,
      longestChain: 0,
    };
  }
}
