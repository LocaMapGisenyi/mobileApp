import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';

export type Language = 'fr' | 'en' | 'rw' | 'sw';
export type Currency = 'RWF' | 'USD' | 'EUR';

interface PreferencesState {
  language: Language;
  currency: Currency;
  notifications: boolean;
  darkMode: boolean;
  setLanguage: (language: Language) => Promise<void>;
  setCurrency: (currency: Currency) => Promise<void>;
  setNotifications: (enabled: boolean) => Promise<void>;
  setDarkMode: (enabled: boolean) => Promise<void>;
  initializeLanguageFromSystem: () => Promise<void>;
  resetPreferences: () => Promise<void>;
}

const DEFAULT_PREFERENCES: Omit<PreferencesState, 'setLanguage' | 'setCurrency' | 'setNotifications' | 'setDarkMode' | 'initializeLanguageFromSystem' | 'resetPreferences'> = {
  language: 'fr',
  currency: 'RWF',
  notifications: true,
  darkMode: false,
};

// Fonction utilitaire pour obtenir la langue du système
const getSystemLanguage = (): Language => {
  const deviceLocale = ((Localization as any).locale || (Localization.getLocales?.()[0]?.languageCode) || 'fr').slice(0, 2);
  
  // Vérifier si la langue est supportée, sinon utiliser français par défaut
  switch (deviceLocale) {
    case 'fr': return 'fr';
    case 'en': return 'en';
    case 'rw': return 'rw';
    case 'sw': return 'sw';
    default: return 'fr';
  }
};

// Fonction pour changer la langue dans i18n sans créer de dépendance circulaire
const updateI18nLanguage = (language: string) => {
  if (i18n && typeof i18n.changeLanguage === 'function') {
    i18n.changeLanguage(language);
    
    // Optionally persist to AsyncStorage
    try {
      AsyncStorage.setItem('@locamap:language', language);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  }
};

// Store persisté avec AsyncStorage
export const usePreferences = create<PreferencesState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PREFERENCES,

      setLanguage: async (language) => {
        return new Promise<void>((resolve) => {
          set({ language });
          // Synchroniser avec i18n
          updateI18nLanguage(language);
          setTimeout(resolve, 50);
        });
      },
      
      setCurrency: async (currency) => {
        return new Promise<void>((resolve) => {
          set({ currency });
          setTimeout(resolve, 50);
        });
      },
      
      setNotifications: async (notifications) => {
        return new Promise<void>((resolve) => {
          set({ notifications });
          setTimeout(resolve, 50);
        });
      },
      
      setDarkMode: async (darkMode) => {
        return new Promise<void>((resolve) => {
          set({ darkMode });
          setTimeout(resolve, 50);
        });
      },
      
      initializeLanguageFromSystem: async () => {
        return new Promise<void>((resolve) => {
          const currentLang = get().language;
          
          // Si aucune langue n'est encore définie, utiliser celle du système
          if (!currentLang) {
            const systemLanguage = getSystemLanguage();
            set({ language: systemLanguage });
            // Synchroniser avec i18n
            updateI18nLanguage(systemLanguage);
          } else {
            // Assurer la synchronisation avec i18n
            updateI18nLanguage(currentLang);
          }
          
          setTimeout(resolve, 50);
        });
      },
      
      resetPreferences: async () => {
        return new Promise<void>((resolve) => {
          set(DEFAULT_PREFERENCES);
          // Synchroniser avec i18n
          updateI18nLanguage(DEFAULT_PREFERENCES.language);
          setTimeout(resolve, 50);
        });
      },
    }),
    {
      name: 'preferences-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
); 