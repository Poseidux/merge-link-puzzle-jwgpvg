
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
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
import Constants from 'expo-constants';
import { RevenueCatContext } from '@/app/_layout';
import {
  RC_OFFERING_ID,
  ALL_PACKAGE_IDS,
  PACKAGE_ID_TO_PRODUCT_ID,
  THEME_PACKAGE_IDS,
  CHAIN_PACKAGE_IDS,
} from '@/constants/RevenueCatProducts';

const SCREEN_WIDTH = Dimensions.get('window').width;

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

export default function ShopScreen() {
  const router = useRouter();
  const { revenueCatReady } = useContext(RevenueCatContext);

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresDevBuild, setRequiresDevBuild] = useState(false);

  const [themes, setThemes] = useState<ProductWithPrice[]>([]);
  const [chainColors, setChainColors] = useState<ProductWithPrice[]>([]);

  const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(
    new Set([FREE_THEME_ID, FREE_CHAIN_COLOR_ID])
  );
  const [equippedTheme, setEquippedTheme] = useState<string>(FREE_THEME_ID);
  const [equippedColor, setEquippedColor] = useState<string>(FREE_CHAIN_COLOR_ID);

  const [activeTab, setActiveTab] = useState<'themes' | 'colors'>('themes');

  // storeProductId -> localProductId reverse map, built from fetched packages
  const [storeProductIdToLocalId, setStoreProductIdToLocalId] = useState<Record<string, string>>({});

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
    console.log('=== Shop Screen Mounted ===');
    console.log('[Shop] Platform:', Platform.OS);
    console.log('[Shop] Is Expo Go:', Constants.appOwnership === 'expo');
    console.log('[Shop] RevenueCat ready:', revenueCatReady);

    if (Platform.OS === 'web') {
      console.error('[Shop] Running on WEB — RevenueCat does NOT work on web');
      setRequiresDevBuild(true);
      setErrorMessage('RevenueCat in-app purchases only work on iOS and Android devices, not in web browsers.');
      loadLocalDataOnly();
      return;
    }

    if (Constants.appOwnership === 'expo') {
      console.error('[Shop] Running in EXPO GO — RevenueCat does NOT work in Expo Go');
      setRequiresDevBuild(true);
      setErrorMessage('RevenueCat requires a custom development build. Expo Go cannot process real in-app purchases.');
      loadLocalDataOnly();
      return;
    }

    if (!revenueCatReady) {
      setLoading(true);
      return;
    }

    loadLocalDataOnly();
    loadOwnershipAndOfferings();
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

      const owned = new Set([FREE_THEME_ID, FREE_CHAIN_COLOR_ID, ...savedOwnedThemes, ...savedOwnedColors]);
      setOwnedProductIds(owned);

      // Build fallback product lists (no RC prices)
      const allThemes: ProductWithPrice[] = Object.values(THEMES).map(theme => ({
        packageId: '',
        productId: theme.productId,
        storeProductId: '',
        displayName: theme.displayName,
        price: theme.price,
        priceString: theme.price === 0 ? 'Free' : `$${theme.price.toFixed(2)}`,
        type: 'theme' as const,
        isAvailable: theme.price === 0,
      }));

      const allColors: ProductWithPrice[] = Object.values(CHAIN_HIGHLIGHT_COLORS).map(color => ({
        packageId: '',
        productId: color.productId,
        storeProductId: '',
        displayName: color.displayName,
        price: color.price,
        priceString: color.price === 0 ? 'Free' : `$${color.price.toFixed(2)}`,
        type: 'chainColor' as const,
        isAvailable: color.price === 0,
      }));

      setThemes(allThemes);
      setChainColors(allColors);
    } catch (error) {
      console.error('[Shop] Error loading local data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOwnershipAndOfferings = async () => {
    setLoading(true);
    setErrorMessage(null);

    if (!Purchases.isConfigured()) {
      console.warn('[RevenueCat] getOfferings attempted before SDK configured');
      setErrorMessage('Store is still initializing. Please try again in a moment.');
      setLoading(false);
      return;
    }

    try {
      console.log('[Shop] Fetching RevenueCat offerings for offering:', RC_OFFERING_ID);
      const offerings = await Purchases.getOfferings();

      const selectedOffering = offerings.all[RC_OFFERING_ID] ?? offerings.current;

      console.log('[Shop] All offerings:', Object.keys(offerings.all));
      console.log('[Shop] Selected offering:', selectedOffering?.identifier ?? 'none');

      if (!selectedOffering) {
        console.warn('[RevenueCat] No "themes" offering found and no current offering set');
        Alert.alert('Products unavailable', 'Products unavailable. Please try again later.');
        setErrorMessage('No offerings found. Check RevenueCat configuration.');
        setLoading(false);
        return;
      }

      const availablePackages = selectedOffering.availablePackages;
      console.log(`[Shop] Offerings loaded: ${availablePackages.length} packages found`);
      availablePackages.forEach(pkg => {
        console.log(`[Shop]   Package: "${pkg.identifier}" | Product: ${pkg.storeProduct?.productIdentifier ?? 'NO_STORE_PRODUCT'} | Price: ${pkg.storeProduct?.priceString ?? 'N/A'}`);
      });

      if (availablePackages.length === 0) {
        console.warn('[RevenueCat] ⚠️ StoreKit returned 0 products. Verify products exist in App Store Connect for bundle ID com.poseiduxfitness.numble and are approved/ready to submit.');
        Alert.alert('Products unavailable', 'Products unavailable. Please try again later.');
        setErrorMessage('No products loaded from Apple. Ensure all In-App Purchase products are Approved in App Store Connect.');
        setLoading(false);
        return;
      }

      // Build packageMap keyed by pkg.identifier (the RevenueCat package identifier)
      const packageMap: Record<string, PurchasesPackage> = {};

      availablePackages.forEach(pkg => {
        if (!pkg.storeProduct) {
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
            priceString: themeData.price === 0 ? 'Free' : `$${themeData.price.toFixed(2)}`,
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
            priceString: colorData.price === 0 ? 'Free' : `$${colorData.price.toFixed(2)}`,
            type: 'chainColor',
            isAvailable: isFree,
          });
        }
      });

      setThemes(allThemes);
      setChainColors(allChainColors);

      console.log('[Shop] Syncing ownership from RevenueCat');
      // Pass the freshly-built map directly — state update is async and won't be visible yet.
      await syncOwnershipFromRevenueCat(newStoreProductIdToLocalId);
    } catch (error: any) {
      console.error('[Shop] Error loading offerings:', {
        message: error.message,
        code: error.code,
        readableErrorCode: error.readableErrorCode,
        underlyingErrorMessage: error.underlyingErrorMessage,
      });
      setErrorMessage(`Failed to load store: ${error.readableErrorCode || error.message}`);
    } finally {
      setLoading(false);
      console.log('=== Shop Loading Complete ===');
    }
  };

  const syncOwnershipFromRevenueCat = async (storeIdMap?: Record<string, string>) => {
    try {
      console.log('[Shop] Fetching customer info for ownership sync');
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('[Shop] Customer info fetched successfully');
      await updateOwnershipFromCustomerInfo(customerInfo, storeIdMap);
    } catch (error: any) {
      console.error('[Shop] Error syncing ownership:', error.message);
    }
  };

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

  const handleBuyItem = useCallback(async (product: ProductWithPrice) => {
    if (!product.pkg) {
      console.log(`[RevenueCat] No package found for productId: ${product.productId} — cannot purchase`);
      Alert.alert('Unavailable', 'This item is not available for purchase right now.');
      return;
    }

    console.log(`[RevenueCat] Purchasing package: "${product.packageId}" (productId: ${product.productId}, storeProductId: ${product.storeProductId})`);
    setPurchasing(product.productId);

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
      Alert.alert('Success!', `${product.displayName} purchased!`);
    } catch (error: any) {
      console.log(`[RevenueCat] Purchase error for "${product.packageId}": ${error.message}`);
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', error.readableErrorCode || error.message);
      }
    } finally {
      setPurchasing(null);
    }
  }, [updateOwnershipFromCustomerInfo]);

  const handleEquipTheme = useCallback(async (themeId: string) => {
    console.log('[Shop] Equipping theme:', themeId);
    setEquippedTheme(themeId);
    await saveTheme(themeId);
  }, []);

  const handleEquipColor = useCallback(async (colorId: string) => {
    console.log('[Shop] Equipping chain color:', colorId);
    setEquippedColor(colorId);
    await saveChainHighlightColor(colorId);
  }, []);

  const handleRestorePurchases = useCallback(async () => {
    console.log('[Shop] Restoring purchases');
    setRestoring(true);

    try {
      const customerInfo = await Purchases.restorePurchases();
      const restoredCount = (customerInfo.nonSubscriptionTransactions ?? []).length;
      console.log(`[Shop] Restore success — ${restoredCount} non-subscription transactions found`);
      await updateOwnershipFromCustomerInfo(customerInfo);
      Alert.alert('Restored!', 'Your purchases have been restored.');
    } catch (error: any) {
      console.error('[Shop] Restore failed:', {
        message: error.message,
        code: error.code,
        readableErrorCode: error.readableErrorCode,
        underlyingErrorMessage: error.underlyingErrorMessage,
      });
      Alert.alert('Restore Failed', error.readableErrorCode || error.message);
    } finally {
      setRestoring(false);
    }
  }, [updateOwnershipFromCustomerInfo]);

  const tabTextThemes = 'Themes';
  const tabTextColors = 'Colors';
  const restoreButtonText = 'Restore Purchases';

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: true, title: 'Shop', headerBackTitle: 'Back' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Store...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (requiresDevBuild) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: true, title: 'Shop', headerBackTitle: 'Back' }} />
        <ScrollView contentContainerStyle={styles.requiresDevBuildContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={64}
            color="#FF9500"
          />
          <Text style={styles.requiresDevBuildTitle}>Development Build Required</Text>
          <Text style={styles.requiresDevBuildMessage}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.requiresDevBuildContinueButton}
            onPress={() => {
              console.log('[Shop] Continue browsing pressed (dev build warning dismissed)');
              setRequiresDevBuild(false);
              setErrorMessage(null);
            }}
          >
            <Text style={styles.requiresDevBuildContinueButtonText}>Continue Browsing</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: true, title: 'Shop', headerBackTitle: 'Back' }} />

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'themes' && styles.tabActive]}
          onPress={() => {
            console.log('[Shop] Tab pressed: Themes');
            setActiveTab('themes');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'themes' && styles.tabTextActive]}>
            {tabTextThemes}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'colors' && styles.tabActive]}
          onPress={() => {
            console.log('[Shop] Tab pressed: Colors');
            setActiveTab('colors');
          }}
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
            {themes.map(product => {
              const theme = THEMES[product.productId];
              if (!theme) return null;

              const isOwned = ownedProductIds.has(product.productId);
              const isEquipped = equippedTheme === product.productId;
              const isPurchasing = purchasing === product.productId;
              const isFree = product.productId === FREE_THEME_ID;
              const priceText = isFree ? 'Free' : (product.priceString || `$${Number(product.price).toFixed(2)}`);
              const statusText = isEquipped ? 'Equipped' : (isOwned ? 'Owned' : (product.isAvailable ? priceText : 'Unavailable'));

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

                  {isOwned && !isEquipped && (
                    <View style={styles.ownedBadge}>
                      <Text style={styles.ownedBadgeText}>Owned</Text>
                    </View>
                  )}

                  <View style={styles.itemActions}>
                    {!isOwned && product.isAvailable && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.buyButton]}
                        onPress={() => handleBuyItem(product)}
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
                            <Text style={styles.buyButtonText}>{priceText}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {!isOwned && !product.isAvailable && (
                      <View style={[styles.actionButton, styles.unavailableButton]}>
                        <Text style={styles.unavailableButtonText}>{statusText}</Text>
                      </View>
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
            {chainColors.map(product => {
              const colorObj = CHAIN_HIGHLIGHT_COLORS[product.productId];
              if (!colorObj) return null;

              const isOwned = ownedProductIds.has(product.productId);
              const isEquipped = equippedColor === product.productId;
              const isPurchasing = purchasing === product.productId;
              const isFree = product.productId === FREE_CHAIN_COLOR_ID;
              const priceText = isFree ? 'Free' : (product.priceString || `$${Number(product.price).toFixed(2)}`);
              const statusText = isEquipped ? 'Equipped' : (isOwned ? 'Owned' : (product.isAvailable ? priceText : 'Unavailable'));

              return (
                <View key={product.productId} style={styles.itemCard}>
                  <View style={[styles.colorPreview, { backgroundColor: colorObj.color }]} />

                  <Text style={styles.itemName}>{product.displayName}</Text>

                  {isOwned && !isEquipped && (
                    <View style={styles.ownedBadge}>
                      <Text style={styles.ownedBadgeText}>Owned</Text>
                    </View>
                  )}

                  <View style={styles.itemActions}>
                    {!isOwned && product.isAvailable && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.buyButton]}
                        onPress={() => handleBuyItem(product)}
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
                            <Text style={styles.buyButtonText}>{priceText}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {!isOwned && !product.isAvailable && (
                      <View style={[styles.actionButton, styles.unavailableButton]}>
                        <Text style={styles.unavailableButtonText}>{statusText}</Text>
                      </View>
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
          style={styles.paywallButton}
          onPress={() => {
            console.log('[Shop] Go Pro button pressed — navigating to /paywall');
            router.push('/paywall');
          }}
        >
          <Text style={styles.paywallButtonText}>⭐ Go Pro — Unlock Everything</Text>
        </TouchableOpacity>

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
  requiresDevBuildContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  requiresDevBuildTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  requiresDevBuildMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  requiresDevBuildContinueButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  requiresDevBuildContinueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 59, 48, 0.3)',
    padding: 12,
  },
  errorBannerText: {
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
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
    marginBottom: 6,
  },
  ownedBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
    alignSelf: 'center',
  },
  ownedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
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
  unavailableButton: {
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(142, 142, 147, 0.3)',
  },
  unavailableButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  paywallButton: {
    backgroundColor: '#764BA2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  paywallButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
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
