import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
      onMessage={handleWebViewMessage}
      onLoadEnd={handleWebViewLoadEnd}
      onError={(event) => console.error('WebView error', event.nativeEvent)}
    />
  );

  const renderContent = () => {
    if (testCompleted && hearingThreshold !== null) {
      return (
        <TestResultView
          hearingThreshold={hearingThreshold}
          onRetry={startTest}
        />
      );
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
    <SafeAreaView style={styles.safeArea}>
      {hiddenWebView}

      <View style={styles.header}>
        {testStarted && !testCompleted ? (
          <TouchableOpacity onPress={cancelTest}>
            <Text style={styles.backButton}>✕ Annuler</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={styles.headerTitle}>HearSafe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderContent()}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  scrollView: {
    padding: 16,
  },
});
