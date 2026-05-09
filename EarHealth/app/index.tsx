import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/colors';

// NavigationGuard in _layout.tsx handles all redirects based on session state.
export default function Home() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
