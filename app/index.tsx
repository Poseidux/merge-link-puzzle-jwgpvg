
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { loadGameState } from '@/utils/storage';
import { GameState } from '@/types/game';
import ConfirmModal from '@/components/ConfirmModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function HomeScreen() {
  const router = useRouter();
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [savedGameState, setSavedGameState] = useState<GameState | null>(null);
  const [confirmNewGameVisible, setConfirmNewGameVisible] = useState(false);

  useEffect(() => {
    console.log('HomeScreen mounted, checking for saved game');
    checkForSavedGame();
  }, []);

  async function checkForSavedGame() {
    const savedState = await loadGameState();
    console.log('Saved game state:', savedState);
    
    if (savedState && savedState.grid && savedState.grid.length > 0) {
      setHasSavedGame(true);
      setSavedGameState(savedState);
    } else {
      setHasSavedGame(false);
      setSavedGameState(null);
    }
  }

  function handleContinue() {
    console.log('User tapped Continue button');
    if (hasSavedGame) {
      router.push('/game');
    }
  }

  function handleNewGame() {
    console.log('User tapped New Game button');
    if (hasSavedGame) {
      setConfirmNewGameVisible(true);
    } else {
      startNewGame();
    }
  }

  function startNewGame() {
    console.log('Starting new game');
    setConfirmNewGameVisible(false);
    router.push('/game?newGame=true');
  }

  const continueButtonOpacity = hasSavedGame ? 1 : 0.5;
  const continueText = 'Continue';
  const scoreText = savedGameState ? `Score: ${savedGameState.score}` : '';

  return (
    <LinearGradient
      colors={[colors.primary, colors.accent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Number</Text>
          <Text style={styles.title}>Merge</Text>
        </View>

        {hasSavedGame && savedGameState && (
          <View style={styles.savedGameInfo}>
            <Text style={styles.savedGameText}>{scoreText}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { opacity: continueButtonOpacity }]}
            onPress={handleContinue}
            disabled={!hasSavedGame}
          >
            <Text style={styles.buttonText}>{continueText}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleNewGame}
          >
            <Text style={styles.buttonText}>New Game</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ConfirmModal
        visible={confirmNewGameVisible}
        title="Start New Game?"
        message="Starting a new game will overwrite your current progress. Are you sure?"
        confirmText="New Game"
        cancelText="Cancel"
        onConfirm={startNewGame}
        onCancel={() => setConfirmNewGameVisible(false)}
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
    paddingHorizontal: 32,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    letterSpacing: 2,
  },
  savedGameInfo: {
    marginBottom: 40,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  savedGameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
});
