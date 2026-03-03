
import React, { useState, useEffect } from 'react';
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

// RevenueCat REST API Identifiers for reference (DO NOT use these as SDK lookup keys)
const REVENUECAT_REST_IDS = {
  offerings: {
    themes: 'ofrng11cb78188e',
    chains: 'ofrngcb03122136',
  },
  products: {
    // Chain Colors
    chain_amber: 'proda0e467a6b1',
    chain_crimson: 'proda7c9bc3233',
    chain_cyan: 'prod8ed64e7906',
    chain_electricblue: 'prod8e369722e5',
    chain_hotpink: 'proda0657d7fa7',
    chain_limegreen: 'prod506b7a6902',
    chain_magenta: 'prod6fe4dae8fe',
    chain_neongreen: 'prod46e51cc4a0',
    chain_orange: 'prod20ac2e890e',
    chain_purple: 'prodd129fac7a8',
    chain_turquoise: 'prod64e152ab65',
    // Themes
    theme_arctic: 'prod5aa7029ec5',
    theme_aurora: 'prod36fe9c19d1',
    theme_autumn: 'prod660da95a4a',
    theme_candy: 'prod10610916c2',
    theme_copperteal: 'prod366f203a0e',
    theme_coralreef: 'prodf1f5386772',
    theme_cottoncandy: 'prod0f24c03cf1',
    theme_desertdusk: 'prod67290599d1',
    theme_forest: 'prodad01f24cdd',
    theme_icefire: 'prodd054745007',
    theme_lagoon: 'prod7a6039cb18',
    theme_midnight: 'prod5d085dbc14',
    theme_monochromeglass: 'prod5a47a8c1b1',
    theme_neon: 'prodf652c971e1',
    theme_ocean: 'prodeb01313480',
    theme_prismpop: 'prod84b94c59a5',
    theme_retroarcade: 'prod399776ba4b',
    theme_royalvelvet: 'prod8e5b509179',
    theme_sakura: 'prod9aa508ccf5',
    theme_sorbet: 'prod68bf5ace88',
    theme_spring: 'prod6f0f85a362',
    theme_sunrise: 'prodde27ccf587',
    theme_sunset: 'prod02ff412864',
    theme_tropical: 'prod88fbd85179',
    theme_volcano: 'prod2e9455b5c0',
  },
  entitlements: {
    // Chain Colors
    chain_amber: 'entl1f5849d624',
    chain_crimson: 'entl8ef9f19f9d',
    chain_cyan: 'entlb80317a813',
    chain_electricblue: 'entl0c5cdcc773',
    chain_hotpink: 'entl524ab3b046',
    chain_limegreen: 'entl04c9ae15d8',
    chain_magenta: 'entlecd9d7ad22',
    chain_neongreen: 'entleef0b3ca0c',
    chain_orange: 'entl7f0867cebc',
    chain_purple: 'entl4bd30ed1f0',
    chain_turquoise: 'entl8ad9c836fd',
    // Themes
    theme_arctic: 'entl22749b524a',
    theme_aurora: 'entl5e023c4139',
    theme_autumn: 'entl4f53259e05',
    theme_candy: 'entldf8ea4c5cb',
    theme_copperteal: 'entld0622bad3d',
    theme_coralreef: 'entla103f4632c',
    theme_cottoncandy: 'entl8c2d3573d2',
    theme_desertdusk: 'entlde154f9fa0',
    theme_forest: 'entl0308dd8b73',
    theme_icefire: 'entl04378f0f87',
    theme_lagoon: 'entl80273fadfc',
    theme_midnight: 'entlf37f675400',
    theme_monochromeglass: 'entl3a4a87b77a',
    theme_neon: 'entl4a5860e5f3',
    theme_ocean: 'entl69dc41b7db',
    theme_prismpop: 'entlb0c46ae482',
    theme_retroarcade: 'entl84dfcccbd9',
    theme_royalvelvet: 'entl0d1556a84c',
    theme_sakura: 'entl38e763f3c2',
    theme_sorbet: 'entl629871d0b3',
    theme_spring: 'entle94f487e11',
    theme_sunrise: 'entl2835ef921b',
    theme_sunset: 'entl8c28d2e515',
    theme_tropical: 'entl6b94447d87',
    theme_volcano: 'entla6a5f118ad',
  },
};

