
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, THEMES, CHAIN_HIGHLIGHT_COLORS } from '@/styles/commonStyles';
import { loadLifetimeStats, LifetimeStats, loadOwnedThemes, loadOwnedColors } from '@/utils/storage';
import { formatTileValue } from '@/utils/gameLogic';
import { useRouter } from 'expo-router';

interface SettingsModalProps {
  visible: boolean;
  currentTheme: string;
  chainHighlightColor: string;
  onClose: () => void;
  onThemeChange: (themeId: string) => void;
  onChainHighlightColorChange: (color: string) => void;
}

export default function SettingsModal({
  visible,
  currentTheme,
  chainHighlightColor,
  onClose,
  onThemeChange,
  onChainHighlightColorChange,
}: SettingsModalProps) {
  const router = useRouter();
  const [stats, setStats] = useState<LifetimeStats>({
    highestTileEver: 0,
    gamesPlayed: 0,
    longestChain: 0,
  });
  const [ownedThemes, setOwnedThemes] = useState<string[]>(['theme_classic']);
  const [ownedColors, setOwnedColors] = useState<string[]>(['chain_gold']);
  
  useEffect(() => {
    if (visible) {
      loadLifetimeStats().then(loadedStats => {
        console.log('[SettingsModal] Loaded stats:', loadedStats);
        setStats(loadedStats);
      });
      
      loadOwnedThemes().then(themes => {
        console.log('[SettingsModal] Loaded owned themes:', themes);
        setOwnedThemes(themes);
      });
      
      loadOwnedColors().then(colors => {
        console.log('[SettingsModal] Loaded owned colors:', colors);
        setOwnedColors(colors);
      });
    }
  }, [visible]);
  
  const highestTileText = stats.highestTileEver > 0 ? formatTileValue(stats.highestTileEver) : '—';
  const gamesPlayedText = stats.gamesPlayed.toString();
  const longestChainText = stats.longestChain > 0 ? stats.longestChain.toString() : '—';
  
  const handleThemePress = (themeId: string, isOwned: boolean, price: number) => {
    if (!isOwned && price > 0) {
      console.log('[SettingsModal] Theme not owned, navigating to Shop');
      onClose();
      router.push('/shop');
      return;
    }
    
    if (isOwned) {
      console.log('[SettingsModal] Equipping owned theme:', themeId);
      onThemeChange(themeId);
    }
  };
  
  const handleColorPress = (colorId: string, isOwned: boolean, price: number) => {
    if (!isOwned && price > 0) {
      console.log('[SettingsModal] Color not owned, navigating to Shop');
      onClose();
      router.push('/shop');
      return;
    }
    
    if (isOwned) {
      console.log('[SettingsModal] Equipping owned color:', colorId);
      const colorObj = CHAIN_HIGHLIGHT_COLORS.find(c => c.id === colorId);
      if (colorObj) {
        onChainHighlightColorChange(colorObj.value);
      }
    }
  };
  
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
                const isOwned = ownedThemes.includes(theme.id);
                const isSelected = theme.id === currentTheme;
                const isFree = theme.price === 0;
                const canSelect = isOwned || isFree;
                const priceText = `$${theme.price.toFixed(2)}`;
                
                return (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeOption,
                      isSelected && styles.themeOptionSelected,
                      !canSelect && styles.themeOptionLocked,
                    ]}
                    onPress={() => handleThemePress(theme.id, canSelect, theme.price)}
                    disabled={!canSelect && isSelected}
                  >
                    <View style={styles.themeInfo}>
                      <View style={styles.themeNameRow}>
                        <Text style={[styles.themeName, isSelected && styles.themeNameSelected]}>
                          {theme.name}
                        </Text>
                        {!canSelect && (
                          <Text style={styles.priceTag}>{priceText}</Text>
                        )}
                      </View>
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
                    {isSelected && canSelect && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                    {!canSelect && !isSelected && (
                      <View style={styles.lockIcon}>
                        <Text style={styles.lockText}>🔒</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Chain Highlight Color</Text>
            
            <View style={styles.highlightColorList}>
              {CHAIN_HIGHLIGHT_COLORS.map((colorOption) => {
                const isOwned = ownedColors.includes(colorOption.id);
                const isSelected = colorOption.value === chainHighlightColor;
                const isFree = colorOption.price === 0;
                const canSelect = isOwned || isFree;
                const priceText = `$${colorOption.price.toFixed(2)}`;
                
                return (
                  <TouchableOpacity
                    key={colorOption.id}
                    style={[
                      styles.colorOption,
                      isSelected && styles.colorOptionSelected,
                      !canSelect && styles.colorOptionLocked,
                    ]}
                    onPress={() => handleColorPress(colorOption.id, canSelect, colorOption.price)}
                    disabled={!canSelect && isSelected}
                  >
                    <View
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: colorOption.value },
                      ]}
                    />
                    <View style={styles.colorInfo}>
                      <Text style={[styles.colorName, isSelected && styles.colorNameSelected]}>
                        {colorOption.name}
                      </Text>
                      {!canSelect && (
                        <Text style={styles.priceTagSmall}>{priceText}</Text>
                      )}
                    </View>
                    {isSelected && canSelect && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                    {!canSelect && !isSelected && (
                      <View style={styles.lockIcon}>
                        <Text style={styles.lockText}>🔒</Text>
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
  themeOptionLocked: {
    opacity: 0.6,
  },
  themeInfo: {
    flex: 1,
  },
  themeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  themeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  themeNameSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  priceTag: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warning,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
  highlightColorList: {
    marginBottom: 8,
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  colorOptionLocked: {
    opacity: 0.6,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  colorInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  colorNameSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  priceTagSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
  lockIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  lockText: {
    fontSize: 18,
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
