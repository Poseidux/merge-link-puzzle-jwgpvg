
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/styles/commonStyles';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
}: ConfirmModalProps) {
  const confirmButtonText = confirmText || 'Confirm';
  const cancelButtonText = cancelText || 'Cancel';
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>{cancelButtonText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmButtonText}</Text>
            </TouchableOpacity>
          </View>
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
  modal: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.card,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
