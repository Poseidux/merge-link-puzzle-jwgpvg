
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import {
  RC_OFFERING_ID,
  ALL_PACKAGE_IDS,
  PACKAGE_ID_TO_PRODUCT_ID,
  THEME_PACKAGE_IDS,
  CHAIN_PACKAGE_IDS,
} from '@/constants/RevenueCatProducts';
import Constants from 'expo-constants';
import { IconSymbol } from '@/components/IconSymbol';
import { SafeAreaView } from 'react-native-safe-area-context';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
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
  packageId: string;       // RevenueCat package identifier (e.g. "Volcano")
  productId: string;       // local product ID (e.g. "theme_volcano")
  storeProductId: string;  // App Store product identifier (e.g. "com.poseiduxfitness.numble.theme_volcano")
  displayName: string;
  price: number;
  priceString?: string;
  type: 'theme' | 'chainColor';
  pkg?: PurchasesPackage;
  isAvailable: boolean;
}

const FREE_THEME_ID = 'theme_classic';
const FREE_CHAIN_COLOR_ID = 'chain_gold';

// Retry a RevenueCat SDK call up to `maxAttempts` times with exponential backoff.
// StoreKit can return 0 products on the first call if it hasn't finished loading yet.
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 500,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * attempt;
        console.warn(`[Shop] RC call failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms…`, err);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ShopScreen() {
  const router = useRouter();
  const { revenueCatReady } = useContext(RevenueCatContext);

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [themes, setThemes] = useState<ProductWithPrice[]>([]);
  const [chainColors, setChainColors] = useState<ProductWithPrice[]>([]);

  const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(
    new Set([FREE_THEME_ID, FREE_CHAIN_COLOR_ID])
  );

  const [equippedTheme, setEquippedTheme] = useState<string>(FREE_THEME_ID);
  const [equippedColor, setEquippedColor] = useState<string>(FREE_CHAIN_COLOR_ID);

  // storeProductId -> localProductId reverse map, built from fetched packages
  const [storeProductIdToLocalId, setStoreProductIdToLocalId] = useState<Record<string, string>>({});

  const [debugInfo, setDebugInfo] = useState({
    allOfferingsCount: 0,
    currentOfferingId: '',
    selectedOfferingId: '',
    totalPackages: 0,
    packagesMissingStoreProduct: 0,
    themePackageCount: 0,
    chainPackageCount: 0,
    fetchedPackageIds: [] as string[],
    unmatchedPackageIds: [] as string[],
    missingPackageIds: [] as string[],
  });
  const [latestRevenueCatError, setLatestRevenueCatError] = useState('');

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

      const owned = new Set([FREE_THEME_ID, FREE_CHAIN_COLOR_ID, ...savedOwnedThemes, ...savedOwnedColors]);
      setOwnedProductIds(owned);
    } catch (error) {
      console.error('[Shop] Error loading local data:', error);
    }
  };

  // Defined before loadOwnershipAndOfferings so the dep chain is acyclic:
  // updateOwnershipFromCustomerInfo → syncOwnershipFromRevenueCat → loadOwnershipAndOfferings

  const updateOwnershipFromCustomerInfo = useCallback(async (customerInfo: CustomerInfo, storeIdMap?: Record<string, string>) => {
    // nonSubscriptionTransactions[].productIdentifier is the App Store product ID
    // (e.g. "com.poseiduxfitness.numble.theme_volcano"), NOT the local ID ("theme_volcano").
    // We resolve it via storeIdMap (built from fetched packages) or fall back to direct match.
    const resolvedMap = storeIdMap ?? storeProductIdToLocalId;

    const nonSubTransactions = customerInfo.nonSubscriptionTransactions ?? [];
    console.log(`[Shop] nonSubscriptionTransactions count: ${nonSubTransactions.length}`);

    const owned = new Set<string>([FREE_THEME_ID, FREE_CHAIN_COLOR_ID]);

    nonSubTransactions.forEach(tx => {
      const storeId = tx.productIdentifier;
      // Try resolving via the store->local map first, then fall back to direct local ID match
      const localId = resolvedMap[storeId] ?? storeId;
      console.log(`[Shop]   Non-subscription transaction: storeId="${storeId}" -> localId="${localId}"`);
      if (themeLookupMap.has(localId) || chainColorLookupMap.has(localId)) {
        owned.add(localId);
      }
    });

    // Also check allPurchasedProductIdentifiers as a fallback (same resolution logic)
    const allPurchased = customerInfo.allPurchasedProductIdentifiers ?? [];
    console.log(`[Shop] allPurchasedProductIdentifiers count: ${allPurchased.length}`);
    allPurchased.forEach(storeId => {
      const localId = resolvedMap[storeId] ?? storeId;
      if (themeLookupMap.has(localId) || chainColorLookupMap.has(localId)) {
        owned.add(localId);
      }
    });

    setOwnedProductIds(owned);

    const ownedThemeIds = Array.from(owned).filter(id => themeLookupMap.has(id));
    const ownedColorIds = Array.from(owned).filter(id => chainColorLookupMap.has(id));

    await Promise.all([
      saveOwnedThemes(ownedThemeIds),
      saveOwnedColors(ownedColorIds),
    ]);

    console.log('[Shop] Ownership updated — themes:', ownedThemeIds, '| colors:', ownedColorIds);
  }, [themeLookupMap, chainColorLookupMap, storeProductIdToLocalId]);

  const syncOwnershipFromRevenueCat = useCallback(async (storeIdMap?: Record<string, string>) => {
    try {
      console.log('[Shop] Fetching customer info for ownership sync');
      const customerInfo = await withRetry(() => Purchases.getCustomerInfo(), 3, 500);
      console.log('[Shop] Customer info fetched successfully');
      await updateOwnershipFromCustomerInfo(customerInfo, storeIdMap);
    } catch (error: any) {
      console.error('[Shop] Error syncing ownership:', error.message);
      setLatestRevenueCatError(error.message);
    }
  }, [updateOwnershipFromCustomerInfo]);

  const loadOwnershipAndOfferings = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    // Wait for RC to be configured (module-level configure in _layout.tsx)
    let configAttempts = 0;
    while (!Purchases.isConfigured() && configAttempts < 20) {
      await new Promise(r => setTimeout(r, 100));
      configAttempts++;
    }
    if (!Purchases.isConfigured()) {
      setErrorMessage('RevenueCat not configured. Please restart the app.');
      setLoading(false);
      return;
    }

    try {
      console.log('[Shop] Fetching RevenueCat offerings for offering:', RC_OFFERING_ID);
      const offerings = await withRetry(() => Purchases.getOfferings(), 3, 500);

      const selectedOffering = offerings.all[RC_OFFERING_ID] ?? offerings.current;

      const debugData = {
        allOfferingsCount: Object.keys(offerings.all).length,
        currentOfferingId: offerings.current?.identifier || '',
        selectedOfferingId: selectedOffering?.identifier || '',
        totalPackages: 0,
        packagesMissingStoreProduct: 0,
        themePackageCount: 0,
        chainPackageCount: 0,
        fetchedPackageIds: [] as string[],
        unmatchedPackageIds: [] as string[],
        missingPackageIds: [] as string[],
      };

      console.log('[Shop] All offerings:', Object.keys(offerings.all));
      console.log('[Shop] Selected offering:', selectedOffering?.identifier ?? 'none');

      if (!selectedOffering) {
        console.warn('[RevenueCat] No "themes" offering found and no current offering set');
        Alert.alert('Products unavailable', 'Products unavailable. Please try again later.');
        setErrorMessage('No offerings found. Check RevenueCat configuration.');
        setDebugInfo(debugData);
        setLoading(false);
        return;
      }

      const availablePackages = selectedOffering.availablePackages;
      debugData.totalPackages = availablePackages.length;

      console.log(`[Shop] Offerings loaded: ${availablePackages.length} packages found`);
      availablePackages.forEach(pkg => {
        console.log(`[Shop]   Package: "${pkg.identifier}" | Product: ${pkg.storeProduct?.productIdentifier ?? 'NO_STORE_PRODUCT'} | Price: ${pkg.storeProduct?.priceString ?? 'N/A'}`);
      });

      if (availablePackages.length === 0) {
        console.warn('[RevenueCat] ⚠️ StoreKit returned 0 products. Verify products exist in App Store Connect for bundle ID com.poseiduxfitness.numble and are approved/ready to submit.');
        setErrorMessage("No products loaded from Apple. Tap \"Retry\" or ensure all In-App Purchase products are Approved in App Store Connect.");
        setDebugInfo(debugData);
        setLoading(false);
        return;
      }

      // Build packageMap keyed by pkg.identifier (the RevenueCat package identifier)
      const packageMap: Record<string, PurchasesPackage> = {};
      const packagesMissingStoreProduct: string[] = [];

      availablePackages.forEach(pkg => {
        if (!pkg.storeProduct) {
          packagesMissingStoreProduct.push(pkg.identifier);
          console.warn('[Shop] Package missing storeProduct:', pkg.identifier);
          return;
        }
        packageMap[pkg.identifier] = pkg;
        console.log(`[Shop] Package lookup: "${pkg.identifier}" -> found`);
      });

      // Warn about any known package IDs that didn't come back from StoreKit
      const missingPackageIds = ALL_PACKAGE_IDS.filter(id => !packageMap[id]);
      if (missingPackageIds.length > 0) {
        console.warn('[RevenueCat] Package IDs in app but NOT returned by StoreKit:', missingPackageIds);
      }

      const fetchedPackageIds = Object.keys(packageMap);
      const unmatchedPackageIds: string[] = [];
      const themeItems: ProductWithPrice[] = [];
      const chainItems: ProductWithPrice[] = [];

      // Build storeProductId -> localProductId map so ownership checks work correctly.
      // nonSubscriptionTransactions[].productIdentifier returns the App Store product ID
      // (e.g. "com.poseiduxfitness.numble.theme_volcano"), NOT the local ID ("theme_volcano").
      const newStoreProductIdToLocalId: Record<string, string> = {};

      fetchedPackageIds.forEach(pkgId => {
        const pkg = packageMap[pkgId];
        const localProductId = PACKAGE_ID_TO_PRODUCT_ID[pkgId];

        if (!localProductId) {
          unmatchedPackageIds.push(pkgId);
          console.warn(`[Shop] Package "${pkgId}" has no local product ID mapping — skipping`);
          return;
        }

        const storeProductId = pkg.storeProduct.productIdentifier;
        newStoreProductIdToLocalId[storeProductId] = localProductId;
        console.log(`[Shop] Store product ID mapping: "${storeProductId}" -> "${localProductId}"`);

        const isTheme = (THEME_PACKAGE_IDS as readonly string[]).includes(pkgId);
        const isChain = (CHAIN_PACKAGE_IDS as readonly string[]).includes(pkgId);

        if (isTheme) {
          const themeData = themeLookupMap.get(localProductId);
          if (themeData) {
            themeItems.push({
              packageId: pkgId,
              productId: localProductId,
              storeProductId,
              displayName: pkg.storeProduct.title || themeData.displayName,
              price: pkg.storeProduct.price,
              priceString: pkg.storeProduct.priceString,
              type: 'theme',
              pkg,
              isAvailable: true,
            });
          }
        } else if (isChain) {
          const colorData = chainColorLookupMap.get(localProductId);
          if (colorData) {
            chainItems.push({
              packageId: pkgId,
              productId: localProductId,
              storeProductId,
              displayName: pkg.storeProduct.title || colorData.displayName,
              price: pkg.storeProduct.price,
              priceString: pkg.storeProduct.priceString,
              type: 'chainColor',
              pkg,
              isAvailable: true,
            });
          }
        }
      });

      setStoreProductIdToLocalId(newStoreProductIdToLocalId);
      console.log(`[Shop] Built storeProductId->localId map with ${Object.keys(newStoreProductIdToLocalId).length} entries`);

      debugData.packagesMissingStoreProduct = packagesMissingStoreProduct.length;
      debugData.themePackageCount = themeItems.length;
      debugData.chainPackageCount = chainItems.length;
      debugData.fetchedPackageIds = fetchedPackageIds;
      debugData.unmatchedPackageIds = unmatchedPackageIds;
      debugData.missingPackageIds = missingPackageIds;
      setDebugInfo(debugData);

      // Build complete product lists including local-only items (free + unavailable paid)
      const allThemes: ProductWithPrice[] = [];
      const allChainColors: ProductWithPrice[] = [];

      Object.values(THEMES).forEach(themeData => {
        const rcItem = themeItems.find(p => p.productId === themeData.productId);
        if (rcItem) {
          allThemes.push(rcItem);
        } else {
          const isFree = themeData.productId === FREE_THEME_ID;
          if (!isFree) {
            console.log(`[RevenueCat] No package found for productId: ${themeData.productId} — not shown as purchasable`);
          }
          allThemes.push({
            packageId: '',
            productId: themeData.productId,
            storeProductId: '',
            displayName: themeData.displayName,
            price: themeData.price || 0,
            type: 'theme',
            isAvailable: isFree,
          });
        }
      });

      Object.values(CHAIN_HIGHLIGHT_COLORS).forEach(colorData => {
        const rcItem = chainItems.find(p => p.productId === colorData.productId);
        if (rcItem) {
          allChainColors.push(rcItem);
        } else {
          const isFree = colorData.productId === FREE_CHAIN_COLOR_ID;
          if (!isFree) {
            console.log(`[RevenueCat] No package found for productId: ${colorData.productId} — not shown as purchasable`);
          }
          allChainColors.push({
            packageId: '',
            productId: colorData.productId,
            storeProductId: '',
            displayName: colorData.displayName,
            price: colorData.price || 0,
            type: 'chainColor',
            isAvailable: isFree,
          });
        }
      });

      setThemes(allThemes);
      setChainColors(allChainColors);

      console.log('[Shop] Syncing ownership from RevenueCat');
      // Pass the freshly-built map directly — state update from setStoreProductIdToLocalId
      // above is async and won't be visible yet when syncOwnershipFromRevenueCat runs.
      await syncOwnershipFromRevenueCat(newStoreProductIdToLocalId);
    } catch (error: any) {
      console.error('[Shop] Error loading offerings:', {
        message: error.message,
        code: error.code,
        readableErrorCode: error.readableErrorCode,
        underlyingErrorMessage: error.underlyingErrorMessage,
      });
      setErrorMessage(`Failed to load shop: ${error.message}`);
      setLatestRevenueCatError(error.message);
    } finally {
      setLoading(false);
      console.log('[Shop] Loading complete');
    }
  }, [themeLookupMap, chainColorLookupMap, syncOwnershipFromRevenueCat]);

  useEffect(() => {
    console.log('[Shop] Mounted — Platform:', Platform.OS);
    loadLocalDataOnly();
    loadOwnershipAndOfferings();
  }, [loadOwnershipAndOfferings]);

  const handleBuyItem = useCallback(async (product: ProductWithPrice) => {
    if (!Purchases.isConfigured()) {
      console.warn('[RevenueCat] Purchase attempted before SDK configured');
      Alert.alert('Not ready', 'Store is still initializing. Please try again in a moment.');
      return;
    }
    if (!product.pkg) {
      console.log(`[RevenueCat] No package found for productId: ${product.productId} — cannot purchase`);
      Alert.alert('Unavailable', 'This item is not available for purchase right now.');
      return;
    }

    console.log(`[RevenueCat] Purchasing package: "${product.packageId}" (productId: ${product.productId})`);
    setPurchasing(product.productId);
    setErrorMessage('');

    try {
      const { customerInfo } = await Purchases.purchasePackage(product.pkg);
      // Check ownership using the store product ID (what RC returns in nonSubscriptionTransactions)
      const ownedByStoreId = (customerInfo.nonSubscriptionTransactions ?? []).some(
        tx => tx.productIdentifier === product.storeProductId
      );
      // Also check local ID as fallback (in case store ID matches local ID directly)
      const ownedByLocalId = (customerInfo.nonSubscriptionTransactions ?? []).some(
        tx => tx.productIdentifier === product.productId
      );
      const owned = ownedByStoreId || ownedByLocalId;
      console.log(`[RevenueCat] Purchase success: "${product.packageId}" | storeProductId: ${product.storeProductId} | localProductId: ${product.productId} | in nonSubscriptionTransactions: ${owned}`);
      await updateOwnershipFromCustomerInfo(customerInfo);
      Alert.alert('Success', `${product.displayName} purchased!`);
    } catch (e: any) {
      console.log(`[RevenueCat] Purchase error for "${product.packageId}": ${e.message}`);
      if (!e.userCancelled) {
        const errMsg = e.readableErrorCode || e.message;
        setErrorMessage(`Purchase failed: ${errMsg}`);
        setLatestRevenueCatError(e.message);
        Alert.alert('Purchase Failed', errMsg);
      }
    } finally {
      setPurchasing(null);
    }
  }, [updateOwnershipFromCustomerInfo]);

  const handleEquipTheme = useCallback(async (productId: string) => {
    console.log('[Shop] Equipping theme:', productId);
    setEquippedTheme(productId);
    await saveTheme(productId);
  }, []);

  const handleEquipColor = useCallback(async (productId: string) => {
    console.log('[Shop] Equipping chain color:', productId);
    setEquippedColor(productId);
    await saveChainHighlightColor(productId);
  }, []);

  const handleRestorePurchases = useCallback(async () => {
    if (!Purchases.isConfigured()) {
      console.warn('[RevenueCat] Restore attempted before SDK configured');
      Alert.alert('Not ready', 'Store is still initializing. Please try again in a moment.');
      return;
    }
    console.log('[Shop] Restoring purchases');
    setRestoring(true);
    setErrorMessage('');

    try {
      const customerInfo = await Purchases.restorePurchases();
      const restoredCount = (customerInfo.nonSubscriptionTransactions ?? []).length;
      console.log(`[Shop] Restore success — ${restoredCount} non-subscription transactions found`);
      await updateOwnershipFromCustomerInfo(customerInfo);
      Alert.alert('Restored!', 'Your purchases have been restored.');
    } catch (e: any) {
      console.error('[Shop] Restore failed:', {
        message: e.message,
        code: e.code,
        readableErrorCode: e.readableErrorCode,
        underlyingErrorMessage: e.underlyingErrorMessage,
      });
      const errMsg = e.readableErrorCode || e.message;
      setErrorMessage(`Restore failed: ${errMsg}`);
      setLatestRevenueCatError(e.message);
      Alert.alert('Restore Failed', errMsg);
    } finally {
      setRestoring(false);
    }
  }, [updateOwnershipFromCustomerInfo]);

  const renderThemeCard = (product: ProductWithPrice) => {
    const themeData = themeLookupMap.get(product.productId);
    if (!themeData) return null;

    const isOwned = ownedProductIds.has(product.productId);
    const isEquipped = equippedTheme === product.productId;
    const isFree = product.productId === FREE_THEME_ID;
    const isPurchasing = purchasing === product.productId;

    const priceDisplay = isFree ? 'Free' : (product.priceString || `$${product.price}`);
    const buttonLabel = isEquipped ? 'Equipped' : (isOwned ? 'Equip' : priceDisplay);

    return (
      <View key={product.productId} style={styles.card}>
        <View style={[styles.themePreview, { backgroundColor: themeData.boardBackground }]}>
          <View style={[styles.previewTile, { backgroundColor: themeData.emptyCellColor }]} />
          <View style={[styles.previewTile, { backgroundColor: themeData.accentColor }]} />
        </View>
        <Text style={styles.cardTitle}>{product.displayName}</Text>
        {isOwned && (
          <View style={styles.ownedBadge}>
            <Text style={styles.ownedBadgeText}>Owned</Text>
          </View>
        )}
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
              handleBuyItem(product);
            }
          }}
          disabled={isPurchasing || purchasing !== null || (!product.isAvailable && !isOwned) || isEquipped}
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.buttonText, isEquipped && styles.buttonTextEquipped]}>
              {buttonLabel}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderChainColorCard = (product: ProductWithPrice) => {
    const colorData = chainColorLookupMap.get(product.productId);
    if (!colorData) return null;

    const isOwned = ownedProductIds.has(product.productId);
    const isEquipped = equippedColor === product.productId;
    const isFree = product.productId === FREE_CHAIN_COLOR_ID;
    const isPurchasing = purchasing === product.productId;

    const priceDisplay = isFree ? 'Free' : (product.priceString || `$${product.price}`);
    const buttonLabel = isEquipped ? 'Equipped' : (isOwned ? 'Equip' : priceDisplay);

    return (
      <View key={product.productId} style={styles.card}>
        <View style={[styles.colorPreview, { backgroundColor: colorData.color }]} />
        <Text style={styles.cardTitle}>{product.displayName}</Text>
        {isOwned && (
          <View style={styles.ownedBadge}>
            <Text style={styles.ownedBadgeText}>Owned</Text>
          </View>
        )}
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
              handleBuyItem(product);
            }
          }}
          disabled={isPurchasing || purchasing !== null || (!product.isAvailable && !isOwned) || isEquipped}
        >
          {isPurchasing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.buttonText, isEquipped && styles.buttonTextEquipped]}>
              {buttonLabel}
            </Text>
          )}
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
          <Text style={styles.debugText}>Missing storeProduct: {debugInfo.packagesMissingStoreProduct}</Text>
          <Text style={styles.debugText}>Theme Packages: {debugInfo.themePackageCount}</Text>
          <Text style={styles.debugText}>Chain Packages: {debugInfo.chainPackageCount}</Text>
          <Text style={styles.debugText}>Fetched IDs: {debugInfo.fetchedPackageIds.join(', ') || 'None'}</Text>
          <Text style={styles.debugText}>Unmatched IDs: {debugInfo.unmatchedPackageIds.join(', ') || 'None'}</Text>
          <Text style={styles.debugText}>Missing IDs: {debugInfo.missingPackageIds.join(', ') || 'None'}</Text>
          <Text style={styles.debugText}>RC Error: {latestRevenueCatError || 'None'}</Text>
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
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  console.log('[Shop] Retry button pressed — re-fetching offerings');
                  loadOwnershipAndOfferings();
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
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
            disabled={restoring || purchasing !== null}
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
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: colors.cardBackground,
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
    marginBottom: 6,
    textAlign: 'center',
  },
  ownedBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  ownedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
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
    backgroundColor: colors.success,
  },
  buttonDisabled: {
    backgroundColor: colors.textSecondary,
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
    backgroundColor: colors.primary,
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
