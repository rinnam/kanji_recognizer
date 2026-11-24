import { Platform, type ViewStyle } from 'react-native';

export const nihongoTheme = {
  colors: {
    bgBase: '#FFFDF9',
    bgWarm: '#FFF7EE',
    bgPeach: '#FCECE3',
    surface: '#FFFFFF',
    surfaceSubtle: '#FFF9F2',
    accent: '#F48A34',
    accentHover: '#EA7A1E',
    accentSoft: '#FFF3E6',
    accentPill: '#FDEBD6',
    accentDisabled: '#FBD7B8',
    textPrimary: '#1E1E1E',
    textSecondary: '#6E6E73',
    textMuted: '#8A8A8E',
    borderWarm: '#F0E6DC',
    borderLight: '#EFEFEF',
    successBg: '#E8F5E9',
    successText: '#1B873F',
    warningBg: '#FFF3E0',
    warningText: '#B45309',
    chipNeutralBg: '#F4F2EF',
  },
  radius: {
    card: 22,
    md: 16,
    button: 14,
    pill: 9999,
  },
  layout: {
    maxWidth: 920,
    dockBottomOffset: 16,
    contentBottomPadding: 112,
  },
  shadow: {
    card: Platform.select<ViewStyle>({
      web: { boxShadow: '0 4px 20px rgba(180, 120, 70, 0.06)' } as ViewStyle,
      default: {
        shadowColor: '#B47846',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 3,
      },
    }) as ViewStyle,
    dock: Platform.select<ViewStyle>({
      web: { boxShadow: '0 8px 30px rgba(30, 30, 30, 0.10)' } as ViewStyle,
      default: {
        shadowColor: '#1E1E1E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 8,
      },
    }) as ViewStyle,
  },
} as const;
