import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { Colors } from '../constants/colors';

export default function Home() {
  // Utiliser Redirect au lieu de useRouter + useEffect
  return <Redirect href="/test" />;
  
  // OU si vous voulez afficher un écran de chargement :
  /*
  return (
    <View style={styles.container}>
      <Text style={styles.title}>EarHealth</Text>
      <Text style={styles.subtitle}>
        Redirection vers le sonomètre...
      </Text>
      <Redirect href="/soundmeter" />
    </View>
  );
  */
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 30,
  },
});