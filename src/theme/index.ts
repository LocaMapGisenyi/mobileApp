/**
 * Thème global pour l'application LocaMap
 * Inspiré du design Airbnb
 */

import { Platform } from 'react-native';

// Palette de couleurs Airbnb
export const colors = {
  // Couleurs principales
  primary: '#FF385C', // Rose Airbnb
  black: '#222222',
  white: '#FFFFFF',
  
  // Nuances de gris
  gray: {
    50: '#F7F7F7',  // Fond très clair, presque blanc
    100: '#F0F0F0', // Fond d'input, cartes
    200: '#DDDDDD', // Bordures légères
    300: '#B0B0B0', // Texte désactivé
    400: '#909090', // Texte secondaire
    500: '#717171', // Texte standard
    600: '#484848', // Texte important
    700: '#333333', // Texte principal
    800: '#222222', // Texte très foncé
  },
  
  // Shortcut aliases for screens that use colors.background / colors.text
  background: '#FFFFFF',
  text: '#222222',
  // Social color shortcuts
  apple: '#000000',
  facebook: '#1877F2',
  google: '#4285F4',
  // Outline color
  outline: '#DDDDDD',

  // États
  success: '#00A699',
  warning: '#FFB400',
  error: '#FF5A5F',
  info: '#007A87',
  // Marque LocaMap
  secondary: '#4F46E5',
  // Réseaux sociaux
  social: {
    google: '#4285F4',
    facebook: '#1877F2',
    apple: '#000000',
  },
};

// Typographie
export const typography = {
  fontFamily: {
    ...Platform.select({
      ios: { 
        regular: 'System',
        medium: 'System',
        semiBold: 'System',
        bold: 'System',
      },
      android: { 
        regular: 'sans-serif',
        medium: 'sans-serif-medium',
        semiBold: 'sans-serif-medium',
        bold: 'sans-serif-medium',
      },
      default: {
        regular: 'sans-serif',
        medium: 'sans-serif-medium',
        semiBold: 'sans-serif-medium',
        bold: 'sans-serif-medium',
      },
    }),
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 32,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.15,
    base: 1.4,
    normal: 1.4,
    md: 1.5,
    relaxed: 1.6,
  },
};

// Espacement
export const spacing = {
  '0': 0,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
};

// Rayons de bordure
export const borderRadius = {
  'none': 0,
  'sm': 4,
  'md': 8,
  'lg': 12,
  'xl': 16,
  '2xl': 24,
  'full': 9999,
  // Spécifiques Airbnb
  'button': 8,
  'card': 12,
  'input': 8,
  'searchBar': 32,
  'tag': 16,
};

// Ombres
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
};

// Styles communs pour les composants
export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  inputStyle: {
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.input,
    padding: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.button,
    padding: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semiBold,
    fontSize: typography.fontSize.base,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.button,
    padding: spacing[4],
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: colors.gray[700],
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.base,
  },
  cardStyle: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    ...shadows.sm,
    padding: spacing[4],
  },
  heading1: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[800],
    marginBottom: spacing[4],
  },
  heading2: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[800],
    marginBottom: spacing[3],
  },
  heading3: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.gray[800],
    marginBottom: spacing[2],
  },
  paragraph: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    lineHeight: typography.lineHeight.relaxed,
  },
  smallText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
};

// Re-export colors from colors.ts as darkColors for dark-theme usage
export { default as darkColors } from './colors';

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  commonStyles,
}; 