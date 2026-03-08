import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
      }}
    >
      <Tabs.Screen
        name="test"
        options={{
          title: 'Test',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>🎧</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="game"
        options={{
          title: 'Jeu',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>🎮</Text>
          ),
        }}
      />
      
      <Tabs.Screen
        name="soundmeter"
        options={{
          title: 'Sonomètre',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>🔊</Text>
          ),
        }}
      />


      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 8,
    height: 70,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  tabBarIcon: {
    marginTop: 4,
  },
  tabIcon: {
    fontSize: 24,
  },
});