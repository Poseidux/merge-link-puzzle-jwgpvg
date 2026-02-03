
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
    const iconMap: { [key: string]: string } = {
      hint: 'lightbulb',
      bomb: 'delete',
      swap: 'swap-horiz',
      shuffle: 'shuffle',
    };
    return iconMap[powerUpId] || 'star';
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.powerUpsContainer}>
        {powerUps.map((powerUp) => {
          const isDisabled = powerUp.usesLeft === 0;
          const usesText = `${powerUp.usesLeft}/${powerUp.maxUses}`;
          const iconName = getIconForPowerUp(powerUp.id);
          
          return (
            <TouchableOpacity
              key={powerUp.id}
              style={[
                styles.powerUpButton,
                isDisabled && styles.powerUpButtonDisabled,
              ]}
              onPress={() => onPowerUpPress(powerUp.id)}
              disabled={isDisabled}
            >
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name={iconName}
                size={28}
                color={isDisabled ? colors.textSecondary : colors.primary}
              />
              <Text style={[
                styles.usesText,
                isDisabled && styles.usesTextDisabled,
              ]}>
                {usesText}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={onSettingsPress}
      >
        <IconSymbol
          ios_icon_name="gear"
          android_material_icon_name="settings"
          size={28}
          color={colors.text}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  powerUpsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  powerUpButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
    minWidth: 60,
  },
  powerUpButtonDisabled: {
    opacity: 0.4,
  },
  usesText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  usesTextDisabled: {
    color: colors.textSecondary,
  },
  settingsButton: {
    padding: 8,
    marginLeft: 12,
  },
});
