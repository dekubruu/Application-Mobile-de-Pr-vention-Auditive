import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { AudioEngine, type AudioEngineHandle } from './audio/AudioEngine';
import { HeadphoneGateView } from './components/HeadphoneGateView';
import { PTTResultView } from './components/PTTResultView';
import { PTTTestingView } from './components/PTTTestingView';
import { usePureToneTest } from './hooks/usePureToneTest';
import { detectFromLabels } from './services/HeadphoneDetector';

export default function PureToneTestScreen() {
  const router = useRouter();
  const audioRef = useRef<AudioEngineHandle | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [gatePassed, setGatePassed] = useState(false);
  const [headsetDetected, setHeadsetDetected] = useState(false);
  const [headsetLabel, setHeadsetLabel]       = useState<string | null>(null);

  const {
    stage,
    currentEar,
    freqIndex,
    totalFreqs,
    currentFrequency,
    currentDb,
    isHeld,
    isPulsing,
    inactiveWarn,
    completedFreqs,
    earResults,
    start,
    startRightEar,
    cancel,
    reset,
    onHoldStart,
    onHoldEnd,
  } = usePureToneTest({ audio: audioRef, audioReady });

  const handleHeadsetDetected = (labels: string[]) => {
    const result = detectFromLabels(labels);
    setHeadsetDetected(result.connected);
    setHeadsetLabel(result.label);
  };

  const handleExit = () => {
    if (stage === 'testing' || stage === 'between-ears') {
      Alert.alert(
        'Quitter le test ?',
        'Vos résultats partiels seront perdus.',
        [
          { text: 'Continuer', style: 'cancel' },
          { text: 'Quitter',   style: 'destructive', onPress: () => { cancel(); router.back(); } },
        ],
      );
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AudioEngine
        ref={audioRef}
        onReady={() => setAudioReady(true)}
        onHeadsetDetected={handleHeadsetDetected}
      />

      <View style={styles.header}>
        <Pressable onPress={handleExit} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Pure Tone Threshold</Text>
        <View style={styles.backBtn} />
      </View>

      {!gatePassed && (
        <HeadphoneGateView
          detected={headsetDetected}
          label={headsetLabel}
          onNext={() => setGatePassed(true)}
          onCancel={() => router.back()}
          onRecheck={() => audioRef.current?.checkHeadphones()}
        />
      )}

      {gatePassed && stage === 'intro' && (
        <IntroView audioReady={audioReady} onStart={start} />
      )}

      {gatePassed && stage === 'testing' && (
        <ScrollView contentContainerStyle={styles.testingScroll}>
          <PTTTestingView
            ear={currentEar}
            freqIndex={freqIndex}
            totalFreqs={totalFreqs}
            currentFrequency={currentFrequency}
            currentDb={currentDb}
            isHeld={isHeld}
            isPulsing={isPulsing}
            inactiveWarn={inactiveWarn}
            completedFreqs={completedFreqs}
            onHoldStart={onHoldStart}
            onHoldEnd={onHoldEnd}
          />
        </ScrollView>
      )}

      {gatePassed && stage === 'between-ears' && (
        <BetweenEarsView onNext={startRightEar} />
      )}

      {gatePassed && stage === 'result' && (
        <>
          <PTTResultView earResults={earResults} />
          <View style={styles.footer}>
            <Pressable onPress={reset} style={styles.footerBtnSecondary}>
              <Ionicons name="refresh" size={17} color={Colors.primary} />
              <Text style={styles.footerBtnSecondaryText}>Refaire</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.footerBtnPrimary}>
              <Text style={styles.footerBtnPrimaryText}>Terminer</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ── Intro view ──

const IntroView: React.FC<{ audioReady: boolean; onStart: () => void }> = ({
  audioReady, onStart,
}) => (
  <ScrollView contentContainerStyle={styles.introContainer}>
    <View style={styles.iconRing}>
      <Ionicons name="ear" size={36} color={Colors.primary} />
    </View>

    <Text style={styles.introTitle}>Test de seuil auditif</Text>
    <Text style={styles.introSub}>
      Nous allons mesurer votre seuil de perception pour 4 fréquences,
      sur chaque oreille séparément.
    </Text>

    <View style={styles.steps}>
      <StepRow num="1" text="Mettez des écouteurs filaires de préférence" />
      <StepRow num="2" text="Réglez le volume du téléphone à mi-course" />
      <StepRow num="3" text="Maintenez le bouton tant que vous entendez" />
      <StepRow num="4" text="Relâchez dès que le son disparaît" />
    </View>

    <View style={styles.tipBox}>
      <Ionicons name="bulb-outline" size={16} color={Colors.primaryDark} />
      <Text style={styles.tipText}>
        Le volume va diminuer pendant que vous maintenez. Tenez bon jusqu’à ne plus rien entendre.
      </Text>
    </View>

    <Pressable
      disabled={!audioReady}
      onPress={onStart}
      style={({ pressed }) => [
        styles.ctaWrapper,
        pressed && styles.ctaPressed,
        !audioReady && styles.ctaDisabled,
      ]}
    >
      <LinearGradient
        colors={['#0D8FA5', '#0B7285', '#09616F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cta}
      >
        <Text style={styles.ctaText}>
          {audioReady ? 'Commencer (oreille gauche)' : 'Chargement audio…'}
        </Text>
        {audioReady && <Ionicons name="arrow-forward" size={20} color="#fff" />}
      </LinearGradient>
    </Pressable>
  </ScrollView>
);

const StepRow: React.FC<{ num: string; text: string }> = ({ num, text }) => (
  <View style={styles.stepRow}>
    <View style={styles.stepNum}>
      <Text style={styles.stepNumText}>{num}</Text>
    </View>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

// ── Between-ears transition ──

const BetweenEarsView: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <View style={styles.betweenContainer}>
    <View style={styles.iconRing}>
      <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
    </View>
    <Text style={styles.introTitle}>Oreille gauche terminée</Text>
    <Text style={styles.introSub}>
      Passez à l’oreille droite quand vous êtes prêt.
    </Text>

    <View style={styles.tipBox}>
      <Ionicons name="information-circle-outline" size={16} color={Colors.primaryDark} />
      <Text style={styles.tipText}>
        Le son sera maintenant joué dans l’oreille droite uniquement.
      </Text>
    </View>

    <Pressable
      onPress={onNext}
      style={({ pressed }) => [styles.ctaWrapper, pressed && styles.ctaPressed]}
    >
      <LinearGradient
        colors={['#0D8FA5', '#0B7285', '#09616F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cta}
      >
        <Text style={styles.ctaText}>Continuer (oreille droite)</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </LinearGradient>
    </Pressable>
  </View>
);

// ── Styles ──

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 16, fontWeight: '700',
    color: Colors.text, letterSpacing: -0.2,
  },

  // Intro
  introContainer: { padding: 20, alignItems: 'center' },
  iconRing: {
    width: 84, height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 18, marginBottom: 14,
  },
  introTitle: {
    fontSize: 22, fontWeight: '800',
    color: Colors.text, letterSpacing: -0.5,
    textAlign: 'center',
  },
  introSub: {
    fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', marginTop: 8, lineHeight: 20,
    paddingHorizontal: 8,
  },
  steps: {
    width: '100%',
    marginTop: 24,
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepNum: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 13, fontWeight: '800', color: Colors.primaryDark },
  stepText: { flex: 1, fontSize: 13, color: Colors.text, fontWeight: '500' },

  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    marginTop: 14,
    width: '100%',
  },
  tipText: { flex: 1, fontSize: 12, color: Colors.primaryDark, lineHeight: 18, fontWeight: '500' },

  ctaWrapper: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 22,
    ...Platform.select({
      ios:     { shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  ctaPressed:  { opacity: 0.9 },
  ctaDisabled: { opacity: 0.55 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },

  // Testing
  testingScroll: { paddingTop: 14, paddingBottom: 28, gap: 18 },

  // Between ears
  betweenContainer: { padding: 20, alignItems: 'center' },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  footerBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  footerBtnSecondaryText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  footerBtnPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  footerBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
