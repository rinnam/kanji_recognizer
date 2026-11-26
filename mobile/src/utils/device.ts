import { Platform, useWindowDimensions } from 'react-native';

export const MOBILE_PHONE_BREAKPOINT = 768;

/**
 * Returns true on native iOS/Android or narrow mobile phone viewports (< 768px).
 * Desktop Web (>= 768px) always returns false so Web layout & features remain untouched.
 */
export function useIsMobilePhone(): boolean {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return true;
  return width > 0 && width < MOBILE_PHONE_BREAKPOINT;
}
