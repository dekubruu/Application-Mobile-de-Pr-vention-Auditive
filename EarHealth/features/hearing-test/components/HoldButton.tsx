import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface HoldButtonProps {
  active:       boolean;
  disabled?:    boolean;
  label?:       string;
  hint?:        string;
  onHoldStart:  () => void;
  onHoldEnd:    () => void;
}

const SIZE = 220;

export const HoldButton: React.FC<HoldButtonProps> = ({
  active,
  disabled = false,
  label = "J'entends",
  hint = "Maintenez tant que vous entendez",
  onHoldStart,
  onHoldEnd,
}) => {
  const pulse = useRef(new Animated.Value(1)).current;
  const ring  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      Animated.timing(pulse, {
        toValue: 1.05, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }).start();

      const loop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ring, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      loop.start();
      return () => { loop.stop(); };
    } else {
      Animated.timing(pulse, {
        toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }).start();
      ring.stopAnimation();
      ring.setValue(0);
    }
  }, [active]);

  const ringScale   = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  return (
    <View style={styles.container}>
      <View style={styles.buttonWrap}>
        {active && (
          <Animated.View
            style={[
              styles.expandRing,
              { transform: [{ scale: ringScale }], opacity: ringOpacity },
            ]}
          />
        )}

        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Pressable
            disabled={disabled}
            onPressIn={onHoldStart}
            onPressOut={onHoldEnd}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              disabled && styles.buttonDisabled,
            ]}
          >
            <LinearGradient
              colors={
                active
                  ? ['#0D8FA5', '#0B7285', '#09616F']
                  : ['#1A9AB0', '#0D8FA5', '#0B7285']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              <Ionicons
                name={active ? 'volume-high' : 'finger-print'}
                size={56}
                color="#FFFFFF"
              />
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.state}>
                {active ? "Maintien actif" : "Appuyez & maintenez"}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>

      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 14 },
  buttonWrap: {
    width: SIZE, height: SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  expandRing: {
    position: 'absolute',
    width:  SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  button: {
    width:  SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 18 },
      android: { elevation: 10 },
    }),
  },
  buttonPressed:  { opacity: 0.95 },
  buttonDisabled: { opacity: 0.5 },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  label: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  state: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
