import { Tabs } from 'expo-router';
import { useMemo, type ReactElement } from 'react';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useTheme, type AppTheme } from '../../src/theme/ThemeProvider';

/** Icon đơn giản dùng Kanji/ký tự Unicode — không cần cài icon library. */
function TabIcon({
  glyph,
  color,
  focused,
  theme,
}: {
  glyph: string;
  color?: ColorValue | string;
  focused: boolean;
  theme: AppTheme;
}): ReactElement {
  return (
    <View
      style={[
        iconStyles.box,
        {
          backgroundColor: focused ? theme.primary : 'transparent',
        },
      ]}
    >
      <Text
        style={[
          iconStyles.glyph,
          { color: focused ? theme.primaryContrast : (color as string) },
        ]}
        accessible={false}
      >
        {glyph}
      </Text>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  box: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 20,
    fontWeight: '700',
  },
});

/**
 * Bottom tab bar: 4 mục — Trang chủ · Từ vựng · Học · Cài đặt.
 * Dùng Kanji/ký tự Unicode làm icon để giữ nhẹ (không cần expo-vector-icons).
 */
export default function TabLayout(): ReactElement {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.primary,
        headerTitleStyle: { color: theme.text, fontWeight: '700' },
        headerShadowVisible: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon glyph="家" color={color} focused={focused} theme={theme} />
          ),
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{
          title: 'Kho từ vựng',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon glyph="語" color={color} focused={focused} theme={theme} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Học',
          headerTitle: 'Không gian học',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon glyph="学" color={color} focused={focused} theme={theme} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Cài đặt',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon glyph="⚙" color={color} focused={focused} theme={theme} />
          ),
        }}
      />
    </Tabs>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: t.surface,
      borderTopWidth: 1,
      borderTopColor: t.border,
      height: 72,
      paddingBottom: 8,
      paddingTop: 6,
      elevation: 0,
      shadowOpacity: 0,
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    tabItem: {
      gap: 2,
    },
  });
