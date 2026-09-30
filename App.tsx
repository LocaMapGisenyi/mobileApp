import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider, DefaultTheme, configureFonts } from 'react-native-paper';
import AppNavigator from './src/navigation';
import { View, StyleSheet, ActivityIndicator, AppState, Platform, Text, Pressable } from 'react-native';
import { colors } from './src/theme';
import { usePreferences } from './src/store/preferences';
import { useUserStore } from './src/store/user';
import { I18nextProvider } from 'react-i18next';
import i18n, { initializeLanguage } from './src/utils/i18n';
import ToastManager from './src/components/ToastManager';
import { installAuthLinkListener } from './src/lib/authLinks';
import { supabase } from './src/lib/supabase';
import NewPasswordScreen from './src/screens/NewPasswordScreen';
import { useMessagesStore } from './src/store/messages';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { captureError, installGlobalDiagnostics } from './src/lib/diagnostics';

// Configuration complète des polices pour React Native Paper
const fontConfig = {
  web: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
  },
  ios: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
  },
  android: {
    regular: {
      fontFamily: 'sans-serif',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'sans-serif-medium',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'sans-serif-light',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'sans-serif-thin',
      fontWeight: '100',
    },
  },
};

// Thème React Native Paper — Direction A : Lac Kivu · Sarcelle
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,           // sarcelle #467434
    accent: colors.primaryMid,
    background: colors.background,
    surface: colors.surface,
    text: colors.ink,
    placeholder: colors.inkSubtle,
    backdrop: 'rgba(54, 54, 54, 0.42)',
    onPrimary: colors.onPrimary,
    primaryContainer: colors.primaryLight,
    onPrimaryContainer: colors.primaryDark,
    secondary: colors.primary,
    secondaryContainer: colors.accentLight,
    onSecondaryContainer: colors.ink,
    outline: colors.borderMid,
    notification: colors.error,
    error: colors.error,
    disabled: colors.inkDisabled,
    onSurface: colors.ink,
    onSurfaceVariant: colors.inkSubtle,
    onBackground: colors.ink,
    card: colors.surface,
    border: colors.border,
    surfaceVariant: colors.surfaceSunken,
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.surface,
      level3: colors.surfaceSunken,
      level4: colors.surfaceSunken,
      level5: colors.surfaceSunken,
    },
  },
  fonts: configureFonts({ config: fontConfig as any }),
  roundness: 10,
  dark: false,
};

// Wrapper pour le theme
const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);
  const recovery = useUserStore(s => s.passwordRecovery);
  const userId = useUserStore(s => s.authUser?.id);
  const authError = useUserStore(s => s.error);

  useEffect(() => userId ? useMessagesStore.getState().connect(userId) : undefined, [userId]);

  useEffect(() => {
    let mounted = true;
    const removeLinks = installAuthLinkListener();
    const removeDiagnostics = installGlobalDiagnostics();
    const refresh = (state: string) => {
      if (Platform.OS !== 'web') {
        if (state === 'active') supabase.auth.startAutoRefresh();
        else supabase.auth.stopAutoRefresh();
      }
    };
    refresh(AppState.currentState);
    const appState = AppState.addEventListener('change', refresh);
    const initApp = async () => {
      try {
        const savedLang = await initializeLanguage();
        if (!mounted) return;
        usePreferences.setState({ language: savedLang as any });
        await useUserStore.getState().actions.initAuth();
      } catch (error) {
        captureError('startup',error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initApp();
    return () => {
      mounted = false;
      removeLinks();
      removeDiagnostics();
      appState.remove();
      supabase.auth.stopAutoRefresh();
      useUserStore.getState().actions.disposeAuth();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {authError && <View accessibilityRole="alert" style={{padding: 12, backgroundColor: colors.surfaceSunken}}>
        <Text style={{color: colors.error}}>{authError}</Text>
        <Pressable onPress={() => useUserStore.getState().actions.clearError()} accessibilityRole="button"><Text>Fermer</Text></Pressable>
      </View>}
      {recovery ? <NewPasswordScreen /> : <AppNavigator />}
      <ToastManager />
    </View>
  );
};

const AppWrapper = () => {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <I18nextProvider i18n={i18n}>
          <AppContent />
        </I18nextProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default function App() {
  return <GestureHandlerRootView style={styles.container}><AppErrorBoundary><AppWrapper /></AppErrorBoundary></GestureHandlerRootView>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
