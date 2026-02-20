
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

// RevenueCat REST API Identifiers for reference (DO NOT use these as SDK lookup keys)
const REVENUECAT_REST_IDS = {
  offerings: {
    themes: 'ofrng11cb78188e',
    chains: 'ofrngcb03122136',
  },
  products: {
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
  
  const [themesWithPrices, setThemesWithPrices] = useState<ProductWithPrice[]>([]);
  const [colorsWithPrices, setColorsWithPrices] = useState<ProductWithPrice[]>([]);

  useEffect(() => {
    console.log('=== Shop Screen Mounted ===');
    console.log('[Shop] 📋 RevenueCat REST API Reference IDs (for dashboard verification only):');
    console.log('[Shop]   Themes Offering REST ID:', REVENUECAT_REST_IDS.offerings.themes);
    console.log('[Shop]   Chains Offering REST ID:', REVENUECAT_REST_IDS.offerings.chains);
    console.log('[Shop]   Chain Product REST IDs:', REVENUECAT_REST_IDS.products);
    console.log('[Shop] ⚠️ NOTE: SDK uses Offering IDENTIFIER strings from dashboard, not these REST IDs');
    console.log('[Shop] Loading ownership data and RevenueCat offerings');
    loadOwnershipAndOfferings();
  }, []);

  const loadOwnershipAndOfferings = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      
      console.log('[Shop] Step 1: Loading local ownership data');
      // Load local ownership
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
      
      console.log('[Shop] Step 2: Checking if RevenueCat is configured');
      const isConfigured = await Purchases.isConfigured();
      console.log(`[Shop] RevenueCat configured: ${isConfigured}`);
      
      if (!isConfigured) {
        console.error('[Shop] ❌ RevenueCat is NOT configured! Cannot fetch offerings.');
        console.error('[Shop] 🔧 Fix: Ensure Purchases.configure() runs at app startup in app/_layout.tsx');
        setErrorMessage('Store not configured. Please restart the app.');
        throw new Error('RevenueCat not configured');
      }
      
      console.log('[Shop] Step 3: Fetching RevenueCat offerings');
      const offerings = await Purchases.getOfferings();
      
      console.log('[Shop] ✅ Offerings fetched successfully');
      console.log('[Shop] 📊 OFFERING IDENTIFIERS (these are the keys to use):');
      console.log('[Shop]   Available offering identifiers:', Object.keys(offerings.all));
      console.log('[Shop]   Number of offerings:', Object.keys(offerings.all).length);
      console.log('[Shop]   Current offering identifier:', offerings.current?.identifier || 'NONE');
      
      // Check if offerings are empty
      if (Object.keys(offerings.all).length === 0) {
        console.error('[Shop] ❌ No offerings found! offerings.all is empty.');
        console.error('[Shop] 🔧 Possible causes:');
        console.error('[Shop]   1. Offerings not configured in RevenueCat dashboard');
        console.error('[Shop]   2. Offerings not available in current environment (sandbox vs production)');
        console.error('[Shop]   3. Products not added to offerings in RevenueCat dashboard');
        console.error('[Shop]   4. App Store Connect products not synced to RevenueCat');
        setErrorMessage('No store items available. Please check RevenueCat dashboard configuration.');
      }
      
      // Map offerings to products
      const themesMap: { [key: string]: ProductWithPrice } = {};
      const colorsMap: { [key: string]: ProductWithPrice } = {};
      
      let totalPackagesFound = 0;
      
      // Process all offerings
      Object.entries(offerings.all).forEach(([offeringId, offering]) => {
        console.log(`[Shop] 📦 Processing offering: "${offeringId}"`);
        console.log(`[Shop]   - Packages in this offering: ${offering.availablePackages.length}`);
        console.log(`[Shop]   - Offering description: ${offering.serverDescription || 'N/A'}`);
        
        offering.availablePackages.forEach((pkg, index) => {
          const productId = pkg.storeProduct.identifier;
          const priceString = pkg.storeProduct.priceString;
          const title = pkg.storeProduct.title;
          const description = pkg.storeProduct.description;
          const packageIdentifier = pkg.identifier;
          
          totalPackagesFound++;
          
          console.log(`[Shop]   📱 Package ${index + 1}:`);
          console.log(`[Shop]     - Package Identifier: ${packageIdentifier}`);
          console.log(`[Shop]     - Store Product ID: ${productId}`);
          console.log(`[Shop]     - Price: ${priceString}`);
          console.log(`[Shop]     - Title: ${title}`);
          console.log(`[Shop]     - Description: ${description}`);
          
          // Check if this matches our expected product IDs
          if (productId.startsWith('theme_')) {
            const theme = THEMES[productId];
            if (theme) {
              console.log(`[Shop]     ✅ Matched to local theme: ${theme.displayName}`);
              themesMap[productId] = {
                productId,
                displayName: theme.displayName,
                price: theme.price,
                priceString: priceString,
                type: 'theme',
                pkg,
              };
            } else {
              console.warn(`[Shop]     ⚠️ No local theme data found for product ID: ${productId}`);
              console.warn(`[Shop]     🔧 Expected format: theme_<slug> (e.g., theme_ocean, theme_sunset)`);
            }
          } else if (productId.startsWith('chain_')) {
            const color = CHAIN_HIGHLIGHT_COLORS[productId];
            if (color) {
              console.log(`[Shop]     ✅ Matched to local color: ${color.displayName}`);
              colorsMap[productId] = {
                productId,
                displayName: color.displayName,
                price: color.price,
                priceString: priceString,
                type: 'chainColor',
                pkg,
              };
            } else {
              console.warn(`[Shop]     ⚠️ No local color data found for product ID: ${productId}`);
              console.warn(`[Shop]     🔧 Expected one of:`, Object.keys(CHAIN_HIGHLIGHT_COLORS).join(', '));
            }
          } else {
            console.warn(`[Shop]     ⚠️ Unknown product ID format: ${productId}`);
            console.warn(`[Shop]     🔧 Expected format: theme_<slug> or chain_<slug>`);
          }
        });
      });
      
      console.log(`[Shop] 📊 Summary:`);
      console.log(`[Shop]   - Total packages found: ${totalPackagesFound}`);
      console.log(`[Shop]   - Themes mapped: ${Object.keys(themesMap).length}`);
      console.log(`[Shop]   - Colors mapped: ${Object.keys(colorsMap).length}`);
      console.log(`[Shop]   - Expected themes: ${Object.keys(THEMES).length}`);
      console.log(`[Shop]   - Expected colors: ${Object.keys(CHAIN_HIGHLIGHT_COLORS).length}`);
      
      if (totalPackagesFound === 0) {
        console.error('[Shop] ❌ CRITICAL: No packages found in any offering!');
        console.error('[Shop] 🔧 Action needed:');
        console.error('[Shop]   1. Check RevenueCat dashboard → Offerings');
        console.error('[Shop]   2. Ensure offerings contain packages with products');
        console.error('[Shop]   3. Verify products are configured in App Store Connect');
        console.error('[Shop]   4. Confirm offering identifiers match dashboard');
      }
      
      // Merge with local product definitions (for items not in offerings)
      const allThemes = Object.values(THEMES).map((theme) => {
        const rcProduct = themesMap[theme.productId];
        if (rcProduct) {
          console.log(`[Shop] ✅ Theme "${theme.displayName}" (${theme.productId}) has RevenueCat package`);
        } else {
          console.log(`[Shop] ⚠️ Theme "${theme.displayName}" (${theme.productId}) using local fallback (no RevenueCat package)`);
        }
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
        if (rcProduct) {
          console.log(`[Shop] ✅ Color "${color.displayName}" (${color.productId}) has RevenueCat package`);
        } else {
          console.log(`[Shop] ⚠️ Color "${color.displayName}" (${color.productId}) using local fallback (no RevenueCat package)`);
        }
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
      
      console.log('[Shop] ✅ Final product lists created');
      console.log(`[Shop]   - Themes: ${allThemes.length} total`);
      console.log(`[Shop]   - Colors: ${allColors.length} total`);
      
      // Sync ownership from RevenueCat
      console.log('[Shop] Step 4: Syncing ownership from RevenueCat');
      await syncOwnershipFromRevenueCat();
      
    } catch (error: any) {
      console.error('[Shop] ❌ Error loading offerings:', error);
      console.error('[Shop] Error details:', {
        message: error.message,
        code: error.code,
        domain: error.domain,
        underlyingErrorMessage: error.underlyingErrorMessage,
        stack: error.stack,
      });
      
      const errorMsg = 'Failed to load store items. Please try again.';
      setErrorMessage(errorMsg);
      Alert.alert('Error', errorMsg);
      
      // Fallback to local data
      console.log('[Shop] Using fallback local data only');
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
      console.log('=== Shop Loading Complete ===');
      console.log('[Shop] 📝 Next steps if issues persist:');
      console.log('[Shop]   1. Share the offering identifiers logged above');
      console.log('[Shop]   2. Verify offering identifiers in RevenueCat dashboard match');
      console.log('[Shop]   3. Check that products are added to offerings in dashboard');
      console.log('[Shop]   4. Confirm App Store Connect product IDs match app product IDs');
    }
  };

  const syncOwnershipFromRevenueCat = async () => {
    try {
      console.log('[Shop] Fetching customer info from RevenueCat');
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('[Shop] ✅ Customer info fetched');
      await updateOwnershipFromCustomerInfo(customerInfo);
    } catch (error: any) {
      console.error('[Shop] ❌ Error syncing ownership from RevenueCat:', error);
      console.error('[Shop] Error details:', {
        message: error.message,
        code: error.code,
        domain: error.domain,
      });
    }
  };

  const updateOwnershipFromCustomerInfo = async (customerInfo: CustomerInfo) => {
    const ownedThemeIds: string[] = ['theme_classic']; // Classic is always owned
    const ownedChainColorIds: string[] = ['chain_gold']; // Gold is always owned
    
    console.log('[Shop] Processing customer info for ownership');
    console.log(`[Shop] Non-subscription transactions: ${customerInfo.nonSubscriptionTransactions.length}`);
    
    // Process non-subscription transactions for themes and chain colors
    customerInfo.nonSubscriptionTransactions.forEach((transaction, index) => {
      const productId = transaction.productIdentifier;
      const purchaseDate = transaction.purchaseDate;
      
      console.log(`[Shop]   Transaction ${index + 1}:`);
      console.log(`[Shop]     - Product ID: ${productId}`);
      console.log(`[Shop]     - Purchase Date: ${purchaseDate}`);
      
      if (productId.startsWith('theme_') && !ownedThemeIds.includes(productId)) {
        ownedThemeIds.push(productId);
        console.log(`[Shop]     ✅ Added to owned themes`);
      } else if (productId.startsWith('chain_') && !ownedChainColorIds.includes(productId)) {
        ownedChainColorIds.push(productId);
        console.log(`[Shop]     ✅ Added to owned colors`);
      }
    });
    
    console.log('[Shop] ✅ Ownership updated');
    console.log(`[Shop]   - Owned themes: ${ownedThemeIds.join(', ')}`);
    console.log(`[Shop]   - Owned colors: ${ownedChainColorIds.join(', ')}`);
    
    // Update state and storage
    setOwnedThemes(ownedThemeIds);
    setOwnedColors(ownedChainColorIds);
    await saveOwnedThemes(ownedThemeIds);
    await saveOwnedColors(ownedChainColorIds);
  };

  const handleBuyTheme = async (product: ProductWithPrice) => {
    if (!product.pkg) {
      console.log(`[Shop] ❌ User tapped Buy for theme "${product.displayName}" but no RevenueCat package available`);
      console.log('[Shop] 🔧 This means:');
      console.log('[Shop]   - Product is not configured in RevenueCat dashboard, OR');
      console.log('[Shop]   - Product is not added to any offering, OR');
      console.log('[Shop]   - Offering is not available in current environment');
      Alert.alert('Not Available', 'This item is not available for purchase at the moment.');
      return;
    }
    
    try {
      console.log(`[Shop] 🛒 User tapped Buy for theme: ${product.productId} (${product.displayName})`);
      console.log(`[Shop] Package details:`, {
        identifier: product.pkg.identifier,
        productId: product.pkg.storeProduct.identifier,
        price: product.pkg.storeProduct.priceString,
      });
      
      setPurchasing(product.productId);
      
      console.log('[Shop] Calling Purchases.purchasePackage...');
      const { customerInfo } = await Purchases.purchasePackage(product.pkg);
      console.log('[Shop] ✅ Purchase successful!');
      console.log('[Shop] Updating ownership from purchase result');
      
      await updateOwnershipFromCustomerInfo(customerInfo);
      
      const successMsg = `${product.displayName} theme purchased successfully!`;
      console.log(`[Shop] ${successMsg}`);
      Alert.alert('Success!', successMsg);
    } catch (error: any) {
      console.error(`[Shop] ❌ Purchase failed for theme: ${product.productId}`);
      console.error('[Shop] Error details:', {
        message: error.message,
        code: error.code,
        domain: error.domain,
        userCancelled: error.userCancelled,
        underlyingErrorMessage: error.underlyingErrorMessage,
        readableErrorCode: error.readableErrorCode,
      });
      
      if (!error.userCancelled) {
        const errorMsg = error.message || error.readableErrorCode || 'Unable to complete purchase. Please try again.';
        Alert.alert('Purchase Failed', errorMsg);
      } else {
        console.log('[Shop] Purchase cancelled by user');
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleEquipTheme = async (themeId: string) => {
    console.log(`[Shop] User tapped Equip for theme: ${themeId}`);
    setEquippedTheme(themeId);
    await saveTheme(themeId);
    console.log(`[Shop] ✅ Theme ${themeId} equipped and saved to storage`);
  };

  const handleBuyColor = async (product: ProductWithPrice) => {
    if (!product.pkg) {
      console.log(`[Shop] ❌ User tapped Buy for color "${product.displayName}" but no RevenueCat package available`);
      console.log('[Shop] 🔧 This means:');
      console.log('[Shop]   - Product is not configured in RevenueCat dashboard, OR');
      console.log('[Shop]   - Product is not added to any offering, OR');
      console.log('[Shop]   - Offering is not available in current environment');
      Alert.alert('Not Available', 'This item is not available for purchase at the moment.');
      return;
    }
    
    try {
      console.log(`[Shop] 🛒 User tapped Buy for color: ${product.productId} (${product.displayName})`);
      console.log(`[Shop] Package details:`, {
        identifier: product.pkg.identifier,
        productId: product.pkg.storeProduct.identifier,
        price: product.pkg.storeProduct.priceString,
      });
      
      setPurchasing(product.productId);
      
      console.log('[Shop] Calling Purchases.purchasePackage...');
      const { customerInfo } = await Purchases.purchasePackage(product.pkg);
      console.log('[Shop] ✅ Purchase successful!');
      console.log('[Shop] Updating ownership from purchase result');
      
      await updateOwnershipFromCustomerInfo(customerInfo);
      
      const successMsg = `${product.displayName} color purchased successfully!`;
      console.log(`[Shop] ${successMsg}`);
      Alert.alert('Success!', successMsg);
    } catch (error: any) {
      console.error(`[Shop] ❌ Purchase failed for color: ${product.productId}`);
      console.error('[Shop] Error details:', {
        message: error.message,
        code: error.code,
        domain: error.domain,
        userCancelled: error.userCancelled,
        underlyingErrorMessage: error.underlyingErrorMessage,
        readableErrorCode: error.readableErrorCode,
      });
      
      if (!error.userCancelled) {
        const errorMsg = error.message || error.readableErrorCode || 'Unable to complete purchase. Please try again.';
        Alert.alert('Purchase Failed', errorMsg);
      } else {
        console.log('[Shop] Purchase cancelled by user');
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
      console.log(`[Shop] ✅ Color ${colorId} (${colorObj.color}) equipped and saved to storage`);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      console.log('[Shop] 🔄 User tapped Restore Purchases');
      setRestoring(true);
      
      console.log('[Shop] Calling Purchases.restorePurchases...');
      const customerInfo = await Purchases.restorePurchases();
      console.log('[Shop] ✅ Restore successful');
      console.log('[Shop] Updating ownership from restore result');
      
      await updateOwnershipFromCustomerInfo(customerInfo);
      
      const successMsg = 'Your purchases have been restored successfully.';
      console.log(`[Shop] ${successMsg}`);
      Alert.alert('Restored!', successMsg);
    } catch (error: any) {
      console.error('[Shop] ❌ Restore failed');
      console.error('[Shop] Error details:', {
        message: error.message,
        code: error.code,
        domain: error.domain,
        underlyingErrorMessage: error.underlyingErrorMessage,
      });
      
      const errorMsg = error.message || 'Unable to restore purchases. Please try again.';
      Alert.alert('Restore Failed', errorMsg);
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

  if (errorMessage) {
    const errorTitle = 'Store Error';
    const retryText = 'Retry';
    
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Stack.Screen 
          options={{
            headerShown: true,
            title: 'Shop',
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={48}
            color={colors.error}
          />
          <Text style={styles.errorTitle}>{errorTitle}</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadOwnershipAndOfferings}
          >
            <Text style={styles.retryButtonText}>{retryText}</Text>
          </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
