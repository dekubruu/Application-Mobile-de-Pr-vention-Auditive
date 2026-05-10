import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import { CV_MAX_ATTEMPTS } from '../constants/hearing-test.constants';
import type { Ear } from '../types/hearing-test.types';

interface ChannelValidationViewProps {
  audioReady:  boolean;
  isPlaying:   boolean;
  hasPlayed:   boolean;
  attempts:    number;
  lastResult:  'correct' | 'wrong' | null;
  onPlay:      () => void;
  onResponse:  (ear: Ear) => void;
  onSkip:      () => void;
}

export const ChannelValidationView: React.FC<ChannelValidationViewProps> = ({
  audioReady,
  isPlaying,
  hasPlayed,
  attempts,
  lastResult,
  onPlay,
  onResponse,
  onSkip,
}) => {
  // Prevent touch bleed-through from the previous screen on iOS:
  // the tap that navigated here can immediately fire on the play button
  // if it renders enabled right away. A short mount delay fixes this.
  const [mountReady, setMountReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMountReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  const attemptsLeft = CV_MAX_ATTEMPTS - attempts;
  const showRetry    = lastResult === 'wrong' && attemptsLeft > 0;
  const showSuccess  = lastResult === 'correct';
  const showForced   = lastResult === 'wrong' && attemptsLeft <= 0;

  return (
    <>
      <View style={styles.hero}>
        <View style={styles.iconRing}>
          <Ionicons name="headset" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Vérification stéréo</Text>
        <Text style={styles.subtitle}>
          Assurez-vous que vos écouteurs sont bien portés.{'\n'}
          Nous allons vérifier que les canaux gauche et droit fonctionnent correctement.
        </Text>
      </View>

      {/* Step 1 — play the tone */}
      <Card style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepNum, hasPlayed && styles.stepNumDone]}>
            {hasPlayed
              ? <Ionicons name="checkmark" size={14} color="#fff" />
              : <Text style={styles.stepNumText}>1</Text>}
          </View>
          <Text style={styles.stepTitle}>Jouer le son de test</Text>
        </View>
        <Text style={styles.stepDesc}>
          Un son sera joué dans une seule oreille. Écoutez attentivement.
        </Text>

        <Pressable
          style={[
            styles.playBtn,
            (!audioReady || !mountReady) && styles.playBtnDisabled,
            isPlaying && styles.playBtnActive,
          ]}
          onPress={onPlay}
          disabled={!audioReady || isPlaying || !mountReady}
        >
          <Ionicons
            name={isPlaying ? 'volume-high' : 'play-circle'}
            size={22}
            color={isPlaying ? Colors.primary : '#fff'}
          />
          <Text style={[styles.playBtnText, isPlaying && styles.playBtnTextActive]}>
            {!audioReady ? 'Préparation…' : isPlaying ? 'Son en cours…' : hasPlayed ? 'Rejouer' : 'Jouer le son'}
          </Text>
        </Pressable>
      </Card>

      {/* Step 2 — respond (shown after first play) */}
      {hasPlayed && !showSuccess && !showForced && (
        <Card style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNum, showRetry && styles.stepNumWarn]}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Dans quelle oreille avez-vous entendu ?</Text>
          </View>

          {showRetry && (
            <View style={styles.warnRow}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.warning} />
              <Text style={styles.warnText}>
                Réponse incorrecte — vérifiez que vos écouteurs ne sont pas inversés.
                {attemptsLeft === 1 ? ' Dernier essai.' : ''}
              </Text>
            </View>
          )}

          <View style={styles.responseRow}>
            <Pressable style={styles.earBtn} onPress={() => onResponse('left')}>
              <Ionicons name="arrow-back" size={20} color={Colors.primary} />
              <Text style={styles.earBtnText}>Gauche</Text>
            </Pressable>
            <Pressable style={styles.earBtn} onPress={() => onResponse('right')}>
              <Text style={styles.earBtnText}>Droite</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
            </Pressable>
          </View>
        </Card>
      )}

      {/* Success state */}
      {showSuccess && (
        <Card style={[styles.stepCard, styles.successCard]}>
          <View style={styles.resultRow}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>Canaux vérifiés ✓</Text>
              <Text style={styles.successDesc}>
                Vos écouteurs sont correctement portés. Le test va commencer.
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Forced-pass after max wrong attempts */}
      {showForced && (
        <Card style={[styles.stepCard, styles.warnCard]}>
          <View style={styles.resultRow}>
            <Ionicons name="alert-circle" size={24} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warnTitle}>Vérification ignorée</Text>
              <Text style={styles.warnDesc}>
                Les canaux n'ont pas pu être confirmés. Assurez-vous que vos écouteurs sont bien portés avant de continuer.
              </Text>
            </View>
          </View>
          <Button title="Continuer quand même" variant="primary" size="md" onPress={onSkip} style={{ marginTop: 12 }} />
        </Card>
      )}

      {/* Skip link */}
      {!showSuccess && !showForced && (
        <Pressable style={styles.skipRow} onPress={onSkip}>
          <Text style={styles.skipText}>Passer cette étape</Text>
        </Pressable>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
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
  stepCard: { paddingVertical: 18, marginBottom: 12 },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumDone: { backgroundColor: Colors.success },
  stepNumWarn: { backgroundColor: Colors.warning },
  stepNumText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  stepTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  stepDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 14 },

  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  playBtnActive: { backgroundColor: Colors.primaryLight },
  playBtnDisabled: { backgroundColor: Colors.borderLight },
  playBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  playBtnTextActive: { color: Colors.primary },

  responseRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  earBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  earBtnText: { fontSize: 16, fontWeight: '700', color: Colors.primary },

  warnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.warningLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  warnText: { flex: 1, fontSize: 13, color: Colors.warning, lineHeight: 18 },

  successCard: { borderColor: Colors.success, borderWidth: 1.5 },
  warnCard:    { borderColor: Colors.warning, borderWidth: 1.5 },

  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  successTitle: { fontSize: 15, fontWeight: '700', color: Colors.success, marginBottom: 4 },
  successDesc:  { fontSize: 13, color: Colors.success, lineHeight: 18 },
  warnTitle:    { fontSize: 15, fontWeight: '700', color: Colors.warning, marginBottom: 4 },
  warnDesc:     { fontSize: 13, color: Colors.warning, lineHeight: 18 },

  skipRow: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 13, color: Colors.textTertiary, textDecorationLine: 'underline' },
});
