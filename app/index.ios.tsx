
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, THEMES } from '@/styles/commonStyles';
import { loadGameState, loadLifetimeStats, LifetimeStats } from '@/utils/storage';
import { formatTileValue } from '@/utils/gameLogic';
import ConfirmModal from '@/components/ConfirmModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const APP_VERSION = "v2.1.0";

export default function HomeScreen() {
  const router = useRouter();
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [stats, setStats] = useState<LifetimeStats>({
    highestTileEver: 0,
    gamesPlayed: 0,
    longestChain: 0,
  });
  const [bestScore, setBestScore] = useState(0);

  const theme = THEMES.classic;

  useEffect(() => {
    console.log('HomeScreen mounted, checking for saved game');
    console.log(`🚀 APP VERSION: ${APP_VERSION} - If you see this version, your changes loaded!`);
    checkForSavedGame();
    loadStats();
  }, []);

  const checkForSavedGame = async () => {
    const savedState = await loadGameState();
    if (savedState) {
      setHasSavedGame(true);
      setBestScore(savedState.bestScore);
    }
  };

  const loadStats = async () => {
    const loadedStats = await loadLifetimeStats();
    console.log('[Home] Loaded lifetime stats:', loadedStats);
    setStats(loadedStats);
  };

  const handleContinue = () => {
    console.log('User tapped Continue button - navigating to /game with replace');
    router.replace('/game');
  };

  const handleNewGame = () => {
    if (hasSavedGame) {
      setShowConfirmModal(true);
    } else {
      startNewGame();
    }
  };

  const startNewGame = () => {
    console.log('User tapped New Game button - navigating to /game with newGame param and replace');
    setShowConfirmModal(false);
    router.replace('/game?newGame=true');
  };

  const bestScoreText = bestScore > 0 ? formatTileValue(bestScore) : '—';
  const highestTileText = stats.highestTileEver > 0 ? formatTileValue(stats.highestTileEver) : '—';
  const gamesPlayedText = stats.gamesPlayed > 0 ? stats.gamesPlayed.toString() : '—';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.boardBackground }]} edges={['top', 'bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.accentColor }]}>Merge Link</Text>
          <Text style={styles.subtitle}>Connect & Merge Numbers</Text>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Best Score</Text>
              <Text style={[styles.statValue, { color: theme.accentColor }]}>{bestScoreText}</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Highest Tile</Text>
              <Text style={[styles.statValue, { color: theme.accentColor }]}>{highestTileText}</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Games Played</Text>
              <Text style={[styles.statValue, { color: theme.accentColor }]}>{gamesPlayedText}</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {hasSavedGame && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: theme.accentColor }]}
              onPress={handleContinue}
            >
              <Text style={styles.primaryButtonText}>Continue Game</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.button, 
              hasSavedGame ? styles.secondaryButton : [styles.primaryButton, { backgroundColor: theme.accentColor }]
            ]}
            onPress={handleNewGame}
          >
            <Text style={hasSavedGame ? styles.secondaryButtonText : styles.primaryButtonText}>New Game</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: theme.accentColor }]}>{APP_VERSION}</Text>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showConfirmModal}
        title="Start New Game?"
        message="Your current progress will be lost. Are you sure?"
        confirmText="New Game"
        cancelText="Cancel"
        onConfirm={startNewGame}
        onCancel={() => setShowConfirmModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  statsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  statItem: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  statDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.border,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
