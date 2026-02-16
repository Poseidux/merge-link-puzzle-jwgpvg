
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, THEMES, CHAIN_HIGHLIGHT_COLORS } from '@/styles/commonStyles';
import { 
  loadOwnedThemes, 
  saveOwnedThemes, 
  loadOwnedColors, 
  saveOwnedColors,
  loadTheme,
  saveTheme,
  loadChainHighlightColor,
  saveChainHighlightColor,
} from '@/utils/storage';
import { IconSymbol } from '@/components/IconSymbol';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ShopScreen() {
  const router = useRouter();
  const [ownedThemes, setOwnedThemes] = useState<string[]>(['theme_classic']);
  const [ownedColors, setOwnedColors] = useState<string[]>(['chain_gold']);
  const [equippedTheme, setEquippedTheme] = useState<string>('theme_classic');
  const [equippedColor, setEquippedColor] = useState<string>('#FFD700');
  const [activeTab, setActiveTab] = useState<'themes' | 'colors'>('themes');

  useEffect(() => {
    console.log('[Shop] Screen mounted, loading ownership data');
    loadOwnership();
  }, []);

  const loadOwnership = async () => {
    const themes = await loadOwnedThemes();
    const colorIds = await loadOwnedColors();
    const currentTheme = await loadTheme();
    const currentColor = await loadChainHighlightColor();
    
    setOwnedThemes(themes);
    setOwnedColors(colorIds);
    setEquippedTheme(currentTheme || 'theme_classic');
    setEquippedColor(currentColor || '#FFD700');
    
    console.log('[Shop] Loaded ownership:', { themes, colorIds, currentTheme, currentColor });
  };

  const handleBuyTheme = async (themeId: string) => {
    console.log(`[Shop] User tapped Buy for theme: ${themeId}`);
    const updatedOwned = [...ownedThemes, themeId];
    setOwnedThemes(updatedOwned);
    await saveOwnedThemes(updatedOwned);
    console.log(`[Shop] Theme ${themeId} purchased`);
  };

  const handleEquipTheme = async (themeId: string) => {
    console.log(`[Shop] User tapped Equip for theme: ${themeId}`);
    setEquippedTheme(themeId);
    await saveTheme(themeId);
    console.log(`[Shop] Theme ${themeId} equipped and saved to storage`);
  };

  const handleBuyColor = async (colorId: string) => {
    console.log(`[Shop] User tapped Buy for color: ${colorId}`);
    const updatedOwned = [...ownedColors, colorId];
    setOwnedColors(updatedOwned);
    await saveOwnedColors(updatedOwned);
    console.log(`[Shop] Color ${colorId} purchased`);
  };

  const handleEquipColor = async (colorId: string) => {
    console.log(`[Shop] User tapped Equip for color: ${colorId}`);
    const colorObj = CHAIN_HIGHLIGHT_COLORS[colorId];
    if (colorObj) {
      setEquippedColor(colorObj.color);
      await saveChainHighlightColor(colorObj.color);
      console.log(`[Shop] Color ${colorId} (${colorObj.color}) equipped and saved to storage`);
    }
  };

  const themesList = Object.values(THEMES);
  const colorsList = Object.values(CHAIN_HIGHLIGHT_COLORS);

  const tabTextThemes = 'Themes';
  const tabTextColors = 'Colors';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Shop',
          headerBackTitle: 'Back',
        }}
      />
      
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'themes' && styles.tabActive]}
          onPress={() => setActiveTab('themes')}
        >
          <Text style={[styles.tabText, activeTab === 'themes' && styles.tabTextActive]}>
            {tabTextThemes}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'colors' && styles.tabActive]}
          onPress={() => setActiveTab('colors')}
        >
          <Text style={[styles.tabText, activeTab === 'colors' && styles.tabTextActive]}>
            {tabTextColors}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'themes' && (
          <View style={styles.grid}>
            {themesList.map((theme) => {
              const isOwned = ownedThemes.includes(theme.productId);
              const isEquipped = equippedTheme === theme.productId;
              const price = theme.price;
              const priceText = price === 0 ? 'Free' : `$${price.toFixed(2)}`;
              const statusText = isEquipped ? 'Equipped' : (isOwned ? 'Owned' : priceText);
              
              return (
                <View key={theme.productId} style={styles.itemCard}>
                  <View style={[styles.themePreview, { backgroundColor: theme.boardBackground }]}>
                    <View style={styles.themePreviewTiles}>
                      <View style={[styles.previewTile, { backgroundColor: theme.tileColors[2]?.[1] || theme.accentColor }]} />
                      <View style={[styles.previewTile, { backgroundColor: theme.tileColors[4]?.[1] || theme.accentColor }]} />
                      <View style={[styles.previewTile, { backgroundColor: theme.tileColors[8]?.[1] || theme.accentColor }]} />
                    </View>
                  </View>
                  
                  <Text style={styles.itemName}>{theme.displayName}</Text>
                  
                  <View style={styles.itemActions}>
                    {!isOwned && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.buyButton]}
                        onPress={() => handleBuyTheme(theme.productId)}
                      >
                        <IconSymbol
                          ios_icon_name="cart.fill"
                          android_material_icon_name="shopping-cart"
                          size={16}
                          color="#FFFFFF"
                        />
                        <Text style={styles.buyButtonText}>{statusText}</Text>
                      </TouchableOpacity>
                    )}
                    
                    {isOwned && !isEquipped && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.equipButton]}
                        onPress={() => handleEquipTheme(theme.productId)}
                      >
                        <Text style={styles.equipButtonText}>Equip</Text>
                      </TouchableOpacity>
                    )}
                    
                    {isEquipped && (
                      <View style={[styles.actionButton, styles.equippedButton]}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check-circle"
                          size={16}
                          color={colors.success}
                        />
                        <Text style={styles.equippedButtonText}>{statusText}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'colors' && (
          <View style={styles.grid}>
            {colorsList.map((colorObj) => {
              const isOwned = ownedColors.includes(colorObj.productId);
              const isEquipped = equippedColor === colorObj.color;
              const price = colorObj.price;
              const priceText = price === 0 ? 'Free' : `$${price.toFixed(2)}`;
              const statusText = isEquipped ? 'Equipped' : (isOwned ? 'Owned' : priceText);
              
              return (
                <View key={colorObj.productId} style={styles.itemCard}>
                  <View style={[styles.colorPreview, { backgroundColor: colorObj.color }]} />
                  
                  <Text style={styles.itemName}>{colorObj.displayName}</Text>
                  
                  <View style={styles.itemActions}>
                    {!isOwned && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.buyButton]}
                        onPress={() => handleBuyColor(colorObj.productId)}
                      >
                        <IconSymbol
                          ios_icon_name="cart.fill"
                          android_material_icon_name="shopping-cart"
                          size={16}
                          color="#FFFFFF"
                        />
                        <Text style={styles.buyButtonText}>{statusText}</Text>
                      </TouchableOpacity>
                    )}
                    
                    {isOwned && !isEquipped && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.equipButton]}
                        onPress={() => handleEquipColor(colorObj.productId)}
                      >
                        <Text style={styles.equipButtonText}>Equip</Text>
                      </TouchableOpacity>
                    )}
                    
                    {isEquipped && (
                      <View style={[styles.actionButton, styles.equippedButton]}>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check-circle"
                          size={16}
                          color={colors.success}
                        />
                        <Text style={styles.equippedButtonText}>{statusText}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  itemCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  themePreview: {
    width: '100%',
    height: 80,
    borderRadius: 12,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  themePreviewTiles: {
    flexDirection: 'row',
    gap: 6,
  },
  previewTile: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  colorPreview: {
    width: '100%',
    height: 80,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  itemActions: {
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  buyButton: {
    backgroundColor: colors.primary,
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  equipButton: {
    backgroundColor: colors.accent,
  },
  equipButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  equippedButton: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: 1.5,
    borderColor: colors.success,
  },
  equippedButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
});
