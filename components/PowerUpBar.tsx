
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
  function getIconForPowerUp(powerUpId: string): string {
    const iconMap: { [key: string]: string } = {
      undo: 'undo',
      hint: 'lightbulb',
      bomb: 'delete',
      swap: 'swap-horiz',
    };
    return iconMap[powerUpId] || 'help';
  }
  
  return (
    <View style={styles.container}>
      {powerUps.map(powerUp => {
        const isDisabled = powerUp.usesLeft === 0;
        const opacity = isDisabled ? 0.3 : 1;
        const usesText = `${powerUp.usesLeft}`;
        
        return (
          <TouchableOpacity
            key={powerUp.id}
            style={[styles.powerUpButton, { opacity }]}
            onPress={() => onPowerUpPress(powerUp.id)}
            disabled={isDisabled}
          >
            <IconSymbol
              ios_icon_name="circle.fill"
              android_material_icon_name={getIconForPowerUp(powerUp.id)}
              size={28}
              color={colors.text}
            />
            <Text style={styles.usesText}>{usesText}</Text>
          </TouchableOpacity>
        );
      })}
      
      <TouchableOpacity style={styles.settingsButton} onPress={onSettingsPress}>
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
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  powerUpButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  usesText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  settingsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
});
