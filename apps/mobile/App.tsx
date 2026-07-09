import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Ephesis_400Regular } from '@expo-google-fonts/ephesis';
import {
  AlbertSans_300Light,
  AlbertSans_400Regular,
  AlbertSans_500Medium,
  AlbertSans_600SemiBold,
  AlbertSans_700Bold,
} from '@expo-google-fonts/albert-sans';
import { AppProvider, useApp } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { registerForPushNotificationsAsync } from './src/utils/notifications';
import { getTokens } from './src/theme/tokens';

function ThemedApp() {
  const { theme } = useApp();
  const t = getTokens(theme);
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.screen }}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Ephesis_400Regular,
    AlbertSans_300Light,
    AlbertSans_400Regular,
    AlbertSans_500Medium,
    AlbertSans_600SemiBold,
    AlbertSans_700Bold,
  });
  // Never hang on the splash: give fonts a moment, then render regardless
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setFontTimeout(true), 2500);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    // Registration is safe even if you later choose a different backend/provider.
    // On development builds, this gives you an Expo push token (when EAS projectId exists).
    void registerForPushNotificationsAsync();
  }, []);

  if (!fontsLoaded && !fontError && !fontTimeout) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <ThemedApp />
      </AppProvider>
    </SafeAreaProvider>
  );
}
