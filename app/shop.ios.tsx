
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
    themes: 'ofrng11cb78188e', // REST ID - for dashboard reference only
  },
};

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
    console.log('[Shop] ⚠️ NOTE: SDK uses Offering IDENTIFIER strings ("themes"), not REST IDs');
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
      
      console.log('[Shop] Step 2: Fetching RevenueCat offerings');
      const offerings = await Purchases.getOfferings();
      
      console.log('[Shop] ✅ Offerings fetched successfully');
      console.log('[Shop] 📊 REVENUECAT DIAGNOSTICS:');
      const offeringIdentifiers = Object.keys(offerings.all);
      console.log('[Shop]   (1) Offering IDs (Object.keys(offerings.all)):', offeringIdentifiers);
      console.log('[Shop]   (2) Current offering ID:', offerings.current?.identifier || 'NONE');
      
      const debugLines = [];
      debugLines.push(`Offerings: [${offeringIdentifiers.join(', ') || 'NONE'}]`);
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
      
      // Select the 'themes' offering (or fallback to current)
      console.log('[Shop] Step 3: Selecting "themes" offering');
      const selectedOffering = offerings.all['themes'] || offerings.current;
      
      if (!selectedOffering) {
        const msg = 'No "themes" offering found and no current offering. Check RevenueCat configuration.';
        console.error(`[Shop] ❌ ${msg}`);
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
      
      console.log(`[Shop]   Selected offering: "${selectedOfferingIdentifier}"`);
      console.log(`[Shop]   (3) Total packages in "${selectedOfferingIdentifier}": ${allPackagesInSelectedOffering.length}`);
      
      debugLines.push(`Selected: ${selectedOfferingIdentifier}`);
      debugLines.push(`Total Packages: ${allPackagesInSelectedOffering.length}`);
      
      // Split packages into themes and chain colors based on product ID prefix
      console.log('[Shop] Step 4: Splitting packages by product ID prefix');
      const themePackages: PurchasesPackage[] = [];
      const chainPackages: PurchasesPackage[] = [];
      
      allPackagesInSelectedOffering.forEach((pkg, index) => {
        const productId = pkg.storeProduct.identifier;
        const priceString = pkg.storeProduct.priceString;
        const pkgIdentifier = pkg.identifier;
        
        console.log(`[Shop]   Package ${index + 1}:`);
        console.log(`[Shop]     - pkg.identifier: ${pkgIdentifier}`);
        console.log(`[Shop]     - pkg.storeProduct.identifier: ${productId}`);
        console.log(`[Shop]     - pkg.storeProduct.priceString: ${priceString}`);
        
        if (productId.startsWith('theme_')) {
          themePackages.push(pkg);
          console.log(`[Shop]     → Categorized as THEME`);
        } else if (productId.startsWith('chain_')) {
          chainPackages.push(pkg);
          console.log(`[Shop]     → Categorized as CHAIN COLOR`);
        } else {
          console.warn(`[Shop]     ⚠️ Unknown product ID prefix: ${productId}`);
        }
      });
      
      console.log(`[Shop] ✅ Package split complete:`);
      console.log(`[Shop]   (4) Theme packages: ${themePackages.length}`);
      console.log(`[Shop]   (5) Chain color packages: ${chainPackages.length}`);
      
      debugLines.push(`Themes: ${themePackages.length}`);
      debugLines.push(`Colors: ${chainPackages.length}`);
      
      // Map packages to local product data
      const themesMap: { [key: string]: ProductWithPrice } = {};
      const colorsMap: { [key: string]: ProductWithPrice } = {};
      
      themePackages.forEach((pkg) => {
        const productId = pkg.storeProduct.identifier;
        const theme = THEMES[productId];
        if (theme) {
          themesMap[productId] = {
            productId,
            displayName: theme.displayName,
            price: theme.price,
            priceString: pkg.storeProduct.priceString,
            type: 'theme',
            pkg,
            isAvailable: true,
          };
        }
      });
      
      chainPackages.forEach((pkg) => {
        const productId = pkg.storeProduct.identifier;
        const color = CHAIN_HIGHLIGHT_COLORS[productId];
        if (color) {
          colorsMap[productId] = {
            productId,
            displayName: color.displayName,
            price: color.price,
            priceString: pkg.storeProduct.priceString,
            type: 'chainColor',
            pkg,
            isAvailable: true,
          };
        }
      });
      
      // Build full product lists (with unavailable items marked)
      const allThemes = Object.values(THEMES).map((theme) => {
        const rcProduct = themesMap[theme.productId];
        if (rcProduct) {
          return rcProduct;
        } else {
          // Product not in offering - mark as unavailable
          return {
            productId: theme.productId,
            displayName: theme.displayName,
            price: theme.price,
            priceString: theme.price === 0 ? 'Free' : `$${theme.price.toFixed(2)}`,
            type: 'theme' as const,
            isAvailable: theme.price === 0, // Free items are always available
          };
        }
      });
      
      const allColors = Object.values(CHAIN_HIGHLIGHT_COLORS).map((color) => {
        const rcProduct = colorsMap[color.productId];
        if (rcProduct) {
          return rcProduct;
        } else {
          // Product not in offering - mark as unavailable
          return {
            productId: color.productId,
            displayName: color.displayName,
            price: color.price,
            priceString: color.price === 0 ? 'Free' : `$${color.price.toFixed(2)}`,
            type: 'chainColor' as const,
            isAvailable: color.price === 0, // Free items are always available
          };
        }
      });
      
      // Check for missing products
      const expectedThemeIds = Object.keys(THEMES).filter(id => THEMES[id].price > 0);
      const expectedColorIds = Object.keys(CHAIN_HIGHLIGHT_COLORS).filter(id => CHAIN_HIGHLIGHT_COLORS[id].price > 0);
      const missingThemes = expectedThemeIds.filter(id => !themesMap[id]);
      const missingColors = expectedColorIds.filter(id => !colorsMap[id]);
      
      if (missingThemes.length > 0 || missingColors.length > 0) {
        console.warn(`[Shop] ⚠️ Some products not found in offering:`);
        console.warn(`[Shop]   Missing themes: ${missingThemes.join(', ') || 'none'}`);
        console.warn(`[Shop]   Missing colors: ${missingColors.join(', ') || 'none'}`);
      }
      
      setThemesWithPrices(allThemes);
      setColorsWithPrices(allColors);
      setDebugInfo(debugLines.join(' | '));
      
      console.log('[Shop] Step 5: Syncing ownership from RevenueCat');
      await syncOwnershipFromRevenueCat();
      
    } catch (error: any) {
      console.error('[Shop] ❌ Error loading offerings');
      console.error('[Shop] 🔍 FULL ERROR OBJECT:', {
        message: error.message || 'N/A',
        code: error.code || 'N/A',
        readableErrorCode: error.readableErrorCode || 'N/A',
        underlyingErrorMessage: error.underlyingErrorMessage || 'N/A',
        domain: error.domain || 'N/A',
        userInfo: error.userInfo || 'N/A',
      });
      
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
      console.error('[Shop] ❌ Error syncing ownership');
      console.error('[Shop] 🔍 FULL ERROR OBJECT:', {
        message: error.message || 'N/A',
        code: error.code || 'N/A',
        readableErrorCode: error.readableErrorCode || 'N/A',
        underlyingErrorMessage: error.underlyingErrorMessage || 'N/A',
        domain: error.domain || 'N/A',
      });
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
      console.error(`[Shop] ❌ Purchase failed`);
      console.error('[Shop] 🔍 FULL ERROR OBJECT:', {
        message: error.message || 'N/A',
        code: error.code || 'N/A',
        readableErrorCode: error.readableErrorCode || 'N/A',
        underlyingErrorMessage: error.underlyingErrorMessage || 'N/A',
        domain: error.domain || 'N/A',
        userCancelled: error.userCancelled || false,
      });
      
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
      console.error(`[Shop] ❌ Purchase failed`);
      console.error('[Shop] 🔍 FULL ERROR OBJECT:', {
        message: error.message || 'N/A',
        code: error.code || 'N/A',
        readableErrorCode: error.readableErrorCode || 'N/A',
        underlyingErrorMessage: error.underlyingErrorMessage || 'N/A',
        domain: error.domain || 'N/A',
        userCancelled: error.userCancelled || false,
      });
      
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
      console.error('[Shop] ❌ Restore failed');
      console.error('[Shop] 🔍 FULL ERROR OBJECT:', {
        message: error.message || 'N/A',
        code: error.code || 'N/A',
        readableErrorCode: error.readableErrorCode || 'N/A',
        underlyingErrorMessage: error.underlyingErrorMessage || 'N/A',
        domain: error.domain || 'N/A',
      });
      
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