// Reverse map: entitlement REST ID → productId (for debugging)
const ENTITLEMENT_TO_PRODUCT_MAP: Record<string, string> = {};
Object.entries(REVENUECAT_REST_IDS.entitlements).forEach(([productId, entitlementId]) => {
  ENTITLEMENT_TO_PRODUCT_MAP[entitlementId] = productId;
});

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [requiresDevBuild, setRequiresDevBuild] = useState(false);
  
  const [themesWithPrices, setThemesWithPrices] = useState<ProductWithPrice[]>([]);
  const [colorsWithPrices, setColorsWithPrices] = useState<ProductWithPrice[]>([]);

  useEffect(() => {
    console.log('=== Shop Screen Mounted ===');
    console.log('[Shop] Platform:', Platform.OS);
    console.log('[Shop] App Name:', Constants.expoConfig?.name);
    console.log('[Shop] Is Expo Go:', Constants.appOwnership === 'expo');
    
    // CRITICAL CHECK: Detect if running in unsupported environment
    if (Platform.OS === 'web') {
      console.error('[Shop] ❌ CRITICAL: Running on WEB - RevenueCat does NOT work on web!');
      console.error('[Shop] 🔧 SOLUTION: You must test on a physical iOS device with a development build');
      setRequiresDevBuild(true);
      setErrorMessage('Web Platform Not Supported');
      setDebugInfo('RevenueCat in-app purchases only work on iOS and Android devices, not in web browsers.');
      loadLocalDataOnly();
      return;
    }
    
    if (Constants.appOwnership === 'expo') {
      console.error('[Shop] ❌ CRITICAL: Running in EXPO GO - RevenueCat does NOT work in Expo Go!');
      console.error('[Shop] 🔧 SOLUTION: You must create a development build and install on a physical device');
      setRequiresDevBuild(true);
      setErrorMessage('Expo Go Not Supported');
      setDebugInfo('RevenueCat requires a custom development build. Expo Go cannot process real in-app purchases.');
      loadLocalDataOnly();
      return;
    }
    
    console.log('[Shop] ✅ Running on native platform, proceeding with RevenueCat initialization');
    console.log('[Shop] 📋 RevenueCat REST API Reference IDs (for dashboard verification only):');
    console.log('[Shop]   Themes Offering REST ID:', REVENUECAT_REST_IDS.offerings.themes);
    console.log('[Shop]   Chains Offering REST ID:', REVENUECAT_REST_IDS.offerings.chains);
    console.log('[Shop] ⚠️ NOTE: SDK uses Offering IDENTIFIER strings from dashboard, not these REST IDs');
    console.log('[Shop] Loading ownership data and RevenueCat offerings');
    loadOwnershipAndOfferings();
  }, []);

  const loadLocalDataOnly = () => {
    console.log('[Shop] Loading local data only (no RevenueCat)');
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
      
      console.log('[Shop] Step 1: Loading local ownership data');
      const themes = await loadOwnedThemes();
      const colorIds = await loadOwnedColors();
      const currentTheme = await loadTheme();
      const currentColor = await loadChainHighlightColor();
      
      setOwnedThemes(themes);
      setOwnedColors(colorIds);
      setEquippedTheme(currentTheme || 'theme_classic');
      setEquippedColor(currentColor || '#FFD700');
      
      console.log('[Shop] ✅ Local ownership loaded:', { 
        themesCount: themes.length, 
        colorsCount: colorIds.length, 
        currentTheme, 
        currentColor 
      });
      
      console.log('[Shop] Step 2: Fetching RevenueCat offerings (skipping isConfigured check)');
      const offerings = await Purchases.getOfferings();
      
      console.log('[Shop] ✅ Offerings fetched successfully');
      console.log('[Shop] 📊 REVENUECAT DEBUG INFO:');
      const offeringIdentifiers = Object.keys(offerings.all);
      console.log('[Shop]   (1) Offering IDs (Object.keys(offerings.all)):', offeringIdentifiers);
      console.log('[Shop]   (2) Current offering ID:', offerings.current?.identifier || 'NONE');
      
      const debugLines = [];
      debugLines.push(`Offering IDs: ${offeringIdentifiers.join(', ') || 'NONE'}`);
      debugLines.push(`Current: ${offerings.current?.identifier || 'NONE'}`);
      
      if (offeringIdentifiers.length === 0) {
        const emptyMsg = 'Offerings empty (check RevenueCat project/API key/offering identifiers)';
        console.error(`[Shop] ❌ ${emptyMsg}`);
        console.error('[Shop] 🔧 Troubleshooting:');
        console.error('[Shop]   1. Verify offerings exist in RevenueCat dashboard');
        console.error('[Shop]   2. Check products are attached to offerings');
        console.error('[Shop]   3. Confirm API key matches project');
        console.error('[Shop]   4. Ensure offerings are available in current environment');
        
        setErrorMessage(emptyMsg);
        debugLines.push('⚠️ Empty - check dashboard');
      }
      
      const themesMap: { [key: string]: ProductWithPrice } = {};
      const colorsMap: { [key: string]: ProductWithPrice } = {};
      
      let totalPackagesFound = 0;
      const foundProductIds: string[] = [];
      
      console.log('[Shop] 📦 Processing packages from offerings:');
      Object.entries(offerings.all).forEach(([offeringId, offering]) => {
        console.log(`[Shop]   Offering "${offeringId}": ${offering.availablePackages.length} packages`);
        
        offering.availablePackages.forEach((pkg, index) => {
          const productId = pkg.storeProduct.identifier;
          const priceString = pkg.storeProduct.priceString;
          
          totalPackagesFound++;
          foundProductIds.push(productId);
          
          console.log(`[Shop]     (3) Package ${index + 1}: ${productId} - ${priceString}`);
          
          if (productId.startsWith('theme_')) {
            const theme = THEMES[productId];
            if (theme) {
              themesMap[productId] = {
                productId,
                displayName: theme.displayName,
                price: theme.price,
                priceString: priceString,
                type: 'theme',
                pkg,
                isAvailable: true,
              };
            }
          } else if (productId.startsWith('chain_')) {
            const color = CHAIN_HIGHLIGHT_COLORS[productId];
            if (color) {
              colorsMap[productId] = {
                productId,
                displayName: color.displayName,
                price: color.price,
                priceString: priceString,
                type: 'chainColor',
                pkg,
                isAvailable: true,
              };
            }
          }
        });
      });
      
      console.log(`[Shop] 📊 Summary: ${totalPackagesFound} packages found`);
      console.log(`[Shop]   Product IDs:`, foundProductIds);
      
      debugLines.push(`Products: ${foundProductIds.slice(0, 3).join(', ')}${foundProductIds.length > 3 ? '...' : ''}`);
      setDebugInfo(debugLines.join(' | '));
      
      const allThemes = Object.values(THEMES).map((theme) => {
        const rcProduct = themesMap[theme.productId];
        if (rcProduct) {
          return rcProduct;
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
        const rcProduct = colorsMap[color.productId];
        if (rcProduct) {
          return rcProduct;
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
      
      setThemesWithPrices(allThemes);
      setColorsWithPrices(allColors);
      
      console.log('[Shop] Step 3: Syncing ownership from RevenueCat');
      await syncOwnershipFromRevenueCat();
      
    } catch (error: any) {
      console.error('[Shop] ❌ Error loading offerings:', error);
      const errorCode = error.code || 'N/A';
      const readableCode = error.readableErrorCode || 'N/A';
      const underlyingMsg = error.underlyingErrorMessage || 'N/A';
      
      console.error('[Shop] Error details:', {
        message: error.message,
        code: errorCode,
        readableErrorCode: readableCode,
        underlyingErrorMessage: underlyingMsg,
        domain: error.domain,
      });
      
      const errorDetails = `${readableCode || error.message}`;
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
      console.log('=== Shop Loading Complete ===');
    }
  };

  const syncOwnershipFromRevenueCat = async () => {
    try {
      console.log('[Shop] Fetching customer info from RevenueCat');
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('[Shop] ✅ Customer info fetched');
      await updateOwnershipFromCustomerInfo(customerInfo);
    } catch (error: any) {
      console.error('[Shop] ❌ Error syncing ownership:', error);
    }
  };

  const updateOwnershipFromCustomerInfo = async (customerInfo: CustomerInfo) => {
    const ownedThemeIds: string[] = ['theme_classic'];
    const ownedChainColorIds: string[] = ['chain_gold'];
    
    console.log('[Shop] 🔍 Processing customer info for ownership');
    console.log(`[Shop] Non-subscription transactions: ${customerInfo.nonSubscriptionTransactions.length}`);
    
    customerInfo.nonSubscriptionTransactions.forEach((transaction, index) => {
      const productId = transaction.productIdentifier;
      console.log(`[Shop]   Transaction ${index + 1}: ${productId}`);
      
      if (productId.startsWith('theme_') && !ownedThemeIds.includes(productId)) {
        ownedThemeIds.push(productId);
      } else if (productId.startsWith('chain_') && !ownedChainColorIds.includes(productId)) {
        ownedChainColorIds.push(productId);
      }
    });
    
    console.log('[Shop] ✅ Ownership updated');
    console.log(`[Shop]   Owned themes: ${ownedThemeIds.join(', ')}`);
    console.log(`[Shop]   Owned colors: ${ownedChainColorIds.join(', ')}`);
    
    setOwnedThemes(ownedThemeIds);
    setOwnedColors(ownedChainColorIds);
    await saveOwnedThemes(ownedThemeIds);
    await saveOwnedColors(ownedChainColorIds);
  };

  const handleBuyTheme = async (product: ProductWithPrice) => {
    if (!product.pkg || !product.isAvailable) {
      console.log(`[Shop] ❌ Cannot purchase "${product.displayName}" - no valid package`);
      Alert.alert('Unavailable', 'This item is not available for purchase.');
      return;
    }
    
    try {
      console.log(`[Shop] 🛒 Purchasing theme: ${product.productId}`);
      setPurchasing(product.productId);
      
      const { customerInfo } = await Purchases.purchasePackage(product.pkg);
      console.log('[Shop] ✅ Purchase successful');
      
      await updateOwnershipFromCustomerInfo(customerInfo);
      Alert.alert('Success!', `${product.displayName} purchased!`);
    } catch (error: any) {
      console.error(`[Shop] ❌ Purchase failed:`, error);
      
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', error.readableErrorCode || error.message);
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleEquipTheme = async (themeId: string) => {
    console.log(`[Shop] Equipping theme: ${themeId}`);
    setEquippedTheme(themeId);
    await saveTheme(themeId);
  };

  const handleBuyColor = async (product: ProductWithPrice) => {
    if (!product.pkg || !product.isAvailable) {
      console.log(`[Shop] ❌ Cannot purchase "${product.displayName}" - no valid package`);
      Alert.alert('Unavailable', 'This item is not available for purchase.');
      return;
    }
    
    try {
      console.log(`[Shop] 🛒 Purchasing color: ${product.productId}`);
      setPurchasing(product.productId);
      
      const { customerInfo } = await Purchases.purchasePackage(product.pkg);
      console.log('[Shop] ✅ Purchase successful');
      
      await updateOwnershipFromCustomerInfo(customerInfo);
      Alert.alert('Success!', `${product.displayName} purchased!`);
    } catch (error: any) {
      console.error(`[Shop] ❌ Purchase failed:`, error);
      
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', error.readableErrorCode || error.message);
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleEquipColor = async (colorId: string) => {
    console.log(`[Shop] Equipping color: ${colorId}`);
    const colorObj = CHAIN_HIGHLIGHT_COLORS[colorId];
    if (colorObj) {
      setEquippedColor(colorObj.color);
      await saveChainHighlightColor(colorObj.color);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      console.log('[Shop] 🔄 Restoring purchases');
      setRestoring(true);
      
      const customerInfo = await Purchases.restorePurchases();
      console.log('[Shop] ✅ Restore successful');
      
      await updateOwnershipFromCustomerInfo(customerInfo);
      Alert.alert('Restored!', 'Your purchases have been restored.');
    } catch (error: any) {
      console.error('[Shop] ❌ Restore failed:', error);
      Alert.alert('Restore Failed', error.readableErrorCode || error.message);
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
      
      {debugInfo && (
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
              const theme = THEMES[product.productId];
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
              const colorObj = CHAIN_HIGHLIGHT_COLORS[product.productId];
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
