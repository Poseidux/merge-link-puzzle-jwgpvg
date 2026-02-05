
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { getTileColor, formatTileValue } from '@/utils/gameLogic';

interface GameTileProps {
  value: number | undefined | null;
  isSelected: boolean;
  size: number;
  isAnimating?: boolean;
  animationDelay?: number;
  tileColors?: { [key: number]: string[] };
  accentColor?: string;
}

// Calculate brightness of a color to determine if text should be dark or light
function getTextColorForBackground(value: number): string {
  // For lower values (2-16), use white text
  // For higher values with lighter gradients, use dark text
  if (value >= 128) {
    return '#1C1C1E'; // Dark text for lighter backgrounds
  }
  return '#FFFFFF'; // White text for darker backgrounds
}

export default function GameTile({ value, isSelected, size, isAnimating = false, animationDelay = 0, tileColors, accentColor = '#FFD700' }: GameTileProps) {
  // Handle invalid values gracefully
  const safeValue = (value !== undefined && value !== null && typeof value === 'number' && !isNaN(value)) ? value : 2;
  
  // Use theme colors if provided, otherwise fall back to default
  let gradientColors: string[];
  if (tileColors && tileColors[safeValue]) {
    gradientColors = tileColors[safeValue];
  } else {
    const tileColorData = getTileColor(safeValue);
    gradientColors = tileColorData.gradientColors;
  }
  
  const displayValue = formatTileValue(safeValue);
  const isGlowing = safeValue >= 1024;
  const textColor = getTextColorForBackground(safeValue);
  
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  
  useEffect(() => {
    if (isAnimating) {
      console.log('Starting smooth particle fade animation with delay:', animationDelay);
      
      opacity.value = withDelay(
        animationDelay,
        withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) })
      );
      
      scale.value = withDelay(
        animationDelay,
        withTiming(0.6, { duration: 300, easing: Easing.out(Easing.ease) })
      );
    } else {
      opacity.value = 1;
      scale.value = 1;
    }
  }, [isAnimating, animationDelay, opacity, scale]);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });
  
  // Auto-scale font size based on number of digits
  const getFontSize = () => {
    const baseSize = size * 0.35;
    const digitCount = displayValue.length;
    
    if (digitCount >= 5) return baseSize * 0.55; // 5+ digits (e.g., "1000K")
    if (digitCount === 4) return baseSize * 0.65; // 4 digits (e.g., "1024")
    if (digitCount === 3) return baseSize * 0.8;  // 3 digits (e.g., "128")
    return baseSize; // 1-2 digits
  };
  
  const fontSize = getFontSize();
  
  return (
    <Animated.View
      style={[
        styles.tileContainer,
        {
          width: size,
          height: size,
        },
        isGlowing && styles.glowContainer,
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderWidth: isSelected ? 4 : 0,
            borderColor: isSelected ? accentColor : 'transparent',
          },
        ]}
      >
        <Text 
          style={[
            styles.tileText, 
            { 
              fontSize,
              color: textColor,
            }
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {displayValue}
        </Text>
      </LinearGradient>
    </Animated.View>
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
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  tileText: {
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: -0.5,
  },
});
