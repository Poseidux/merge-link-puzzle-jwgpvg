
import React from 'react';
import { View, Text, Modal, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { GameSettings } from '@/types/game';

interface SettingsModalProps {
  visible: boolean;
  settings: GameSettings;
  onClose: () => void;
  onSettingChange: (key: keyof GameSettings, value: boolean) => void;
}

export default function SettingsModal({
  visible,
  settings,
  onClose,
  onSettingChange,
}: SettingsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Settings</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Sound Effects</Text>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(value) => onSettingChange('soundEnabled', value)}
              trackColor={{ false: colors.card, true: colors.secondary }}
              thumbColor={settings.soundEnabled ? colors.accent : colors.textSecondary}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Haptic Feedback</Text>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(value) => onSettingChange('hapticsEnabled', value)}
              trackColor={{ false: colors.card, true: colors.secondary }}
              thumbColor={settings.hapticsEnabled ? colors.accent : colors.textSecondary}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Switch
              value={settings.darkMode}
              onValueChange={(value) => onSettingChange('darkMode', value)}
              trackColor={{ false: colors.card, true: colors.secondary }}
              thumbColor={settings.darkMode ? colors.accent : colors.textSecondary}
            />
          </View>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
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
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 3,
    borderColor: colors.secondary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
  },
  settingLabel: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
