
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTileColor, formatTileValue } from '@/utils/gameLogic';

interface GameTileProps {
  value: number;
  isSelected: boolean;
  size: number;
}

export default function GameTile({ value, isSelected, size }: GameTileProps) {
  const backgroundColor = getTileColor(value);
  const displayValue = formatTileValue(value);
  
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
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor,
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
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  tileText: {
    color: '#FFFFFF',
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: -0.5,
  },
});
