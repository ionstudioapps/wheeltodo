import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Flame, LayoutGrid, LifeBuoy, User } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { TasksScreen } from '../screens/TasksScreen';
import { HabitsScreen } from '../screens/HabitsScreen';
import { YouScreen } from '../screens/YouScreen';
import { FONTS } from '../theme/tokens';
import { SectionLabel, SpinPill, WheelMark, cardShadow, useTokens } from '../components/kit';
import { TUTORIAL_TASKS } from '../utils/tutorial';

type TabParamList = {
  Tasks: undefined;
  Habits: undefined;
  You: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS = { Tasks: LifeBuoy, Habits: LayoutGrid, You: User } as const;

/* ── Tutorial welcome (first run) ────────────────────────────────────────── */

function TutorialWelcome({ onDone }: { onDone: () => void }) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const { seedTasks } = useApp();

  function begin() {
    seedTasks(TUTORIAL_TASKS.map(({ id, name, minutes, color, icon }) => ({ id, name, minutes, color, icon, category: icon })));
    onDone();
  }

  return (
    <Modal animationType="fade">
      <View style={{ flex: 1, backgroundColor: t.colors.bg.screen }}>
        <ScrollView contentContainerStyle={{
          flexGrow: 1, alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 26, paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 24) + 16,
        }}>
          <View style={{ marginBottom: 22 }}>
            <WheelMark size={78} />
          </View>
          <Text style={{ fontFamily: FONTS.sansLight, fontSize: 15, color: t.colors.text.secondary, marginBottom: 3 }}>Hello.</Text>
          <Text style={{ fontFamily: FONTS.display, fontSize: 58, lineHeight: 66, color: t.colors.text.primary, marginBottom: 24 }}>
            Welcome<Text style={{ color: t.colors.accent.main }}>.</Text>
          </Text>

          <View style={[{ width: '100%', backgroundColor: t.colors.bg.card, borderRadius: 20, padding: 16, marginBottom: 20 }, cardShadow(t.dark)]}>
            <SectionLabel style={{ fontSize: 11, marginBottom: 11, marginLeft: 2 }}>Start here · 5 tasks</SectionLabel>
            <View style={{ gap: 9 }}>
              {TUTORIAL_TASKS.map((task) => (
                <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 999, backgroundColor: task.color, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: FONTS.sansBold, fontSize: 11, color: t.colors.bg.card }}>{task.step}</Text>
                  </View>
                  <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 14, color: t.colors.text.primary }}>{task.name}</Text>
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 11, color: t.colors.text.muted }}>{task.feature}</Text>
                </View>
              ))}
            </View>
          </View>

          <SpinPill full onPress={begin}>Spin to begin</SpinPill>
          <Pressable onPress={onDone} style={{ marginTop: 12, padding: 6 }}>
            <Text style={{ fontFamily: FONTS.sansLight, fontSize: 13, color: t.colors.text.muted }}>
              Skip — I&apos;ll add my own tasks
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

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

  return (
    <>
      <Tab.Navigator
        initialRouteName="Tasks"
        screenOptions={({ route }) => {
          const Icon = TAB_ICONS[route.name as keyof TabParamList];
          return {
            header: ({ navigation }) => (
              <Header
                onStreak={() => navigation.navigate('Habits')}
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

      {!hasSeenOnboarding && <TutorialWelcome onDone={markOnboardingSeen} />}
    </>
  );
}
