
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface GameMenuProps {
  visible: boolean;
  onResumeGame: () => void;
  onBackToHome: () => void;
  onNewGame: () => void;
}

export default function GameMenu({ visible, onResumeGame, onBackToHome, onNewGame }: GameMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onResumeGame}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onResumeGame}
      >
        <View style={styles.menuContainer} onStartShouldSetResponder={() => true}>
          <Text style={styles.menuTitle}>Game Menu</Text>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={onResumeGame}
          >
            <Text style={styles.menuButtonText}>Resume Game</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, styles.menuButtonSecondary]}
            onPress={onNewGame}
          >
            <Text style={styles.menuButtonTextSecondary}>New Game</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, styles.menuButtonSecondary]}
            onPress={onBackToHome}
          >
            <Text style={styles.menuButtonTextSecondary}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
    padding: 24,
    width: '80%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  menuButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuButtonSecondary: {
    backgroundColor: colors.cardBackground,
  },
  menuButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  menuButtonTextSecondary: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
});
