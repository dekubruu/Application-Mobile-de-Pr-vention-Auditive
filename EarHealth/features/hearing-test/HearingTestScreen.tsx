import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Colors } from '@/constants/colors';
import { WEBVIEW_AUDIO_HTML } from './constants/hearing-test.constants';
import { useHearingTest } from './hooks/useHearingTest';
import { TestIntroView } from './components/TestIntroView';
import { TestingView } from './components/TestingView';
import { TestResultView } from './components/TestResultView';

export default function HearingTestScreen() {
  const {
    webViewRef,
    isWeb,
    audioReady,
    testStarted,
    testCompleted,
    isPlaying,
    volume,
    currentFrequency,
    testPhase,
    precision,
    hearingThreshold,
    startTest,
    cancelTest,
    playFrequency,
    stopFrequency,
    updateVolume,
    handleHeard,
    handleNotHeard,
    handleWebViewMessage,
    handleWebViewLoadEnd,
  } = useHearingTest();

  const hiddenWebView = isWeb ? null : (
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
  );

  const renderContent = () => {
    if (testCompleted && hearingThreshold !== null) {
      return <TestResultView hearingThreshold={hearingThreshold} onRetry={startTest} />;
    }
    if (testStarted) {
      return (
        <TestingView
          currentFrequency={currentFrequency}
          isPlaying={isPlaying}
          volume={volume}
          testPhase={testPhase}
          precision={precision}
          onPlay={playFrequency}
          onStop={stopFrequency}
          onVolumeChange={updateVolume}
          onHeard={handleHeard}
          onNotHeard={handleNotHeard}
        />
      );
    }
    return <TestIntroView audioReady={audioReady} onStart={startTest} />;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {hiddenWebView}

      <View style={styles.header}>
        <View style={styles.headerSide}>
          {testStarted && !testCompleted && (
            <Pressable onPress={cancelTest} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.headerTitle}>HearSafe</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerSide: {
    width: 80,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.primary,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
});
