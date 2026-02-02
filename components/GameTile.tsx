
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getTileColor, formatTileValue } from '@/utils/gameLogic';

interface GameTileProps {
  value: number;
  isSelected: boolean;
  size: number;
}

export default function GameTile({ value, isSelected, size }: GameTileProps) {
  const tileColorData = getTileColor(value);
  const displayValue = formatTileValue(value);
  const isGlowing = value >= 1024;
  
  // Dynamic font size based on the length of the display value
  const getFontSize = () => {
    const baseSize = size * 0.35;
    if (displayValue.length >= 4) return baseSize * 0.7;
    if (displayValue.length === 3) return baseSize * 0.85;
    return baseSize;
  };
  
  const fontSize = getFontSize();
  
  return (
    <View
      style={[
        styles.tileContainer,
        {
          width: size,
          height: size,
        },
        isGlowing && styles.glowContainer,
      ]}
    >
      <LinearGradient
        colors={tileColorData.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderWidth: isSelected ? 4 : 0,
            borderColor: isSelected ? '#FFD700' : 'transparent',
          },
        ]}
      >
        <Text 
          style={[
            styles.tileText, 
            { fontSize }
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {displayValue}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  tileContainer: {
    position: 'relative',
  },
  glowContainer: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  tile: {
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  tileText: {
    color: '#FFFFFF',
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    letterSpacing: -0.5,
  },
});
