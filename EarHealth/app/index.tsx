<<<<<<< HEAD
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
=======
import { Redirect } from 'expo-router';
import React from 'react';

export default function Index() {
  return <Redirect href="/test" />;
>>>>>>> 9637e9e (feat: implement hearing test functionality)
}
