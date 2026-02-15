
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

export interface PowerUp {
  id: string;
  name: string;
  icon: string;
  usesLeft: number;
  maxUses: number;
}

interface PowerUpBarProps {
  powerUps: PowerUp[];
  onPowerUpPress: (powerUpId: string) => void;
  onSettingsPress: () => void;
  activeTheme?: {
    id: string;
    name: string;
    boardBackground: string;
    emptyCellColor: string;
    accentColor: string;
  };
}

// Helper to derive theme-appropriate power-up bar styling
function getThemeBarStyle(themeId: string, accentColor: string) {
  const darkThemes = [
    'midnight', 'neon', 'volcano', 'aurora', 'coralreef', 'desertdusk',
    'royalvelvet', 'sakura', 'copperteal', 'prismpop', 'icefire',
    'retroarcade', 'monochromeglass', 'lagoon', 'tropical'
  ];

  const isDarkTheme = darkThemes.includes(themeId);

  if (!isDarkTheme) {
    // Light themes: use default light card styling
    return {
      backgroundColor: colors.cardBackground,
      borderColor: 'rgba(0, 0, 0, 0.05)',
      shadowColor: '#000',
      shadowOpacity: 0.1,
    };
  }

  // Dark/contrast themes: derive from theme accent
  const themeStyles: { [key: string]: any } = {
    midnight: {
      backgroundColor: 'rgba(14, 18, 51, 0.85)',
      borderColor: 'rgba(79, 123, 255, 0.25)',
      shadowColor: '#4F7BFF',
      shadowOpacity: 0.15,
    },
    neon: {
      backgroundColor: 'rgba(10, 10, 10, 0.90)',
      borderColor: 'rgba(0, 255, 0, 0.30)',
      shadowColor: '#00FF00',
      shadowOpacity: 0.20,
    },
    volcano: {
      backgroundColor: 'rgba(43, 11, 11, 0.85)',
      borderColor: 'rgba(255, 69, 0, 0.30)',
      shadowColor: '#FF4500',
      shadowOpacity: 0.18,
    },
    aurora: {
      backgroundColor: 'rgba(7, 26, 43, 0.85)',
      borderColor: 'rgba(8, 191, 174, 0.30)',
      shadowColor: '#08BFAE',
      shadowOpacity: 0.18,
    },
    coralreef: {
      backgroundColor: 'rgba(6, 32, 56, 0.85)',
      borderColor: 'rgba(46, 224, 255, 0.30)',
      shadowColor: '#2EE0FF',
      shadowOpacity: 0.18,
    },
    desertdusk: {
      backgroundColor: 'rgba(59, 32, 16, 0.85)',
      borderColor: 'rgba(255, 122, 46, 0.30)',
      shadowColor: '#FF7A2E',
      shadowOpacity: 0.18,
    },
    royalvelvet: {
      backgroundColor: 'rgba(10, 14, 26, 0.85)',
      borderColor: 'rgba(79, 123, 255, 0.30)',
      shadowColor: '#4F7BFF',
      shadowOpacity: 0.18,
    },
    sakura: {
      backgroundColor: 'rgba(42, 18, 24, 0.85)',
      borderColor: 'rgba(255, 46, 138, 0.30)',
      shadowColor: '#FF2E8A',
      shadowOpacity: 0.18,
    },
    copperteal: {
      backgroundColor: 'rgba(42, 26, 21, 0.85)',
      borderColor: 'rgba(255, 122, 46, 0.30)',
      shadowColor: '#FF7A2E',
      shadowOpacity: 0.18,
    },
    prismpop: {
      backgroundColor: 'rgba(15, 16, 32, 0.85)',
      borderColor: 'rgba(255, 77, 255, 0.30)',
      shadowColor: '#FF4DFF',
      shadowOpacity: 0.20,
    },
    icefire: {
      backgroundColor: 'rgba(15, 31, 47, 0.85)',
      borderColor: 'rgba(46, 224, 255, 0.30)',
      shadowColor: '#2EE0FF',
      shadowOpacity: 0.18,
    },
    retroarcade: {
      backgroundColor: 'rgba(10, 10, 21, 0.90)',
      borderColor: 'rgba(0, 229, 255, 0.35)',
      shadowColor: '#00E5FF',
      shadowOpacity: 0.22,
    },
    monochromeglass: {
      backgroundColor: 'rgba(26, 26, 26, 0.85)',
      borderColor: 'rgba(122, 122, 122, 0.35)',
      shadowColor: '#7A7A7A',
      shadowOpacity: 0.15,
    },
    lagoon: {
      backgroundColor: 'rgba(13, 42, 58, 0.85)',
      borderColor: 'rgba(46, 224, 255, 0.30)',
      shadowColor: '#2EE0FF',
      shadowOpacity: 0.18,
    },
    tropical: {
      backgroundColor: 'rgba(10, 42, 42, 0.85)',
      borderColor: 'rgba(46, 224, 255, 0.30)',
      shadowColor: '#2EE0FF',
      shadowOpacity: 0.18,
    },
  };

  return themeStyles[themeId] || {
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    borderColor: 'rgba(102, 126, 234, 0.25)',
    shadowColor: accentColor,
    shadowOpacity: 0.15,
  };
}

