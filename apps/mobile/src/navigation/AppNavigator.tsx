import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Flame, LayoutGrid, LifeBuoy, User } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { TasksScreen } from '../screens/TasksScreen';
import { HabitsScreen } from '../screens/HabitsScreen';
import { YouScreen } from '../screens/YouScreen';
import { FONTS } from '../theme/tokens';
import { useTokens } from '../components/kit';
import { Onboarding } from '../components/Onboarding';
import { StreakSheet } from '../components/StreakSheet';

type TabParamList = {
  Tasks: undefined;
  Habits: undefined;
  You: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS = { Tasks: LifeBuoy, Habits: LayoutGrid, You: User } as const;

/* ── Header (streak + avatar) ────────────────────────────────────────────── */

function Header({ onStreak, onAvatar }: { onStreak: () => void; onAvatar: () => void }) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const { streak, user } = useApp();

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: insets.top + 6, paddingBottom: 4, paddingHorizontal: 22,
      backgroundColor: t.colors.bg.screen,
    }}>
      <Pressable onPress={onStreak} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Flame size={18} color={t.colors.accent.main} strokeWidth={2.2} />
        <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 15, color: t.colors.text.primary, fontVariant: ['tabular-nums'] }}>
          {streak}
        </Text>
      </Pressable>
      <Pressable onPress={onAvatar} hitSlop={8} style={{
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: t.colors.lavender, alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: t.colors.bg.screen,
      }}>
        <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 14, color: t.colors.text.onInk }}>
          {user?.initials ?? 'IO'}
        </Text>
      </Pressable>
    </View>
  );
}

/* ── Navigator ───────────────────────────────────────────────────────────── */

export function AppNavigator() {
  const t = useTokens();
  const { hasSeenOnboarding, markOnboardingSeen } = useApp();
  const [streakOpen, setStreakOpen] = useState(false);

  return (
    <>
      <Tab.Navigator
        initialRouteName="Tasks"
        screenOptions={({ route }) => {
          const Icon = TAB_ICONS[route.name as keyof TabParamList];
          return {
            header: ({ navigation }) => (
              <Header
                onStreak={() => setStreakOpen(true)}
                onAvatar={() => navigation.navigate('You')}
              />
            ),
            tabBarActiveTintColor: t.colors.text.primary,
            tabBarInactiveTintColor: t.colors.text.muted,
            tabBarStyle: {
              backgroundColor: t.colors.bg.card,
              borderTopColor: t.colors.hairline,
              borderTopWidth: 1,
              height: 84,
              paddingTop: 8,
            },
            tabBarLabelStyle: { fontFamily: FONTS.sansSemi, fontSize: 11, letterSpacing: 0.4 },
            tabBarIcon: ({ focused, color }) => (
              <Icon size={24} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            ),
            sceneStyle: { backgroundColor: t.colors.bg.screen },
          };
        }}
      >
        <Tab.Screen name="Tasks" component={TasksScreen} />
        <Tab.Screen name="Habits" component={HabitsScreen} />
        <Tab.Screen name="You" component={YouScreen} />
      </Tab.Navigator>

      {streakOpen && <StreakSheet onClose={() => setStreakOpen(false)} />}
      {!hasSeenOnboarding && <Onboarding onDone={markOnboardingSeen} />}
    </>
  );
}
