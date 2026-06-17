import { setAudioModeAsync } from 'expo-audio';
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { WEBVIEW_AUDIO_HTML } from '../constants/hearing-test.constants';

export type AudioChannel = 'left' | 'right' | 'both';

export interface AudioEngineHandle {
  playTone:     (frequency: number, volume: number, channel: AudioChannel) => void;
  stopTone:     () => void;
  setVolume:    (volume: number) => void;
  setFrequency: (frequency: number) => void;
}

interface AudioEngineProps {
  onReady?: () => void;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export const AudioEngine = forwardRef<AudioEngineHandle, AudioEngineProps>(
  ({ onReady }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const readyRef   = useRef(false);

    useImperativeHandle(ref, () => ({
      playTone(frequency, volume, channel) {
        const v = clamp01(volume);
        const f = Math.max(20, Math.min(22000, frequency));
        webViewRef.current?.injectJavaScript(
          `window.playTone && window.playTone(${f}, ${v}, '${channel}'); true;`
        );
      },
      stopTone() {
        webViewRef.current?.injectJavaScript(`window.stopTone && window.stopTone(); true;`);
      },
      setVolume(volume) {
        const v = clamp01(volume);
        webViewRef.current?.injectJavaScript(`window.setVolume && window.setVolume(${v}); true;`);
      },
      setFrequency(frequency) {
        const f = Math.max(20, Math.min(22000, frequency));
        webViewRef.current?.injectJavaScript(
          `window.setFrequency && window.setFrequency(${f}); true;`
        );
      },
    }), []);

    // iOS: sans cette session audio, les tons (joués via la WebView) sont
    // coupés par l'interrupteur silencieux quand aucun écouteur n'est branché.
    // playsInSilentMode → audible même en mode silencieux ; allowsRecording:false
    // → sortie haut-parleur (et neutralise un éventuel mode "record" laissé par
    // le sonomètre). N'affecte pas la logique du test.
    useEffect(() => {
      if (Platform.OS === 'web') return;
      setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    }, []);

    if (Platform.OS === 'web') return null;

    return (
      <View style={styles.hidden} pointerEvents="none">
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: WEBVIEW_AUDIO_HTML }}
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'audio_ready' && !readyRef.current) {
                readyRef.current = true;
                onReady?.();
              }
            } catch {
              /* ignore */
            }
          }}
        />
      </View>
    );
  }
);

AudioEngine.displayName = 'AudioEngine';

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -10,
    left: -10,
  },
});
