import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import { RISK_THRESHOLD_DB, SOUND_LEVEL_GUIDE } from '../constants/sound-level.constants';

export const SoundLevelGuide: React.FC = () => (
  <Card>
    <Text style={styles.title}>Guide des niveaux sonores</Text>
    <View style={styles.thresholdBanner}>
      <Ionicons name="warning-outline" size={16} color={Colors.warning} />
      <Text style={styles.thresholdText}>
        Seuil de risque : <Text style={styles.thresholdValue}>{RISK_THRESHOLD_DB} dB</Text>. Au-delà,
        l&apos;exposition prolongée peut endommager l&apos;audition.
      </Text>
    </View>
    {SOUND_LEVEL_GUIDE.map((entry, index) => (
      <View key={index} style={[styles.row, index < SOUND_LEVEL_GUIDE.length - 1 && styles.rowBorder]}>
        <View style={[styles.dot, { backgroundColor: entry.color }]} />
        <Text style={styles.text}>{entry.text}</Text>
      </View>
    ))}
  </Card>
);

const styles = StyleSheet.create({
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
    letterSpacing: -0.1,
  },
  thresholdBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  thresholdText: { flex: 1, fontSize: 12, color: Colors.text, lineHeight: 17 },
  thresholdValue: { fontWeight: '800', color: Colors.warning },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 9,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});
