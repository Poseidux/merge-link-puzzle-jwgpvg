
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
      ? withSpring(1.1, { damping: 10, stiffness: 100 })
      : withSpring(1, { damping: 10, stiffness: 100 });
    
    return {
      transform: [{ scale }],
    };
  });
  
  const fontSize = value >= 1000 ? size * 0.25 : value >= 100 ? size * 0.3 : size * 0.35;
  
  return (
    <Animated.View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor,
          borderColor: isSelected ? '#FFF' : 'transparent',
          borderWidth: isSelected ? 3 : 0,
        },
        animatedStyle,
      ]}
    >
      <Text style={[styles.tileText, { fontSize }]}>{value}</Text>
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
  },
  tileText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
