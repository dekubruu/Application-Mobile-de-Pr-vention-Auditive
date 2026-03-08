import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/colors';

export default function SoundMeterScreen() {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [soundLevel, setSoundLevel] = useState(0);

  const toggleMeasure = () => {
    setIsMeasuring(!isMeasuring);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        <Text style={styles.title}>Sonomètre</Text>

        <Text style={styles.level}>{soundLevel} dB</Text>

        <View style={styles.indicator}>
          <View
            style={[
              styles.bar,
              {
                width: `${Math.min(soundLevel, 100)}%`,
                backgroundColor:
                  soundLevel < 60
                    ? '#22C55E'
                    : soundLevel < 85
                    ? '#F59E0B'
                    : '#EF4444',
              },
            ]}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            isMeasuring ? styles.buttonStop : styles.buttonStart,
          ]}
          onPress={toggleMeasure}
        >
          <Text style={styles.buttonText}>
            {isMeasuring ? 'Arrêter' : 'Démarrer'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.info}>
          Niveau sonore recommandé : moins de 85 dB
        </Text>

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
  level: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 30,
  },
  indicator: {
    width: '100%',
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 40,
  },
  bar: {
    height: '100%',
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
});