import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';

interface TestWelcomeViewProps {
  onStart: () => void;
}

const REQUIREMENTS = [
  {
    icon: 'headset'          as const,
    title: 'Écouteurs requis',
    desc:  'Pour un test précis et binaural, utilisez des écouteurs ou un casque.',
    accent: true,
  },
  {
    icon: 'moon-outline'     as const,
    title: 'Endroit calme',
    desc:  "Trouvez un environnement silencieux. Le bruit ambiant fausse les résultats.",
    accent: false,
  },
  {
    icon: 'time-outline'     as const,
    title: 'Environ 5–7 minutes',
    desc:  "Le test adapte son volume automatiquement — ne l'interrompez pas.",
    accent: false,
  },
  {
    icon: 'volume-medium-outline' as const,
    title: 'Volume stable',
    desc:  "Réglez le volume de votre appareil à 60–80 % avant de commencer.",
    accent: false,
  },
];

export const TestWelcomeView: React.FC<TestWelcomeViewProps> = ({ onStart }) => (
  <>
    <View style={styles.hero}>
      <LinearGradient
        colors={['#E0F2F7', '#C7EBF3', '#E0F2F7']}
        style={styles.iconRing}
      >
        <Ionicons name="ear-outline" size={54} color={Colors.primary} />
      </LinearGradient>
      <Text style={styles.heroTitle}>Test Auditif</Text>
      <Text style={styles.heroSubtitle}>
        Évaluez votre audition avec un algorithme adaptatif inspiré de l'audiométrie professionnelle.
      </Text>
    </View>

    <Card>
      <Text style={styles.sectionLabel}>Avant de commencer</Text>
      {REQUIREMENTS.map((r) => (
        <View key={r.title} style={styles.reqRow}>
          <View style={[styles.reqIcon, r.accent && styles.reqIconAccent]}>
            <Ionicons name={r.icon} size={20} color={r.accent ? Colors.primary : Colors.textSecondary} />
          </View>
          <View style={styles.reqText}>
            <Text style={styles.reqTitle}>{r.title}</Text>
            <Text style={styles.reqDesc}>{r.desc}</Text>
          </View>
        </View>
      ))}
    </Card>

    <Card style={styles.disclaimerCard}>
      <View style={styles.disclaimerRow}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
        <Text style={styles.disclaimerText}>
          Ce test n'est pas un diagnostic médical. Pour une évaluation clinique, consultez un audiologiste.
        </Text>
      </View>
    </Card>

    <Button
      title="Commencer le test"
      variant="primary"
      size="lg"
      onPress={onStart}
      style={styles.cta}
    />
  </>
);

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  iconRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios:     { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.6,
    marginBottom: 10,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  reqIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  reqIconAccent: { backgroundColor: Colors.primaryLight },
  reqText: { flex: 1 },
  reqTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 3,
  },
  reqDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  disclaimerCard: { backgroundColor: Colors.surfaceSecondary },
  disclaimerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
  cta: { marginTop: 4 },
});
