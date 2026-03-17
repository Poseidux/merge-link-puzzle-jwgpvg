export const RC_OFFERING_ID = 'themes';

export const CHAIN_PRODUCT_IDS = [
  'chain_turquoise',
  'chain_purple',
  'chain_orange',
  'chain_neongreen',
  'chain_magenta',
  'chain_limegreen',
  'chain_hotpink',
  'chain_electricblue',
  'chain_amber',
  'chain_cyan',
  'chain_crimson',
] as const;

export const THEME_PRODUCT_IDS = [
  'theme_arctic',
  'theme_aurora',
  'theme_autumn',
  'theme_candy',
  'theme_copperteal',
  'theme_coralreef',
  'theme_cottoncandy',
  'theme_desertdusk',
  'theme_forest',
  'theme_icefire',
  'theme_lagoon',
  'theme_midnight',
  'theme_monochromeglass',
  'theme_neon',
  'theme_ocean',
  'theme_prismpop',
  'theme_retroarcade',
  'theme_royalvelvet',
  'theme_sakura',
  'theme_sorbet',
  'theme_spring',
  'theme_sunrise',
  'theme_sunset',
  'theme_tropical',
  'theme_volcano',
] as const;

export const ALL_PRODUCT_IDS: string[] = [...CHAIN_PRODUCT_IDS, ...THEME_PRODUCT_IDS];
