
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
}

export default function PowerUpBar({ powerUps, onPowerUpPress, onSettingsPress }: PowerUpBarProps) {
  const getIconForPowerUp = (powerUpId: string) => {
    const iconMap: { [key: string]: { ios: string; android: string } } = {
      undo: { ios: 'arrow.uturn.backward', android: 'undo' },
      hint: { ios: 'lightbulb.fill', android: 'lightbulb' },
      bomb: { ios: 'hammer.fill', android: 'delete' },
      swap: { ios: 'arrow.left.arrow.right', android: 'swap-horiz' },
      shuffle: { ios: 'shuffle', android: 'shuffle' },
    };
    return iconMap[powerUpId] || { ios: 'star.fill', android: 'star' };
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.powerUpCard}>
        {powerUps.map((powerUp) => {
          const isDisabled = powerUp.usesLeft === 0;
          const usesText = `${powerUp.usesLeft}`;
          const iconData = getIconForPowerUp(powerUp.id);
          
          return (
            <TouchableOpacity
              key={powerUp.id}
              style={[
                styles.powerUpButton,
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
                  color={isDisabled ? colors.textSecondary : colors.primary}
                />
                {powerUp.usesLeft > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{usesText}</Text>
                  </View>
                )}
              </View>
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
    backgroundColor: colors.background,
  },
  powerUpCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  powerUpButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.08)',
  },
  powerUpButtonDisabled: {
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    opacity: 0.5,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
