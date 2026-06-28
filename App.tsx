import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, DefaultTheme, configureFonts } from 'react-native-paper';
import AppNavigator from './src/navigation';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from './src/theme';
import { usePreferences } from './src/store/preferences';
import { useUserStore } from './src/store/user';
import { I18nextProvider } from 'react-i18next';
import i18n, { initializeLanguage } from './src/utils/i18n';
import ToastManager from './src/components/ToastManager';

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
    primary: colors.primary,           // sarcelle #0D6E6E
    accent: colors.primaryMid,
    background: colors.background,
    surface: colors.surface,
    text: colors.ink,
    placeholder: colors.inkSubtle,
    backdrop: 'rgba(13, 110, 110, 0.18)',
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
  roundness: 6,
  dark: false,
};

// Wrapper pour le theme
const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        const savedLang = await initializeLanguage();
        usePreferences.setState({ language: savedLang as any });
        await useUserStore.getState().actions.initAuth();
      } catch (error) {
        console.error('Erreur initialisation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
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
      <AppNavigator />
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
  return <AppWrapper />;
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
