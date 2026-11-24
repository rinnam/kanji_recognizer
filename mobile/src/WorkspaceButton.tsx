import { useState, type ReactNode } from 'react';
import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';
import type { WorkspaceTheme } from './workspace-theme';

interface ControlProps {
  theme: WorkspaceTheme;
  label: string;
  accessibleLabel?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  count?: number;
  compactTab?: boolean;
  layout?: StyleProp<ViewStyle>;
  icon?: ReactNode;
  dense?: boolean;
  selectedFilled?: boolean;
}

export function Control({ theme, label, accessibleLabel, onPress, onLongPress, selected, disabled, count, compactTab, layout, icon, dense, selectedFilled }: ControlProps) {
  const [focused, setFocused] = useState(false);
  const { styles } = theme;
  const iconOnly = !!icon && label === '' && count === undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibleLabel ?? (count === undefined ? label : `${label} · ${count}`)}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={dense ? 4 : undefined}
      style={[
        styles.button,
        dense && styles.denseButton,
        layout,
        count !== undefined && styles.folderButton,
        compactTab && styles.tabButton,
        iconOnly && styles.iconOnlyButton,
        selected && (selectedFilled ? styles.active : (count !== undefined || compactTab ? styles.scopedActive : styles.active)),
        focused && styles.focus,
        disabled && { opacity: 0.55 },
      ]}
    >
      {icon}
      {!iconOnly && <Text style={[
        styles.buttonText, compactTab && styles.tabText, count !== undefined && { flexShrink: 1 },
        selected && (selectedFilled ? styles.activeText : (count !== undefined || compactTab ? styles.scopedText : styles.activeText)),
      ]}>{label}</Text>}
      {count !== undefined && <Text style={styles.pill}>{count}</Text>}
    </Pressable>
  );
}
