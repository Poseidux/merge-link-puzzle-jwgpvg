
import { loadGameState } from '@/utils/storage';
import { GameState } from '@/types/game';
import { useRouter } from 'expo-router';
import ConfirmModal from '@/components/ConfirmModal';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/styles/commonStyles';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// VERSION INDICATOR - Update this number when you make changes to verify they're loading
const APP_VERSION = "v2.0.1";

export default function HomeScreen() {
  const router = useRouter();
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    console.log('HomeScreen mounted, checking for saved game');
    console.log(`🚀 APP VERSION: ${APP_VERSION} - If you see this version, your changes loaded!`);
    checkForSavedGame();
  }, []);

  const checkForSavedGame = async () => {
    const savedState = await loadGameState();
    setHasSavedGame(!!savedState);
  };

  const handleContinue = () => {
    console.log('User tapped Continue button - navigating to /game');
    router.push('/game');
  };

  const handleNewGame = () => {
    if (hasSavedGame) {
      setShowConfirmModal(true);
    } else {
      startNewGame();
    }
  };

  const startNewGame = () => {
    console.log('User tapped New Game button - navigating to /game with newGame param');
    setShowConfirmModal(false);
    router.push('/game?newGame=true');
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Merge Link</Text>
        <Text style={styles.subtitle}>Connect & Merge Numbers</Text>

        <View style={styles.buttonContainer}>
          {hasSavedGame && (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleContinue}
            >
              <Text style={styles.buttonText}>Continue Game</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, hasSavedGame ? styles.secondaryButton : styles.primaryButton]}
            onPress={handleNewGame}
          >
            <Text style={styles.buttonText}>New Game</Text>
          </TouchableOpacity>
        </View>

        {/* VERSION INDICATOR - Shows at bottom so you can verify changes loaded */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>{APP_VERSION}</Text>
          <Text style={styles.versionSubtext}>
            If you see this version, your changes loaded successfully!
          </Text>
        </View>
      </View>

      <ConfirmModal
        visible={showConfirmModal}
        title="Start New Game?"
        message="Your current progress will be lost. Are you sure?"
        onConfirm={startNewGame}
        onCancel={() => setShowConfirmModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#a8b2d1',
    marginBottom: 60,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  versionContainer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  versionText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  versionSubtext: {
    color: '#a8b2d1',
    fontSize: 12,
    textAlign: 'center',
  },
});
