
import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { formatTileValue } from '@/utils/gameLogic';

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
  
  const stableOnComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);
  
  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 800 })
    );
    translateY.value = withTiming(-50, { duration: 900 });
    
    const timer = setTimeout(() => {
      stableOnComplete();
    }, 900);
    
    return () => clearTimeout(timer);
  }, [opacity, translateY, stableOnComplete]);
  
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

interface MilestoneBannerProps {
  value: number;
  onComplete: () => void;
}

export function MilestoneBanner({ value, onComplete }: MilestoneBannerProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  const stableOnComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    console.log('[MilestoneBanner] Showing milestone for value:', value);
    
    opacity.value = withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 600 }),
      withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) })
    );
    
    scale.value = withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.5)) }),
      withTiming(1, { duration: 600 }),
      withTiming(0.8, { duration: 200, easing: Easing.in(Easing.ease) })
    );

    const timer = setTimeout(() => {
      stableOnComplete();
    }, 1000);

    return () => clearTimeout(timer);
  }, [value, opacity, scale, stableOnComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const valueText = formatTileValue(value);
  const bannerText = `New Tile: ${valueText}!`;

  return (
    <Animated.View style={[styles.milestoneBanner, animatedStyle]}>
      <View style={styles.milestoneContent}>
        <Text style={styles.milestoneText}>{bannerText}</Text>
      </View>
    </Animated.View>
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
  milestoneBanner: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    zIndex: 2000,
    alignItems: 'center',
  },
  milestoneContent: {
    backgroundColor: '#F093FB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  milestoneText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
