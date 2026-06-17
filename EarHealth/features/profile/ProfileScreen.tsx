import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import { profileService } from '@/features/auth/services/profile.service';
import { StatsGrid } from './components/StatsGrid';
import { useProfileData } from './hooks/useProfileData';

export default function ProfileScreen() {
  const { profile, session, testsCount, daysSinceJoined, loadingStats, refreshProfile, signOut } =
    useProfileData();
  const [darkMode, setDarkMode] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setEditUsername(profile.username ?? '');
  }, [profile]);

  const handleSave = async () => {
    if (!session || !editUsername.trim()) return;
    setSaving(true);
    try {
      await profileService.updateProfile(session.user.id, { username: editUsername.trim() });
      await refreshProfile();
      setEditVisible(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.profileCard} elevated>
          <Pressable style={styles.editBtn} onPress={() => setEditVisible(true)} hitSlop={8}>
            <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
          </Pressable>
          <View style={styles.avatarRing}>
            <Ionicons name="person" size={36} color={Colors.primary} />
          </View>
          {loadingStats && !profile ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 8 }} />
          ) : (
            <>
              <Text style={styles.userName}>{profile?.username ?? 'Utilisateur'}</Text>
              <Text style={styles.userEmail}>{session?.user.email ?? ''}</Text>
            </>
          )}
        </Card>

        <StatsGrid
          tests={testsCount}
          points={profile?.total_points ?? 0}
          days={daysSinceJoined}
        />

        <Card style={styles.section} padding={0}>
          <Text style={styles.sectionTitle}>Préférences</Text>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="moon-outline" size={18} color={Colors.textSecondary} />
            </View>
            <Text style={styles.rowLabel}>Mode sombre</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        <Card style={styles.section} padding={0}>
          <Text style={styles.sectionTitle}>Données</Text>
          <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
            <View style={styles.rowIcon}>
              <Ionicons name="download-outline" size={18} color={Colors.textSecondary} />
            </View>
            <Text style={styles.rowLabel}>Exporter mes données</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </Pressable>
        </Card>

        <Card style={styles.section} padding={0}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleSignOut}
          >
            <View style={[styles.rowIcon, styles.rowIconDanger]}>
              <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            </View>
            <Text style={[styles.rowLabel, styles.rowLabelDanger]}>Déconnexion</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </Pressable>
        </Card>
      </ScrollView>

      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setEditVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Modifier le profil</Text>
          <Text style={styles.sheetLabel}>Nom d'utilisateur</Text>
          <TextInput
            style={styles.sheetInput}
            value={editUsername}
            onChangeText={setEditUsername}
            placeholder="Nom d'utilisateur"
            placeholderTextColor={Colors.textTertiary}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <Button
            title={saving ? 'Enregistrement…' : 'Enregistrer'}
            variant="primary"
            size="lg"
            onPress={handleSave}
            disabled={saving}
            style={styles.sheetBtn}
          />
          <Button
            title="Annuler"
            variant="ghost"
            size="md"
            onPress={() => setEditVisible(false)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
    textAlign: 'center'
  },
  content: { padding: 16, paddingBottom: 48 },
  profileCard: { alignItems: 'center', paddingVertical: 28, marginBottom: 12 },
  editBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  userEmail: { fontSize: 13, color: Colors.textSecondary },
  section: { overflow: 'hidden', marginBottom: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowPressed: { backgroundColor: Colors.surfaceSecondary },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowIconDanger: { backgroundColor: Colors.errorLight },
  rowLabel: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },
  rowLabelDanger: { color: Colors.error },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  sheetLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 7,
  },
  sheetInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
    marginBottom: 16,
  },
  sheetBtn: { marginBottom: 8 },
});
