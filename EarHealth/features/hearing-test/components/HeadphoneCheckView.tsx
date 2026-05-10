import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import type { TestMode } from '../types/hearing-test.types';

interface HeadphoneCheckViewProps {
  onSelect: (mode: TestMode) => void;
}

const MODES: {
  mode: TestMode;
  icon: 'headset' | 'volume-medium';
  title: string;
  subtitle: string;
  badge: string;
  features: string[];
  recommended?: boolean;
}[] = [
  {
    mode: 'headset',
    icon: 'headset',
    title: 'Avec écouteurs',
    subtitle: 'Test complet — binaural + chaque oreille séparément',
    badge: 'Recommandé',
    recommended: true,
    features: [
      'Screening binaural (les deux oreilles)',
      'Test oreille gauche avec sons imprévisibles',
      'Test oreille droite avec sons imprévisibles',
      'Résultats détaillés par oreille',
    ],
  },
  {
    mode: 'speaker',
    icon: 'volume-medium',
    title: 'Sans écouteurs',
    subtitle: 'Test simplifié — seuil auditif global',
    badge: 'Simplifié',
    recommended: false,
    features: [
      'Son diffusé par le haut-parleur',
      'Réponse simple : entendu / pas entendu',
      'Résultat global uniquement',
      'Moins précis qu\'avec des écouteurs',
    ],
  },
];

export const HeadphoneCheckView: React.FC<HeadphoneCheckViewProps> = ({ onSelect }) => (
  <>
    <View style={styles.hero}>
      <Text style={styles.heroTitle}>Choisissez votre mode</Text>
      <Text style={styles.heroSubtitle}>
        Le type de test dépend de votre équipement audio.
      </Text>
    </View>

    {MODES.map((m) => (
      <Pressable key={m.mode} onPress={() => onSelect(m.mode)}>
        {({ pressed }) => (
          <Card
            style={[
              styles.modeCard,
              m.recommended && styles.modeCardHighlight,
              pressed && styles.modeCardPressed,
            ]}
            elevated={m.recommended}
          >
            <View style={styles.modeHeader}>
              <View style={[styles.iconWrap, m.recommended && styles.iconWrapHighlight]}>
                <Ionicons
                  name={m.icon}
                  size={28}
                  color={m.recommended ? Colors.primary : Colors.textSecondary}
                />
              </View>
              <View style={styles.modeTitles}>
                <View style={styles.titleRow}>
                  <Text style={styles.modeTitle}>{m.title}</Text>
                  <View style={[styles.badge, m.recommended ? styles.badgePrimary : styles.badgeGray]}>
                    <Text style={[styles.badgeText, m.recommended ? styles.badgeTextPrimary : styles.badgeTextGray]}>
                      {m.badge}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modeSubtitle}>{m.subtitle}</Text>
              </View>
            </View>

            <View style={styles.featureList}>
              {m.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons
                    name={i === 3 && !m.recommended ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                    size={16}
                    color={i === 3 && !m.recommended ? Colors.warning : Colors.success}
                  />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.selectBtn, m.recommended && styles.selectBtnPrimary]}>
              <Text style={[styles.selectBtnText, m.recommended && styles.selectBtnTextPrimary]}>
                {m.recommended ? 'Commencer ce test →' : 'Utiliser ce mode →'}
              </Text>
            </View>
          </Card>
        )}
      </Pressable>
    ))}
  </>
);

const styles = StyleSheet.create({
  hero: {
    paddingVertical: 24,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modeCard: {
    marginBottom: 12,
    padding: 20,
  },
  modeCardHighlight: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  modeCardPressed: { opacity: 0.88 },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapHighlight: {
    backgroundColor: Colors.primaryLight,
  },
  modeTitles: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  modeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  modeSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgePrimary:     { backgroundColor: Colors.primaryLight },
  badgeGray:        { backgroundColor: Colors.surfaceSecondary },
  badgeText:        { fontSize: 11, fontWeight: '700' },
  badgeTextPrimary: { color: Colors.primary },
  badgeTextGray:    { color: Colors.textSecondary },
  featureList: { gap: 10, marginBottom: 16 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  selectBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  selectBtnPrimary: { backgroundColor: Colors.primary },
  selectBtnText:        { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  selectBtnTextPrimary: { color: '#fff' },
});
