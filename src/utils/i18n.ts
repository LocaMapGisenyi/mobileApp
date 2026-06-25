import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import de tous les fichiers de traduction
import fr from '../locales/fr.json';
import en from '../locales/en.json';
import rw from '../locales/rw.json';
import sw from '../locales/sw.json';

// Constantes pour la persistance des préférences
export const LANGUAGE_STORAGE_KEY = '@locamap:language';

// Langues supportées
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'rw', 'sw'];

// Détection de la langue du système et correspondance avec une langue supportée
const getDeviceLanguage = (): string => {
  // Obtient la locale du dispositif (par exemple 'fr-FR', 'en-US', etc.)
  const deviceLocale = ((Localization as any).locale || (Localization.getLocales?.()[0]?.languageCode) || 'fr') as string;
  
  // Extrait le code de langue principal (fr, en, etc.)
  const languageCode = deviceLocale.split('-')[0];
  
  // Vérifie si cette langue est supportée, sinon retourne le français par défaut
  return SUPPORTED_LANGUAGES.includes(languageCode) ? languageCode : 'fr';
};

// Initialisation de i18next
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4' as const,
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      rw: { translation: rw },
      sw: { translation: sw },
    },
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

/**
 * Initialise la langue au démarrage de l'application
 * Ordre de priorité:
 * 1. Langue stockée dans AsyncStorage
 * 2. Langue du système (si supportée)
 * 3. Français (par défaut)
 */
export const initializeLanguage = async (): Promise<string> => {
  try {
    // Essaie de récupérer la langue sauvegardée
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    
    // Si une langue est sauvegardée et qu'elle est supportée
    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      i18n.changeLanguage(savedLanguage);
      return savedLanguage;
    }
    
    // Sinon, utilise la langue du système (ou fr par défaut)
    const deviceLanguage = getDeviceLanguage();
    i18n.changeLanguage(deviceLanguage);
    return deviceLanguage;
  } catch (error) {
    console.error('Error initializing language:', error);
    // En cas d'erreur, utilise le français
    i18n.changeLanguage('fr');
    return 'fr';
  }
};

/**
 * Fonction pour changer la langue manuellement et la persister
 * @param language Code de la langue
 */
export const changeLanguage = async (language: string): Promise<void> => {
  // Vérifie si la langue est supportée
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    console.warn(`Langue non supportée: ${language}`);
    return;
  }
  
  try {
    // Change la langue dans i18next
    await i18n.changeLanguage(language);
    
    // Sauvegarde la langue dans AsyncStorage
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

/**
 * Fonction utilitaire pour traduire du texte en dehors des composants React
 * @param key Clé de traduction
 * @param options Options de traduction (variables, etc.)
 */
export const translate = (key: string, options?: any): string => {
  return i18n.t(key, options) as string;
};

export default i18n; 