import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import type { HeadphoneDetectionResult } from '../services/HeadphoneDetector';
import type { TestMode } from '../types/hearing-test.types';

interface HeadphoneDetectViewProps {
  detection: HeadphoneDetectionResult | null;
  onSelect:  (mode: TestMode) => void;
}

const TYPE_LABEL: Record<string, string> = {
  airpods:   'AirPods',
  bluetooth: 'Bluetooth',
  wired:     'Filaire',
  speaker:   'Haut-parleur',
  unknown:   'Inconnu',
};

const TYPE_ICON: Record<string, 'headset' | 'bluetooth' | 'headset-outline' | 'ear-outline'> = {
  airpods:   'headset',
  bluetooth: 'headset',
  wired:     'headset-outline',
  speaker:   'ear-outline',
  unknown:   'headset-outline',
};

export const HeadphoneDetectView: React.FC<HeadphoneDetectViewProps> = ({
  detection,
  onSelect,
}) => {
  const detected = detection?.connected === true;

  return (
    <>
      <View style={styles.hero}>
        <View style={[styles.iconRing, detected ? styles.iconRingConnected : styles.iconRingNeutral]}>
          <Ionicons
            name={detected ? (TYPE_ICON[detection!.type] ?? 'headset') : 'headset-outline'}
            size={48}
            color={detected ? Colors.primary : Colors.textSecondary}
          />
        </View>
        <Text style={styles.heroTitle}>Équipement audio</Text>
        <Text style={styles.heroSubtitle}>
          {detected
            ? "Écouteurs détectés. Le test binaural par oreille est disponible."
            : "Aucun écouteur détecté. Un casque ou des écouteurs sont fortement recommandés."}
        </Text>
      </View>

      {/* Detection result pill */}
      {detected && detection && (
        <Card style={styles.detectedCard}>
          <View style={styles.detectedRow}>
            <View style={styles.detectedIconWrap}>
              <Ionicons name={TYPE_ICON[detection.type] ?? 'headset'} size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.detectedTitleRow}>
                <Text style={styles.detectedName}>
                  {detection.label
                    ? detection.label.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                    : 'Écouteurs connectés'}
                </Text>
                <View style={styles.detectedBadge}>
                  <Ionicons name="radio-outline" size={11} color={Colors.success} />
                  <Text style={styles.detectedBadgeText}>Connecté</Text>
                </View>
              </View>
              <Text style={styles.detectedType}>{TYPE_LABEL[detection.type]}</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Mode selection */}
      <Pressable onPress={() => onSelect('headset')}>
        {({ pressed }) => (
          <Card style={[styles.modeCard, styles.modeCardPrimary, pressed && styles.modeCardPressed]}>
            <View style={styles.modeHeader}>
              <View style={styles.modeIconWrapPrimary}>
                <Ionicons name="headset" size={26} color={Colors.primary} />
              </View>
              <View style={styles.modeTitles}>
                <View style={styles.modeTitleRow}>
                  <Text style={styles.modeTitle}>Avec écouteurs</Text>
                  <View style={styles.badgePrimary}>
                    <Text style={styles.badgePrimaryText}>Recommandé</Text>
                  </View>
                </View>
                <Text style={styles.modeSubtitle}>Test binaural — chaque oreille séparément</Text>
              </View>
            </View>
            <View style={styles.featureList}>
              {[
                'Audiogramme complet gauche + droite',
                'Détection d\'asymétrie auditive',
                '6 fréquences par oreille (250 Hz – 8 kHz)',
                'Résultats les plus précis',
              ].map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle-outline" size={15} color={Colors.success} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
            <View style={styles.selectBtnPrimary}>
              <Text style={styles.selectBtnPrimaryText}>Commencer avec écouteurs →</Text>
            </View>
          </Card>
        )}
      </Pressable>

      <Pressable onPress={() => onSelect('speaker')}>
        {({ pressed }) => (
          <Card style={[styles.modeCard, pressed && styles.modeCardPressed]}>
            <View style={styles.modeHeader}>
              <View style={styles.modeIconWrap}>
                <Ionicons name="volume-medium" size={26} color={Colors.textSecondary} />
              </View>
              <View style={styles.modeTitles}>
                <View style={styles.modeTitleRow}>
                  <Text style={styles.modeTitle}>Sans écouteurs</Text>
                  <View style={styles.badgeGray}>
                    <Text style={styles.badgeGrayText}>Simplifié</Text>
                  </View>
                </View>
                <Text style={styles.modeSubtitle}>Test global — haut-parleur, résultat unique</Text>
              </View>
            </View>
            <Card style={styles.speakerWarn}>
              <View style={styles.warnRow}>
                <Ionicons name="alert-circle-outline" size={15} color={Colors.warning} />
                <Text style={styles.warnText}>
                  Sans isolation L/R, le test ne peut pas détecter les asymétries. Précision réduite.
                </Text>
              </View>
            </Card>
            <View style={styles.selectBtn}>
              <Text style={styles.selectBtnText}>Continuer sans écouteurs</Text>
            </View>
          </Card>
        )}
      </Pressable>
    </>
  );
};

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconRingConnected: { backgroundColor: Colors.primaryLight },
  iconRingNeutral:   { backgroundColor: Colors.surfaceSecondary },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 4,
  },
  detectedCard: { borderColor: Colors.success, borderWidth: 1.5, marginBottom: 4 },
  detectedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detectedIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  detectedName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.successLight,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  detectedBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.success },
  detectedType: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  modeCard: { marginBottom: 10 },
  modeCardPrimary: { borderColor: Colors.primary, borderWidth: 2 },
  modeCardPressed: { opacity: 0.88 },
  modeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  modeIconWrapPrimary: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTitles: { flex: 1 },
  modeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 3,
  },
  modeTitle:   { fontSize: 16, fontWeight: '700', color: Colors.text },
  modeSubtitle:{ fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  badgePrimary: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgePrimaryText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  badgeGray: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeGrayText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
  featureList: { gap: 8, marginBottom: 14 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  speakerWarn:  { backgroundColor: Colors.warningLight, borderColor: Colors.warning, marginBottom: 14, paddingVertical: 10 },
  warnRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  warnText:     { flex: 1, fontSize: 12, color: Colors.warning, lineHeight: 18 },
  selectBtnPrimary: {
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  selectBtn: {
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
});
