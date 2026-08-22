import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useMobileAuth } from '../../src/auth';
import { colors } from '../../src/theme';

const Icon = ({ value, color, active }: { value: string; color: string; active: boolean }) =>
  <Text style={{ color, fontSize: active ? 22 : 20, fontWeight: active ? '800' : '500' }}>{value}</Text>;

export default function TabLayout() {
  const { user, loading } = useMobileAuth();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.green}/></View>;
  if (!user) return <Redirect href="/login"/>;
  const icon = (value: string) => ({ color, focused }: { color: string; focused: boolean }) => <Icon value={value} color={color} active={focused}/>;
  return <Tabs screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 11, fontWeight: '700' }, tabBarStyle: { height: 70, paddingBottom: 9, paddingTop: 6, backgroundColor: 'white', borderTopColor: '#e5e8e2' }, headerTitleStyle: { fontWeight: '800' } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('⌂') }}/>
    <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: icon('⌕') }}/>
    <Tabs.Screen name="create" options={{ title: 'Create', tabBarIcon: icon('＋') }}/>
    <Tabs.Screen name="reels" options={{ title: 'Reels', tabBarIcon: icon('▶') }}/>
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('◎') }}/>
  </Tabs>;
}
