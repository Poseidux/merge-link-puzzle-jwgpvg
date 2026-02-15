
import AsyncStorage from '@react-native-async-storage/async-storage';

const GAME_STATE_KEY = '@merge_puzzle_game_state';
const SETTINGS_KEY = '@merge_puzzle_settings';
const THEME_KEY = '@merge_puzzle_theme';
const MILESTONES_KEY = '@merge_puzzle_milestones';
const STATS_KEY = '@merge_puzzle_lifetime_stats';
const CHAIN_HIGHLIGHT_COLOR_KEY = '@merge_puzzle_chain_highlight_color';
const OWNED_THEMES_KEY = '@merge_puzzle_owned_themes';
const OWNED_COLORS_KEY = '@merge_puzzle_owned_colors';

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
    const themeId = await AsyncStorage.getItem(THEME_KEY);
    
    // Migration: Convert old theme IDs to new format
    if (themeId && !themeId.startsWith('theme_')) {
      const newThemeId = `theme_${themeId}`;
      console.log(`[Storage] Migrating theme ID from ${themeId} to ${newThemeId}`);
      await saveTheme(newThemeId);
      return newThemeId;
    }
    
    return themeId;
  } catch (error) {
    console.error('[Storage] Error loading theme:', error);
    return null;
  }
}

export async function saveChainHighlightColor(color: string): Promise<void> {
  try {
    console.log('[Storage] Saving chain highlight color:', color);
    await AsyncStorage.setItem(CHAIN_HIGHLIGHT_COLOR_KEY, color);
  } catch (error) {
    console.error('[Storage] Error saving chain highlight color:', error);
  }
}

export async function loadChainHighlightColor(): Promise<string | null> {
  try {
    console.log('[Storage] Loading chain highlight color');
    return await AsyncStorage.getItem(CHAIN_HIGHLIGHT_COLOR_KEY);
  } catch (error) {
    console.error('[Storage] Error loading chain highlight color:', error);
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

// Shop ownership functions with migration support
export async function saveOwnedThemes(themeIds: string[]): Promise<void> {
  try {
    console.log('[Storage] Saving owned themes:', themeIds);
    const jsonValue = JSON.stringify(themeIds);
    await AsyncStorage.setItem(OWNED_THEMES_KEY, jsonValue);
  } catch (error) {
    console.error('[Storage] Error saving owned themes:', error);
  }
}

export async function loadOwnedThemes(): Promise<string[]> {
  try {
    console.log('[Storage] Loading owned themes');
    const jsonValue = await AsyncStorage.getItem(OWNED_THEMES_KEY);
    if (jsonValue) {
      const themes = JSON.parse(jsonValue);
      // Migration: Convert old theme IDs to new format
      const migratedThemes = themes.map((id: string) => 
        id.startsWith('theme_') ? id : `theme_${id}`
      );
      if (JSON.stringify(themes) !== JSON.stringify(migratedThemes)) {
        console.log('[Storage] Migrating owned themes to new ID format');
        await saveOwnedThemes(migratedThemes);
      }
      return migratedThemes;
    }
    // Default: user owns Classic theme
    return ['theme_classic'];
  } catch (error) {
    console.error('[Storage] Error loading owned themes:', error);
    return ['theme_classic'];
  }
}

export async function saveOwnedColors(colorIds: string[]): Promise<void> {
  try {
    console.log('[Storage] Saving owned colors:', colorIds);
    const jsonValue = JSON.stringify(colorIds);
    await AsyncStorage.setItem(OWNED_COLORS_KEY, jsonValue);
  } catch (error) {
    console.error('[Storage] Error saving owned colors:', error);
  }
}

export async function loadOwnedColors(): Promise<string[]> {
  try {
    console.log('[Storage] Loading owned colors');
    const jsonValue = await AsyncStorage.getItem(OWNED_COLORS_KEY);
    if (jsonValue) {
      const colors = JSON.parse(jsonValue);
      // Migration: Convert old color names to new IDs
      const migratedColors = colors.map((nameOrId: string) => {
        if (nameOrId.startsWith('chain_')) return nameOrId;
        // Convert name to ID format
        const normalized = nameOrId.toLowerCase().replace(/\s+/g, '');
        return `chain_${normalized}`;
      });
      if (JSON.stringify(colors) !== JSON.stringify(migratedColors)) {
        console.log('[Storage] Migrating owned colors to new ID format');
        await saveOwnedColors(migratedColors);
      }
      return migratedColors;
    }
    // Default: user owns Gold
    return ['chain_gold'];
  } catch (error) {
    console.error('[Storage] Error loading owned colors:', error);
    return ['chain_gold'];
  }
}
