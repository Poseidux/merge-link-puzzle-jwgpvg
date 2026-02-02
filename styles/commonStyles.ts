
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

export const colors = {
  // Vibrant puzzle game colors
  primary: '#FF6B6B',      // Coral Red
  secondary: '#4ECDC4',    // Turquoise
  accent: '#FFE66D',       // Sunny Yellow
  background: '#1A1A2E',   // Dark Navy
  backgroundAlt: '#16213E', // Slightly lighter navy
  text: '#EAEAEA',         // Light grey text
  textSecondary: '#A0A0A0', // Secondary text
  card: '#0F3460',         // Deep blue for cards
  highlight: '#FF6B6B',    // Highlight color
  
  // Tile colors for different values
  tile2: '#FF6B6B',        // Red
  tile4: '#FF8E53',        // Orange
  tile8: '#FFD93D',        // Yellow
  tile16: '#6BCF7F',       // Green
  tile32: '#4ECDC4',       // Turquoise
  tile64: '#5DADE2',       // Blue
  tile128: '#A569BD',      // Purple
  tile256: '#EC7063',      // Pink
  tile512: '#F8B739',      // Gold
  tile1024: '#48C9B0',     // Mint
  tile2048: '#AF7AC5',     // Lavender
  tileDefault: '#2C3E50',  // Dark grey for higher values
};

export const buttonStyles = StyleSheet.create({
  instructionsButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: colors.backgroundAlt,
    alignSelf: 'center',
    width: '100%',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.secondary,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    width: '100%',
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: "white",
  },
});
