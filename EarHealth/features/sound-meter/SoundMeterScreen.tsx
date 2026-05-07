import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { SoundLevelBar } from './components/SoundLevelBar';
import { SoundLevelDisplay } from './components/SoundLevelDisplay';
import { SoundLevelGuide } from './components/SoundLevelGuide';
import { useSoundMeter } from './hooks/useSoundMeter';

export default function SoundMeterScreen() {
  const {
    isWeb,
    isMeasuring,
    soundLevel,
    averageLevel,
    statusMessage,
    category,
    toggleMeasure,
  } = useSoundMeter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sonomètre</Text>

        <SoundLevelDisplay
          soundLevel={soundLevel}
          averageLevel={averageLevel}
          category={category}
        />

        <SoundLevelBar soundLevel={soundLevel} />

        <TouchableOpacity
          style={[styles.button, isMeasuring ? styles.buttonStop : styles.buttonStart]}
          onPress={toggleMeasure}
        >
          <Text style={styles.buttonText}>{isMeasuring ? 'Arrêter' : 'Démarrer'}</Text>
        </TouchableOpacity>

        <Text style={styles.info}>{statusMessage}</Text>
        <Text style={styles.help}>
          {isWeb
            ? 'Autorisez le microphone dans le navigateur.'
            : 'Autorisez le microphone sur votre appareil.'}
        </Text>

        <SoundLevelGuide />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 40,
    color: Colors.text,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonStart: {
    backgroundColor: Colors.primary,
  },
  buttonStop: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  info: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  help: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
