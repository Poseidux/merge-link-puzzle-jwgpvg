
import React, { useEffect, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
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
  
  const scoreText = `+${score}`;
  
  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);
  
  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 800 })
    );
    translateY.value = withTiming(-50, { duration: 900 });
    
    const timer = setTimeout(() => {
      handleComplete();
    }, 900);
    
    return () => clearTimeout(timer);
  }, [opacity, translateY, handleComplete]);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });
  
  return (
    <Animated.Text
      style={[
        styles.floatingScore,
        {
          left: x,
          top: y,
        },
        animatedStyle,
      ]}
    >
      {scoreText}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  floatingScore: {
    position: 'absolute',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFE66D',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
