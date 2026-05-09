import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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

const toISODate = (d: Date) => d.toISOString().split('T')[0];

const DEFAULT_DOB = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 25);
  return d;
})();

export default function RegisterScreen() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    date_of_birth: toISODate(DEFAULT_DOB),
    gender: '',
  });
  const [dateOfBirth, setDateOfBirth] = useState(DEFAULT_DOB);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (date) {
      setDateOfBirth(date);
      setForm(prev => ({ ...prev, date_of_birth: toISODate(date) }));
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.username.trim()) e.username = "Nom d'utilisateur requis.";
    else if (form.username.trim().length < 3) e.username = 'Minimum 3 caractères.';
    if (!form.gender) e.gender = 'Veuillez sélectionner votre genre.';
    if (!form.date_of_birth) e.date_of_birth = 'Veuillez sélectionner votre date de naissance.';
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
        form.date_of_birth,
        form.gender,
      );
      if (session) {
        // NavigationGuard in _layout.tsx handles redirect
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
            onPress={() => router.replace('/(auth)/login' as any)}
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

            {/* Genre */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Genre</Text>
              <View style={styles.genderRow}>
                {[{ label: 'Homme', value: 'male' }, { label: 'Femme', value: 'female' }].map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[styles.genderBtn, form.gender === opt.value && styles.genderBtnActive]}
                    onPress={() => set('gender')(opt.value)}
                  >
                    <Text style={[styles.genderLabel, form.gender === opt.value && styles.genderLabelActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {errors.gender ? <Text style={styles.errorInline}>{errors.gender}</Text> : null}
            </View>

            {/* Date de naissance */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Date de naissance</Text>
              <Pressable style={styles.dateBtn} onPress={() => setShowPicker(true)}>
                <Text style={styles.dateBtnText}>
                  {dateOfBirth.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
                <Ionicons name="calendar-outline" size={18} color={Colors.textTertiary} />
              </Pressable>
              {errors.date_of_birth ? <Text style={styles.errorInline}>{errors.date_of_birth}</Text> : null}
            </View>

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
            <Pressable onPress={() => router.replace('/(auth)/login' as any)} hitSlop={8}>
              <Text style={styles.footerLink}> Se connecter</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date picker bottom sheet */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowPicker(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Date de naissance</Text>
            <Pressable onPress={() => setShowPicker(false)} hitSlop={8}>
              <Text style={styles.sheetDone}>Confirmer</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={dateOfBirth}
            mode="date"
            display="spinner"
            onChange={onDateChange}
            maximumDate={new Date()}
            locale="fr-FR"
            style={styles.datePicker}
            textColor={Colors.text}
          />
        </View>
      </Modal>
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
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  formTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, letterSpacing: -0.3, marginBottom: 4 },
  formSub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24 },
  fieldBlock: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 7, letterSpacing: 0.1 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', backgroundColor: Colors.surface,
  },
  genderBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  genderLabel: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  genderLabelActive: { color: Colors.primary },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 12, borderColor: Colors.border,
    backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 13,
  },
  dateBtnText: { fontSize: 15, color: Colors.text },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  sheetDone: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  datePicker: { width: '100%' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.errorLight, borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '500' },
  errorInline: { fontSize: 12, color: Colors.error, marginTop: 6, fontWeight: '500' },
  btn: { marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: Colors.textSecondary },
  footerLink: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  successTitle: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5, textAlign: 'center' },
  successText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  successBtn: { alignSelf: 'stretch', marginTop: 16 },
});
