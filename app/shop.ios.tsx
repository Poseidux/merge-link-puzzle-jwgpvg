
import React, { useState, useEffect, useContext, useMemo } from 'react';
import Constants from 'expo-constants';
import { IconSymbol } from '@/components/IconSymbol';
import { SafeAreaView } from 'react-native-safe-area-context';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { RevenueCatContext } from '@/app/_layout';
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

interface ProductWithPrice {
  productId: string;
  displayName: string;
  price: number;
  priceString?: string;
  type: 'theme' | 'chainColor';
  pkg?: PurchasesPackage;
  isAvailable: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  buyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  equippedButton: {
    backgroundColor: colors.success,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  equippedButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ownedButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  ownedButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  unavailableButton: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  unavailableButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
  },
  restoreButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  debugBanner: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  debugText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#856404',
    lineHeight: 16,
  },
});

export default function ShopScreen() {
  const router = useRouter();
  const [revenueCatReady] = useContext(RevenueCatContext);
  
  const [activeTab, setActiveTab] = useState<'themes' | 'colors'>('themes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  
  const [themeProducts, setThemeProducts] = useState<ProductWithPrice[]>([]);
  const [colorProducts, setColorProducts] = useState<ProductWithPrice[]>([]);
  
  const [ownedThemes, setOwnedThemes] = useState<Set<string>>(new Set());
  const [ownedColors, setOwnedColors] = useState<Set<string>>(new Set());
  const [equippedTheme, setEquippedTheme] = useState<string>('classic');
  const [equippedColor, setEquippedColor] = useState<string>('gold');
  
  const [latestRevenueCatError, setLatestRevenueCatError] = useState<string | null>(null);

  // Lookup maps for local product definitions
  const themeLookupMap = useMemo(() => {
    const map = new Map<string, typeof THEMES[keyof typeof THEMES]>();
    Object.values(THEMES).forEach(theme => map.set(theme.productId, theme));
    return map;
  }, []);

  const chainColorLookupMap = useMemo(() => {
    const map = new Map<string, typeof CHAIN_HIGHLIGHT_COLORS[keyof typeof CHAIN_HIGHLIGHT_COLORS]>();
    Object.values(CHAIN_HIGHLIGHT_COLORS).forEach(color => map.set(color.productId, color));
    return map;
  }, []);

  useEffect(() => {
    loadLocalDataOnly();
    if (revenueCatReady) {
      loadOwnershipAndOfferings();
    }
  }, [revenueCatReady]);

  const loadLocalDataOnly = async () => {
    try {
      const savedTheme = await loadTheme();
      const savedColor = await loadChainHighlightColor();
      const savedOwnedThemes = await loadOwnedThemes();
      const savedOwnedColors = await loadOwnedColors();

      setEquippedTheme(savedTheme);
      setEquippedColor(savedColor);
      
      const ownedThemesSet = new Set(savedOwnedThemes);
      ownedThemesSet.add('classic');
      setOwnedThemes(ownedThemesSet);
      
      const ownedColorsSet = new Set(savedOwnedColors);
      ownedColorsSet.add('gold');
      setOwnedColors(ownedColorsSet);

      const themes: ProductWithPrice[] = Object.values(THEMES).map(theme => ({
        productId: theme.productId,
        displayName: theme.name,
        price: theme.price,
        type: 'theme' as const,
        isAvailable: theme.price === 0,
      }));

      const colors: ProductWithPrice[] = Object.values(CHAIN_HIGHLIGHT_COLORS).map(color => ({
        productId: color.productId,
        displayName: color.name,
        price: color.price,
        type: 'chainColor' as const,
        isAvailable: color.price === 0,
      }));

      setThemeProducts(themes);
      setColorProducts(colors);
    } catch (e) {
      console.error('[Shop] Error loading local data:', e);
    }
  };

  const loadOwnershipAndOfferings = async () => {
    if (!revenueCatReady) {
      setLoading(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Shop] Fetching RevenueCat offerings...');
      const fetchedOfferings = await Purchases.getOfferings();
      
      let selectedOffering = fetchedOfferings.all['themes'];
      if (!selectedOffering) {
        selectedOffering = fetchedOfferings.current;
      }

      if (!selectedOffering) {
        setError('No offerings found. Check RevenueCat configuration.');
        setLoading(false);
        return;
      }

      // NEW: Specific error message for empty availablePackages
      if (selectedOffering.availablePackages.length === 0) {
        setError('RevenueCat offering loaded, but Apple StoreKit returned zero products for this build. Check App Store Connect product state, sandbox/TestFlight availability, bundle id, and Apple review/submission state.');
        setLoading(false);
        
        // Still build debug info even with empty packages
        if (__DEV__) {
          const allOfferingIds = Object.keys(fetchedOfferings.all).join(', ') || 'NONE';
          const currentOfferingId = fetchedOfferings.current?.identifier || 'NONE';
          const selectedOfferingId = selectedOffering.identifier;
          
          let debugMessage = `RC Ready: ${revenueCatReady ? '✅' : '❌'}\n`;
          debugMessage += `All Offerings: [${allOfferingIds}]\n`;
          debugMessage += `Current Offering: ${currentOfferingId}\n`;
          debugMessage += `Selected Offering: ${selectedOfferingId}\n`;
          debugMessage += `Total Packages: 0\n`;
          debugMessage += `Theme Package Count: 0\n`;
          debugMessage += `Chain Package Count: 0\n`;
          debugMessage += `Fetched Product IDs: []\n`;
          debugMessage += `Unmatched Product IDs: []\n`;
          
          const missingLocalPaidIds: string[] = [];
          Object.values(THEMES).forEach(theme => {
            if (theme.price > 0) {
              missingLocalPaidIds.push(theme.productId);
            }
          });
          Object.values(CHAIN_HIGHLIGHT_COLORS).forEach(color => {
            if (color.price > 0) {
              missingLocalPaidIds.push(color.productId);
            }
          });
          
          if (missingLocalPaidIds.length > 0) {
            debugMessage += `Missing Local Paid IDs: [${missingLocalPaidIds.join(', ')}]\n`;
          }
          if (latestRevenueCatError) {
            debugMessage += `Latest RevenueCat error message: ${latestRevenueCatError}`;
          }
          
          setDebugInfo(debugMessage);
        }
        return;
      }

      const fetchedProductIds: string[] = [];
      const unmatchedProductIds: string[] = [];
      const missingLocalPaidIds: string[] = [];
      let themePackageCount = 0;
      let chainPackageCount = 0;

      const themesWithPackages: ProductWithPrice[] = [];
      const colorsWithPackages: ProductWithPrice[] = [];

      selectedOffering.availablePackages.forEach(pkg => {
        const productId = pkg.storeProduct.identifier;
        fetchedProductIds.push(productId);

        if (themeLookupMap.has(productId)) {
          const theme = themeLookupMap.get(productId)!;
          themesWithPackages.push({
            productId: theme.productId,
            displayName: theme.name,
            price: theme.price,
            priceString: pkg.storeProduct.priceString,
            type: 'theme',
            pkg,
            isAvailable: true,
          });
          themePackageCount++;
        } else if (chainColorLookupMap.has(productId)) {
          const color = chainColorLookupMap.get(productId)!;
          colorsWithPackages.push({
            productId: color.productId,
            displayName: color.name,
            price: color.price,
            priceString: pkg.storeProduct.priceString,
            type: 'chainColor',
            pkg,
            isAvailable: true,
          });
          chainPackageCount++;
        } else {
          unmatchedProductIds.push(productId);
          console.warn(`[Shop] ⚠️ RevenueCat returned unknown product ID: ${productId}`);
        }
      });

      Object.values(THEMES).forEach(theme => {
        if (theme.price > 0 && !themesWithPackages.find(p => p.productId === theme.productId)) {
          missingLocalPaidIds.push(theme.productId);
          themesWithPackages.push({
            productId: theme.productId,
            displayName: theme.name,
            price: theme.price,
            type: 'theme',
            isAvailable: false,
          });
        } else if (theme.price === 0 && !themesWithPackages.find(p => p.productId === theme.productId)) {
          themesWithPackages.push({
            productId: theme.productId,
            displayName: theme.name,
            price: theme.price,
            type: 'theme',
            isAvailable: true,
          });
        }
      });

      Object.values(CHAIN_HIGHLIGHT_COLORS).forEach(color => {
        if (color.price > 0 && !colorsWithPackages.find(p => p.productId === color.productId)) {
          missingLocalPaidIds.push(color.productId);
          colorsWithPackages.push({
            productId: color.productId,
            displayName: color.name,
            price: color.price,
            type: 'chainColor',
            isAvailable: false,
          });
        } else if (color.price === 0 && !colorsWithPackages.find(p => p.productId === color.productId)) {
          colorsWithPackages.push({
            productId: color.productId,
            displayName: color.name,
            price: color.price,
            type: 'chainColor',
            isAvailable: true,
          });
        }
      });

      setThemeProducts(themesWithPackages);
      setColorProducts(colorsWithPackages);

      await syncOwnershipFromRevenueCat();

      // Build debug info string
      if (__DEV__) {
        const allOfferingIds = Object.keys(fetchedOfferings.all).join(', ') || 'NONE';
        const currentOfferingId = fetchedOfferings.current?.identifier || 'NONE';
        const selectedOfferingId = selectedOffering.identifier;
        const totalPackages = selectedOffering.availablePackages.length;

        let debugMessage = `RC Ready: ${revenueCatReady ? '✅' : '❌'}\n`;
        debugMessage += `All Offerings: [${allOfferingIds}]\n`;
        debugMessage += `Current Offering: ${currentOfferingId}\n`;
        debugMessage += `Selected Offering: ${selectedOfferingId}\n`;
        debugMessage += `Total Packages: ${totalPackages}\n`;
        debugMessage += `Theme Package Count: ${themePackageCount}\n`;
        debugMessage += `Chain Package Count: ${chainPackageCount}\n`;
        debugMessage += `Fetched Product IDs: [${fetchedProductIds.join(', ')}]\n`;
        if (unmatchedProductIds.length > 0) {
          debugMessage += `Unmatched Product IDs: [${unmatchedProductIds.join(', ')}]\n`;
        }
        if (missingLocalPaidIds.length > 0) {
          debugMessage += `Missing Local Paid IDs: [${missingLocalPaidIds.join(', ')}]\n`;
        }
        if (latestRevenueCatError) {
          debugMessage += `Latest RevenueCat error message: ${latestRevenueCatError}`;
        }
        setDebugInfo(debugMessage);
      }

    } catch (e: any) {
      console.error('[Shop] Error fetching offerings:', e);
      const errorMessage = e.message || e.readableErrorCode || 'Unknown error';
      setError(`Failed to load store items: ${errorMessage}`);
      setLatestRevenueCatError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const syncOwnershipFromRevenueCat = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      await updateOwnershipFromCustomerInfo(customerInfo);
    } catch (e: any) {
      console.error('[Shop] Error syncing ownership:', e);
      setLatestRevenueCatError(e.message || e.readableErrorCode || 'Unknown error');
    }
  };

  const updateOwnershipFromCustomerInfo = async (customerInfo: CustomerInfo) => {
    const purchasedProductIds = customerInfo.allPurchasedProductIdentifiers;
    
    const newOwnedThemes = new Set<string>(['classic']);
    const newOwnedColors = new Set<string>(['gold']);

    purchasedProductIds.forEach(productId => {
      if (themeLookupMap.has(productId)) {
        newOwnedThemes.add(productId);
      } else if (chainColorLookupMap.has(productId)) {
        newOwnedColors.add(productId);
      }
    });

    setOwnedThemes(newOwnedThemes);
    setOwnedColors(newOwnedColors);

    await saveOwnedThemes(Array.from(newOwnedThemes));
    await saveOwnedColors(Array.from(newOwnedColors));

    if (__DEV__) {
      console.log(`[Shop] 🎫 Purchased Product IDs: [${purchasedProductIds.join(', ')}]`);
    }
  };

  const handleBuyTheme = async (product: ProductWithPrice) => {
    if (!product.pkg) {
      Alert.alert('Unavailable', 'This theme is not available for purchase.');
      return;
    }

    setLoading(true);
    try {
      await Purchases.purchasePackage(product.pkg);
      await syncOwnershipFromRevenueCat();
      Alert.alert('Success', `${product.displayName} theme purchased!`);
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error('[Shop] Purchase error:', e);
        const errorMessage = e.message || e.readableErrorCode || 'Unknown error';
        Alert.alert('Purchase Failed', errorMessage);
        setLatestRevenueCatError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEquipTheme = async (themeId: string) => {
    setEquippedTheme(themeId);
    await saveTheme(themeId);
    Alert.alert('Theme Equipped', `${themeLookupMap.get(themeId)?.name || themeId} is now active!`);
  };

  const handleBuyColor = async (product: ProductWithPrice) => {
    if (!product.pkg) {
      Alert.alert('Unavailable', 'This color is not available for purchase.');
      return;
    }

    setLoading(true);
    try {
      await Purchases.purchasePackage(product.pkg);
      await syncOwnershipFromRevenueCat();
      Alert.alert('Success', `${product.displayName} color purchased!`);
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error('[Shop] Purchase error:', e);
        const errorMessage = e.message || e.readableErrorCode || 'Unknown error';
        Alert.alert('Purchase Failed', errorMessage);
        setLatestRevenueCatError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEquipColor = async (colorId: string) => {
    setEquippedColor(colorId);
    await saveChainHighlightColor(colorId);
    Alert.alert('Color Equipped', `${chainColorLookupMap.get(colorId)?.name || colorId} is now active!`);
  };

  const handleRestorePurchases = async () => {
    setLoading(true);
    try {
      await Purchases.restorePurchases();
      await syncOwnershipFromRevenueCat();
      Alert.alert('Purchases Restored', 'Your previous purchases have been restored.');
    } catch (e: any) {
      console.error('[Shop] Restore error:', e);
      const errorMessage = e.message || e.readableErrorCode || 'Unknown error';
      Alert.alert('Restore Failed', errorMessage);
      setLatestRevenueCatError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !revenueCatReady) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 16 }}>Initializing store...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        {__DEV__ && debugInfo && (
          <View style={styles.debugBanner}>
            <Text style={styles.debugText}>{debugInfo}</Text>
          </View>
        )}
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOwnershipAndOfferings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentProducts = activeTab === 'themes' ? themeProducts : colorProducts;
  const currentOwned = activeTab === 'themes' ? ownedThemes : ownedColors;
  const currentEquipped = activeTab === 'themes' ? equippedTheme : equippedColor;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Shop</Text>
        <Text style={styles.subtitle}>Customize your game experience</Text>
      </View>

      {__DEV__ && debugInfo && (
        <View style={styles.debugBanner}>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
      )}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'themes' && styles.tabActive]}
          onPress={() => setActiveTab('themes')}
        >
          <Text style={[styles.tabText, activeTab === 'themes' && styles.tabTextActive]}>
            Themes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'colors' && styles.tabActive]}
          onPress={() => setActiveTab('colors')}
        >
          <Text style={[styles.tabText, activeTab === 'colors' && styles.tabTextActive]}>
            Chain Colors
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {currentProducts.map((product, index) => {
          const isOwned = currentOwned.has(product.productId);
          const isEquipped = currentEquipped === product.productId;
          const isFree = product.price === 0;

          return (
            <View key={index} style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.displayName}</Text>
                <Text style={styles.productPrice}>
                  {isFree ? 'Free' : product.priceString || `$${product.price.toFixed(2)}`}
                </Text>
              </View>
              
              {isEquipped ? (
                <View style={styles.equippedButton}>
                  <Text style={styles.equippedButtonText}>Equipped</Text>
                </View>
              ) : isOwned ? (
                <TouchableOpacity
                  style={styles.ownedButton}
                  onPress={() => {
                    if (activeTab === 'themes') {
                      handleEquipTheme(product.productId);
                    } else {
                      handleEquipColor(product.productId);
                    }
                  }}
                >
                  <Text style={styles.ownedButtonText}>Equip</Text>
                </TouchableOpacity>
              ) : product.isAvailable ? (
                <TouchableOpacity
                  style={styles.buyButton}
                  onPress={() => {
                    if (activeTab === 'themes') {
                      handleBuyTheme(product);
                    } else {
                      handleBuyColor(product);
                    }
                  }}
                >
                  <Text style={styles.buyButtonText}>
                    {isFree ? 'Get' : 'Buy'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.unavailableButton}>
                  <Text style={styles.unavailableButtonText}>Unavailable</Text>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
      </ScrollView>

      {loading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}
