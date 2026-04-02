export const RC_OFFERING_ID = 'themes';

// Exact package identifiers as configured in RevenueCat dashboard
// These are used to look up packages via pkg.identifier in the offering
export const THEME_PACKAGE_IDS = [
  'Volcano',
  'Tropical',
  'Sunset',
  'Sunrise',
  'Spring',
  'Sorbet',
  'Sakura',
  'Royal Velvet',
  'Retro Arcade',
  'Prism Pop',
  'Ocean',
  'Neon',
  'Monochrome Glass',
  'Midnight',
  'Lagoon',
  'Ice Fire',
  'Forest',
  'Desert Dusk theme',
  'Cotton Candy',
  'Coral Reef',
  'Copper Teal',
  'Candy',
  'Autumn',
  'Aurora',
  'Arctic',
] as const;

export const CHAIN_PACKAGE_IDS = [
  'Turquoise',
  'Purple',
  'Orange',
  'Neon Green',
  'Magenta',
  'Lime Green',
  'Hot Pink',
  'Electric Blue',
  'Cyan',
  'Crimson',
  'Amber',
] as const;

export const ALL_PACKAGE_IDS: string[] = [...THEME_PACKAGE_IDS, ...CHAIN_PACKAGE_IDS];

// Map from RevenueCat package identifier -> local productId (used in THEMES / CHAIN_HIGHLIGHT_COLORS)
export const PACKAGE_ID_TO_PRODUCT_ID: Record<string, string> = {
  'Volcano': 'theme_volcano',
  'Tropical': 'theme_tropical',
  'Sunset': 'theme_sunset',
  'Sunrise': 'theme_sunrise',
  'Spring': 'theme_spring',
  'Sorbet': 'theme_sorbet',
  'Sakura': 'theme_sakura',
  'Royal Velvet': 'theme_royalvelvet',
  'Retro Arcade': 'theme_retroarcade',
  'Prism Pop': 'theme_prismpop',
  'Ocean': 'theme_ocean',
  'Neon': 'theme_neon',
  'Monochrome Glass': 'theme_monochromeglass',
  'Midnight': 'theme_midnight',
  'Lagoon': 'theme_lagoon',
  'Ice Fire': 'theme_icefire',
  'Forest': 'theme_forest',
  'Desert Dusk theme': 'theme_desertdusk',
  'Cotton Candy': 'theme_cottoncandy',
  'Coral Reef': 'theme_coralreef',
  'Copper Teal': 'theme_copperteal',
  'Candy': 'theme_candy',
  'Autumn': 'theme_autumn',
  'Aurora': 'theme_aurora',
  'Arctic': 'theme_arctic',
  'Turquoise': 'chain_turquoise',
  'Purple': 'chain_purple',
  'Orange': 'chain_orange',
  'Neon Green': 'chain_neongreen',
  'Magenta': 'chain_magenta',
  'Lime Green': 'chain_limegreen',
  'Hot Pink': 'chain_hotpink',
  'Electric Blue': 'chain_electricblue',
  'Cyan': 'chain_cyan',
  'Crimson': 'chain_crimson',
  'Amber': 'chain_amber',
};

// Reverse map: local productId -> RevenueCat package identifier
export const PRODUCT_ID_TO_PACKAGE_ID: Record<string, string> = Object.fromEntries(
  Object.entries(PACKAGE_ID_TO_PRODUCT_ID).map(([pkgId, productId]) => [productId, pkgId])
);

// Legacy exports kept for backward compatibility with shop.tsx
export const THEME_PRODUCT_IDS = [
  'theme_arctic', 'theme_aurora', 'theme_autumn', 'theme_candy',
  'theme_copperteal', 'theme_coralreef', 'theme_cottoncandy', 'theme_desertdusk',
  'theme_forest', 'theme_icefire', 'theme_lagoon', 'theme_midnight',
  'theme_monochromeglass', 'theme_neon', 'theme_ocean', 'theme_prismpop',
  'theme_retroarcade', 'theme_royalvelvet', 'theme_sakura', 'theme_sorbet',
  'theme_spring', 'theme_sunrise', 'theme_sunset', 'theme_tropical',
  'theme_volcano',
] as const;

export const CHAIN_PRODUCT_IDS = [
  'chain_turquoise', 'chain_purple', 'chain_orange', 'chain_neongreen',
  'chain_magenta', 'chain_limegreen', 'chain_hotpink', 'chain_electricblue',
  'chain_cyan', 'chain_crimson', 'chain_amber',
] as const;

export const ALL_PRODUCT_IDS: string[] = [...THEME_PRODUCT_IDS, ...CHAIN_PRODUCT_IDS];
