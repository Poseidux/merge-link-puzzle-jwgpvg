
import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';

interface FloatingScoreProps {
  score: number;
  x: number;
  y: number;
  onComplete: () => void;
}

export default function FloatingScore({ score, x, y, onComplete }: FloatingScoreProps) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  
  useEffect(() => {
    console.log('FloatingScore animation started for score:', score);
    opacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 800 }, () => {
        runOnJS(onComplete)();
      })
    );
    translateY.value = withTiming(-50, { duration: 900 });
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });
  
  const scoreText = `+${score}`;
  
  return (
    <Animated.View style={[styles.container, { left: x, top: y }, animatedStyle]}>
      <Text style={styles.text}>{scoreText}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFE66D',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
