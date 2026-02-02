
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
          <Text style={styles.title}>Game Over!</Text>
          
          <View style={styles.scoreContainer}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={styles.scoreValue}>{scoreText}</Text>
            </View>
            
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Best</Text>
              <Text style={styles.bestScoreValue}>{bestScoreText}</Text>
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.restartButton]}
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
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 32,
    width: '85%',
    maxWidth: 400,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  scoreContainer: {
    marginBottom: 32,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 28,
    color: colors.text,
    fontWeight: 'bold',
  },
  bestScoreValue: {
    fontSize: 28,
    color: colors.accent,
    fontWeight: 'bold',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  restartButton: {
    backgroundColor: colors.primary,
  },
  continueButton: {
    backgroundColor: colors.secondary,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
