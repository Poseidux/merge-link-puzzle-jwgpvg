
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEMES, CHAIN_HIGHLIGHT_COLORS } from '@/styles/commonStyles';

export default function ProductsListScreen() {
  const themes = Object.values(THEMES);
  const chainColors = Object.values(CHAIN_HIGHLIGHT_COLORS);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'All Products & IDs',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THEMES ({themes.length} total)</Text>
          <Text style={styles.sectionSubtitle}>Free: 1 | Paid: {themes.length - 1}</Text>
          {themes.map((theme, index) => {
            const isFree = theme.price === 0;
            const priceDisplay = isFree ? 'FREE' : `$${theme.price.toFixed(2)}`;
            return (
              <View key={index} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <Text style={styles.productName}>{theme.displayName}</Text>
                  <Text style={[styles.productPrice, isFree && styles.freePrice]}>
                    {priceDisplay}
                  </Text>
                </View>
                <Text style={styles.productId}>ID: {theme.productId}</Text>
                <Text style={styles.productType}>Type: {theme.type}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CHAIN HIGHLIGHT COLORS ({chainColors.length} total)</Text>
          <Text style={styles.sectionSubtitle}>Free: 1 | Paid: {chainColors.length - 1}</Text>
          {chainColors.map((color, index) => {
            const isFree = color.price === 0;
            const priceDisplay = isFree ? 'FREE' : `$${color.price.toFixed(2)}`;
            return (
              <View key={index} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <View style={styles.colorNameRow}>
                    <Text style={styles.productName}>{color.displayName}</Text>
                    <View style={[styles.colorPreview, { backgroundColor: color.color }]} />
                  </View>
                  <Text style={[styles.productPrice, isFree && styles.freePrice]}>
                    {priceDisplay}
                  </Text>
                </View>
                <Text style={styles.productId}>ID: {color.productId}</Text>
                <Text style={styles.productType}>Type: {color.type}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>SUMMARY</Text>
          <Text style={styles.summaryText}>Total Products: {themes.length + chainColors.length}</Text>
          <Text style={styles.summaryText}>Total Themes: {themes.length}</Text>
          <Text style={styles.summaryText}>Total Chain Colors: {chainColors.length}</Text>
          <Text style={styles.summaryText}>Free Items: 2 (theme_classic, chain_gold)</Text>
          <Text style={styles.summaryText}>Paid Items: {themes.length + chainColors.length - 2}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667EEA',
  },
  freePrice: {
    color: '#34C759',
  },
  productId: {
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  productType: {
    fontSize: 12,
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: '#D1D1D6',
    marginVertical: 24,
  },
  summary: {
    backgroundColor: '#667EEA',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    marginBottom: 32,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 6,
  },
});
