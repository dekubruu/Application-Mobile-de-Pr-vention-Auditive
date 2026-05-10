import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import {
  FALSE_POSITIVE_WARN_RATIO,
  getCategoryBg,
  getCategoryColor,
  getCategoryLabel,
  getTestSummary,
} from '../constants/hearing-test.constants';
import {
  averageDb,
  calculateHearingScore,
  detectHFLoss,
} from '../services/HearingResultService';
import type { FrequencyThreshold, HearingCategory, TestMode } from '../types/hearing-test.types';
import { AudiogramView } from './AudiogramView';

interface TestResultViewProps {
  testMode:         TestMode;
  leftEarResults?:  FrequencyThreshold[];
  rightEarResults?: FrequencyThreshold[];
  monoResults?:     FrequencyThreshold[];
  leftCategory?:    HearingCategory;
  rightCategory?:   HearingCategory;
  monoCategory?:    HearingCategory;
  resultReliable:   boolean;
  falsePositives:   number;
  silentCount:      number;
  saveError:        string | null;
  onRetry:          () => void;
  onSave:           () => void;
}

// ── Hearing score ring ────────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number; color: string; bg: string }> = ({ score, color, bg }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: score,
      duration: 1000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [score]);

  return (
    <View style={[styles.scoreRing, { backgroundColor: bg }]}>
      <Animated.Text style={[styles.scoreValue, { color }]}>
        {anim.interpolate({ inputRange: [0, 100], outputRange: ['0', '100'] }).__getValue
          ? score
          : score}
      </Animated.Text>
      <Text style={[styles.scoreMax, { color }]}>/100</Text>
    </View>
  );
};

// ── Per-ear card ──────────────────────────────────────────────────────────────

const EarCard: React.FC<{
  label:    string;
  side:     'left' | 'right' | 'both';
  results:  FrequencyThreshold[];
  category: HearingCategory;
}> = ({ label, side, results, category }) => {
  const color    = getCategoryColor(category);
  const bg       = getCategoryBg(category);
  const catLabel = getCategoryLabel(category);
  const db       = averageDb(results);
  const score    = calculateHearingScore(db);

  return (
    <Card style={[styles.earCard, { borderColor: color, borderWidth: 1.5 }]}>
      <View style={styles.earCardHeader}>
        {side === 'left'  && <Ionicons name="arrow-back"    size={13} color={color} />}
        {side === 'right' && <Ionicons name="arrow-forward" size={13} color={color} />}
        {side === 'both'  && <Ionicons name="volume-medium" size={13} color={color} />}
        <Text style={[styles.earCardLabel, { color }]}>{label}</Text>
      </View>
      <Text style={[styles.earCardDb, { color }]}>{db}</Text>
      <Text style={styles.earCardUnit}>dB moy.</Text>
      <View style={[styles.catBadge, { backgroundColor: bg }]}>
        <Text style={[styles.catBadgeText, { color }]}>{catLabel}</Text>
      </View>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>Score</Text>
        <Text style={[styles.scoreInline, { color }]}>{score}</Text>
        <Text style={styles.scoreDenom}>/100</Text>
      </View>
    </Card>
  );
};

// ── Asymmetry warning ─────────────────────────────────────────────────────────

const AsymmetryWarning: React.FC<{ leftDb: number; rightDb: number }> = ({ leftDb, rightDb }) => {
  const diff = Math.abs(leftDb - rightDb);
  if (diff < 15) return null;
  return (
    <Card style={styles.warnCard}>
      <View style={styles.warnRow}>
        <Ionicons name="alert-circle" size={18} color={Colors.warning} />
        <View style={{ flex: 1 }}>
          <Text style={styles.warnTitle}>Asymétrie détectée</Text>
          <Text style={styles.warnText}>
            Différence de {diff} dB entre les deux oreilles. Une consultation audiologique est conseillée.
          </Text>
        </View>
      </View>
    </Card>
  );
};

// ── HF loss warning ───────────────────────────────────────────────────────────

