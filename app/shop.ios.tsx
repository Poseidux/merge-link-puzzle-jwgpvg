
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import Constants from 'expo-constants';
import { IconSymbol } from '@/components/IconSymbol';
import { SafeAreaView } from 'react-native-safe-area-context';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, THEMES, CHAIN_HIGHLIGHT_COLORS } from '@/styles/commonStyles';
import { RevenueCatContext } from '@/app/_layout';
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

const FREE_THEME_ID = 'theme_classic';
const FREE_CHAIN_COLOR_ID = 'chain_gold';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ShopScreen() {
  const router = useRouter();
  const { revenueCatReady } = useContext(RevenueCatContext);

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [themes, setThemes] = useState<ProductWithPrice[]>([]);
  const [chainColors, setChainColors] = useState<ProductWithPrice[]>([]);

  const [ownedThemes, setOwnedThemes] = useState<Set<string>>(new Set([FREE_THEME_ID]));
  const [ownedChainColors, setOwnedChainColors] = useState<Set<string>>(new Set([FREE_CHAIN_COLOR_ID]));

  const [equippedTheme, setEquippedTheme] = useState<string>(FREE_THEME_ID);
  const [equippedColor, setEquippedColor] = useState<string>(FREE_CHAIN_COLOR_ID);

  // Debug state
  const [debugInfo, setDebugInfo] = useState({
    allOfferingsCount: 0,
    currentOfferingId: '',
    selectedOfferingId: '',
    totalPackages: 0,
    packagesMissingStoreProduct: 0,
    themePackageCount: 0,
    chainPackageCount: 0,
    fetchedProductIds: [] as string[],
    unmatchedProductIds: [] as string[],
    missingLocalPaidIds: [] as string[],
  });
  const [latestRevenueCatError, setLatestRevenueCatError] = useState('');

  // Build lookup maps from Object.values
  const themeLookupMap = useMemo(() => {
    const map = new Map<string, typeof THEMES[keyof typeof THEMES]>();
    Object.values(THEMES).forEach(theme => {
      map.set(theme.productId, theme);
    });
    return map;
  }, []);

  const chainColorLookupMap = useMemo(() => {
    const map = new Map<string, typeof CHAIN_HIGHLIGHT_COLORS[keyof typeof CHAIN_HIGHLIGHT_COLORS]>();
    Object.values(CHAIN_HIGHLIGHT_COLORS).forEach(color => {
      map.set(color.productId, color);
    });
    return map;
  }, []);

  useEffect(() => {
    if (revenueCatReady) {
      loadLocalDataOnly();
      loadOwnershipAndOfferings();
    } else {
      setLoading(true);
    }
  }, [revenueCatReady]);

  const loadLocalDataOnly = async () => {
    try {
      const [savedTheme, savedColor, savedOwnedThemes, savedOwnedColors] = await Promise.all([
        loadTheme(),
        loadChainHighlightColor(),
        loadOwnedThemes(),
        loadOwnedColors(),
      ]);

      setEquippedTheme(savedTheme || FREE_THEME_ID);
      setEquippedColor(savedColor || FREE_CHAIN_COLOR_ID);

      const ownedThemesSet = new Set([FREE_THEME_ID, ...savedOwnedThemes]);
      const ownedColorsSet = new Set([FREE_CHAIN_COLOR_ID, ...savedOwnedColors]);

      setOwnedThemes(ownedThemesSet);
      setOwnedChainColors(ownedColorsSet);
    } catch (error) {
      console.error('[Shop] Error loading local data:', error);
    }
  };

  const loadOwnershipAndOfferings = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const offerings = await Purchases.getOfferings();

      // Use offerings.current (default offering) as primary source of truth
      const selectedOffering = offerings.current;

      const debugData = {
        allOfferingsCount: Object.keys(offerings.all).length,
        currentOfferingId: offerings.current?.identifier || '',
        selectedOfferingId: selectedOffering?.identifier || '',
        totalPackages: 0,
        packagesMissingStoreProduct: 0,
        themePackageCount: 0,
        chainPackageCount: 0,
        fetchedProductIds: [] as string[],
        unmatchedProductIds: [] as string[],
        missingLocalPaidIds: [] as string[],
      };

      if (!selectedOffering) {
        console.warn('[RevenueCat] offerings.current is null — no default offering configured');
        setErrorMessage('No offerings found. Check RevenueCat configuration.');
        setDebugInfo(debugData);
        setLoading(false);
        return;
      }

      const availablePackages = selectedOffering.availablePackages;
      debugData.totalPackages = availablePackages.length;

      console.log(`[RevenueCat] Offerings loaded: ${availablePackages.length} packages`);

      if (availablePackages.length === 0) {
        setErrorMessage('RevenueCat offering loaded, but Apple StoreKit returned zero products for this build. Check App Store Connect product state, sandbox/TestFlight availability, bundle id, and Apple review/submission state.');
        setDebugInfo(debugData);
        setLoading(false);
        return;
      }

      // Build packageMap keyed by storeProduct.identifier (exact product ID)
      const packageMap: Record<string, PurchasesPackage> = {};
      const packagesMissingStoreProduct: string[] = [];

      availablePackages.forEach(pkg => {
        if (!pkg.storeProduct) {
          packagesMissingStoreProduct.push(pkg.identifier);
          console.warn('[Shop] Package missing storeProduct:', pkg.identifier);
          return;
        }
        const productId = pkg.storeProduct.identifier;
        packageMap[productId] = pkg;
      });

      console.log('[RevenueCat] packageMap keys:', Object.keys(packageMap));

      const fetchedProductIds = Object.keys(packageMap);
      const unmatchedProductIds: string[] = [];

      const themePackages: ProductWithPrice[] = [];
      const chainPackages: ProductWithPrice[] = [];

      fetchedProductIds.forEach(productId => {
        const pkg = packageMap[productId];
        if (themeLookupMap.has(productId)) {
          const themeData = themeLookupMap.get(productId)!;
          themePackages.push({
            productId,
            displayName: themeData.displayName,
            price: pkg.storeProduct.price,
            priceString: pkg.storeProduct.priceString,
            type: 'theme',
            pkg,
            isAvailable: true,
          });
        } else if (chainColorLookupMap.has(productId)) {
          const colorData = chainColorLookupMap.get(productId)!;
          chainPackages.push({
            productId,
            displayName: colorData.displayName,
            price: pkg.storeProduct.price,
            priceString: pkg.storeProduct.priceString,
            type: 'chainColor',
            pkg,
            isAvailable: true,
          });
        } else {
          unmatchedProductIds.push(productId);
        }
      });

      debugData.packagesMissingStoreProduct = packagesMissingStoreProduct.length;
      debugData.themePackageCount = themePackages.length;
      debugData.chainPackageCount = chainPackages.length;
      debugData.fetchedProductIds = fetchedProductIds;
      debugData.unmatchedProductIds = unmatchedProductIds;

      // Build complete product lists including local-only items
      const allThemes: ProductWithPrice[] = [];
      const allChainColors: ProductWithPrice[] = [];
      const missingLocalPaidIds: string[] = [];

      Object.values(THEMES).forEach(themeData => {
        const rcItem = themePackages.find(p => p.productId === themeData.productId);
        if (rcItem) {
          allThemes.push(rcItem);
        } else {
          const isFree = themeData.productId === FREE_THEME_ID;
          if (!isFree) {
            console.log(`[RevenueCat] No package found for productId: ${themeData.productId}`);
            missingLocalPaidIds.push(themeData.productId);
          }
          allThemes.push({
            productId: themeData.productId,
            displayName: themeData.displayName,
            price: themeData.price || 0,
            type: 'theme',
            isAvailable: isFree,
          });
        }
      });

      Object.values(CHAIN_HIGHLIGHT_COLORS).forEach(colorData => {
        const rcItem = chainPackages.find(p => p.productId === colorData.productId);
        if (rcItem) {
          allChainColors.push(rcItem);
        } else {
          const isFree = colorData.productId === FREE_CHAIN_COLOR_ID;
          if (!isFree) {
            console.log(`[RevenueCat] No package found for productId: ${colorData.productId}`);
            missingLocalPaidIds.push(colorData.productId);
          }
          allChainColors.push({
            productId: colorData.productId,
            displayName: colorData.displayName,
            price: colorData.price || 0,
            type: 'chainColor',
            isAvailable: isFree,
          });
        }
      });

      debugData.missingLocalPaidIds = missingLocalPaidIds;
      setDebugInfo(debugData);

      setThemes(allThemes);
      setChainColors(allChainColors);

      if (packagesMissingStoreProduct.length > 0) {
        setErrorMessage('RevenueCat package missing store product data for this build.');
      }

      await syncOwnershipFromRevenueCat();
    } catch (error: any) {
      console.error('[Shop] Error loading offerings:', error);
      setErrorMessage(`Failed to load shop: ${error.message}`);
      setLatestRevenueCatError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const syncOwnershipFromRevenueCat = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      await updateOwnershipFromCustomerInfo(customerInfo);
    } catch (error: any) {
      console.error('[Shop] Error syncing ownership:', error);
      setLatestRevenueCatError(error.message);
    }
  };

  const updateOwnershipFromCustomerInfo = useCallback(async (customerInfo: CustomerInfo) => {
    const purchasedProductIds = customerInfo.allPurchasedProductIdentifiers;

    const ownedThemesSet = new Set<string>([FREE_THEME_ID]);
    const ownedColorsSet = new Set<string>([FREE_CHAIN_COLOR_ID]);

    purchasedProductIds.forEach(productId => {
      if (themeLookupMap.has(productId)) {
        ownedThemesSet.add(productId);
      } else if (chainColorLookupMap.has(productId)) {
        ownedColorsSet.add(productId);
      }
    });

    setOwnedThemes(ownedThemesSet);
    setOwnedChainColors(ownedColorsSet);

    await saveOwnedThemes(Array.from(ownedThemesSet));
    await saveOwnedColors(Array.from(ownedColorsSet));

    if (__DEV__) {
      console.log('[Shop] Ownership updated:', {
        ownedThemes: Array.from(ownedThemesSet),
        ownedColors: Array.from(ownedColorsSet),
      });
    }
  }, [themeLookupMap, chainColorLookupMap]);

  const handleBuyTheme = useCallback(async (product: ProductWithPrice) => {
    if (!product.pkg) {
      console.log(`[RevenueCat] No package found for productId: ${product.productId}`);
      Alert.alert('Unavailable', 'This item is not available for purchase right now.');
      return;
    }

    console.log(`[RevenueCat] Purchasing package: ${product.productId}`);
    setPurchasing(true);
    setErrorMessage('');

    try {
      const { customerInfo } = await Purchases.purchasePackage(product.pkg);
      const owned = customerInfo.allPurchasedProductIdentifiers.includes(product.productId);
      console.log(`[RevenueCat] Purchase success: ${product.productId} (in allPurchasedProductIdentifiers: ${owned})`);
      await updateOwnershipFromCustomerInfo(customerInfo);
      Alert.alert('Success', `${product.displayName} purchased!`);
    } catch (e: any) {
      console.log(`[RevenueCat] Purchase error: ${e.message}`);
      if (!e.userCancelled) {
        setErrorMessage(`Purchase failed: ${e.message}`);
        setLatestRevenueCatError(e.message);
        Alert.alert('Purchase Failed', e.message);
      }
    } finally {
      setPurchasing(false);
    }
  }, [updateOwnershipFromCustomerInfo]);

  const handleEquipTheme = useCallback(async (productId: string) => {
    setEquippedTheme(productId);
    await saveTheme(productId);
    if (__DEV__) {
      console.log('[Shop] Theme equipped:', productId);
    }
  }, []);

  const handleBuyColor = useCallback(async (product: ProductWithPrice) => {
    if (!product.pkg) {
      console.log(`[RevenueCat] No package found for productId: ${product.productId}`);
      Alert.alert('Unavailable', 'This item is not available for purchase right now.');
      return;
    }

    console.log(`[RevenueCat] Purchasing package: ${product.productId}`);
    setPurchasing(true);
    setErrorMessage('');

    try {
      const { customerInfo } = await Purchases.purchasePackage(product.pkg);
      const owned = customerInfo.allPurchasedProductIdentifiers.includes(product.productId);
      console.log(`[RevenueCat] Purchase success: ${product.productId} (in allPurchasedProductIdentifiers: ${owned})`);
      await updateOwnershipFromCustomerInfo(customerInfo);
      Alert.alert('Success', `${product.displayName} purchased!`);
    } catch (e: any) {
      console.log(`[RevenueCat] Purchase error: ${e.message}`);
      if (!e.userCancelled) {
        setErrorMessage(`Purchase failed: ${e.message}`);
        setLatestRevenueCatError(e.message);
        Alert.alert('Purchase Failed', e.message);
      }
    } finally {
      setPurchasing(false);
    }
  }, [updateOwnershipFromCustomerInfo]);

  const handleEquipColor = useCallback(async (productId: string) => {
    setEquippedColor(productId);
    await saveChainHighlightColor(productId);
    if (__DEV__) {
      console.log('[Shop] Chain color equipped:', productId);
    }
  }, []);

  const handleRestorePurchases = useCallback(async () => {
    setRestoring(true);
    setErrorMessage('');

    try {
      const customerInfo = await Purchases.restorePurchases();
      await updateOwnershipFromCustomerInfo(customerInfo);
      Alert.alert('Success', 'Purchases restored!');
    } catch (e: any) {
      if (__DEV__) {
        console.error('[Shop] Restore error:', {
          message: e.message,
          code: e.code,
          readableErrorCode: e.readableErrorCode,
          underlyingErrorMessage: e.underlyingErrorMessage,
          domain: e.domain,
        });
      }

      setErrorMessage(`Restore failed: ${e.message}`);
      setLatestRevenueCatError(e.message);
      Alert.alert('Restore Failed', e.message);
    } finally {
      setRestoring(false);
    }
  }, [updateOwnershipFromCustomerInfo]);

  const renderThemeCard = (product: ProductWithPrice) => {
    const themeData = themeLookupMap.get(product.productId);
    if (!themeData) {
      if (__DEV__) {
        console.warn('[Shop] Render lookup mismatch for theme:', product.productId);
      }
      return null;
    }

    const isOwned = ownedThemes.has(product.productId);
    const isEquipped = equippedTheme === product.productId;
    const isFree = product.productId === FREE_THEME_ID;

    const priceDisplay = isFree ? 'Free' : (product.priceString || `$${product.price}`);
    const buttonText = isEquipped ? 'Equipped' : (isOwned ? 'Equip' : priceDisplay);

    return (
      <View key={product.productId} style={styles.card}>
        <View style={[styles.themePreview, { backgroundColor: themeData.boardBackground }]}>
          <View style={[styles.previewTile, { backgroundColor: themeData.emptyCellColor }]} />
          <View style={[styles.previewTile, { backgroundColor: themeData.accentColor }]} />
        </View>
        <Text style={styles.cardTitle}>{product.displayName}</Text>
        <TouchableOpacity
          style={[
            styles.button,
            isEquipped && styles.buttonEquipped,
            !product.isAvailable && !isOwned && styles.buttonDisabled,
          ]}
          onPress={() => {
            if (isOwned) {
              handleEquipTheme(product.productId);
            } else if (product.isAvailable) {
              handleBuyTheme(product);
            }
          }}
          disabled={purchasing || (!product.isAvailable && !isOwned) || isEquipped}
        >
          <Text style={[styles.buttonText, isEquipped && styles.buttonTextEquipped]}>
            {buttonText}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderChainColorCard = (product: ProductWithPrice) => {
    const colorData = chainColorLookupMap.get(product.productId);
    if (!colorData) {
      if (__DEV__) {
        console.warn('[Shop] Render lookup mismatch for chain color:', product.productId);
      }
      return null;
    }

    const isOwned = ownedChainColors.has(product.productId);
    const isEquipped = equippedColor === product.productId;
    const isFree = product.productId === FREE_CHAIN_COLOR_ID;

    const priceDisplay = isFree ? 'Free' : (product.priceString || `$${product.price}`);
    const buttonText = isEquipped ? 'Equipped' : (isOwned ? 'Equip' : priceDisplay);

    return (
      <View key={product.productId} style={styles.card}>
        <View style={[styles.colorPreview, { backgroundColor: colorData.hex }]} />
        <Text style={styles.cardTitle}>{product.displayName}</Text>
        <TouchableOpacity
          style={[
            styles.button,
            isEquipped && styles.buttonEquipped,
            !product.isAvailable && !isOwned && styles.buttonDisabled,
          ]}
          onPress={() => {
            if (isOwned) {
              handleEquipColor(product.productId);
            } else if (product.isAvailable) {
              handleBuyColor(product);
            }
          }}
          disabled={purchasing || (!product.isAvailable && !isOwned) || isEquipped}
        >
          <Text style={[styles.buttonText, isEquipped && styles.buttonTextEquipped]}>
            {buttonText}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Shop',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {__DEV__ && (
        <View style={styles.debugBanner}>
          <Text style={styles.debugText}>RC Ready: {revenueCatReady ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>All Offerings: {debugInfo.allOfferingsCount}</Text>
          <Text style={styles.debugText}>Current Offering: {debugInfo.currentOfferingId || 'None'}</Text>
          <Text style={styles.debugText}>Selected Offering: {debugInfo.selectedOfferingId || 'None'}</Text>
          <Text style={styles.debugText}>Total Packages: {debugInfo.totalPackages}</Text>
          <Text style={styles.debugText}>Packages Missing storeProduct: {debugInfo.packagesMissingStoreProduct}</Text>
          <Text style={styles.debugText}>Theme Package Count: {debugInfo.themePackageCount}</Text>
          <Text style={styles.debugText}>Chain Package Count: {debugInfo.chainPackageCount}</Text>
          <Text style={styles.debugText}>Fetched Product IDs: {debugInfo.fetchedProductIds.join(', ') || 'None'}</Text>
          <Text style={styles.debugText}>Unmatched Product IDs: {debugInfo.unmatchedProductIds.join(', ') || 'None'}</Text>
          <Text style={styles.debugText}>Missing Local Paid IDs: {debugInfo.missingLocalPaidIds.join(', ') || 'None'}</Text>
          <Text style={styles.debugText}>Latest RevenueCat error: {latestRevenueCatError || 'None'}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading shop...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Themes</Text>
            <View style={styles.grid}>
              {themes.map(renderThemeCard)}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chain Highlight Colors</Text>
            <View style={styles.grid}>
              {chainColors.map(renderChainColorCard)}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.restoreButton, restoring && styles.buttonDisabled]}
            onPress={handleRestorePurchases}
            disabled={restoring || purchasing}
          >
            <Text style={styles.restoreButtonText}>
              {restoring ? 'Restoring...' : 'Restore Purchases'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  debugBanner: {
    backgroundColor: '#000',
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#ff0',
  },
  debugText: {
    color: '#0f0',
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#ff000020',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ff0000',
  },
  errorText: {
    color: '#ff0000',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  themePreview: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 8,
  },
  previewTile: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  colorPreview: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonEquipped: {
    backgroundColor: colors.success || '#4CAF50',
  },
  buttonDisabled: {
    backgroundColor: colors.disabled || '#ccc',
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextEquipped: {
    color: '#fff',
  },
  restoreButton: {
    backgroundColor: colors.secondary || colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  restoreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
