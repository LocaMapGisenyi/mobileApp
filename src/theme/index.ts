/**
 * LocaMap — Direction A : Lac Kivu · Sarcelle
 * Couleur signature : sarcelle profonde du lac à l'aube
 */

import { Platform } from 'react-native';

// ─── Palette ─────────────────────────────────────────────────────────────────

export const colors = {
  // Primaire : sarcelle profonde — lac Kivu au petit matin
  primary: '#0D6E6E',
  primaryLight: '#E8F4F4',   // surface de chip, fond d'input focus
  primaryMid: '#1A9494',     // état hover / icône active légère
  primaryDark: '#084F4F',    // état pressed, profondeur

  // Fond & surface
  background: '#FAFAFA',     // blanc neutre pur, pas warm
  surface: '#FFFFFF',
  surfaceSunken: '#F3F8F8',  // fond légèrement teinté sarcelle pour sections

  // Texte — teinté vers le primaire, pas le gris générique
  ink: '#0F1F1F',            // titre, label principal
  inkMid: '#2E4A4A',         // corps de texte
  inkSubtle: '#5A7878',      // métadonnées, labels secondaires
  inkDisabled: '#9BB5B5',    // désactivé

  // Bordures
  border: '#D0E8E8',         // bordure légère teintée sarcelle
  borderMid: '#9BB5B5',      // bordure visible

  // Alias de compatibilité (utilisés par les anciens écrans)
  black: '#0F1F1F',
  white: '#FFFFFF',
  gray: {
    50: '#F3F8F8',
    100: '#E8F4F4',
    200: '#D0E8E8',
    300: '#9BB5B5',
    400: '#6E9898',
    500: '#5A7878',
    600: '#3D5E5E',
    700: '#2E4A4A',
    800: '#1A3333',
  },

  // États sémantiques
  success: '#1A8A6E',
  warning: '#C47C00',
  error: '#C1440E',          // latérite — contraste fort avec le vert-sarcelle
  info: '#0D6E6E',

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
  background_compat: '#FAFAFA',
  text: '#0F1F1F',
  outline: '#D0E8E8',
  secondary: '#1A9494',
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
  md: 6,       // inputs, boutons — plus serré qu'Airbnb
  lg: 12,      // cards
  xl: 16,
  '2xl': 24,
  full: 9999,
  button: 6,
  card: 12,
  input: 6,
  searchBar: 28,
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
    shadowColor: '#0D6E6E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0D6E6E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0D6E6E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0D6E6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#0D6E6E',
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
    backgroundColor: colors.primary,
    borderRadius: borderRadius.button,
    padding: spacing[4],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryButtonText: {
    color: colors.white,
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
    lineHeight: typography.lineHeight.relaxed,
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
