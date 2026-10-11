/**
 * Token màu mobile — mirror `apps/web/.../theme/tokens.css` (--kn-*).
 * Sáng/tối qua ThemeProvider (mặc định theo hệ thống, nhớ lựa chọn vào SQLite meta).
 */
export interface AppTheme {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryContrast: string;
  danger: string;
  btnBg: string;
  btnBorder: string;
  btnFg: string;
}

export type ThemeName = 'light' | 'dark';

export const lightTheme: AppTheme = {
  bg: '#efe9dc',
  surface: '#faf6ee',
  text: '#2b2622',
  muted: '#6b6257',
  border: '#d8cfbe',
  primary: '#b4532a',
  primaryContrast: '#ffffff',
  danger: '#a3301f',
  btnBg: '#efe9dc',
  btnBorder: '#8a7f6e',
  btnFg: '#2b2622',
};

export const darkTheme: AppTheme = {
  bg: '#1c1917',
  surface: '#262220',
  text: '#ece5d8',
  muted: '#a79e8e',
  border: '#3a342f',
  primary: '#e2794b',
  primaryContrast: '#1c1917',
  danger: '#e8795f',
  btnBg: '#3c352f',
  btnBorder: '#7d7366',
  btnFg: '#ece5d8',
};

export const THEMES: Record<ThemeName, AppTheme> = {
  light: lightTheme,
  dark: darkTheme,
};
