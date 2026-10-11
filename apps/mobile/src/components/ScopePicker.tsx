import type { FolderDto } from '@kanji-nest/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useStoragePort } from '../db/DbProvider';
import { useScope } from '../scope/ScopeProvider';
import { useTheme, type AppTheme } from '../theme/ThemeProvider';

const SCOPE_MODES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'first', label: 'N đầu' },
  { id: 'random', label: 'Random' },
] as const;

type ScopeMode = (typeof SCOPE_MODES)[number]['id'];

/**
 * Chọn phạm vi học (M4): chip thư mục (Tất cả + thư mục còn sống) + chip
 * chế độ (Tất cả/N đầu/Random) + ô nhập N. Dùng chung cho 3 màn học.
 */
export function ScopePicker(): ReactElement {
  const port = useStoragePort();
  const { theme } = useTheme();
  const { folderId, selectFolder, selection, setSelection } = useScope();
  const [folders, setFolders] = useState<FolderDto[]>([]);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const all = await port.folders.all();
        if (active) setFolders(all.filter((f) => f.deletedAt === null));
      })();
      return () => {
        active = false;
      };
    }, [port]),
  );

  const chooseMode = (mode: ScopeMode): void => {
    if (mode === 'all') {
      setSelection({ mode: 'all', n: selection.n, seed: selection.seed });
    } else {
      setSelection({ mode, n: selection.n, seed: Date.now() });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
        <Pressable
          style={[styles.chip, folderId === null && styles.chipActive]}
          onPress={() => selectFolder(null)}
        >
          <Text style={[styles.chipText, folderId === null && styles.chipTextActive]}>
            Tất cả
          </Text>
        </Pressable>
        {folders.map((folder) => (
          <Pressable
            key={folder.id}
            style={[styles.chip, folder.id === folderId && styles.chipActive]}
            onPress={() => selectFolder(folder.id)}
          >
            <Text style={[styles.chipText, folder.id === folderId && styles.chipTextActive]}>
              {folder.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.row}>
        {SCOPE_MODES.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.chip, selection.mode === item.id && styles.chipActive]}
            onPress={() => chooseMode(item.id)}
          >
            <Text style={[styles.chipText, selection.mode === item.id && styles.chipTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
        {selection.mode !== 'all' ? (
          <TextInput
            style={styles.nInput}
            keyboardType="number-pad"
            aria-label="Số từ"
            value={String(selection.n)}
            onChangeText={(text) => {
              const n = Math.max(1, Math.min(5000, Number(text.replace(/[^0-9]/g, '')) || 1));
              setSelection({ ...selection, n });
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: 8,
    },
    row: {
      flexDirection: 'row',
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.btnBorder,
      marginRight: 8,
      backgroundColor: t.btnBg,
    },
    chipActive: {
      backgroundColor: t.primary,
      borderColor: t.primary,
    },
    chipText: {
      fontWeight: '600',
      color: t.btnFg,
    },
    chipTextActive: {
      color: t.primaryContrast,
    },
    nInput: {
      width: 64,
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.btnBg,
      color: t.text,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      textAlign: 'center',
      fontWeight: '700',
    },
  });
