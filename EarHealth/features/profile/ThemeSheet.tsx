import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { TIER_COST, TIER_LABEL, TIER_ORDER, TIER_PALETTES, type ThemeTier } from '@/features/theme/theme.constants';
import { useThemeColors } from '@/features/theme/ThemeContext';

interface ThemeSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ThemeSheet({ visible, onClose }: ThemeSheetProps) {
  const { profile } = useAuth();
  const { colors: tierColors, tier: activeTier, ownedTiers, nextTier, purchaseTier, selectTier } = useThemeColors();
  const [busyTier, setBusyTier] = useState<ThemeTier | null>(null);

  const points = profile?.total_points ?? 0;

  const handleBuy = async (target: ThemeTier) => {
    setBusyTier(target);
    try {
      const result = await purchaseTier(target);
      if (!result.ok) {
        Alert.alert(
          'Achat impossible',
          result.reason === 'insufficient-points'
            ? "Vous n'avez pas encore assez de points pour ce palier."
            : "Ce palier n'est pas disponible pour l'instant.",
        );
      }
    } finally {
      setBusyTier(null);
    }
  };

  const handleSelect = async (target: ThemeTier) => {
    setBusyTier(target);
    try {
      await selectTier(target);
    } finally {
      setBusyTier(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Personnaliser l’application</Text>
        <View style={styles.pointsRow}>
          <Ionicons name="star" size={15} color={Colors.warning} />
          <Text style={styles.pointsText}>{points} points cumulés</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {TIER_ORDER.map((t, i) => {
            const palette = TIER_PALETTES[t];
            const owned = ownedTiers.includes(t);
            const isActive = activeTier === t;
            const isNext = t === nextTier;
            const cost = TIER_COST[t];
            const canAfford = points >= cost;
            const busy = busyTier === t;

            return (
              <View
                key={t}
                style={[
                  styles.card,
                  isActive && { borderColor: tierColors.primary, backgroundColor: tierColors.primaryLight },
                ]}
              >
                <View style={[styles.swatch, { backgroundColor: palette.primary }]} />
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel}>{TIER_LABEL[t]}</Text>
                  {t === 'default' ? (
                    <Text style={styles.cardSub}>Couleur d’origine, gratuite</Text>
                  ) : owned ? (
                    <Text style={styles.cardSub}>Débloqué</Text>
                  ) : isNext ? (
                    <Text style={styles.cardSub}>{cost} points</Text>
                  ) : (
                    <Text style={styles.cardSub}>Débloquez {TIER_LABEL[TIER_ORDER[i - 1]]} d’abord</Text>
                  )}
                </View>

                {isActive ? (
                  <View style={styles.activeBadge}>
                    <Ionicons name="checkmark-circle" size={22} color={tierColors.primary} />
                  </View>
                ) : owned ? (
                  <Pressable
                    onPress={() => handleSelect(t)}
                    disabled={busy}
                    style={({ pressed }) => [
                      styles.selectBtn,
                      { borderColor: tierColors.primary },
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={[styles.selectBtnText, { color: tierColors.primary }]}>Sélectionner</Text>
                  </Pressable>
                ) : isNext ? (
                  <Pressable
                    onPress={() => handleBuy(t)}
                    disabled={busy || !canAfford}
                    style={({ pressed }) => [
                      styles.buyBtn,
                      { backgroundColor: tierColors.primary },
                      !canAfford && styles.buyBtnDisabled,
                      pressed && canAfford && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.buyBtnText}>Acheter</Text>
                  </Pressable>
                ) : (
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.textTertiary} />
                )}
              </View>
            );
          })}

          <Button title="Fermer" variant="ghost" size="md" onPress={onClose} style={styles.closeBtn} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  pointsText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  scrollContent: { paddingBottom: Platform.OS === 'ios' ? 40 : 24 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  cardSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  activeBadge: { padding: 2 },
  btnPressed: { opacity: 0.85 },
  selectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  selectBtnText: { fontSize: 13, fontWeight: '700' },
  buyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  buyBtnDisabled: { opacity: 0.4 },
  buyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  closeBtn: { marginTop: 4 },
});
