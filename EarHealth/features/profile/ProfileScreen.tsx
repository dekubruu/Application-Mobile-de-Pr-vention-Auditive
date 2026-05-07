import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import { StatsGrid } from './components/StatsGrid';

export default function ProfileScreen() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.profileCard} elevated>
          <View style={styles.avatarRing}>
            <Ionicons name="person" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.userName}>Deaf Hacker</Text>
          <Text style={styles.userEmail}>Deaf.hacker@icanthearyou.help</Text>
        </Card>

        <StatsGrid tests={999} points={0} days={193} />

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
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 12,
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
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  section: {
    overflow: 'hidden',
    marginBottom: 12,
  },
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
  rowPressed: {
    backgroundColor: Colors.surfaceSecondary,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
});