export default function PowerUpBar({ powerUps, onPowerUpPress, onSettingsPress, activeTheme }: PowerUpBarProps) {
  const getIconForPowerUp = (powerUpId: string) => {
    const iconMap: { [key: string]: { ios: string; android: string } } = {
      hint: { ios: 'lightbulb.fill', android: 'lightbulb' },
      bomb: { ios: 'hammer.fill', android: 'delete' },
      swap: { ios: 'arrow.left.arrow.right', android: 'swap-horiz' },
      scoreBoost: { ios: 'multiply.circle.fill', android: 'close' },
    };
    return iconMap[powerUpId] || { ios: 'star.fill', android: 'star' };
  };

  const themeId = activeTheme?.id || 'classic';
  const accentColor = activeTheme?.accentColor || colors.primary;
  const barStyle = getThemeBarStyle(themeId, accentColor);
  
  return (
    <View style={styles.container}>
      <View style={[
        styles.powerUpCard,
        {
          backgroundColor: barStyle.backgroundColor,
          borderColor: barStyle.borderColor,
          shadowColor: barStyle.shadowColor,
          shadowOpacity: barStyle.shadowOpacity,
        }
      ]}>
        {powerUps.map((powerUp) => {
          const isDisabled = powerUp.usesLeft === 0;
          const usesText = `${powerUp.usesLeft}`;
          const iconData = getIconForPowerUp(powerUp.id);
          
          return (
            <TouchableOpacity
              key={powerUp.id}
              style={[
                styles.powerUpButton,
                {
                  backgroundColor: isDisabled 
                    ? 'rgba(142, 142, 147, 0.08)' 
                    : `${accentColor}15`,
                  borderColor: isDisabled 
                    ? 'transparent' 
                    : `${accentColor}30`,
                },
                isDisabled && styles.powerUpButtonDisabled,
              ]}
              onPress={() => onPowerUpPress(powerUp.id)}
              disabled={isDisabled}
              activeOpacity={isDisabled ? 1 : 0.7}
            >
              <View style={styles.iconContainer}>
                <IconSymbol
                  ios_icon_name={iconData.ios}
                  android_material_icon_name={iconData.android}
                  size={24}
                  color={isDisabled ? 'rgba(142, 142, 147, 0.5)' : accentColor}
                />
                {powerUp.id === 'scoreBoost' && !isDisabled && (
                  <Text style={[styles.x2Label, { color: accentColor }]}>x2</Text>
                )}
              </View>
              {powerUp.usesLeft > 0 && (
                <View style={[styles.badge, { backgroundColor: accentColor }]}>
                  <Text style={styles.badgeText}>{usesText}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
  },
  powerUpCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1.5,
  },
  powerUpButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 14,
    position: 'relative',
    minWidth: 44,
    minHeight: 44,
    borderWidth: 1.5,
  },
  powerUpButtonDisabled: {
    opacity: 0.4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  x2Label: {
    position: 'absolute',
    bottom: -8,
    fontSize: 10,
    fontWeight: '900',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2.5,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
