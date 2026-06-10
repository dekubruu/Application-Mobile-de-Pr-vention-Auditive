import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useAuthContext } from '@/features/auth/context/AuthContext';

export default function Home() {
  const { session, loading } = useAuthContext();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <Redirect href={session ? '/(tabs)/test' : '/(auth)/login'} />;
}
