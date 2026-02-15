
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
import { formatTileValue } from '@/utils/gameLogic';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Pricing for themes and colors
const THEME_PRICES: { [key: string]: number } = {
  classic: 0,
  ocean: 500,
  sunset: 500,
  forest: 500,
  midnight: 750,
  candy: 500,
  neon: 750,
  autumn: 500,
  arctic: 500,
  volcano: 750,
  aurora: 1000,
  coralreef: 1000,
  desertdusk: 1000,
  royalvelvet: 1000,
  sakura: 1000,
  copperteal: 1000,
  prismpop: 1000,
  icefire: 1000,
  retroarcade: 1000,
  monochromeglass: 1000,
  lagoon: 1000,
  tropical: 1000,
  spring: 750,
  sorbet: 750,
  sunrise: 750,
  cottoncandy: 750,
};

const COLOR_PRICES: { [key: string]: number } = {
  'Gold': 0,
  'Electric Blue': 200,
  'Hot Pink': 200,
  'Lime Green': 200,
  'Orange': 200,
  'Purple': 200,
  'Crimson': 300,
  'Turquoise': 300,
  'Amber': 300,
  'Neon Green': 300,
  'Magenta': 300,
  'Cyan': 300,
};

export default function ShopScreen() {
  const router = useRouter();
  const [ownedThemes, setOwnedThemes] = useState<string[]>(['classic']);
  const [ownedColors, setOwnedColors] = useState<string[]>(['Gold']);
  const [equippedTheme, setEquippedTheme] = useState<string>('classic');
  const [equippedColor, setEquippedColor] = useState<string>('Gold');
  const [activeTab, setActiveTab] = useState<'themes' | 'colors'>('themes');

  useEffect(() => {
    console.log('Shop screen mounted, loading ownership data');
    loadOwnership();
  }, []);

  const loadOwnership = async () => {
    const themes = await loadOwnedThemes();
    const colors = await loadOwnedColors();
    const currentTheme = await loadTheme();
    const currentColor = await loadChainHighlightColor();
    
    setOwnedThemes(themes);
    setOwnedColors(colors);
    setEquippedTheme(currentTheme || 'classic');
    setEquippedColor(currentColor || 'Gold');
    
    console.log('[Shop] Loaded ownership:', { themes, colors, currentTheme, currentColor });
  };

  const handleBuyTheme = async (themeId: string) => {
    console.log(`User tapped Buy for theme: ${themeId}`);
    // In a real app, this would deduct currency. For now, just grant ownership.
    const updatedOwned = [...ownedThemes, themeId];
    setOwnedThemes(updatedOwned);
    await saveOwnedThemes(updatedOwned);
    console.log(`[Shop] Theme ${themeId} purchased`);
  };

  const handleEquipTheme = async (themeId: string) => {
    console.log(`User tapped Equip for theme: ${themeId}`);
    setEquippedTheme(themeId);
    await saveTheme(themeId);
    console.log(`[Shop] Theme ${themeId} equipped`);
  };

  const handleBuyColor = async (colorName: string) => {
    console.log(`User tapped Buy for color: ${colorName}`);
    const updatedOwned = [...ownedColors, colorName];
    setOwnedColors(updatedOwned);
    await saveOwnedColors(updatedOwned);
    console.log(`[Shop] Color ${colorName} purchased`);
  };

  const handleEquipColor = async (colorName: string) => {
    console.log(`User tapped Equip for color: ${colorName}`);
    const colorObj = CHAIN_HIGHLIGHT_COLORS.find(c => c.name === colorName);
    if (colorObj) {
      setEquippedColor(colorName);
      await saveChainHighlightColor(colorObj.value);
      console.log(`[Shop] Color ${colorName} equipped`);
    }
  };

  const handleBack = () => {
    console.log('User tapped Back button - navigating to home');
    router.back();
  };

  const themesList = Object.values(THEMES);
  const colorsList = CHAIN_HIGHLIGHT_COLORS;

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
              const isOwned = ownedThemes.includes(theme.id);
              const isEquipped = equippedTheme === theme.id;
              const price = THEME_PRICES[theme.id] || 0;
              const priceText = formatTileValue(price);
              const statusText = isEquipped ? 'Equipped' : (isOwned ? 'Owned' : `${priceText}`);
              
              return (
                <View key={theme.id} style={styles.itemCard}>
                  <View style={[styles.themePreview, { backgroundColor: theme.boardBackground }]}>
                    <View style={styles.themePreviewTiles}>
                      <View style={[styles.previewTile, { backgroundColor: theme.tileColors[2]?.[1] || theme.accentColor }]} />
                      <View style={[styles.previewTile, { backgroundColor: theme.tileColors[4]?.[1] || theme.accentColor }]} />
                      <View style={[styles.previewTile, { backgroundColor: theme.tileColors[8]?.[1] || theme.accentColor }]} />
                    </View>
                  </View>
                  
                  <Text style={styles.itemName}>{theme.name}</Text>
                  
                  <View style={styles.itemActions}>
                    {!isOwned && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.buyButton]}
                        onPress={() => handleBuyTheme(theme.id)}
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
                        onPress={() => handleEquipTheme(theme.id)}
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
              const isOwned = ownedColors.includes(colorObj.name);
              const isEquipped = equippedColor === colorObj.name;
              const price = COLOR_PRICES[colorObj.name] || 0;
              const priceText = formatTileValue(price);
              const statusText = isEquipped ? 'Equipped' : (isOwned ? 'Owned' : `${priceText}`);
              
              return (
                <View key={colorObj.name} style={styles.itemCard}>
                  <View style={[styles.colorPreview, { backgroundColor: colorObj.value }]} />
                  
                  <Text style={styles.itemName}>{colorObj.name}</Text>
                  
                  <View style={styles.itemActions}>
                    {!isOwned && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.buyButton]}
                        onPress={() => handleBuyColor(colorObj.name)}
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
                        onPress={() => handleEquipColor(colorObj.name)}
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