const HFLossCard: React.FC<{ results: FrequencyThreshold[] }> = ({ results }) => {
  if (!detectHFLoss(results)) return null;
  return (
    <Card style={[styles.warnCard, { borderColor: Colors.warning, backgroundColor: Colors.warningLight }]}>
      <View style={styles.warnRow}>
        <Ionicons name="trending-up" size={18} color={Colors.warning} />
        <View style={{ flex: 1 }}>
          <Text style={styles.warnTitle}>Perte haute fréquence détectée</Text>
          <Text style={styles.warnText}>
            Vos seuils à 4 kHz et 8 kHz sont significativement plus élevés que vos basses fréquences — signe précoce d'une exposition sonore excessive. Protégez vos oreilles.
          </Text>
        </View>
      </View>
    </Card>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const TestResultView: React.FC<TestResultViewProps> = ({
  testMode,
  leftEarResults  = [],
  rightEarResults = [],
  monoResults     = [],
  leftCategory    = 'normal',
  rightCategory   = 'normal',
  monoCategory    = 'normal',
  resultReliable,
  falsePositives,
  silentCount,
  saveError,
  onRetry,
  onSave,
}) => {
  const [saved, setSaved] = useState(false);

  const isMono   = testMode === 'speaker';
  const category = isMono ? monoCategory : leftCategory;
  const summary  = getTestSummary(category);
  const color    = getCategoryColor(category);
  const bg       = getCategoryBg(category);

  const primaryResults = isMono ? monoResults : leftEarResults;
  const primaryAvgDb   = averageDb(primaryResults);
  const primaryScore   = calculateHearingScore(primaryAvgDb);

  const showReliabilityWarn =
    silentCount > 0 && falsePositives / silentCount > FALSE_POSITIVE_WARN_RATIO;

  const allResults = isMono ? monoResults : [...leftEarResults, ...rightEarResults];

  const handleSave = async () => {
    await onSave();
    setSaved(true);
  };

  return (
    <>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.iconRing, { backgroundColor: bg }]}>
          <Ionicons
            name={category === 'normal' || category === 'mild' ? 'checkmark-circle' : 'alert-circle'}
            size={44}
            color={color}
          />
        </View>
        <Text style={styles.heroTitle}>Résultats du test</Text>
        <Text style={styles.heroSub}>{summary.interpretation}</Text>
      </View>

      {/* Primary hearing score */}
      <Card style={[styles.scoreCard, { borderColor: color, borderWidth: 1.5 }]}>
        <View style={styles.scoreCardInner}>
          <ScoreRing score={primaryScore} color={color} bg={bg} />
          <View style={styles.scoreCardText}>
            <Text style={styles.scoreCardTitle}>Score auditif</Text>
            <Text style={[styles.scoreCardCategory, { color }]}>{getCategoryLabel(category)}</Text>
            <Text style={styles.scoreCardDesc}>
              {isMono ? 'Global (haut-parleur)' : 'Oreille gauche'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Reliability warning */}
      {showReliabilityWarn && (
        <Card style={[styles.warnCard, { backgroundColor: Colors.warningLight }]}>
          <View style={styles.warnRow}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
            <Text style={[styles.warnText, { color: Colors.warning }]}>
              Fiabilité réduite : {falsePositives}/{silentCount} essais silencieux ont déclenché une réponse. Refaire dans un endroit calme.
            </Text>
          </View>
        </Card>
      )}

      {/* HF loss warning */}
      <HFLossCard results={allResults} />

      {/* Ear cards */}
      {isMono ? (
        <EarCard label="Résultat global" side="both" results={monoResults} category={monoCategory} />
      ) : (
        <View style={styles.earRow}>
          <View style={{ flex: 1 }}>
            <EarCard label="Gauche" side="left" results={leftEarResults} category={leftCategory} />
          </View>
          <View style={{ flex: 1 }}>
            <EarCard label="Droite" side="right" results={rightEarResults} category={rightCategory} />
          </View>
        </View>
      )}

      {/* Asymmetry */}
      {!isMono && leftEarResults.length > 0 && rightEarResults.length > 0 && (
        <AsymmetryWarning leftDb={averageDb(leftEarResults)} rightDb={averageDb(rightEarResults)} />
      )}

      {/* Audiogram */}
      <Card style={styles.audiogramCard}>
        <Text style={styles.sectionLabel}>Audiogramme</Text>
        <Text style={styles.audiogramNote}>
          Seuils relatifs sur cet appareil — non calibré cliniquement.
        </Text>
        <AudiogramView
          leftResults={isMono  ? undefined : leftEarResults}
          rightResults={isMono ? undefined : rightEarResults}
          monoResults={isMono  ? monoResults : undefined}
        />
      </Card>

      {/* Frequency table */}
      <Card>
        <Text style={styles.sectionLabel}>Seuils par fréquence</Text>
        <View style={styles.freqTable}>
          {isMono ? (
            <>
              <View style={styles.freqTableHeader}>
                <Text style={[styles.freqCell, styles.freqHeaderText]}>Fréquence</Text>
                <Text style={[styles.freqCell, styles.freqHeaderText]}>Seuil</Text>
              </View>
              {[...monoResults].sort((a, b) => a.frequency - b.frequency).map(r => (
                <View key={r.frequency} style={styles.freqTableRow}>
                  <Text style={[styles.freqCell, styles.freqFreqText]}>
                    {r.frequency >= 1000 ? `${r.frequency / 1000} kHz` : `${r.frequency} Hz`}
                  </Text>
                  <Text style={[styles.freqCell, styles.freqDbText]}>{r.dbLevel} dB</Text>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={styles.freqTableHeader}>
                <Text style={[styles.freqCell, styles.freqHeaderText]}>Fréquence</Text>
                <Text style={[styles.freqCell, styles.freqHeaderText, { color: '#1D4ED8' }]}>Gauche</Text>
                <Text style={[styles.freqCell, styles.freqHeaderText, { color: Colors.error }]}>Droite</Text>
              </View>
              {Array.from(new Set([
                ...leftEarResults.map(r => r.frequency),
                ...rightEarResults.map(r => r.frequency),
              ])).sort((a, b) => a - b).map(freq => {
                const L = leftEarResults.find(r => r.frequency === freq);
                const R = rightEarResults.find(r => r.frequency === freq);
                return (
                  <View key={freq} style={styles.freqTableRow}>
                    <Text style={[styles.freqCell, styles.freqFreqText]}>
                      {freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`}
                    </Text>
                    <Text style={[styles.freqCell, styles.freqDbText, { color: '#1D4ED8' }]}>
                      {L ? `${L.dbLevel} dB` : '—'}
                    </Text>
                    <Text style={[styles.freqCell, styles.freqDbText, { color: Colors.error }]}>
                      {R ? `${R.dbLevel} dB` : '—'}
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </Card>

      {/* Save */}
      {!saved ? (
        <Button
          title="Sauvegarder les résultats"
          variant="primary"
          size="lg"
          onPress={handleSave}
          style={styles.saveBtn}
        />
      ) : (
        <Card style={[styles.savedCard, { borderColor: Colors.success }]}>
          <View style={styles.savedRow}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.savedText}>Résultats sauvegardés</Text>
          </View>
        </Card>
      )}

      {saveError && (
        <Card style={[styles.warnCard, { marginTop: 0 }]}>
          <View style={styles.warnRow}>
            <Ionicons name="cloud-offline-outline" size={16} color={Colors.error} />
            <Text style={[styles.warnText, { color: Colors.error }]}>{saveError}</Text>
          </View>
        </Card>
      )}

      {/* Disclaimer */}
      <Card style={styles.disclaimer}>
        <View style={styles.warnRow}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
          <Text style={styles.disclaimerText}>
            Ce test est un dépistage indicatif sur appareil non calibré. Il ne remplace pas un audiogramme clinique réalisé par un audiologiste.
          </Text>
        </View>
      </Card>

      <Button title="Refaire le test" variant="outline" size="lg" onPress={onRetry} style={styles.retryBtn} />
    </>
  );
};

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: { fontSize: 26, fontWeight: '700', color: Colors.text, letterSpacing: -0.4, marginBottom: 6 },
  heroSub:   { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, paddingHorizontal: 8 },

  scoreCard: { marginBottom: 4 },
  scoreCardInner: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end' as any,
    paddingBottom: 4,
  },
  scoreValue: { fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  scoreMax:   { fontSize: 14, fontWeight: '600', marginBottom: 5 },
  scoreCardText: { flex: 1 },
  scoreCardTitle:    { fontSize: 12, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6 },
  scoreCardCategory: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, marginTop: 2 },
  scoreCardDesc:     { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },

  earRow:       { flexDirection: 'row', gap: 10, marginBottom: 2 },
  earCard:      { alignItems: 'center', paddingVertical: 18, gap: 2 },
  earCardHeader:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  earCardLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  earCardDb:    { fontSize: 36, fontWeight: '700', letterSpacing: -1, marginTop: 4 },
  earCardUnit:  { fontSize: 12, color: Colors.textTertiary, marginBottom: 6 },
  catBadge:     { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 6 },
  catBadgeText: { fontSize: 12, fontWeight: '700' },
  scoreRow:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  scoreLabel:   { fontSize: 11, color: Colors.textTertiary, marginRight: 4 },
  scoreInline:  { fontSize: 14, fontWeight: '700' },
  scoreDenom:   { fontSize: 11, color: Colors.textTertiary },

  warnCard: { borderColor: Colors.warning, borderWidth: 1, marginBottom: 4 },
  warnRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  warnTitle:{ fontSize: 13, fontWeight: '700', color: Colors.warning, marginBottom: 3 },
  warnText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  audiogramCard: { gap: 4 },
  audiogramNote: { fontSize: 11, color: Colors.textTertiary, marginBottom: 4, lineHeight: 16 },

  freqTable:       { gap: 0 },
  freqTableHeader: {
    flexDirection: 'row', paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight, marginBottom: 4,
  },
  freqTableRow: {
    flexDirection: 'row', paddingVertical: 7,
    borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight,
  },
  freqCell:       { flex: 1 },
  freqHeaderText: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary },
  freqFreqText:   { fontSize: 13, color: Colors.text, fontWeight: '500' },
  freqDbText:     { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  saveBtn:  { marginTop: 4 },
  savedCard:{ borderWidth: 1.5, marginTop: 4 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedText:{ fontSize: 13, fontWeight: '600', color: Colors.success },

  disclaimer:     { backgroundColor: Colors.surfaceSecondary, marginTop: 4 },
  disclaimerText: { flex: 1, fontSize: 12, color: Colors.textTertiary, lineHeight: 18 },
  retryBtn:       { marginTop: 4 },
});
