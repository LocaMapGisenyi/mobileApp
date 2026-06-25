/**
 * Typographie globale pour l'application LocaMap
 * Basée sur le design Gisenyi-Housing-App.html
 */

import { TextStyle } from 'react-native';
import colors from './colors';
import { Platform } from 'react-native';

// Utilisation des polices système équivalentes par défaut
export const fontFamilies = {
  primary: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'sans-serif',
  }),
  logo: Platform.select({
    ios: 'Georgia',
    android: 'cursive',
    default: 'sans-serif',
  }),
};

export const fontWeights: Record<string, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
};

// Styles de texte réutilisables
export const textStyles: Record<string, TextStyle> = {
  // Titres
  h1: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSize['4xl'],
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  h2: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  h3: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeights.semiBold,
    color: colors.text.primary,
  },
  h4: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeights.semiBold,
    color: colors.text.primary,
  },
  h5: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  
  // Corps de texte
  body: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeights.regular,
    color: colors.text.primary,
  },
  bodySmall: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeights.regular,
    color: colors.text.primary,
  },
  bodyLarge: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeights.regular,
    color: colors.text.primary,
  },
  
  // Textes spéciaux
  caption: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeights.regular,
    color: colors.text.secondary,
  },
  button: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeights.semiBold,
    color: colors.text.primary,
  },
  label: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  link: {
    fontFamily: fontFamilies.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeights.medium,
    color: colors.text.link,
  },
  
  // Logo et marque
  logo: {
    fontFamily: fontFamilies.logo,
    fontSize: fontSize['2xl'],
    color: colors.text.primary,
  },
};

export default {
  fontFamilies,
  fontWeights,
  fontSize,
  textStyles,
}; 