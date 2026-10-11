import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { useStoragePort } from '../db/DbProvider';
import { THEMES, type AppTheme, type ThemeName } from './theme';

export type { AppTheme, ThemeName };

const THEME_META_KEY = 'ui.theme';

interface ThemeApi {
  name: ThemeName;
  theme: AppTheme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);

function parseName(value: string | null): ThemeName | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/**
 * Theme sáng/tối: mặc định theo hệ thống, nhớ lựa chọn vào SQLite meta.
 * Đặt trong DbProvider (cần port), ngoài ScopeProvider/Stack.
 */
export function ThemeProvider({ children }: { children: ReactNode }): ReactElement {
  const port = useStoragePort();
  const system = useColorScheme();
  const [name, setName] = useState<ThemeName>(system === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    let active = true;
    void (async () => {
      const saved = parseName(await port.meta.get(THEME_META_KEY));
      if (active && saved !== null) setName(saved);
    })();
    return () => {
      active = false;
    };
  }, [port]);

  const toggle = useCallback(() => {
    setName((prev) => {
      const next: ThemeName = prev === 'light' ? 'dark' : 'light';
      void port.meta.set(THEME_META_KEY, next);
      return next;
    });
  }, [port]);

  return (
    <ThemeContext.Provider value={{ name, theme: THEMES[name], toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeApi {
  const api = useContext(ThemeContext);
  if (api === null) throw new Error('useTheme phải dùng trong <ThemeProvider>');
  return api;
}
