
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface GameOverModalProps {
  visible: boolean;
  score: number;
  bestScore: number;
  onRestart: () => void;
}

export default function GameOverModal({ visible, score, bestScore, onRestart }: GameOverModalProps) {
  const scoreText = `${score}`;
  const bestScoreText = `${bestScore}`;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Game Over</Text>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Final Score</Text>
            <Text style={styles.scoreValue}>{scoreText}</Text>
          </View>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Best Score</Text>
            <Text style={styles.bestScoreValue}>{bestScoreText}</Text>
          </View>
          
          <TouchableOpacity style={styles.restartButton} onPress={onRestart}>
            <Text style={styles.restartButtonText}>Restart</Text>
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
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 32,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 36,
    color: colors.text,
    fontWeight: 'bold',
  },
  bestScoreValue: {
    fontSize: 36,
    color: colors.accent,
    fontWeight: 'bold',
  },
  restartButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginTop: 16,
  },
  restartButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
