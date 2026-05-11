import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { WEBVIEW_AUDIO_HTML } from './constants/hearing-test.constants';
import { useHearingTest } from './hooks/useHearingTest';
import { ChannelValidationView } from './components/ChannelValidationView';
import { EnvironmentCheckView }  from './components/EnvironmentCheckView';
import { EarTransitionView }     from './components/EarTransitionView';
import { HeadphoneDetectView }   from './components/HeadphoneDetectView';
import { HeadsetSelectView }     from './components/HeadsetSelectView';
import { TestingView }           from './components/TestingView';
import { TestIntroView }         from './components/TestIntroView';
import { TestResultView }        from './components/TestResultView';
import { TestWelcomeView }       from './components/TestWelcomeView';

export default function HearingTestScreen() {
  const router       = useRouter();
  const { session }  = useAuth();
  const {
    webViewRef,
    isWeb,
    audioReady,
    testStage,
    testMode,
    currentEar,

    // Ambient
    ambientStatus,
    ambientDb,
    measureAmbient,
    proceedFromEnvironment,

    // Channel validation
    cvHasPlayed,
    cvAttempts,
    cvLastResult,
    isPlaying,
    playChannelValidation,
    handleChannelValidationResponse,
    skipChannelValidation,

    // Headphone detection
    headphoneDetection,
    detectedHeadsetId,

    // Testing
    freqIndex,
    totalFrequencies,
    currentFrequency,
    frequencyResults,
    isSilentTrial,
    falsePositives,
    silentCount,
    resultReliable,

    // Results
    leftEarResults,
    rightEarResults,
    monoResults,
    getEarCategory,
    saveResults,
    saveError,

    // Headset select
    selectHeadset,

    // Actions
    proceedFromIntro,
    selectMode,
    startTest,
    continueToNextPhase,
    cancelTest,
    retryTest,
    handleResponse,
    replayFrequency,
    handleWebViewMessage,
    handleWebViewLoadEnd,
  } = useHearingTest(session?.user?.id);

  const isActiveTest = testStage === 'testing' || testStage === 'ear-transition';
  const showEarPill  = testStage === 'testing' && testMode === 'headset';

  // Fade in content whenever the stage changes
  const fadeAnim     = useRef(new Animated.Value(1)).current;
  const prevStageRef = useRef(testStage);
  useEffect(() => {
    if (prevStageRef.current === testStage) return;
    prevStageRef.current = testStage;
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 280,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [testStage]);

  const handleQuit = () => {
    if (isActiveTest) {
      Alert.alert(
        'Quitter le test',
        'Le test en cours sera annulé. Voulez-vous vraiment quitter ?',
        [
          { text: 'Rester',  style: 'cancel' },
          { text: 'Quitter', style: 'destructive', onPress: () => { cancelTest(); router.back(); } },
        ],
      );
    } else {
      router.back();
    }
  };

  const renderContent = () => {
    switch (testStage) {
      case 'intro':
        return <TestWelcomeView onStart={proceedFromIntro} />;

      case 'environment-check':
        return (
          <EnvironmentCheckView
            status={ambientStatus}
            ambientDb={ambientDb}
            onMeasure={measureAmbient}
            onContinue={proceedFromEnvironment}
          />
        );

      case 'headphone-detect':
        return (
          <HeadphoneDetectView
            detection={headphoneDetection}
            onSelect={selectMode}
          />
        );

      case 'channel-validation':
        return (
          <ChannelValidationView
            audioReady={audioReady}
            isPlaying={isPlaying}
            hasPlayed={cvHasPlayed}
            attempts={cvAttempts}
            lastResult={cvLastResult}
            onPlay={playChannelValidation}
            onResponse={handleChannelValidationResponse}
            onSkip={skipChannelValidation}
          />
        );

      case 'headset-select':
        return (
          <HeadsetSelectView
            onSelect={selectHeadset}
            detectedHeadsetId={detectedHeadsetId}
          />
        );

      case 'pre-test':
        return (
          <TestIntroView
            audioReady={audioReady}
            testMode={testMode}
            onStart={startTest}
          />
        );

      case 'testing':
        return (
          <TestingView
            testMode={testMode}
            currentEar={currentEar}
            freqIndex={freqIndex}
            totalFrequencies={totalFrequencies}
            currentFrequency={currentFrequency}
            isPlaying={isPlaying}
            isSilentTrial={isSilentTrial}
            frequencyResults={frequencyResults}
            onReplay={replayFrequency}
            onResponse={handleResponse}
          />
        );

      case 'ear-transition':
        return (
          <EarTransitionView
            leftEarResults={leftEarResults}
            onContinue={continueToNextPhase}
          />
        );

      case 'results':
        return (
          <TestResultView
            testMode={testMode}
            leftEarResults={leftEarResults}
            rightEarResults={rightEarResults}
            monoResults={monoResults}
            leftCategory={getEarCategory(leftEarResults)}
            rightCategory={getEarCategory(rightEarResults)}
            monoCategory={getEarCategory(monoResults)}
            resultReliable={resultReliable}
            falsePositives={falsePositives}
            silentCount={silentCount}
            saveError={saveError}
            onRetry={retryTest}
            onSave={saveResults}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Hidden WebView audio bridge for iOS / Android */}
      {!isWeb && (
        <WebView
          ref={webViewRef}
          source={{ html: WEBVIEW_AUDIO_HTML }}
          style={{ height: 0, width: 0 }}
          originWhitelist={['*']}
          javaScriptEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          onMessage={handleWebViewMessage}
          onLoadEnd={handleWebViewLoadEnd}
          onError={(event) => console.error('WebView error', event.nativeEvent)}
        />
      )}

      <View style={styles.header}>
        <View style={styles.headerSide}>
          <Pressable onPress={handleQuit} style={styles.cancelBtn} hitSlop={8}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>HearSafe</Text>
        <View style={styles.headerSide}>
          {showEarPill && (
            <View style={styles.earPill}>
              <Ionicons
                name={currentEar === 'left' ? 'arrow-back' : 'arrow-forward'}
                size={13}
                color={Colors.primary}
              />
              <Text style={styles.earPillText}>
                {currentEar === 'left' ? 'G' : 'D'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {renderContent()}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerSide:  { width: 80 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  cancelBtn:   { paddingVertical: 6, paddingHorizontal: 2 },
  cancelText:  { fontSize: 15, fontWeight: '500', color: Colors.primary },
  earPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-end',
  },
  earPillText: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  content: { padding: 16, paddingBottom: 40 },
});
