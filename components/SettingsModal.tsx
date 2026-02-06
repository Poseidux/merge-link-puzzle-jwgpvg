
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Switch, StyleSheet, ScrollView } from 'react-native';
import { colors, THEMES } from '@/styles/commonStyles';
import { loadLifetimeStats, LifetimeStats } from '@/utils/storage';
import { formatTileValue } from '@/utils/gameLogic';

interface SettingsModalProps {
  visible: boolean;
  currentTheme: string;
  onClose: () => void;
  onThemeChange: (themeId: string) => void;
}

export default function SettingsModal({
  visible,
  currentTheme,
  onClose,
  onThemeChange,
}: SettingsModalProps) {
  const [stats, setStats] = useState<LifetimeStats>({
    highestTileEver: 0,
    gamesPlayed: 0,
    longestChain: 0,
  });
  
  useEffect(() => {
    if (visible) {
      loadLifetimeStats().then(loadedStats => {
        console.log('[SettingsModal] Loaded stats:', loadedStats);
        setStats(loadedStats);
      });
    }
  }, [visible]);
  
  const highestTileText = stats.highestTileEver > 0 ? formatTileValue(stats.highestTileEver) : '—';
  const gamesPlayedText = stats.gamesPlayed.toString();
  const longestChainText = stats.longestChain > 0 ? stats.longestChain.toString() : '—';
  
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
          
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Theme</Text>
            
            <View style={styles.themeList}>
              {Object.values(THEMES).map((theme) => {
                const isSelected = theme.id === currentTheme;
                return (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeOption,
                      isSelected && styles.themeOptionSelected,
                    ]}
                    onPress={() => onThemeChange(theme.id)}
                  >
                    <View style={styles.themeInfo}>
                      <Text style={[styles.themeName, isSelected && styles.themeNameSelected]}>
                        {theme.name}
                      </Text>
                      <View style={styles.themePreview}>
                        <View
                          style={[
                            styles.themeColorSwatch,
                            { backgroundColor: theme.tileColors[2][0] },
                          ]}
                        />
                        <View
                          style={[
                            styles.themeColorSwatch,
                            { backgroundColor: theme.tileColors[4][0] },
                          ]}
                        />
                        <View
                          style={[
                            styles.themeColorSwatch,
                            { backgroundColor: theme.tileColors[8][0] },
                          ]}
                        />
                        <View
                          style={[
                            styles.themeColorSwatch,
                            { backgroundColor: theme.tileColors[16][0] },
                          ]}
                        />
                      </View>
                    </View>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Lifetime Stats</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Highest Tile Ever</Text>
                <Text style={styles.statValue}>{highestTileText}</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Games Played</Text>
                <Text style={styles.statValue}>{gamesPlayedText}</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Longest Chain</Text>
                <Text style={styles.statValue}>{longestChainText}</Text>
              </View>
            </View>
          </ScrollView>
          
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
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollContent: {
    maxHeight: 500,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  themeList: {
    marginBottom: 8,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  themeNameSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  themePreview: {
    flexDirection: 'row',
    gap: 6,
  },
  themeColorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkmarkText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statsContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
