import { Text, View } from 'react-native';
import type { WorkspaceTheme } from './workspace-theme';

export function StudyProgress({ theme, label, current, total, summary }: {
  theme: WorkspaceTheme; label: string; current: number; total: number; summary?: string;
}) {
  const { colors, styles } = theme;
  return <View style={[styles.headerWide, { gap: 9, minHeight: theme.compact ? 32 : 40 }]}>
    <Text style={[styles.muted, { fontSize: 11, letterSpacing: 1 }]}>{label.toUpperCase()}</Text>
    <Text style={[styles.field, { fontSize: 13, fontWeight: '700' }]}>{current}/{total}</Text>
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: total || 1, now: current }}
      style={{ flex: 1, minWidth: 32, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
      <View style={{ width: `${total ? current / total * 100 : 0}%`, height: 6, backgroundColor: colors.primary }} />
    </View>
    {!!summary && !theme.compact && <Text style={[styles.muted, { fontSize: 13 }]}>{summary}</Text>}
  </View>;
}

