import { Text, View } from 'react-native';
import type { WorkspaceTheme } from './workspace-theme';

export function StudyProgress({ theme, label, current, total }: {
  theme: WorkspaceTheme; label: string; current: number; total: number;
}) {
  const { colors, styles } = theme;
  return <View style={{ gap: 6 }}>
    <View style={styles.headerWide}><Text style={styles.muted}>{label}</Text><Text style={styles.pill}>{current}/{total}</Text></View>
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: total || 1, now: current }}
      style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
      <View style={{ width: `${total ? current / total * 100 : 0}%`, height: 6, backgroundColor: colors.primary }} />
    </View>
  </View>;
}

