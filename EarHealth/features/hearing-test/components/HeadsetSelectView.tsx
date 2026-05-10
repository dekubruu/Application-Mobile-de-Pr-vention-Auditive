import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';

interface HeadsetOption {
  id:      string;
  brand:   string;
  name:    string;
  type:    'in-ear' | 'over-ear' | 'on-ear';
  icon:    'headset' | 'ear' | 'musical-notes';
  popular: boolean;
}

const HEADSETS: HeadsetOption[] = [
  { id: 'airpods3',      brand: 'Apple',   name: 'AirPods (3e gén.)',       type: 'in-ear',   icon: 'ear',         popular: true  },
  { id: 'airpods_pro2',  brand: 'Apple',   name: 'AirPods Pro (2e gén.)',   type: 'in-ear',   icon: 'ear',         popular: true  },
  { id: 'airpods_max',   brand: 'Apple',   name: 'AirPods Max',             type: 'over-ear', icon: 'headset',     popular: true  },
  { id: 'sony_wh1000xm5',brand: 'Sony',    name: 'WH-1000XM5',              type: 'over-ear', icon: 'headset',     popular: true  },
  { id: 'sony_wf1000xm5',brand: 'Sony',    name: 'WF-1000XM5',              type: 'in-ear',   icon: 'ear',         popular: false },
  { id: 'bose_qc45',     brand: 'Bose',    name: 'QuietComfort 45',         type: 'over-ear', icon: 'headset',     popular: false },
  { id: 'bose_qe2',      brand: 'Bose',    name: 'QuietComfort Earbuds II', type: 'in-ear',   icon: 'ear',         popular: false },
  { id: 'samsung_buds2', brand: 'Samsung', name: 'Galaxy Buds2 Pro',        type: 'in-ear',   icon: 'ear',         popular: false },
  { id: 'jabra_85h',     brand: 'Jabra',   name: 'Evolve2 85',              type: 'over-ear', icon: 'headset',     popular: false },
  { id: 'generic_iem',   brand: 'Autre',   name: 'Écouteurs intra-auriculaires', type: 'in-ear', icon: 'musical-notes', popular: false },
  { id: 'generic_over',  brand: 'Autre',   name: 'Casque circum-auriculaire',   type: 'over-ear', icon: 'headset',  popular: false },
];

const TYPE_LABEL: Record<string, string> = {
  'in-ear':   'Intra',
  'over-ear': 'Circum',
  'on-ear':   'Supra',
};

interface HeadsetSelectViewProps {
  onSelect:           (modelId: string | null) => void;
  detectedHeadsetId?: string | null;
}

export const HeadsetSelectView: React.FC<HeadsetSelectViewProps> = ({ onSelect, detectedHeadsetId }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [showAll,  setShowAll]  = useState(false);

  // Auto-select detected headset when it becomes available
  useEffect(() => {
    if (detectedHeadsetId) setSelected(detectedHeadsetId);
  }, [detectedHeadsetId]);

  const baseList = showAll ? HEADSETS : HEADSETS.filter(h => h.popular);
  // Bubble detected headset to the top of the list
  const visible = detectedHeadsetId
    ? [
        ...baseList.filter(h => h.id === detectedHeadsetId),
        ...baseList.filter(h => h.id !== detectedHeadsetId),
      ]
    : baseList;

  return (
    <>
      <View style={styles.hero}>
        <View style={styles.iconRing}>
          <Ionicons name="headset" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Vos écouteurs</Text>
        <Text style={styles.subtitle}>
          Sélectionnez votre modèle pour une meilleure précision du test.{'\n'}
          (La calibration par modèle sera disponible prochainement.)
        </Text>
      </View>

      <Card style={styles.listCard}>
        <Text style={styles.sectionLabel}>Modèles populaires</Text>

        {visible.map(h => {
          const isSelected = selected === h.id;
          return (
            <Pressable
              key={h.id}
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => setSelected(isSelected ? null : h.id)}
            >
              <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                <Ionicons
                  name={h.icon}
                  size={20}
                  color={isSelected ? Colors.primary : Colors.textSecondary}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowBrand, isSelected && styles.rowBrandSelected]}>
                  {h.brand}
                </Text>
                <Text style={[styles.rowName, isSelected && styles.rowNameSelected]}>
                  {h.name}
                </Text>
              </View>
              <View style={[styles.typeBadge, isSelected && styles.typeBadgeSelected]}>
                <Text style={[styles.typeText, isSelected && styles.typeTextSelected]}>
                  {TYPE_LABEL[h.type]}
                </Text>
              </View>
              {h.id === detectedHeadsetId && (
                <View style={styles.detectedBadge}>
                  <Ionicons name="radio-outline" size={11} color={Colors.success} />
                  <Text style={styles.detectedText}>Détecté</Text>
                </View>
              )}
              {isSelected && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              )}
            </Pressable>
          );
        })}

        {!showAll && (
          <Pressable style={styles.showMoreBtn} onPress={() => setShowAll(true)}>
            <Text style={styles.showMoreText}>Voir plus de modèles</Text>
            <Ionicons name="chevron-down" size={14} color={Colors.primary} />
          </Pressable>
        )}
      </Card>

      {/* Coming-soon calibration note */}
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="flask-outline" size={16} color={Colors.primary} />
          <Text style={styles.infoText}>
            Calibration AutoEq par modèle en cours de développement — votre sélection sera utilisée automatiquement lors du prochain déploiement.
          </Text>
        </View>
      </Card>

      <Button
        title={selected ? `Continuer avec ${HEADSETS.find(h => h.id === selected)?.name}` : 'Continuer sans sélection'}
        variant="primary"
        size="lg"
        onPress={() => onSelect(selected)}
        style={styles.cta}
      />

      <Pressable style={styles.skipRow} onPress={() => onSelect(null)}>
        <Text style={styles.skipText}>Passer cette étape</Text>
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
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  listCard: { paddingVertical: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 10,
    marginVertical: 1,
  },
  rowSelected: {
    backgroundColor: Colors.primaryLight,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapSelected: { backgroundColor: '#fff' },
  rowText: { flex: 1 },
  rowBrand: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rowBrandSelected: { color: Colors.primaryDark },
  rowName: { fontSize: 14, fontWeight: '600', color: Colors.text, marginTop: 1 },
  rowNameSelected: { color: Colors.primary },
  typeBadge: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeSelected: { backgroundColor: '#fff' },
  typeText:         { fontSize: 11, fontWeight: '600', color: Colors.textTertiary },
  typeTextSelected: { color: Colors.primary },

  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  detectedText: { fontSize: 10, fontWeight: '700', color: Colors.success },

  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 4,
  },
  showMoreText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  infoCard: { backgroundColor: Colors.primaryLight },
  infoRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, fontSize: 13, color: Colors.primaryDark, lineHeight: 19 },

  cta:     { marginTop: 4 },
  skipRow: { alignItems: 'center', paddingVertical: 10 },
  skipText:{ fontSize: 13, color: Colors.textTertiary, textDecorationLine: 'underline' },
});
