import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
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
  toDisplayDb,
} from './constants/hearing-test.constants';
import { useTestDashboard } from './hooks/useTestDashboard';
import type { HearingCategory } from './types/hearing-test.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const HERO_GRADIENT: [string, string, string] = ['#0D8FA5', '#0B7285', '#064E5F'];
const RING_SIZE = 148;

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

// ── Animated pulse rings ──────────────────────────────────────────────────────

function PulseRings({ active }: { active: boolean }) {
  const s1 = useRef(new Animated.Value(1)).current;
  const o1 = useRef(new Animated.Value(0.45)).current;
  const s2 = useRef(new Animated.Value(1)).current;
  const o2 = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    if (!active) return;

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(s1, { toValue: 1.7, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(o1, { toValue: 0,   duration: 2000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(s1, { toValue: 1,    duration: 0, useNativeDriver: true }),
          Animated.timing(o1, { toValue: 0.45, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();

    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(s2, { toValue: 1.7, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(o2, { toValue: 0,   duration: 2000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(s2, { toValue: 1,    duration: 0, useNativeDriver: true }),
            Animated.timing(o2, { toValue: 0.25, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, 900);

    return () => {
      clearTimeout(t);
      s1.stopAnimation(); o1.stopAnimation();
      s2.stopAnimation(); o2.stopAnimation();
    };
  }, [active]);

  const base = {
    position: 'absolute' as const,
    width:  RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
  };

  return (
    <>
      <Animated.View style={[base, { transform: [{ scale: s1 }], opacity: o1 }]} />
      <Animated.View style={[base, { transform: [{ scale: s2 }], opacity: o2 }]} />
    </>
  );
}

// ── Score count-up ────────────────────────────────────────────────────────────

function useCountUp(target: number | null): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target == null) { setVal(0); return; }
    const steps    = 45;
    const interval = 1300 / steps;
    let step = 0;
    const id = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      setVal(Math.round(eased * target));
      if (step >= steps) clearInterval(id);
    }, interval);
    return () => clearInterval(id);
  }, [target]);
  return val;
}

// ── Hero section ──────────────────────────────────────────────────────────────

const HeroSection: React.FC<{
  loading:      boolean;
  score:        number | null;
  category:     HearingCategory | null;
  lastTestDate: Date | null;
}> = ({ loading, score, category, lastTestDate }) => {
  const displayScore = useCountUp(score);
  const hasTest      = score !== null;

  return (
    <LinearGradient colors={HERO_GRADIENT} style={styles.hero}>
      <View style={styles.decor1} />
      <View style={styles.decor2} />
      <View style={styles.decor3} />

      <View style={styles.heroContent}>
        {loading ? (
          <ActivityIndicator size="large" color="rgba(255,255,255,0.85)" />
        ) : (
          <>
            <View style={styles.ringContainer}>
              <PulseRings active={hasTest} />
              <View style={[styles.scoreCircle, !hasTest && styles.scoreCircleDashed]}>
                <Text style={styles.scoreNumber}>{hasTest ? displayScore : '—'}</Text>
                {hasTest && <Text style={styles.scoreOver}>/100</Text>}
              </View>
            </View>

            <View style={styles.heroMeta}>
              <View style={styles.catBadge}>
                {hasTest && category && (
                  <View style={[styles.catDot, { backgroundColor: getCategoryColor(category) }]} />
                )}
                <Text style={styles.catBadgeText}>
                  {hasTest && category ? getCategoryLabel(category) : 'Aucun test réalisé'}
                </Text>
              </View>
              <Text style={styles.heroDate}>
                {lastTestDate
                  ? `Dernier test : ${formatDate(lastTestDate.toISOString())}`
                  : 'Commencez votre premier test auditif'}
              </Text>
            </View>
          </>
        )}
      </View>
    </LinearGradient>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  value:       string;
  label:       string;
  icon:        React.ComponentProps<typeof Ionicons>['name'];
  valueColor?: string;
}> = ({ value, label, icon, valueColor }) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={17} color={Colors.primary} style={{ marginBottom: 5 }} />
    <Text style={[styles.statValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
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
  const {
    loading, history, lastScore, avgScore, testCount,
    trend, lastTestDate, lastCategory, refresh,
  } = useTestDashboard();

  const name     = profile?.username ?? null;
  const greeting = getGreeting();

  const trendIcon: React.ComponentProps<typeof Ionicons>['name'] =
    trend === 'up'     ? 'trending-up'   :
    trend === 'down'   ? 'trending-down' :
    trend === 'stable' ? 'remove'        : 'remove-outline';

  const trendColor =
    trend === 'up'     ? Colors.success       :
    trend === 'down'   ? Colors.error         :
    trend === 'stable' ? Colors.textSecondary : Colors.textTertiary;

  const trendValue =
    trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'stable' ? '→' : '—';

  const trendLabel =
    trend === 'up' ? 'Progression' : trend === 'down' ? 'Déclin' :
    trend === 'stable' ? 'Stable'  : 'Tendance';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {greeting}{name ? `, ${name}` : ''}
          </Text>
          <Text style={styles.appName}>HearSafe</Text>
        </View>
        <Pressable onPress={refresh} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="refresh-outline" size={21} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.primary} />
        }
      >
        {/* Hero */}
        <HeroSection
          loading={loading}
          score={lastScore}
          category={lastCategory}
          lastTestDate={lastTestDate}
        />

        {/* Floating stats row */}
        <View style={styles.statsRow}>
          <StatCard
            value={loading ? '—' : String(testCount)}
            label="Tests"
            icon="clipboard-outline"
          />
          <StatCard
            value={loading || avgScore == null ? '—' : String(avgScore)}
            label="Score moyen"
            icon="star-outline"
          />
          <StatCard
            value={loading ? '—' : trendValue}
            label={loading ? 'Tendance' : trendLabel}
            icon={trendIcon}
            valueColor={trend !== 'none' ? trendColor : undefined}
          />
        </View>

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
              <Text style={styles.optionTitle}>Pure Tone Threshold Test (PTT)</Text>
              <Text style={styles.optionSub}>Évaluer le seuil auditif tonal oreille gauche/droite.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
          </Pressable>
        </View>

        {/* History */}
        {!loading && history.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Derniers tests</Text>
              <Text style={styles.sectionCount}>{testCount} au total</Text>
            </View>
            {history.slice(0, 3).map(item => {
              const isPTT = item.testType === 'ptt';
              const subtitle = isPTT
                ? (item.ptaDb != null ? `Tonal · PTA ${toDisplayDb(item.ptaDb)} dB` : 'Tonal')
                : (item.maxFrequencyHz != null
                    ? `Haute fréquence · ${(item.maxFrequencyHz / 1000).toFixed(1)} kHz`
                    : 'Haute fréquence');
              return (
                <View key={item.id} style={styles.historyItem}>
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
                </View>
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
  greeting: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', marginBottom: 1 },
  appName:  { fontSize: 22, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  headerBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
  },

  // Hero
  hero: {
    overflow: 'hidden',
    paddingTop: 36,
    paddingBottom: 44,
  },
  decor1: {
    position: 'absolute', top: -50, right: -50,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decor2: {
    position: 'absolute', top: 10, right: 80,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  decor3: {
    position: 'absolute', bottom: -30, left: -30,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroContent: { alignItems: 'center', gap: 16 },

  ringContainer: {
    width:          RING_SIZE,
    height:         RING_SIZE,
    alignItems:     'center',
    justifyContent: 'center',
  },
  scoreCircle: {
    width:          RING_SIZE,
    height:         RING_SIZE,
    borderRadius:   RING_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth:    2.5,
    borderColor:    'rgba(255,255,255,0.42)',
    alignItems:     'center',
    justifyContent: 'center',
    gap: 0,
  },
  scoreCircleDashed: {
    borderStyle:     'dashed',
    borderColor:     'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  scoreNumber: {
    fontSize:    50,
    fontWeight:  '800',
    color:       '#FFFFFF',
    letterSpacing: -2,
    lineHeight:  54,
  },
  scoreOver: {
    fontSize:   13,
    color:      'rgba(255,255,255,0.6)',
    fontWeight: '600',
    marginTop:  -4,
  },

  heroMeta: { alignItems: 'center', gap: 6 },
  catBadge: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              7,
    backgroundColor:  'rgba(255,255,255,0.18)',
    paddingHorizontal: 16,
    paddingVertical:   6,
    borderRadius:     20,
  },
  catDot:      { width: 7, height: 7, borderRadius: 4 },
  catBadgeText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  heroDate:    { fontSize: 12, color: 'rgba(255,255,255,0.58)', fontWeight: '500' },

  // Stats row (overlaps hero)
  statsRow: {
    flexDirection:   'row',
    marginHorizontal: 16,
    marginTop:       -28,
    gap:             10,
    zIndex:          2,
  },
  statCard: {
    flex:            1,
    backgroundColor: Colors.surface,
    borderRadius:    16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.border,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  statValue: {
    fontSize:    22,
    fontWeight:  '800',
    color:       Colors.text,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize:       10,
    color:          Colors.textTertiary,
    fontWeight:     '600',
    textAlign:      'center',
    textTransform:  'uppercase',
    letterSpacing:  0.3,
  },

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
  sectionCount: { fontSize: 13, color: Colors.textTertiary, fontWeight: '500' },

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
});
