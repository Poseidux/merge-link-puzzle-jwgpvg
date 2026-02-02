
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface TutorialOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export default function TutorialOverlay({ visible, onClose }: TutorialOverlayProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>How to Play</Text>
          
          <View style={styles.instructionContainer}>
            <Text style={styles.instruction}>
              <Text style={styles.bold}>1. Drag</Text> your finger across adjacent tiles to create a chain
            </Text>
            
            <Text style={styles.instruction}>
              <Text style={styles.bold}>2. Start</Text> by linking tiles with the same number
            </Text>
            
            <Text style={styles.instruction}>
              <Text style={styles.bold}>3. Continue</Text> the chain with tiles that are the same OR double the previous value
            </Text>
            
            <Text style={styles.instruction}>
              <Text style={styles.bold}>4. Release</Text> to merge! The last tile becomes 2× the highest value
            </Text>
            
            <Text style={styles.instruction}>
              <Text style={styles.bold}>Example:</Text> 2 → 2 → 4 → 4 → 8 = Valid chain!
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 28,
    width: '90%',
    maxWidth: 450,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 24,
    textAlign: 'center',
  },
  instructionContainer: {
    marginBottom: 28,
  },
  instruction: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    lineHeight: 24,
  },
  bold: {
    fontWeight: 'bold',
    color: colors.accent,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
