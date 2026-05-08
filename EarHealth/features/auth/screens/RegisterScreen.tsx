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

export default function RegisterScreen() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.username.trim()) e.username = "Nom d'utilisateur requis.";
    else if (form.username.trim().length < 3) e.username = 'Minimum 3 caractères.';
    if (!form.email.trim()) e.email = 'Email requis.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email invalide.';
    if (!form.password) e.password = 'Mot de passe requis.';
    else if (form.password.length < 6) e.password = 'Minimum 6 caractères.';
    if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Les mots de passe ne correspondent pas.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const { session } = await authService.signUp(
        form.email.trim(),
        form.password,
        form.username.trim(),
      );
      if (session) {
        // NavigationGuard in _layout.tsx handles redirect on session change
      } else {
        setSuccess(true);
      }
    } catch (e: any) {
      const raw: string = e?.message ?? '';
      const msg = raw.includes('already registered')
        ? 'Cet email est déjà utilisé.'
        : raw || 'Erreur lors de la création du compte.';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
          <Text style={styles.successTitle}>Compte créé !</Text>
          <Text style={styles.successText}>
            Vérifiez votre boîte mail pour confirmer votre adresse email, puis connectez-vous.
          </Text>
          <Button
            title="Se connecter"
            variant="primary"
            size="lg"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.successBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

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
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>

          <View style={styles.card}>
            <Text style={styles.formTitle}>Créer un compte</Text>
            <Text style={styles.formSub}>Commencez à prendre soin de votre audition.</Text>

            <AuthInput
              label="Nom d'utilisateur"
              value={form.username}
              onChangeText={set('username')}
              placeholder="ex: johndoe"
              error={errors.username}
              autoCapitalize="none"
            />
            <AuthInput
              label="Email"
              value={form.email}
              onChangeText={set('email')}
              placeholder="votre@email.com"
              keyboardType="email-address"
              error={errors.email}
            />
            <AuthInput
              label="Mot de passe"
              value={form.password}
              onChangeText={set('password')}
              placeholder="Minimum 6 caractères"
              secureToggle
              error={errors.password}
            />
            <AuthInput
              label="Confirmer le mot de passe"
              value={form.confirmPassword}
              onChangeText={set('confirmPassword')}
              placeholder="••••••••"
              secureToggle
              error={errors.confirmPassword}
            />

            {errors.general ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            ) : null}

            <Button
              title={loading ? 'Création…' : 'Créer mon compte'}
              variant="primary"
              size="lg"
              onPress={handleRegister}
              disabled={loading}
              style={styles.btn}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ?</Text>
            <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
              <Text style={styles.footerLink}> Se connecter</Text>
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
  content: { flexGrow: 1, padding: 24 },
  backBtn: { marginBottom: 24, alignSelf: 'flex-start' },
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  successText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  successBtn: { alignSelf: 'stretch', marginTop: 16 },
});
