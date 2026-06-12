import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Colors } from '@/constants/colors';
import { SoundLevelBar } from './components/SoundLevelBar';
import { SoundLevelDisplay } from './components/SoundLevelDisplay';
import { SoundLevelGuide } from './components/SoundLevelGuide';
import { useSoundMeter } from './hooks/useSoundMeter';

export default function SoundMeterScreen() {
  const { isWeb, isMeasuring, soundLevel, averageLevel, statusMessage, category, overRange, toggleMeasure } =
    useSoundMeter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sonomètre</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.meter}>
          <SoundLevelDisplay soundLevel={soundLevel} averageLevel={averageLevel} category={category} overRange={overRange} />
          <SoundLevelBar soundLevel={soundLevel} />
        </View>

        <Button
          title={isMeasuring ? 'Arrêter la mesure' : 'Démarrer la mesure'}
          variant={isMeasuring ? 'danger' : 'primary'}
          size="lg"
          onPress={toggleMeasure}
          style={styles.btn}
        />

        <Text style={styles.status}>{statusMessage}</Text>
        <Text style={styles.hint}>
          {isWeb
            ? 'Autorisez le microphone dans le navigateur.'
            : 'Autorisez le microphone sur votre appareil.'}
        </Text>

        <SoundLevelGuide />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  meter: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  btn: {
    marginBottom: 16,
  },
  status: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 19,
  },
});
