// app/profile.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Colors } from '../../constants/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>

        <Text style={styles.headerTitle}>Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Card style={styles.profileHeader}>
          <Text style={styles.avatar}>👤</Text>
          <Text style={styles.userName}>Deaf Hacker</Text>
          <Text style={styles.userEmail}>Deaf.hacker@icanthearyou.help</Text>
        </Card>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>999</Text>
            <Text style={styles.statLabel}>Tests</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Points</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statValue}>193</Text>
            <Text style={styles.statLabel}>Jours</Text>
          </Card>
        </View>

        {/* Preferences */}
        <Card style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Préférences</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>🌙 Mode sombre</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{
                false: Colors.border,
                true: Colors.success,
              }}
              thumbColor={darkMode ? Colors.success : Colors.textSecondary}
            />
          </View>
        </Card>

        {/* Data */}
        <Card style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Données</Text>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>📥 Exporter mes données</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>

          <View style={styles.settingDivider} />
        </Card>

        {/* About 
        <Card style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>À propos</Text>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>

          <View style={styles.settingDivider} />

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>📄 Conditions d'utilisation</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>🔐 Politique de confidentialité</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        </Card>
         */}
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
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
  scrollView: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    fontSize: 64,
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  settingsSection: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 16,
    overflow: 'hidden',
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  settingValue: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  chevron: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  logoutButton: {
    backgroundColor: Colors.error,
    marginTop: 24,
  },
});
