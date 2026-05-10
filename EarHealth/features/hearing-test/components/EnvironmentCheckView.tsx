import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import type { AmbientStatus } from '../types/hearing-test.types';

interface EnvironmentCheckViewProps {
  status:    AmbientStatus;
  ambientDb: number | null;
  onMeasure: () => void;
  onContinue: () => void;
}

const DURATION_S = 5;

const STATUS_CONFIG = {
  idle: {
    icon:    'mic-outline'        as const,
    color:   Colors.textSecondary,
    bg:      Colors.surfaceSecondary,
    title:   'Vérification de l\'environnement',
    desc:    'Nous allons mesurer le bruit ambiant pendant 5 secondes pour s\'assurer des meilleures conditions.',
  },
  measuring: {
    icon:    'mic'                as const,
    color:   Colors.primary,
    bg:      Colors.primaryLight,
    title:   'Mesure en cours…',
    desc:    'Restez silencieux et ne parlez pas.',
  },
  ok: {
    icon:    'checkmark-circle'   as const,
    color:   Colors.success,
    bg:      Colors.successLight,
    title:   'Environnement calme',
    desc:    'Parfait ! Le niveau sonore est idéal pour un test fiable.',
  },
  warning: {
    icon:    'alert-circle'       as const,
    color:   Colors.warning,
    bg:      Colors.warningLight,
    title:   'Bruit modéré détecté',
    desc:    'Vous pouvez continuer, mais les résultats pourraient être légèrement affectés.',
  },
  loud: {
    icon:    'volume-high'        as const,
    color:   Colors.error,
    bg:      Colors.errorLight,
    title:   'Environnement trop bruyant',
    desc:    'Trouvez un endroit plus calme pour un test fiable. Évitez les pièces avec de la musique ou de la télévision.',
  },
};

export const EnvironmentCheckView: React.FC<EnvironmentCheckViewProps> = ({
  status,
  ambientDb,
  onMeasure,
  onContinue,
}) => {
  const [elapsed, setElapsed]  = useState(0);
  const progressAnim           = useRef(new Animated.Value(0)).current;
  const pulseAnim              = useRef(new Animated.Value(1)).current;
  const prevStatus             = useRef<AmbientStatus>('idle');

  // Drive the 5s progress bar while measuring
  useEffect(() => {
    if (status === 'measuring') {
      setElapsed(0);
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: DURATION_S * 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      const iv = setInterval(() => setElapsed(e => e + 1), 1000);
      return () => clearInterval(iv);
    } else {
      progressAnim.stopAnimation();
    }
  }, [status]);

  // Pulse animation on the mic icon while measuring
  useEffect(() => {
    if (status === 'measuring') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
    }
    prevStatus.current = status;
  }, [status]);

  const cfg   = STATUS_CONFIG[status];
  const done  = status === 'ok' || status === 'warning' || status === 'loud';
  const isMeasuring = status === 'measuring';

  return (
    <>
      <View style={styles.hero}>
        <Animated.View style={[
          styles.iconRing,
          { backgroundColor: cfg.bg },
          isMeasuring && { transform: [{ scale: pulseAnim }] },
        ]}>
          <Ionicons name={cfg.icon} size={48} color={cfg.color} />
        </Animated.View>
        <Text style={styles.heroTitle}>{cfg.title}</Text>
        <Text style={styles.heroSubtitle}>{cfg.desc}</Text>
      </View>

      {/* Progress bar — shown while measuring */}
      {isMeasuring && (
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Mesure du bruit ambiant</Text>
            <Text style={styles.progressCount}>{elapsed} / {DURATION_S}s</Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[
              styles.progressFill,
              { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]} />
          </View>
        </Card>
      )}

      {/* Result card — shown when done */}
      {done && ambientDb !== null && (
        <Card style={[styles.resultCard, { borderColor: cfg.color, borderWidth: 1.5 }]}>
          <View style={styles.resultRow}>
            <View style={[styles.resultIconWrap, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={22} color={cfg.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.resultDb, { color: cfg.color }]}>{ambientDb} dB</Text>
              <Text style={styles.resultLabel}>Niveau ambiant mesuré</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Tips */}
      {status === 'loud' && (
        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Conseils</Text>
          {[
            'Fermez les fenêtres et les portes',
            'Éloignez-vous des appareils bruyants',
            'Coupez la musique ou la télévision',
            'Essayez une pièce différente',
          ].map(tip => (
            <View key={tip} style={styles.tipRow}>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Actions */}
      {status === 'idle' && (
        <Button
          title="Mesurer l'environnement"
          variant="primary"
          size="lg"
          onPress={onMeasure}
          style={styles.cta}
        />
      )}

      {status === 'loud' && (
        <>
          <Button
            title="Réessayer la mesure"
            variant="primary"
            size="lg"
            onPress={onMeasure}
            style={styles.cta}
          />
          <Pressable style={styles.skipRow} onPress={onContinue}>
            <Text style={styles.skipText}>Continuer quand même</Text>
          </Pressable>
        </>
      )}

      {(status === 'ok' || status === 'warning') && (
        <Button
          title="Continuer"
          variant="primary"
          size="lg"
          onPress={onContinue}
          style={styles.cta}
        />
      )}

      {/* Always-visible skip once not measuring */}
      {status === 'idle' && (
        <Pressable style={styles.skipRow} onPress={onContinue}>
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
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  progressCard: { paddingVertical: 16, gap: 10 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  progressCount: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  resultCard: { paddingVertical: 16 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  resultIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultDb:    { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  resultLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  tipsCard:    { paddingVertical: 16, gap: 8 },
  tipsTitle:   { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  tipRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipText:     { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  cta:         { marginTop: 8 },
  skipRow:     { alignItems: 'center', paddingVertical: 12 },
  skipText:    { fontSize: 13, color: Colors.textTertiary, textDecorationLine: 'underline' },
});
