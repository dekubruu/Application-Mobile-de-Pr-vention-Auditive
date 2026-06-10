import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

export const QuizLoadingView: React.FC = () => (
  <View style={styles.container}>
    <View style={styles.iconRing}>
      <Ionicons name="help-circle-outline" size={36} color={Colors.primary} />
    </View>
    <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
    <Text style={styles.title}>Chargement du quiz…</Text>
    <Text style={styles.sub}>Sélection de questions au hasard.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  iconRing: {
    width: 84, height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  spinner: { marginTop: 4 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
