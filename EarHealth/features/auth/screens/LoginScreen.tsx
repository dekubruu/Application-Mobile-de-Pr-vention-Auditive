import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Colors } from '@/constants/colors';
import { AuthInput } from '../components/AuthInput';
import { authService } from '../services/auth.service';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email requis.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email invalide.';
    if (!password) e.password = 'Mot de passe requis.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await authService.signIn(email.trim(), password);
      // NavigationGuard in _layout.tsx handles redirect on session change
    } catch (e: any) {
      const raw: string = e?.message ?? '';
      const msg = raw.includes('Invalid login credentials')
        ? 'Email ou mot de passe incorrect.'
        : raw.includes('Email not confirmed')
        ? 'Email non confirmé. Vérifiez votre boîte mail.'
        : raw || 'Erreur de connexion. Réessayez.';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.iconRing}>
              <Ionicons name="ear-outline" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.appName}>EarHealth</Text>
            <Text style={styles.tagline}>Prenez soin de votre audition</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.formTitle}>Connexion</Text>
            <Text style={styles.formSub}>Bienvenue ! Connectez-vous pour continuer.</Text>

            <AuthInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              keyboardType="email-address"
              error={errors.email}
            />
            <AuthInput
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureToggle
              error={errors.password}
            />

            {errors.general ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            ) : null}

            <Button
              title={loading ? 'Connexion…' : 'Se connecter'}
              variant="primary"
              size="lg"
              onPress={handleLogin}
              disabled={loading}
              style={styles.btn}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ?</Text>
            <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={8}>
              <Text style={styles.footerLink}> Créer un compte</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 32 },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: Colors.primaryLight,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  formSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.error,
    fontWeight: '500',
  },
  btn: { marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: Colors.textSecondary },
  footerLink: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
});
