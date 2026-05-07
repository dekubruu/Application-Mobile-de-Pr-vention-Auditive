import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import { StatsGrid } from './components/StatsGrid';

export default function ProfileScreen() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Card style={styles.profileHeader}>
          <Text style={styles.avatar}>👤</Text>
          <Text style={styles.userName}>Deaf Hacker</Text>
          <Text style={styles.userEmail}>Deaf.hacker@icanthearyou.help</Text>
        </Card>

        <StatsGrid tests={999} points={0} days={193} />

        <Card style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Préférences</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>🌙 Mode sombre</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: Colors.border, true: Colors.success }}
              thumbColor={darkMode ? Colors.success : Colors.textSecondary}
            />
          </View>
        </Card>

        <Card style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Données</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>📥 Exporter mes données</Text>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
          <View style={styles.settingDivider} />
        </Card>

        {/* About section (commented out pending future implementation)
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
});
