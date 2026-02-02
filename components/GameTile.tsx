
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTileColor } from '@/utils/gameLogic';

interface GameTileProps {
  value: number;
  isSelected: boolean;
  size: number;
}

export default function GameTile({ value, isSelected, size }: GameTileProps) {
  const backgroundColor = getTileColor(value);
  const valueText = `${value}`;
  
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor,
          borderWidth: isSelected ? 4 : 0,
          borderColor: '#FFE66D',
        },
      ]}
    >
      <Text style={styles.tileText}>{valueText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tileText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
