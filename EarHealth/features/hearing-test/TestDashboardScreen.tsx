import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  getCategoryBg,
  getCategoryColor,
  getCategoryLabel,
  getHearingCategory,
  toDisplayDb,
} from './constants/hearing-test.constants';
import { useTestDashboard } from './hooks/useTestDashboard';
import { InfoTooltip } from './components/InfoTooltip';
import {
  DISCLAIMER_INFO,
  HAUTES_FREQUENCES_INFO,
  SEUIL_AUDITIF_INFO,
  type InfoContent,
} from './constants/hearing-info';

// ── Constants ─────────────────────────────────────────────────────────────────

const HERO_GRADIENT: [string, string, string] = ['#0D8FA5', '#0B7285', '#064E5F'];

const TIPS = [
  {
    icon: 'volume-off-outline' as const,
    text: "Limitez l'exposition aux sons > 85 dB — chaque +3 dB divise par 2 la durée d'exposition sûre.",
  },
  {
    icon: 'headset-outline' as const,
    text: "La règle du 60/60 : écoutez à 60 % du volume max, pas plus de 60 minutes par session.",
  },
  {
    icon: 'ear-outline' as const,
    text: "Après un concert, si vous avez des acouphènes, reposez vos oreilles 24h dans un endroit calme.",
  },
  {
    icon: 'shield-checkmark-outline' as const,
    text: "Des bouchons d'oreilles bien ajustés réduisent le bruit de 15 à 30 dB sans déformer la musique.",
  },
  {
    icon: 'trending-up-outline' as const,
    text: "La perte auditive liée au bruit est irréversible. Détecter tôt, c'est protéger durablement.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff < 7)  return `Il y a ${diff} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

// HFRT quality tone (higher frequency = better). Mirrors the tiers in
// interpretMaxFrequency so the badge colour matches the stored label.
function hfrtToneColor(maxHz: number): string {
  if (maxHz >= 15_000) return Colors.success;
  if (maxHz >= 13_000) return Colors.primary;
  if (maxHz >= 11_000) return Colors.warning;
  return Colors.error;
}

// ── Summary card (one per test type) ──────────────────────────────────────────

const SummaryCard: React.FC<{
  icon:        React.ComponentProps<typeof Ionicons>['name'];
  title:       string;
  value:       string | null;      // formatted metric, or null when never tested
  unit:        string;
  statusLabel: string | null;
  accent:      string;             // status colour
  dateLabel:   string | null;
  ctaLabel:    string;             // shown in the empty state
  onPress:     () => void;
  info?:       InfoContent;        // optional "ⓘ" explanation
}> = ({ icon, title, value, unit, statusLabel, accent, dateLabel, ctaLabel, onPress, info }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.sumCard, pressed && styles.sumCardPressed]}
  >
    <View style={styles.sumHeader}>
      <View style={styles.sumIconRing}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <Text style={styles.sumTitle} numberOfLines={1}>{title}</Text>
      {info && <InfoTooltip content={info} size={15} />}
    </View>

    {value != null ? (
      <>
        <View style={styles.sumValueRow}>
          <Text style={styles.sumValue}>{value}</Text>
          <Text style={styles.sumUnit}>{unit}</Text>
        </View>
        {statusLabel && (
          <View style={[styles.sumBadge, { backgroundColor: accent + '22' }]}>
            <View style={[styles.sumDot, { backgroundColor: accent }]} />
            <Text style={[styles.sumBadgeText, { color: accent }]} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
        )}
        {dateLabel && <Text style={styles.sumDate}>{dateLabel}</Text>}
      </>
    ) : (
      <>
        <Text style={styles.sumEmptyValue}>—</Text>
        <Text style={styles.sumEmptyHint}>Pas encore testé</Text>
        <View style={styles.sumCta}>
          <Text style={styles.sumCtaText}>{ctaLabel}</Text>
          <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
        </View>
      </>
    )}
  </Pressable>
);

// ── Tips carousel ─────────────────────────────────────────────────────────────

