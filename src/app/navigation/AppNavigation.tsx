import type { ComponentProps } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AnalyticsPage } from '@pages/analytics/AnalyticsPage';
import { HistoryPage } from '@pages/history/HistoryPage';
import { HomePage } from '@pages/home/HomePage';
import { PlanDetailsPage } from '@pages/plan-details/PlanDetailsPage';
import { PlansPage } from '@pages/plans/PlansPage';
import { SettingsPage } from '@pages/settings/SettingsPage';
import { WorkoutDetailsPage } from '@pages/workout-details/WorkoutDetailsPage';
import { WorkoutSessionPage } from '@pages/workout-session/WorkoutSessionPage';
import { useThemeColors, useThemeMode } from '@shared/ui/theme';

import type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const tabIcons: Record<keyof MainTabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Home: { active: 'today', inactive: 'today-outline' },
  Plans: { active: 'barbell', inactive: 'barbell-outline' },
  History: { active: 'time', inactive: 'time-outline' },
  Analytics: { active: 'analytics', inactive: 'analytics-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

const MainTabs = () => {
  const colors = useThemeColors();

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, focused, size }) => {
          const icon = tabIcons[route.name];

          return <Ionicons name={focused ? icon.active : icon.inactive} size={size} color={color} />;
        },
      })}>
      <Tabs.Screen name="Home" component={HomePage} options={{ title: 'Today' }} />
      <Tabs.Screen name="Plans" component={PlansPage} />
      <Tabs.Screen name="History" component={HistoryPage} />
      <Tabs.Screen name="Analytics" component={AnalyticsPage} />
      <Tabs.Screen name="Settings" component={SettingsPage} />
    </Tabs.Navigator>
  );
};

export const AppNavigation = () => {
  const { colors, mode } = useThemeMode();

  return (
    <NavigationContainer
      theme={{
        dark: mode === 'dark',
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.warning,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="PlanDetails" component={PlanDetailsPage} options={{ title: 'Plan' }} />
        <Stack.Screen name="WorkoutSession" component={WorkoutSessionPage} options={{ title: 'Workout' }} />
        <Stack.Screen name="WorkoutDetails" component={WorkoutDetailsPage} options={{ title: 'Workout details' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
