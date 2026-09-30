/**
 * LocaMap — orange pour agir, vert pour se repérer, gris pour lire.
 */

import { Platform } from 'react-native';

// ─── Palette ─────────────────────────────────────────────────────────────────

export const colors = {
  accent: '#F58F20',
  accentPressed: '#E17B0E',
  accentLight: '#FFF0DD',
  onAccent: '#363636',
  onPrimary: '#FFFFFF',
  // Vert : navigation, sélection et confirmation
  primary: '#467434',
  primaryLight: '#EDF3E9',   // surface de chip, fond d'input focus
  primaryMid: '#568940',     // état hover / icône active légère
  primaryDark: '#315225',    // état pressed, profondeur

  // Fond & surface
  background: '#F7F8F6',     // blanc neutre pur, pas warm
  surface: '#FFFFFF',
  surfaceSunken: '#F1F4EF',  // fond légèrement teinté vert pour sections

  // Texte — teinté vers le primaire, pas le gris générique
  ink: '#363636',            // titre, label principal
  inkMid: '#4D514A',         // corps de texte
  inkSubtle: '#62685F',      // métadonnées, labels secondaires
  inkDisabled: '#ADB5A7',    // désactivé

  // Bordures
  border: '#DFE5DB',         // bordure légère teintée verte
  borderMid: '#ADB5A7',      // bordure visible

  // Alias de compatibilité (utilisés par les anciens écrans)
  black: '#363636',
  white: '#FFFFFF',
  gray: {
    50: '#F1F4EF',
    100: '#EDF3E9',
    200: '#DFE5DB',
    300: '#ADB5A7',
    400: '#70786A',
    500: '#62685F',
    600: '#555C4F',
    700: '#4D514A',
    800: '#363636',
  },

  // États sémantiques
  success: '#467434',
  warning: '#8B510B',
  error: '#B43C2E',          // latérite — contraste fort avec le vert
  info: '#467434',

  // Sociaux
  apple: '#000000',
  facebook: '#1877F2',
  google: '#4285F4',
  social: {
    google: '#4285F4',
    facebook: '#1877F2',
    apple: '#000000',
  },

  // Compatibilité
  background_compat: '#F7F8F6',
  text: '#363636',
  outline: '#DFE5DB',
  secondary: '#568940',
};

// ─── Typographie ──────────────────────────────────────────────────────────────

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
    xs: 12,
    sm: 14,
    base: 16,
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

// ─── Espacement ───────────────────────────────────────────────────────────────

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

// ─── Rayons ───────────────────────────────────────────────────────────────────

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 10,
  lg: 16,
  xl: 16,
  '2xl': 16,
  full: 9999,
  button: 12,
  card: 16,
  input: 10,
  searchBar: 12,
  tag: 6,
};

// ─── Ombres ───────────────────────────────────────────────────────────────────
// Teintées sarcelle pour cohérence

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#467434',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#467434',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#467434',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#467434',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#467434',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
};

// ─── Styles communs ───────────────────────────────────────────────────────────

export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inputStyle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    padding: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.ink,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    minHeight: 48,
    borderRadius: borderRadius.button,
    padding: spacing[4],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryButtonText: {
    color: colors.onAccent,
    fontWeight: typography.fontWeight.semiBold,
    fontSize: typography.fontSize.base,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.button,
    padding: spacing[4],
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  outlineButtonText: {
    color: colors.inkMid,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.base,
  },
  cardStyle: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
  },
  heading1: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
    marginBottom: spacing[4],
  },
  heading2: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.ink,
    marginBottom: spacing[3],
  },
  heading3: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.ink,
    marginBottom: spacing[2],
  },
  paragraph: {
    fontSize: typography.fontSize.base,
    color: colors.inkMid,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  smallText: {
    fontSize: typography.fontSize.sm,
    color: colors.inkSubtle,
  },
};

export { default as darkColors } from './colors';

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  commonStyles,
};
