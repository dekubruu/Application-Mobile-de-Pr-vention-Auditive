import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Colors } from '@/constants/colors';
import { SoundLevelBar } from './components/SoundLevelBar';
import { SoundLevelDisplay } from './components/SoundLevelDisplay';
import { SoundLevelGuide } from './components/SoundLevelGuide';
import { DBFS_TO_DB_OFFSET } from './constants/sound-level.constants';
import { useSoundMeter } from './hooks/useSoundMeter';

export default function SoundMeterScreen() {
  const { isWeb, isMeasuring, soundLevel, averageLevel, statusMessage, rawDbfs, category, toggleMeasure } =
    useSoundMeter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sonomètre</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.meter}>
          <SoundLevelDisplay soundLevel={soundLevel} averageLevel={averageLevel} category={category} />
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

        {/* TEMPORARY calibration diagnostic — visible only in development. */}
        {__DEV__ && (
          <View style={styles.debugBox}>
            <Text style={styles.debugTitle}>🔧 Diagnostic calibration (DEV)</Text>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>metering brut</Text>
              <Text style={styles.debugValue}>
                {rawDbfs !== null ? `${rawDbfs.toFixed(1)} dBFS` : '—'}
              </Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>dB affiché</Text>
              <Text style={styles.debugValue}>{soundLevel} dB</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>offset appliqué</Text>
              <Text style={styles.debugValue}>+{DBFS_TO_DB_OFFSET}</Text>
            </View>
          </View>
        )}

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
  debugBox: {
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: Colors.warningLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  debugTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.warning,
    marginBottom: 8,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  debugLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  debugValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
});
