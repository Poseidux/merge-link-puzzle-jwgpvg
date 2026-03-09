
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator, Alert, Platform } from 'react-native';
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

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ProductWithPrice {
  productId: string;
  displayName: string;
  price: number;
  priceString?: string;
  type: 'theme' | 'chainColor';
  pkg?: PurchasesPackage;
  isAvailable: boolean;
}

export default function ShopScreen() {
  const router = useRouter();
  const { revenueCatReady } = useContext(RevenueCatContext);
  const [ownedThemes, setOwnedThemes] = useState<string[]>(['theme_classic']);
  const [ownedColors, setOwnedColors] = useState<string[]>(['chain_gold']);
  const [equippedTheme, setEquippedTheme] = useState<string>('theme_classic');
  const [equippedColor, setEquippedColor] = useState<string>('#FFD700');
  const [activeTab, setActiveTab] = useState<'themes' | 'colors'>('themes');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [requiresDevBuild, setRequiresDevBuild] = useState(false);
  
  const [themesWithPrices, setThemesWithPrices] = useState<ProductWithPrice[]>([]);
  const [colorsWithPrices, setColorsWithPrices] = useState<ProductWithPrice[]>([]);

  // Build lookup maps from Object.values, keyed by productId
  const themeLookupMap = useMemo(() => {
    const map = new Map<string, typeof THEMES[string]>();
    Object.values(THEMES).forEach(theme => {
      map.set(theme.productId, theme);
    });
    return map;
  }, []);

  const chainColorLookupMap = useMemo(() => {
    const map = new Map<string, typeof CHAIN_HIGHLIGHT_COLORS[string]>();
    Object.values(CHAIN_HIGHLIGHT_COLORS).forEach(color => {
      map.set(color.productId, color);
    });
    return map;
  }, []);

  useEffect(() => {
    if (__DEV__) {
      console.log('=== Shop Screen Mounted ===');
      console.log('[Shop] Platform:', Platform.OS);
      console.log('[Shop] RevenueCat Ready:', revenueCatReady);
    }
    
    // CRITICAL CHECK: Detect if running in unsupported environment
    if (Platform.OS === 'web') {
      if (__DEV__) {
        console.error('[Shop] ❌ CRITICAL: Running on WEB - RevenueCat does NOT work on web!');
      }
      setRequiresDevBuild(true);
      setErrorMessage('Web Platform Not Supported');
      setDebugInfo('RevenueCat in-app purchases only work on iOS and Android devices, not in web browsers.');
      loadLocalDataOnly();
      return;
    }
    
    if (Constants.appOwnership === 'expo') {
      if (__DEV__) {
        console.error('[Shop] ❌ CRITICAL: Running in EXPO GO - RevenueCat does NOT work in Expo Go!');
      }
      setRequiresDevBuild(true);
      setErrorMessage('Expo Go Not Supported');
      setDebugInfo('RevenueCat requires a custom development build. Expo Go cannot process real in-app purchases.');
      loadLocalDataOnly();
      return;
    }
    
    // Wait for RevenueCat to be ready before fetching offerings
    if (!revenueCatReady) {
      if (__DEV__) {
        console.log('[Shop] ⏳ Waiting for RevenueCat to be ready...');
      }
      setLoading(true);
      setErrorMessage('Store is loading...');
      return;
    }
    
    if (__DEV__) {
      console.log('[Shop] ✅ RevenueCat is ready, loading offerings');
    }
    loadOwnershipAndOfferings();
  }, [revenueCatReady]);

  const loadLocalDataOnly = () => {
    if (__DEV__) {
      console.log('[Shop] Loading local data only (no RevenueCat)');
    }
    setLoading(true);
    
    const allThemes = Object.values(THEMES).map((theme) => ({
      productId: theme.productId,
      displayName: theme.displayName,
      price: theme.price,
      priceString: theme.price === 0 ? 'Free' : `$${theme.price.toFixed(2)}`,
      type: 'theme' as const,
      isAvailable: theme.price === 0,
    }));
    
    const allColors = Object.values(CHAIN_HIGHLIGHT_COLORS).map((color) => ({
      productId: color.productId,
      displayName: color.displayName,
      price: color.price,
      priceString: color.price === 0 ? 'Free' : `$${color.price.toFixed(2)}`,
      type: 'chainColor' as const,
      isAvailable: color.price === 0,
    }));
    
    setThemesWithPrices(allThemes);
    setColorsWithPrices(allColors);
    
    // Load local ownership
    loadOwnedThemes().then(setOwnedThemes);
    loadOwnedColors().then(setOwnedColors);
    loadTheme().then((theme) => setEquippedTheme(theme || 'theme_classic'));
    loadChainHighlightColor().then((color) => setEquippedColor(color || '#FFD700'));
    
    setLoading(false);
  };

  const loadOwnershipAndOfferings = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setDebugInfo('');
      
      if (__DEV__) {
        console.log('[Shop] Step 1: Loading local ownership data');
      }
      const themes = await loadOwnedThemes();
      const colorIds = await loadOwnedColors();
      const currentTheme = await loadTheme();
      const currentColor = await loadChainHighlightColor();
      
      setOwnedThemes(themes);
      setOwnedColors(colorIds);
      setEquippedTheme(currentTheme || 'theme_classic');
      setEquippedColor(currentColor || '#FFD700');
      
      if (__DEV__) {
        console.log('[Shop] ✅ Local ownership loaded');
        console.log('[Shop] Step 2: Fetching RevenueCat offerings');
      }
      
      const offerings = await Purchases.getOfferings();
      
      if (__DEV__) {
        console.log('[Shop] ✅ Offerings fetched successfully');
      }
      
      const offeringIdentifiers = Object.keys(offerings.all);
      const currentOfferingId = offerings.current?.identifier || 'NONE';
      
      if (__DEV__) {
        console.log('[Shop]   All offering IDs:', offeringIdentifiers);
        console.log('[Shop]   Current offering ID:', currentOfferingId);
      }
      
      const debugLines = [];
      debugLines.push(`RC Ready: ${revenueCatReady ? '✅' : '❌'}`);
      debugLines.push(`All Offerings: [${offeringIdentifiers.join(', ') || 'NONE'}]`);
      debugLines.push(`Current: ${currentOfferingId}`);
      
      if (offeringIdentifiers.length === 0) {
        const emptyMsg = 'Offerings empty (check RevenueCat project/API key/offering identifiers)';
        if (__DEV__) {
          console.error(`[Shop] ❌ ${emptyMsg}`);
        }
        setErrorMessage(emptyMsg);
        debugLines.push('⚠️ Empty - check dashboard');
      }
      
      // Select the 'themes' offering (or fallback to current)
      if (__DEV__) {
        console.log('[Shop] Step 3: Selecting "themes" offering');
      }
      const selectedOffering = offerings.all['themes'] || offerings.current;
      
      if (!selectedOffering) {
        const msg = 'No "themes" offering found and no current offering. Check RevenueCat configuration.';
        if (__DEV__) {
          console.error(`[Shop] ❌ ${msg}`);
        }
        setErrorMessage(msg);
        debugLines.push('⚠️ No "themes" offering');
        
        // Fallback to local data
        const allThemes = Object.values(THEMES).map((theme) => ({
          productId: theme.productId,
          displayName: theme.displayName,
          price: theme.price,
          priceString: theme.price === 0 ? 'Free' : `$${theme.price.toFixed(2)}`,
          type: 'theme' as const,
          isAvailable: theme.price === 0,
        }));
        
        const allColors = Object.values(CHAIN_HIGHLIGHT_COLORS).map((color) => ({
          productId: color.productId,
          displayName: color.displayName,
          price: color.price,
          priceString: color.price === 0 ? 'Free' : `$${color.price.toFixed(2)}`,
          type: 'chainColor' as const,
          isAvailable: color.price === 0,
        }));
        
        setThemesWithPrices(allThemes);
        setColorsWithPrices(allColors);
        setDebugInfo(debugLines.join(' | '));
        setLoading(false);
        return;
      }
      
      const selectedOfferingIdentifier = selectedOffering.identifier;
      const allPackagesInSelectedOffering = selectedOffering.availablePackages;
      
      if (__DEV__) {
        console.log(`[Shop]   Selected offering: "${selectedOfferingIdentifier}"`);
        console.log(`[Shop]   Total packages: ${allPackagesInSelectedOffering.length}`);
      }
      
      debugLines.push(`Selected: ${selectedOfferingIdentifier}`);
      debugLines.push(`Total Pkgs: ${allPackagesInSelectedOffering.length}`);
      
      // Categorize packages by exact productId match using lookup maps
      if (__DEV__) {
        console.log('[Shop] Step 4: Categorizing packages by exact productId match');
      }
      
      const themesMap: { [key: string]: PurchasesPackage } = {};
      const colorsMap: { [key: string]: PurchasesPackage } = {};
      const unmatchedProductIds: string[] = [];
      const fetchedProductIds: string[] = [];
      
      allPackagesInSelectedOffering.forEach((pkg, index) => {
        const productId = pkg.storeProduct.identifier;
        fetchedProductIds.push(productId);
        
        if (__DEV__) {
          console.log(`[Shop]   Package ${index + 1}: ${productId} (${pkg.storeProduct.priceString})`);
        }
        
        // Exact membership check using lookup maps
        if (themeLookupMap.has(productId)) {
          themesMap[productId] = pkg;
          if (__DEV__) {
            console.log(`[Shop]     → Matched as THEME`);
          }
        } else if (chainColorLookupMap.has(productId)) {
          colorsMap[productId] = pkg;
          if (__DEV__) {
            console.log(`[Shop]     → Matched as CHAIN COLOR`);
          }
        } else {
          unmatchedProductIds.push(productId);
          if (__DEV__) {
            console.warn(`[Shop]     ⚠️ UNMATCHED: "${productId}" not in local catalogs`);
          }
        }
      });
      
      const themePackageCount = Object.keys(themesMap).length;
      const chainPackageCount = Object.keys(colorsMap).length;
      
      if (__DEV__) {
        console.log(`[Shop] ✅ Categorization complete:`);
        console.log(`[Shop]   Theme packages: ${themePackageCount}`);
        console.log(`[Shop]   Chain packages: ${chainPackageCount}`);
        console.log(`[Shop]   Fetched IDs: [${fetchedProductIds.join(', ')}]`);
        console.log(`[Shop]   Unmatched IDs: [${unmatchedProductIds.join(', ') || 'none'}]`);
      }
      
      debugLines.push(`Themes: ${themePackageCount}`);
      debugLines.push(`Chains: ${chainPackageCount}`);
      debugLines.push(`Fetched IDs: [${fetchedProductIds.join(', ')}]`);
      if (unmatchedProductIds.length > 0) {
        debugLines.push(`Unmatched: [${unmatchedProductIds.join(', ')}]`);
      }
      
      // Build full product lists using lookup maps
      const allThemes = Object.values(THEMES).map((theme) => {
        const rcPackage = themesMap[theme.productId];
        if (rcPackage) {
          return {
            productId: theme.productId,
            displayName: theme.displayName,
            price: theme.price,
            priceString: rcPackage.storeProduct.priceString,
            type: 'theme' as const,
            pkg: rcPackage,
            isAvailable: true,
          };
        } else {
          return {
            productId: theme.productId,
            displayName: theme.displayName,
            price: theme.price,
            priceString: theme.price === 0 ? 'Free' : `$${theme.price.toFixed(2)}`,
            type: 'theme' as const,
            isAvailable: theme.price === 0,
          };
        }
      });
      
      const allColors = Object.values(CHAIN_HIGHLIGHT_COLORS).map((color) => {
        const rcPackage = colorsMap[color.productId];
        if (rcPackage) {
          return {
            productId: color.productId,
            displayName: color.displayName,
            price: color.price,
            priceString: rcPackage.storeProduct.priceString,
            type: 'chainColor' as const,
            pkg: rcPackage,
            isAvailable: true,
          };
        } else {
          return {
            productId: color.productId,
            displayName: color.displayName,
            price: color.price,
            priceString: color.price === 0 ? 'Free' : `$${color.price.toFixed(2)}`,
            type: 'chainColor' as const,
            isAvailable: color.price === 0,
          };
        }
      });
      
      // Check for missing local paid products
      const expectedThemeIds = Object.values(THEMES).filter(t => t.price > 0).map(t => t.productId);
      const expectedColorIds = Object.values(CHAIN_HIGHLIGHT_COLORS).filter(c => c.price > 0).map(c => c.productId);
      const missingThemes = expectedThemeIds.filter(id => !themesMap[id]);
      const missingColors = expectedColorIds.filter(id => !colorsMap[id]);
      
      if (missingThemes.length > 0 || missingColors.length > 0) {
        if (__DEV__) {
          console.warn(`[Shop] ⚠️ Render lookup mismatch: Some local paid products not in RC offering:`);
          if (missingThemes.length > 0) {
            console.warn(`[Shop]   Missing themes: [${missingThemes.join(', ')}]`);
          }
          if (missingColors.length > 0) {
            console.warn(`[Shop]   Missing colors: [${missingColors.join(', ')}]`);
          }
        }
        debugLines.push(`Missing Local Paid: Themes[${missingThemes.join(', ') || 'none'}] Colors[${missingColors.join(', ') || 'none'}]`);
      }
      
      setThemesWithPrices(allThemes);
      setColorsWithPrices(allColors);
      setDebugInfo(debugLines.join(' | '));
      
      if (__DEV__) {
        console.log('[Shop] Step 5: Syncing ownership from RevenueCat');
      }
      await syncOwnershipFromRevenueCat();
      
    } catch (error: any) {
      if (__DEV__) {
        console.error('[Shop] ❌ Error loading offerings:', {
          message: error.message || 'N/A',
          code: error.code || 'N/A',
          readableErrorCode: error.readableErrorCode || 'N/A',
        });
      }
      
      const errorDetails = `${error.readableErrorCode || error.message}`;
      const errorMsg = `Failed to load store: ${errorDetails}`;
      setErrorMessage(errorMsg);
      
      const allThemes = Object.values(THEMES).map((theme) => ({
        productId: theme.productId,
        displayName: theme.displayName,
        price: theme.price,
        priceString: theme.price === 0 ? 'Free' : `$${theme.price.toFixed(2)}`,
        type: 'theme' as const,
        isAvailable: theme.price === 0,
      }));
      
      const allColors = Object.values(CHAIN_HIGHLIGHT_COLORS).map((color) => ({
        productId: color.productId,
        displayName: color.displayName,
        price: color.price,
        priceString: color.price === 0 ? 'Free' : `$${color.price.toFixed(2)}`,
        type: 'chainColor' as const,
        isAvailable: color.price === 0,
      }));
      
      setThemesWithPrices(allThemes);
      setColorsWithPrices(allColors);
    } finally {
      setLoading(false);
      if (__DEV__) {
        console.log('=== Shop Loading Complete ===');
      }
    }
  };

  const syncOwnershipFromRevenueCat = async () => {
    try {
      if (__DEV__) {
        console.log('[Shop] Fetching customer info');
      }
      const customerInfo = await Purchases.getCustomerInfo();
      if (__DEV__) {
        console.log('[Shop] ✅ Customer info fetched');
      }
      await updateOwnershipFromCustomerInfo(customerInfo);
    } catch (error: any) {
      if (__DEV__) {
        console.error('[Shop] ❌ Error syncing ownership:', error);
      }
    }
  };

  const updateOwnershipFromCustomerInfo = async (customerInfo: CustomerInfo) => {
    const ownedThemeIds: string[] = ['theme_classic'];
    const ownedChainColorIds: string[] = ['chain_gold'];
    
    const purchasedProductIds = new Set(customerInfo.allPurchasedProductIdentifiers);
    
    if (__DEV__) {
      console.log(`[Shop] Purchased IDs: [${Array.from(purchasedProductIds).join(', ') || 'none'}]`);
    }
    
    purchasedProductIds.forEach((productId) => {
      if (themeLookupMap.has(productId) && !ownedThemeIds.includes(productId)) {
        ownedThemeIds.push(productId);
        if (__DEV__) {
          console.log(`[Shop]   ✅ Theme owned: ${productId}`);
        }
      } else if (chainColorLookupMap.has(productId) && !ownedChainColorIds.includes(productId)) {
        ownedChainColorIds.push(productId);
        if (__DEV__) {
          console.log(`[Shop]   ✅ Color owned: ${productId}`);
        }
      }
    });
    
    if (__DEV__) {
      console.log(`[Shop] ✅ Ownership updated: Themes[${ownedThemeIds.join(', ')}] Colors[${ownedChainColorIds.join(', ')}]`);
    }
    
    setOwnedThemes(ownedThemeIds);
    setOwnedColors(ownedChainColorIds);
    await saveOwnedThemes(ownedThemeIds);
    await saveOwnedColors(ownedChainColorIds);
  };

  const handleBuyTheme = async (product: ProductWithPrice) => {
    if (!product.pkg || !product.isAvailable) {
      if (__DEV__) {
        console.log(`[Shop] ❌ Cannot purchase "${product.displayName}" - no valid package`);
      }
      Alert.alert('Unavailable', 'This item is not available for purchase.');
      return;
    }
    
    try {
      if (__DEV__) {
        console.log(`[Shop] 🛒 Purchasing theme: ${product.productId}`);
      }
      setPurchasing(product.productId);
      
      const { customerInfo } = await Purchases.purchasePackage(product.pkg);
      if (__DEV__) {
        console.log('[Shop] ✅ Purchase successful');
      }
      
      await updateOwnershipFromCustomerInfo(customerInfo);
      Alert.alert('Success!', `${product.displayName} purchased!`);
    } catch (error: any) {
      if (__DEV__) {
        console.error(`[Shop] ❌ Purchase failed:`, error);
      }
      
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', error.readableErrorCode || error.message);
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleEquipTheme = async (themeId: string) => {
    if (__DEV__) {
      console.log(`[Shop] Equipping theme: ${themeId}`);
    }
    setEquippedTheme(themeId);
    await saveTheme(themeId);
  };

  const handleBuyColor = async (product: ProductWithPrice) => {
    if (!product.pkg || !product.isAvailable) {
      if (__DEV__) {
        console.log(`[Shop] ❌ Cannot purchase "${product.displayName}" - no valid package`);
      }
      Alert.alert('Unavailable', 'This item is not available for purchase.');
      return;
    }
    
    try {
      if (__DEV__) {
        console.log(`[Shop] 🛒 Purchasing color: ${product.productId}`);
      }
      setPurchasing(product.productId);
      
      const { customerInfo } = await Purchases.purchasePackage(product.pkg);
      if (__DEV__) {
        console.log('[Shop] ✅ Purchase successful');
      }
      
      await updateOwnershipFromCustomerInfo(customerInfo);
      Alert.alert('Success!', `${product.displayName} purchased!`);
    } catch (error: any) {
      if (__DEV__) {
        console.error(`[Shop] ❌ Purchase failed:`, error);
      }
      
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', error.readableErrorCode || error.message);
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleEquipColor = async (colorId: string) => {
    if (__DEV__) {
      console.log(`[Shop] Equipping color: ${colorId}`);
    }
    // Use lookup map to find the color object
    const colorObj = chainColorLookupMap.get(colorId);
    if (colorObj) {
      setEquippedColor(colorObj.color);
      await saveChainHighlightColor(colorObj.color);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      if (__DEV__) {
        console.log('[Shop] 🔄 Restoring purchases');
      }
      setRestoring(true);
      
      const customerInfo = await Purchases.restorePurchases();
      if (__DEV__) {
        console.log('[Shop] ✅ Restore successful');
      }
      
      await updateOwnershipFromCustomerInfo(customerInfo);
      Alert.alert('Restored!', 'Your purchases have been restored.');
    } catch (error: any) {
      if (__DEV__) {
        console.error('[Shop] ❌ Restore failed:', error);
      }
      
      Alert.alert('Restore Failed', error.readableErrorCode || error.message);
    } finally {
      setRestoring(false);
    }
  };

  const tabTextThemes = 'Themes';
  const tabTextColors = 'Colors';
  const restoreButtonText = 'Restore Purchases';

  if (loading) {
    const loadingText = revenueCatReady ? 'Loading Store...' : 'Initializing Store...';
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

  if (requiresDevBuild) {
    const title = errorMessage || 'Development Build Required';
    const message1 = debugInfo || 'RevenueCat requires a development build.';
    const continueText = 'Continue Browsing';
    
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen 
          options={{
            headerShown: true,
            title: 'Shop',
            headerBackTitle: 'Back',
          }}
        />
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.requiresDevBuildContainer}
        >
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={64}
            color="#FF9500"
          />
          <Text style={styles.requiresDevBuildTitle}>{title}</Text>
          <Text style={styles.requiresDevBuildMessage}>{message1}</Text>
          
          <TouchableOpacity
            style={styles.requiresDevBuildContinueButton}
            onPress={() => {
              setRequiresDevBuild(false);
              setErrorMessage(null);
            }}
          >
            <Text style={styles.requiresDevBuildContinueButtonText}>{continueText}</Text>
          </TouchableOpacity>
        </ScrollView>
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
      
      {debugInfo && __DEV__ && (
        <View style={styles.debugBanner}>
          <Text style={styles.debugBannerTitle}>RevenueCat Debug</Text>
          <Text style={styles.debugBannerText}>{debugInfo}</Text>
        </View>
      )}
      
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      )}
      
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
              const theme = themeLookupMap.get(product.productId);
              if (!theme) return null;
              
              const isOwned = ownedThemes.includes(product.productId);
              const isEquipped = equippedTheme === product.productId;
              const isPurchasing = purchasing === product.productId;
              const priceText = product.priceString || (product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`);
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
                  
                  <View style={styles.itemActions}>
                    {!isOwned && product.isAvailable && (
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
            {colorsWithPrices.map((product) => {
              const colorObj = chainColorLookupMap.get(product.productId);
              if (!colorObj) return null;
              
              const isOwned = ownedColors.includes(product.productId);
              const isEquipped = equippedColor === colorObj.color;
              const isPurchasing = purchasing === product.productId;
              const priceText = product.priceString || (product.price === 0 ? 'Free' : `$${product.price.toFixed(2)}`);
              const statusText = isEquipped ? 'Equipped' : (isOwned ? 'Owned' : (product.isAvailable ? priceText : 'Unavailable'));
              
              return (
                <View key={product.productId} style={styles.itemCard}>
                  <View style={[styles.colorPreview, { backgroundColor: colorObj.color }]} />
                  
                  <Text style={styles.itemName}>{product.displayName}</Text>
                  
                  <View style={styles.itemActions}>
                    {!isOwned && product.isAvailable && (
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
  debugBanner: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 152, 0, 0.3)',
    padding: 12,
  },
  debugBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  debugBannerText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textSecondary,
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
