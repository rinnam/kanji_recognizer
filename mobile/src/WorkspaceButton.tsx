import { useState } from 'react';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { WorkspaceTheme } from './workspace-theme';

interface ControlProps {
  theme: WorkspaceTheme;
  label: string;
  accessibleLabel?: string;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  count?: number;
  compactTab?: boolean;
  layout?: StyleProp<ViewStyle>;
}

export function Control({ theme, label, accessibleLabel, onPress, selected, disabled, count, compactTab, layout }: ControlProps) {
  const [focused, setFocused] = useState(false);
  const { styles } = theme;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibleLabel ?? (count === undefined ? label : `${label} · ${count}`)}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        styles.button,
        layout,
        count !== undefined && styles.folderButton,
        compactTab && styles.tabButton,
        selected && (count !== undefined || compactTab ? styles.scopedActive : styles.active),
        focused && styles.focus,
        disabled && { opacity: 0.55 },
      ]}
    >
      <Text style={[
        styles.buttonText, count !== undefined && { flexShrink: 1 },
        selected && (count !== undefined || compactTab ? styles.scopedText : styles.activeText),
      ]}>{label}</Text>
      {count !== undefined && <Text style={styles.pill}>{count}</Text>}
    </Pressable>
  );
}
