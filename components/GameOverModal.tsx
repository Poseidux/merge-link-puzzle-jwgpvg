
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface GameOverModalProps {
  visible: boolean;
  score: number;
  bestScore: number;
  canContinue: boolean;
  onRestart: () => void;
  onContinue: () => void;
}

export default function GameOverModal({
  visible,
  score,
  bestScore,
  canContinue,
  onRestart,
  onContinue,
}: GameOverModalProps) {
  const scoreText = `${score}`;
  const bestScoreText = `${bestScore}`;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Game Over</Text>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.label}>Score</Text>
            <Text style={styles.score}>{scoreText}</Text>
          </View>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.label}>Best</Text>
            <Text style={styles.bestScore}>{bestScoreText}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.button}
            onPress={onRestart}
          >
            <Text style={styles.buttonText}>Restart</Text>
          </TouchableOpacity>
          
          {canContinue && (
            <TouchableOpacity
              style={[styles.button, styles.continueButton]}
              onPress={onContinue}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 300,
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
  label: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  score: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  bestScore: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.accent,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 16,
    minWidth: 200,
  },
  continueButton: {
    backgroundColor: colors.secondary,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
