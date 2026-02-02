
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
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
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>How to Play</Text>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 Goal</Text>
              <Text style={styles.text}>
                Create chains of tiles to merge them into higher values and maximize your score!
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👆 Basic Controls</Text>
              <Text style={styles.text}>
                Press and drag across tiles to form a chain. Release to merge.
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ Chain Rules</Text>
              <Text style={styles.ruleText}>
                1. Chains must have at least 2 tiles
              </Text>
              <Text style={styles.ruleText}>
                2. First two tiles MUST be identical
              </Text>
              <Text style={styles.ruleText}>
                3. After that, each tile must be either:
              </Text>
              <Text style={styles.subRuleText}>
                • The SAME value as the previous tile
              </Text>
              <Text style={styles.subRuleText}>
                • EXACTLY DOUBLE the previous tile
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Examples</Text>
              <Text style={styles.exampleText}>
                ✅ Valid: 2→2→4→4→8
              </Text>
              <Text style={styles.exampleText}>
                ✅ Valid: 8→8→16→32
              </Text>
              <Text style={styles.exampleText}>
                ✅ Valid: 4→4→4→8→8→16
              </Text>
              <Text style={styles.invalidText}>
                ❌ Invalid: 2→4 (must start with identical)
              </Text>
              <Text style={styles.invalidText}>
                ❌ Invalid: 2→2→8 (skips the double step)
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎁 Merge Result</Text>
              <Text style={styles.text}>
                The final tile becomes 2× the HIGHEST value in your chain.
              </Text>
              <Text style={styles.text}>
                Score = sum of all merged tile values.
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🛠️ Power-ups</Text>
              <Text style={styles.powerUpText}>
                • Undo: Revert your last move
              </Text>
              <Text style={styles.powerUpText}>
                • Hammer: Remove one tile
              </Text>
              <Text style={styles.powerUpText}>
                • Swap: Exchange two tiles
              </Text>
              <Text style={styles.powerUpText}>
                • Hint: Highlight a strong chain
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎮 Game Over</Text>
              <Text style={styles.text}>
                The game ends when no valid chains exist. You can Continue once per game to keep playing!
              </Text>
            </View>
          </ScrollView>
          
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Got It!</Text>
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
    padding: 20,
  },
  modal: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  scrollView: {
    maxHeight: 500,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.accent,
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 4,
  },
  ruleText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  subRuleText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginLeft: 16,
    marginBottom: 2,
  },
  exampleText: {
    fontSize: 15,
    color: colors.secondary,
    lineHeight: 22,
    marginBottom: 4,
    fontWeight: '600',
  },
  invalidText: {
    fontSize: 15,
    color: colors.primary,
    lineHeight: 22,
    marginBottom: 4,
    fontWeight: '600',
  },
  powerUpText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 4,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
