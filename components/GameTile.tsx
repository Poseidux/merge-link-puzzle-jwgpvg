
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { getTileColor } from '@/utils/gameLogic';

interface GameTileProps {
  value: number;
  isSelected: boolean;
  size: number;
}

export default function GameTile({ value, isSelected, size }: GameTileProps) {
  const backgroundColor = getTileColor(value);
  
  const animatedStyle = useAnimatedStyle(() => {
    const scale = isSelected
      ? withSpring(1.15, { damping: 10, stiffness: 100 })
      : withSpring(1, { damping: 10, stiffness: 100 });
    
    return {
      transform: [{ scale }],
    };
  });
  
  const fontSize = value >= 1000 ? size * 0.25 : value >= 100 ? size * 0.3 : size * 0.35;
  const valueText = `${value}`;
  
  return (
    <Animated.View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor,
          borderColor: isSelected ? '#FFF' : 'transparent',
          borderWidth: isSelected ? 4 : 0,
        },
        animatedStyle,
      ]}
    >
      <Text style={[styles.tileText, { fontSize }]}>{valueText}</Text>
      {isSelected && <View style={styles.glowEffect} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  tileText: {
    color: '#FFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
