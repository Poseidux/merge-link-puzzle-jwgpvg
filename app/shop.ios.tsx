
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
  const [isExpoGo, setIsExpoGo] = useState(false);
  
  const [themesWithPrices, setThemesWithPrices] = useState<ProductWithPrice[]>([]);
  const [colorsWithPrices, setColorsWithPrices] = useState<ProductWithPrice[]>([]);

  useEffect(() => {
    console.log('=== Shop Screen Mounted (iOS/Android Only) ===');
    console.log('[Shop] Platform:', Platform.OS);
    console.log('[Shop] 📋 RevenueCat REST API Reference IDs (for dashboard verification only):');
    console.log('[Shop]   Themes Offering REST ID:', REVENUECAT_REST_IDS.offerings.themes);
    console.log('[Shop]   Chains Offering REST ID:', REVENUECAT_REST_IDS.offerings.chains);
    console.log('[Shop] ⚠️ NOTE: SDK uses Offering IDENTIFIER strings from dashboard, not these REST IDs');
    console.log('[Shop] Loading ownership data and RevenueCat offerings');
    loadOwnershipAndOfferings();
  }, []);

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
      
      console.log('[Shop] Step 2: Checking if running in Expo Go');
      const isConfigured = await Purchases.isConfigured();
      console.log(`[Shop] Purchases.isConfigured(): ${isConfigured}`);
      
      if (!isConfigured) {
        console.warn('[Shop] ⚠️ RevenueCat is NOT configured - likely running in Expo Go');
        setIsExpoGo(true);
        setErrorMessage('Development Build Required');
        setDebugInfo('RevenueCat requires a custom development build. Expo Go is not supported.');
        
        // Load local data only
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
        setLoading(false);
        return;
      }
      
      console.log('[Shop] Step 3: Fetching RevenueCat offerings');
      const offerings = await Purchases.getOfferings();
      
      console.log('[Shop] ✅ Offerings fetched successfully');
      console.log('[Shop] 📊 OFFERING IDENTIFIERS (keys from offerings.all):');
      const offeringIdentifiers = Object.keys(offerings.all);
      console.log('[Shop]   Available offering identifiers:', offeringIdentifiers);
      console.log('[Shop]   Number of offerings:', offeringIdentifiers.length);
      console.log('[Shop]   Current offering identifier:', offerings.current?.identifier || 'NONE');
      
      const debugLines = [];
      debugLines.push(`Offering IDs: ${offeringIdentifiers.join(', ') || 'NONE'}`);
      
      if (offeringIdentifiers.length === 0) {
        const emptyMsg = '⚠️ No offerings found! This usually indicates a configuration mismatch between RevenueCat and the store.';
        console.error(`[Shop] ${emptyMsg}`);
        console.error('[Shop] 🔧 Troubleshooting steps:');
        console.error('[Shop]   1. Check RevenueCat dashboard → Offerings tab');
        console.error('[Shop]   2. Ensure offerings are created and contain products');
        console.error('[Shop]   3. Verify products are configured in App Store Connect');
        console.error('[Shop]   4. Confirm App Store Connect product IDs match your app product IDs');
        console.error('[Shop]   5. Check that offerings are available in current environment (sandbox vs production)');
        console.error('[Shop]');
        console.error('[Shop] 📝 To diagnose, please provide:');
        console.error('[Shop]   - Your Offering identifier strings from RevenueCat dashboard (e.g., "themes_offering", "chains_offering")');
        console.error('[Shop]   - The storeProduct.identifier values you expect to see (e.g., "theme_ocean", "chain_gold")');
        
        setErrorMessage(emptyMsg);
        debugLines.push('⚠️ Empty offerings - check RevenueCat dashboard');
      }
      
      const themesMap: { [key: string]: ProductWithPrice } = {};
      const colorsMap: { [key: string]: ProductWithPrice } = {};
      
      let totalPackagesFound = 0;
      const foundProductIds: string[] = [];
      
      Object.entries(offerings.all).forEach(([offeringId, offering]) => {
        console.log(`[Shop] 📦 Processing offering: "${offeringId}"`);
        console.log(`[Shop]   - Packages in this offering: ${offering.availablePackages.length}`);
        console.log(`[Shop]   - Offering description: ${offering.serverDescription || 'N/A'}`);
        
        offering.availablePackages.forEach((pkg, index) => {
          const productId = pkg.storeProduct.identifier;
          const priceString = pkg.storeProduct.priceString;
          const title = pkg.storeProduct.title;
          const packageIdentifier = pkg.identifier;
          
          totalPackagesFound++;
          foundProductIds.push(productId);
          
          console.log(`[Shop]   📱 Package ${index + 1}:`);
          console.log(`[Shop]     - Package Identifier: ${packageIdentifier}`);
          console.log(`[Shop]     - Store Product ID: ${productId}`);
          console.log(`[Shop]     - Price: ${priceString}`);
          console.log(`[Shop]     - Title: ${title}`);
          
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
                isAvailable: true,
              };
            } else {
              console.warn(`[Shop]     ⚠️ No local theme data found for product ID: ${productId}`);
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
                isAvailable: true,
              };
            } else {
              console.warn(`[Shop]     ⚠️ No local color data found for product ID: ${productId}`);
            }
          } else {
            console.warn(`[Shop]     ⚠️ Unknown product ID format: ${productId}`);
          }
        });
      });
      
      console.log(`[Shop] 📊 Summary:`);
      console.log(`[Shop]   - Total packages found: ${totalPackagesFound}`);
      console.log(`[Shop]   - Product IDs found:`, foundProductIds);
      console.log(`[Shop]   - Themes mapped: ${Object.keys(themesMap).length}`);
      console.log(`[Shop]   - Colors mapped: ${Object.keys(colorsMap).length}`);
      console.log(`[Shop]   - Expected themes: ${Object.keys(THEMES).length}`);
      console.log(`[Shop]   - Expected colors: ${Object.keys(CHAIN_HIGHLIGHT_COLORS).length}`);
      
      debugLines.push(`Products found: ${foundProductIds.join(', ') || 'NONE'}`);
      setDebugInfo(debugLines.join('\n'));
      
      if (totalPackagesFound === 0) {
        console.error('[Shop] ❌ CRITICAL: No packages found in any offering!');
        console.error('[Shop] 🔧 This means offerings exist but contain no products.');
      }
      
      const allThemes = Object.values(THEMES).map((theme) => {
        const rcProduct = themesMap[theme.productId];
        if (rcProduct) {
          console.log(`[Shop] ✅ Theme "${theme.displayName}" (${theme.productId}) has RevenueCat package`);
          return rcProduct;
        } else {
          console.log(`[Shop] ⚠️ Theme "${theme.displayName}" (${theme.productId}) NOT available in offerings - will show as Unavailable`);
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
          console.log(`[Shop] ✅ Color "${color.displayName}" (${color.productId}) has RevenueCat package`);
          return rcProduct;
        } else {
          console.log(`[Shop] ⚠️ Color "${color.displayName}" (${color.productId}) NOT available in offerings - will show as Unavailable`);
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
      
      console.log('[Shop] ✅ Final product lists created');
      console.log(`[Shop]   - Themes: ${allThemes.length} total (${allThemes.filter(t => t.isAvailable).length} available)`);
      console.log(`[Shop]   - Colors: ${allColors.length} total (${allColors.filter(c => c.isAvailable).length} available)`);
      
      console.log('[Shop] Step 4: Syncing ownership from RevenueCat');
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
        stack: error.stack,
      });
      
      const errorDetails = `Code: ${errorCode}, Readable: ${readableCode}, Underlying: ${underlyingMsg}`;
      const errorMsg = `Failed to load store items. ${errorDetails}`;
      setErrorMessage(errorMsg);
      
      console.log('[Shop] Using fallback local data only (all items marked unavailable except free)');
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
      console.log('[Shop] 📝 If issues persist, please provide:');
      console.log('[Shop]   1. The offering identifiers logged above');
      console.log('[Shop]   2. The storeProduct.identifier values logged above');
      console.log('[Shop]   3. Your RevenueCat dashboard offering identifier strings');
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
    const ownedThemeIds: string[] = ['theme_classic'];
    const ownedChainColorIds: string[] = ['chain_gold'];
    
    console.log('[Shop] 🔍 Processing customer info for ownership');
    console.log(`[Shop] Non-subscription transactions: ${customerInfo.nonSubscriptionTransactions.length}`);
    
    console.log('[Shop] 🎫 ACTIVE ENTITLEMENTS CHECK:');
    const activeEntitlementKeys = Object.keys(customerInfo.entitlements.active);
    console.log(`[Shop]   - Active entitlement count: ${activeEntitlementKeys.length}`);
    console.log(`[Shop]   - Active entitlement keys:`, activeEntitlementKeys);
    
    if (activeEntitlementKeys.length > 0) {
      activeEntitlementKeys.forEach((entitlementKey) => {
        const entitlement = customerInfo.entitlements.active[entitlementKey];
        const entitlementIdentifier = entitlement.identifier;
        const productIdentifier = entitlement.productIdentifier;
        
        console.log(`[Shop]   📌 Entitlement: "${entitlementKey}"`);
        console.log(`[Shop]     - Entitlement Identifier (from SDK): ${entitlementIdentifier}`);
        console.log(`[Shop]     - Product Identifier (from SDK): ${productIdentifier}`);
        
        const mappedProductId = ENTITLEMENT_TO_PRODUCT_MAP[entitlementIdentifier];
        if (mappedProductId) {
          console.log(`[Shop]     - Mapped to internal productId (via REST ID): ${mappedProductId}`);
          if (mappedProductId !== productIdentifier) {
            console.warn(`[Shop]     ⚠️ MISMATCH: Mapped productId (${mappedProductId}) differs from SDK productIdentifier (${productIdentifier})`);
          }
        } else {
          console.warn(`[Shop]     ⚠️ No internal productId mapping found for entitlement identifier: ${entitlementIdentifier}`);
        }
        
        const expectedEntitlementRestId = REVENUECAT_REST_IDS.entitlements[productIdentifier as keyof typeof REVENUECAT_REST_IDS.entitlements];
        if (expectedEntitlementRestId) {
          console.log(`[Shop]     - Expected Entitlement REST ID (from our map): ${expectedEntitlementRestId}`);
          if (expectedEntitlementRestId !== entitlementIdentifier) {
            console.warn(`[Shop]     ⚠️ MISMATCH: Expected REST ID (${expectedEntitlementRestId}) differs from SDK identifier (${entitlementIdentifier})`);
          } else {
            console.log(`[Shop]     ✅ Entitlement REST ID matches our reference map`);
          }
        } else {
          console.warn(`[Shop]     ⚠️ No expected entitlement REST ID found for product: ${productIdentifier}`);
        }
      });
    } else {
      console.log('[Shop]   ℹ️ No active entitlements found (user has not purchased anything yet)');
    }
    
    console.log('[Shop] 📦 PROCESSING NON-SUBSCRIPTION TRANSACTIONS:');
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
    
    setOwnedThemes(ownedThemeIds);
    setOwnedColors(ownedChainColorIds);
    await saveOwnedThemes(ownedThemeIds);
    await saveOwnedColors(ownedChainColorIds);
  };

  const handleBuyTheme = async (product: ProductWithPrice) => {
    if (!product.pkg || !product.isAvailable) {
      console.log(`[Shop] ❌ User tapped Buy for theme "${product.displayName}" but item is unavailable`);
      console.log('[Shop] 🔧 This means the product is not in any RevenueCat offering');
      Alert.alert('Unavailable', 'This item is not available for purchase. It may not be configured in the store.');
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
      const errorCode = error.code || 'N/A';
      const readableCode = error.readableErrorCode || 'N/A';
      const underlyingMsg = error.underlyingErrorMessage || 'N/A';
      
      console.error('[Shop] Error details:', {
        message: error.message,
        code: errorCode,
        readableErrorCode: readableCode,
        underlyingErrorMessage: underlyingMsg,
        domain: error.domain,
        userCancelled: error.userCancelled,
      });
      
      if (!error.userCancelled) {
        const errorDetails = `Code: ${errorCode}, Readable: ${readableCode}, Underlying: ${underlyingMsg}`;
        const errorMsg = `Purchase failed. ${errorDetails}`;
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
    if (!product.pkg || !product.isAvailable) {
      console.log(`[Shop] ❌ User tapped Buy for color "${product.displayName}" but item is unavailable`);
      console.log('[Shop] 🔧 This means the product is not in any RevenueCat offering');
      Alert.alert('Unavailable', 'This item is not available for purchase. It may not be configured in the store.');
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
      const errorCode = error.code || 'N/A';
      const readableCode = error.readableErrorCode || 'N/A';
      const underlyingMsg = error.underlyingErrorMessage || 'N/A';
      
      console.error('[Shop] Error details:', {
        message: error.message,
        code: errorCode,
        readableErrorCode: readableCode,
        underlyingErrorMessage: underlyingMsg,
        domain: error.domain,
        userCancelled: error.userCancelled,
      });
      
      if (!error.userCancelled) {
        const errorDetails = `Code: ${errorCode}, Readable: ${readableCode}, Underlying: ${underlyingMsg}`;
        const errorMsg = `Purchase failed. ${errorDetails}`;
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
      
      const errorDetails = `Code: ${errorCode}, Readable: ${readableCode}, Underlying: ${underlyingMsg}`;
      const errorMsg = `Restore failed. ${errorDetails}`;
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

  if (isExpoGo) {
    const expoGoTitle = 'Development Build Required';
    const expoGoMessage1 = 'RevenueCat in-app purchases require a custom development build and cannot work in Expo Go.';
    const expoGoMessage2 = 'To enable purchases:';
    const expoGoStep1 = '1. Create a development build';
    const expoGoStep2 = '2. Install on a physical device';
    const expoGoStep3 = '3. Test purchases in sandbox mode';
    const expoGoNote = 'Note: You can still browse and equip free themes and colors below.';
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
          contentContainerStyle={styles.expoGoContainer}
        >
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={64}
            color="#FF9500"
          />
          <Text style={styles.expoGoTitle}>{expoGoTitle}</Text>
          <Text style={styles.expoGoMessage}>{expoGoMessage1}</Text>
          
          <View style={styles.expoGoStepsCard}>
            <Text style={styles.expoGoStepsTitle}>{expoGoMessage2}</Text>
            <Text style={styles.expoGoStep}>{expoGoStep1}</Text>
            <Text style={styles.expoGoStep}>{expoGoStep2}</Text>
            <Text style={styles.expoGoStep}>{expoGoStep3}</Text>
          </View>
          
          <Text style={styles.expoGoNote}>{expoGoNote}</Text>
          
          <TouchableOpacity
            style={styles.expoGoContinueButton}
            onPress={() => {
              setIsExpoGo(false);
              setErrorMessage(null);
            }}
          >
            <Text style={styles.expoGoContinueButtonText}>{continueText}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (errorMessage && !isExpoGo) {
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
          {debugInfo && (
            <View style={styles.debugBox}>
              <Text style={styles.debugText}>{debugInfo}</Text>
            </View>
          )}
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
      
      {debugInfo && (
        <View style={styles.debugBanner}>
          <Text style={styles.debugBannerText}>{debugInfo}</Text>
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
  expoGoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 20,
  },
  expoGoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  expoGoMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  expoGoStepsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expoGoStepsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  expoGoStep: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  expoGoNote: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  expoGoContinueButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  expoGoContinueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
  debugBox: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    maxWidth: '100%',
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  debugBanner: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 152, 0, 0.3)',
    padding: 8,
  },
  debugBannerText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    textAlign: 'center',
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
