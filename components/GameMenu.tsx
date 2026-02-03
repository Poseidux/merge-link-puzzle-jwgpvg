
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface GameMenuProps {
  visible: boolean;
  onResumeGame: () => void;
  onBackToHome: () => void;
}

export default function GameMenu({ visible, onResumeGame, onBackToHome }: GameMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onResumeGame}
    >
      <View style={styles.overlay}>
        <View style={styles.menuContainer}>
          <Text style={styles.title}>Game Menu</Text>
          
          <TouchableOpacity style={styles.menuButton} onPress={onResumeGame}>
            <Text style={styles.menuButtonText}>Resume Game</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuButton} onPress={onBackToHome}>
            <Text style={styles.menuButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 32,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  menuButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