const TipsCarousel: React.FC = () => {
  const [idx, setIdx]   = useState(0);
  const opacity         = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let alive = true;
    const id  = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
        if (!alive) return;
        setIdx(prev => (prev + 1) % TIPS.length);
        Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => { alive = false; clearInterval(id); opacity.stopAnimation(); };
  }, []);

  const tip = TIPS[idx];

  return (
    <View style={styles.tipsCard}>
      <View style={styles.tipsHeader}>
        <View style={styles.tipsIconRing}>
          <Ionicons name="bulb" size={15} color={Colors.primary} />
        </View>
        <Text style={styles.tipsSectionTitle}>Le saviez-vous ?</Text>
        <View style={styles.tipsDots}>
          {TIPS.map((_, i) => (
            <View key={i} style={[styles.tipsDot, i === idx && styles.tipsDotActive]} />
          ))}
        </View>
      </View>
      <Animated.View style={{ opacity }}>
        <View style={styles.tipContent}>
          <View style={styles.tipIconWrap}>
            <Ionicons name={tip.icon} size={20} color={Colors.primary} />
          </View>
          <Text style={styles.tipText}>{tip.text}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export default function TestDashboardScreen() {
  const router      = useRouter();
  const { profile } = useAuth();
  const { loading, history, lastTestDate, refresh } = useTestDashboard();

  const name     = profile?.username ?? null;
  const greeting = getGreeting();

  // Most recent result of each type (history is newest-first).
  const lastPTT  = history.find(h => h.testType === 'ptt');
  const lastHFRT = history.find(h => h.testType === 'hfrt');

  const pttCategory = lastPTT?.ptaDb != null ? getHearingCategory(lastPTT.ptaDb) : null;
  const hfrtHz      = lastHFRT ? (lastHFRT.hitCeiling ? 20_000 : (lastHFRT.maxFrequencyHz ?? 0)) : 0;
  const hfrtValue   = lastHFRT
    ? (lastHFRT.hitCeiling ? '≥ 20' : ((lastHFRT.maxFrequencyHz ?? 0) / 1000).toFixed(1))
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>HearSafe</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.primary} />
        }
      >
        {/* Greeting banner */}
        <LinearGradient colors={HERO_GRADIENT} style={styles.heroBar}>
          <View style={styles.decor1} />
          <View style={styles.decor2} />
          <Text style={styles.heroGreeting}>
            {greeting}{name ? `, ${name}` : ''}
          </Text>
          <Text style={styles.heroSubtitle}>
            {lastTestDate
              ? `Dernier test · ${formatDate(lastTestDate.toISOString())}`
              : 'Suivez votre audition dans le temps'}
          </Text>
        </LinearGradient>

        {/* Two summary cards (overlap the banner) */}
        {loading && history.length === 0 ? (
          <View style={styles.summaryLoading}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <View style={styles.summaryRow}>
            <SummaryCard
              icon="ear"
              title="Seuil auditif"
              value={lastPTT?.ptaDb != null ? String(toDisplayDb(lastPTT.ptaDb)) : null}
              unit="dB"
              statusLabel={pttCategory ? getCategoryLabel(pttCategory) : null}
              accent={pttCategory ? getCategoryColor(pttCategory) : Colors.primary}
              dateLabel={lastPTT ? formatDate(lastPTT.createdAt) : null}
              ctaLabel="Faire le test"
              info={SEUIL_AUDITIF_INFO}
              onPress={() =>
                lastPTT
                  ? router.push(`/test-detail/${lastPTT.id}` as any)
                  : router.push('/pure-tone-test' as any)
              }
            />
            <SummaryCard
              icon="pulse"
              title="Hautes fréquences"
              value={hfrtValue}
              unit="kHz"
              statusLabel={lastHFRT?.interpretation ?? null}
              accent={lastHFRT ? hfrtToneColor(hfrtHz) : Colors.primary}
              dateLabel={lastHFRT ? formatDate(lastHFRT.createdAt) : null}
              ctaLabel="Faire le test"
              info={HAUTES_FREQUENCES_INFO}
              onPress={() =>
                lastHFRT
                  ? router.push(`/test-detail/${lastHFRT.id}` as any)
                  : router.push('/high-frequency-test' as any)
              }
            />
          </View>
        )}

        {/* Test selection */}
        <View style={styles.selectionSection}>
          <Text style={styles.selectionTitle}>Choisissez votre test</Text>

          <Pressable
            onPress={() => router.push('/high-frequency-test' as any)}
            style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
          >
            <View style={styles.optionIconRing}>
              <Ionicons name="pulse" size={22} color={Colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Test haute fréquence</Text>
              <Text style={styles.optionSub}>Tester la perception des fréquences aiguës.</Text>
            </View>
            <InfoTooltip content={HAUTES_FREQUENCES_INFO} size={18} />
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/pure-tone-test' as any)}
            style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
          >
            <View style={styles.optionIconRing}>
              <Ionicons name="ear" size={22} color={Colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Test du seuil auditif</Text>
              <Text style={styles.optionSub}>Le son le plus faible perçu, pour chaque oreille.</Text>
            </View>
            <InfoTooltip content={SEUIL_AUDITIF_INFO} size={18} />
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>

        {/* History */}
        {!loading && history.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Derniers tests</Text>
              <Pressable
                onPress={() => router.push('/history' as any)}
                hitSlop={8}
                style={({ pressed }) => [styles.seeAllBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.seeAllText}>Voir tout</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              </Pressable>
            </View>
            {history.slice(0, 3).map(item => {
              const isPTT = item.testType === 'ptt';
              const subtitle = isPTT
                ? (item.ptaDb != null ? `Seuil auditif · PTA ${toDisplayDb(item.ptaDb)} dB` : 'Seuil auditif')
                : (item.maxFrequencyHz != null
                    ? `Haute fréquence · ${item.hitCeiling ? '≥ 20' : (item.maxFrequencyHz / 1000).toFixed(1)} kHz`
                    : 'Haute fréquence');
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/test-detail/${item.id}` as any)}
                  style={({ pressed }) => [styles.historyItem, pressed && styles.historyItemPressed]}
                >
                  <View style={[
                    styles.historyModeIcon,
                    { backgroundColor: isPTT ? Colors.primaryLight : Colors.warningLight },
                  ]}>
                    <Ionicons
                      name={isPTT ? 'ear' : 'pulse'}
                      size={17}
                      color={isPTT ? Colors.primary : Colors.warning}
                    />
                  </View>

                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>{formatDate(item.createdAt)}</Text>
                    <Text style={styles.historyMode}>{subtitle}</Text>
                  </View>

                  <View style={styles.historyRight}>
                    <Text style={[styles.historyScore, { color: getCategoryColor(item.category) }]}>
                      {item.score}
                    </Text>
                    <View style={[styles.historyBadge, { backgroundColor: getCategoryBg(item.category) }]}>
                      <Text style={[styles.historyBadgeText, { color: getCategoryColor(item.category) }]}>
                        {getCategoryLabel(item.category)}
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {!loading && history.length === 0 && (
          <View style={styles.emptySection}>
            <View style={styles.emptyIconRing}>
              <Ionicons name="ear-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Aucun historique</Text>
            <Text style={styles.emptySub}>
              Vos résultats apparaîtront ici après votre premier test.
            </Text>
          </View>
        )}

        {/* Tips */}
        <TipsCarousel />

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.textTertiary} />
          <Text style={styles.disclaimerText}>
            Ce test est un dépistage indicatif sur appareil non calibré. Il ne remplace pas un audiogramme clinique réalisé par un audiologiste.
          </Text>
        </View>

        {/* Non-liability clause (opens the full educational disclaimer) */}
        <View style={styles.disclaimerBtnWrap}>
          <InfoTooltip content={DISCLAIMER_INFO} label="Clause de non-responsabilité" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 20,
    paddingVertical:   14,
    backgroundColor:   Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  appName:  { fontSize: 22, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },

  // Greeting banner
  heroBar: {
    overflow: 'hidden',
    paddingTop: 22,
    paddingBottom: 44,
    paddingHorizontal: 20,
  },
  decor1: {
    position: 'absolute', top: -50, right: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decor2: {
    position: 'absolute', top: 20, right: 90,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroGreeting: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.72)', fontWeight: '500', marginTop: 4 },

  // Summary cards (overlap the banner)
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -28,
    gap: 10,
    zIndex: 2,
  },
  summaryLoading: {
    marginHorizontal: 16,
    marginTop: -28,
    height: 150,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  sumCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    minHeight: 150,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  sumCardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  sumHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sumIconRing: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  sumTitle:   { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: -0.1 },
  sumValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 2 },
  sumValue:   { fontSize: 30, fontWeight: '800', color: Colors.text, letterSpacing: -1 },
  sumUnit:    { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  sumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  sumDot:       { width: 6, height: 6, borderRadius: 3 },
  sumBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  sumDate:      { fontSize: 11, color: Colors.textTertiary, fontWeight: '500', marginTop: 8 },
  sumEmptyValue: { fontSize: 30, fontWeight: '800', color: Colors.borderLight, marginTop: 2 },
  sumEmptyHint:  { fontSize: 12, color: Colors.textTertiary, fontWeight: '500', marginTop: 6 },
  sumCta:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  sumCtaText:    { fontSize: 12, fontWeight: '700', color: Colors.primary },

  // Test selection
  selectionSection: {
    marginHorizontal: 16,
    marginTop:        24,
    gap:              10,
  },
  selectionTitle: {
    fontSize:      17,
    fontWeight:    '700',
    color:         Colors.text,
    letterSpacing: -0.2,
    marginBottom:  4,
  },
  optionCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface,
    borderRadius:    16,
    padding:         16,
    gap:             14,
    borderWidth:     1,
    borderColor:     Colors.border,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  optionCardPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  optionIconRing: {
    width:          46,
    height:         46,
    borderRadius:   23,
    backgroundColor: Colors.primaryLight,
    alignItems:     'center',
    justifyContent: 'center',
  },
  optionText:  { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
  optionSub:   { fontSize: 12, color: Colors.textSecondary, marginTop: 3, fontWeight: '500', lineHeight: 17 },

  // Section
  section:       { marginHorizontal: 16, marginTop: 24 },
  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
  seeAllBtn:  { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, color: Colors.primary, fontWeight: '700' },

  // History
  historyItem: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface,
    borderRadius:    14,
    padding:         14,
    marginBottom:    8,
    gap:             12,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  historyItemPressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  historyModeIcon: {
    width:          42,
    height:         42,
    borderRadius:   21,
    alignItems:     'center',
    justifyContent: 'center',
  },
  historyInfo:  { flex: 1 },
  historyDate:  { fontSize: 14, fontWeight: '600', color: Colors.text },
  historyMode:  { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  historyRight: { alignItems: 'flex-end', gap: 5 },
  historyScore: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  historyBadge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 },
  historyBadgeText: { fontSize: 10, fontWeight: '700' },

  // Empty state
  emptySection: {
    marginHorizontal: 16,
    marginTop:        24,
    alignItems:       'center',
    paddingVertical:  28,
    backgroundColor:  Colors.surface,
    borderRadius:     16,
    borderWidth:      1,
    borderColor:      Colors.border,
  },
  emptyIconRing: {
    width:          68,
    height:         68,
    borderRadius:   34,
    backgroundColor: Colors.primaryLight,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptySub:   { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24, lineHeight: 20 },

  // Tips
  tipsCard: {
    marginHorizontal: 16,
    marginTop:        20,
    backgroundColor:  Colors.primaryLight,
    borderRadius:     16,
    padding:          16,
    borderWidth:      1,
    borderColor:      Colors.border,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    marginBottom:  12,
  },
  tipsIconRing: {
    width:          28,
    height:         28,
    borderRadius:   14,
    backgroundColor: Colors.surface,
    alignItems:     'center',
    justifyContent: 'center',
  },
  tipsSectionTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  tipsDots:         { flexDirection: 'row', gap: 4, alignItems: 'center' },
  tipsDot:          { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, opacity: 0.3 },
  tipsDotActive:    { opacity: 1, width: 14, borderRadius: 3 },
  tipContent:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipIconWrap: {
    width:          34,
    height:         34,
    borderRadius:   17,
    backgroundColor: Colors.surface,
    alignItems:     'center',
    justifyContent: 'center',
  },
  tipText: { flex: 1, fontSize: 13, color: Colors.primaryDark, lineHeight: 20, fontWeight: '500' },

  // Disclaimer
  disclaimer: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             8,
    marginHorizontal: 16,
    marginTop:       20,
    padding:         12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius:    12,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.textTertiary, lineHeight: 16 },
  disclaimerBtnWrap: { alignItems: 'center', marginTop: 16 },
});
