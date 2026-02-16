
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
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
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ProductWithPrice {
  productId: string;
  displayName: string;
  price: number;
  priceString?: string;
  type: 'theme' | 'chainColor';
  pkg?: PurchasesPackage;
}

export default function ShopScreen() {
  const router = useRouter();
  const [ownedThemes, setOwnedThemes] = useState<string[]>(['theme_classic']);
  const [ownedColors, setOwnedColors] = useState<string[]>(['chain_gold']);
  const [equippedTheme, setEquippedTheme] = useState<string>('theme_classic');
  const [equippedColor, setEquippedColor] = useState<string>('#FFD700');
  const [activeTab, setActiveTab] = useState<'themes' | 'colors'>('themes');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  
  const [themesWithPrices, setThemesWithPrices] = useState<ProductWithPrice[]>([]);
  const [colorsWithPrices, setColorsWithPrices] = useState<ProductWithPrice[]>([]);

  useEffect(() => {
    console.log('[Shop] Screen mounted, loading ownership data and RevenueCat offerings');
    loadOwnershipAndOfferings();
  }, []);

  const loadOwnershipAndOfferings = async () => {
    try {
      setLoading(true);
      
      // Load local ownership
      const themes = await loadOwnedThemes();
      const colorIds = await loadOwnedColors();
      const currentTheme = await loadTheme();
      const currentColor = await loadChainHighlightColor();
      
      setOwnedThemes(themes);
      setOwnedColors(colorIds);
      setEquippedTheme(currentTheme || 'theme_classic');
      setEquippedColor(currentColor || '#FFD700');
      
      console.log('[Shop] Loaded local ownership:', { themes, colorIds, currentTheme, currentColor });
      
      // Fetch RevenueCat offerings
      console.log('[Shop] Fetching RevenueCat offerings...');
      const offerings = await Purchases.getOfferings();
      
      // Log all offering identifiers to confirm correct ones
      console.log('[Shop] Available offering identifiers:', Object.keys(offerings.all));
      
      // Map offerings to products
      const themesMap: { [key: string]: ProductWithPrice } = {};
      const colorsMap: { [key: string]: ProductWithPrice } = {};
      
      // Process all offerings
      Object.values(offerings.all).forEach((offering) => {
        console.log(`[Shop] Processing offering: ${offering.identifier} with ${offering.availablePackages.length} packages`);
        
        offering.availablePackages.forEach((pkg) => {
          const productId = pkg.storeProduct.identifier;
          console.log(`[Shop] Package product ID: ${productId}, price: ${pkg.storeProduct.priceString}`);
          
          if (productId.startsWith('theme_')) {
            const theme = THEMES[productId];
            if (theme) {
              themesMap[productId] = {
                productId,
                displayName: theme.displayName,
                price: theme.price,
                priceString: pkg.storeProduct.priceString,
                type: 'theme',
                pkg,
              };
            }
          } else if (productId.startsWith('chain_')) {
            const color = CHAIN_HIGHLIGHT_COLORS[productId];
            if (color) {
              colorsMap[productId] = {
                productId,
                displayName: color.displayName,
                price: color.price,
                priceString: pkg.storeProduct.priceString,
                type: 'chainColor',
                pkg,
              };
            }
          }
        });
      });
      
      // Merge with local product definitions (for items not in offerings)
      const allThemes = Object.values(THEMES).map((theme) => {
        const rcProduct = themesMap[theme.productId];
        return rcProduct || {
          productId: theme.productId,
          displayName: theme.displayName,
          price: theme.price,
          priceString: theme.price === 0 ? 'Free' : `$${theme.price.toFixed(2)}`,
          type: 'theme' as const,
        };
      });
      
      const allColors = Object.values(CHAIN_HIGHLIGHT_COLORS).map((color) => {
        const rcProduct = colorsMap[color.productId];
        return rcProduct || {
          productId: color.productId,
          displayName: color.displayName,
          price: color.price,
          priceString: color.price === 0 ? 'Free' : `$${color.price.toFixed(2)}`,
          type: 'chainColor' as const,
        };
      });
      
      setThemesWithPrices(allThemes);
      setColorsWithPrices(allColors);
      
      console.log('[Shop] Loaded themes with prices:', allThemes.length);
      console.log('[Shop] Loaded colors with prices:', allColors.length);
      
      // Sync ownership from RevenueCat
      await syncOwnershipFromRevenueCat();
      
    } catch (error) {
      console.error('[Shop] Error loading offerings:', error);
      Alert.alert('Error', 'Failed to load store items. Please try again.');
      
      // Fallback to local data
      const allThemes = Object.values(THEMES).map((theme) => ({
        productId: theme.productId,
        displayName: theme.displayName,
        price: theme.price,
        priceString: theme.price === 0 ? 'Free' : `$${theme.price.toFixed(2)}`,
        type: 'theme' as const,
      }));
      
      const allColors = Object.values(CHAIN_HIGHLIGHT_COLORS).map((color) => ({
        productId: color.productId,
        displayName: color.displayName,
        price: color.price,
        priceString: color.price === 0 ? 'Free' : `$${color.price.toFixed(2)}`,
        type: 'chainColor' as const,
      }));
      
      setThemesWithPrices(allThemes);
      setColorsWithPrices(allColors);
    } finally {
      setLoading(false);
    }
  };

  const syncOwnershipFromRevenueCat = async () => {
    try {
      console.log('[Shop] Syncing ownership from RevenueCat...');
      const customerInfo = await Purchases.getCustomerInfo();
      await updateOwnershipFromCustomerInfo(customerInfo);
    } catch (error) {
      console.error('[Shop] Error syncing ownership from RevenueCat:', error);
    }
  };

  const updateOwnershipFromCustomerInfo = async (customerInfo: CustomerInfo) => {
    const ownedThemeIds: string[] = ['theme_classic']; // Classic is always owned
    const ownedChainColorIds: string[] = ['chain_gold']; // Gold is always owned
    
    console.log('[Shop] Processing customer info for ownership...');
    console.log('[Shop] Non-subscription transactions:', customerInfo.nonSubscriptionTransactions.length);
    
    // Process non-subscription transactions for themes and chain colors
    customerInfo.nonSubscriptionTransactions.forEach((transaction) => {
      const productId = transaction.productIdentifier;
      console.log(`[Shop] Found purchased product: ${productId}`);
      
      if (productId.startsWith('theme_') && !ownedThemeIds.includes(productId)) {
        ownedThemeIds.push(productId);
      } else if (productId.startsWith('chain_') && !ownedChainColorIds.includes(productId)) {
        ownedChainColorIds.push(productId);
      }
    });
    
    console.log('[Shop] Updated owned themes:', ownedThemeIds);
    console.log('[Shop] Updated owned colors:', ownedChainColorIds);
    
    // Update state and storage
    setOwnedThemes(ownedThemeIds);
    setOwnedColors(ownedChainColorIds);
    await saveOwnedThemes(ownedThemeIds);
    await saveOwnedColors(ownedChainColorIds);
  };

  const handleBuyTheme = async (product: ProductWithPrice) => {
    if (!product.pkg) {
      console.log('[Shop] No RevenueCat package for theme:', product.productId);
      Alert.alert('Not Available', 'This item is not available for purchase at the moment.');
      return;
    }
    
    try {
      console.log(`[Shop] User tapped Buy for theme: ${product.productId}`);
      setPurchasing(product.productId);
      
      const { customerInfo } = await Purchases.purchasePackage(product.pkg);
      console.log('[Shop] Purchase successful, updating ownership...');
      
      await updateOwnershipFromCustomerInfo(customerInfo);
      
      Alert.alert('Success!', `${product.displayName} theme purchased successfully!`);
    } catch (error: any) {
      console.error('[Shop] Purchase error:', error);
      
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', error.message || 'Unable to complete purchase. Please try again.');
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleEquipTheme = async (themeId: string) => {
    console.log(`[Shop] User tapped Equip for theme: ${themeId}`);
    setEquippedTheme(themeId);
    await saveTheme(themeId);
    console.log(`[Shop] Theme ${themeId} equipped and saved to storage`);
  };

  const handleBuyColor = async (product: ProductWithPrice) => {
    if (!product.pkg) {
      console.log('[Shop] No RevenueCat package for color:', product.productId);
      Alert.alert('Not Available', 'This item is not available for purchase at the moment.');
      return;
    }
    
    try {
      console.log(`[Shop] User tapped Buy for color: ${product.productId}`);
      setPurchasing(product.productId);
      
      const { customerInfo } = await Purchases.purchasePackage(product.pkg);
      console.log('[Shop] Purchase successful, updating ownership...');
      
      await updateOwnershipFromCustomerInfo(customerInfo);
      
      Alert.alert('Success!', `${product.displayName} color purchased successfully!`);
    } catch (error: any) {
      console.error('[Shop] Purchase error:', error);
      
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', error.message || 'Unable to complete purchase. Please try again.');
      }
    } finally {
      setPurchasing(null);
    }
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

  const handleRestorePurchases = async () => {
    try {
      console.log('[Shop] User tapped Restore Purchases');
      setRestoring(true);
      
      const customerInfo = await Purchases.restorePurchases();
      console.log('[Shop] Restore successful, updating ownership...');
      
      await updateOwnershipFromCustomerInfo(customerInfo);
      
      Alert.alert('Restored!', 'Your purchases have been restored successfully.');
    } catch (error: any) {
      console.error('[Shop] Restore error:', error);
      Alert.alert('Restore Failed', error.message || 'Unable to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const tabTextThemes = 'Themes';
  const tabTextColors = 'Colors';
  const restoreButtonText = 'Restore Purchases';

  if (loading) {
    const loadingText = 'Loading Store...';
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen 
          options={{
            headerShown: true,
            title: 'Shop',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            {themesWithPrices.map((product) => {
              const theme = THEMES[product.productId];
              if (!theme) return null;
              
              const isOwned = ownedThemes.includes(product.productId);
              const isEquipped = equippedTheme === product.productId;
              const isPurchasing = purchasing === product.productId;
              const priceText = product.priceString || (product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`);
              const statusText = isEquipped ? 'Equipped' : (isOwned ? 'Owned' : priceText);
              
              return (
                <View key={product.productId} style={styles.itemCard}>
                  <View style={[styles.themePreview, { backgroundColor: theme.boardBackground }]}>
                    <View style={styles.themePreviewTiles}>
                      <View style={[styles.previewTile, { backgroundColor: theme.tileColors[2]?.[1] || theme.accentColor }]} />
                      <View style={[styles.previewTile, { backgroundColor: theme.tileColors[4]?.[1] || theme.accentColor }]} />
                      <View style={[styles.previewTile, { backgroundColor: theme.tileColors[8]?.[1] || theme.accentColor }]} />
                    </View>
                  </View>
                  
                  <Text style={styles.itemName}>{product.displayName}</Text>
                  
                  <View style={styles.itemActions}>
                    {!isOwned && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.buyButton]}
                        onPress={() => handleBuyTheme(product)}
                        disabled={isPurchasing}
                      >
                        {isPurchasing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <IconSymbol
                              ios_icon_name="cart.fill"
                              android_material_icon_name="shopping-cart"
                              size={16}
                              color="#FFFFFF"
                            />
                            <Text style={styles.buyButtonText}>{statusText}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                    
                    {isOwned && !isEquipped && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.equipButton]}
                        onPress={() => handleEquipTheme(product.productId)}
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
            {colorsWithPrices.map((product) => {
              const colorObj = CHAIN_HIGHLIGHT_COLORS[product.productId];
              if (!colorObj) return null;
              
              const isOwned = ownedColors.includes(product.productId);
              const isEquipped = equippedColor === colorObj.color;
              const isPurchasing = purchasing === product.productId;
              const priceText = product.priceString || (product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`);
              const statusText = isEquipped ? 'Equipped' : (isOwned ? 'Owned' : priceText);
              
              return (
                <View key={product.productId} style={styles.itemCard}>
                  <View style={[styles.colorPreview, { backgroundColor: colorObj.color }]} />
                  
                  <Text style={styles.itemName}>{product.displayName}</Text>
                  
                  <View style={styles.itemActions}>
                    {!isOwned && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.buyButton]}
                        onPress={() => handleBuyColor(product)}
                        disabled={isPurchasing}
                      >
                        {isPurchasing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <IconSymbol
                              ios_icon_name="cart.fill"
                              android_material_icon_name="shopping-cart"
                              size={16}
                              color="#FFFFFF"
                            />
                            <Text style={styles.buyButtonText}>{statusText}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                    
                    {isOwned && !isEquipped && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.equipButton]}
                        onPress={() => handleEquipColor(product.productId)}
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
        
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <IconSymbol
                ios_icon_name="arrow.clockwise"
                android_material_icon_name="refresh"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.restoreButtonText}>{restoreButtonText}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
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
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
});
