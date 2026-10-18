import { newVocabId, findDuplicate, type VocabularyDto } from '@kanji-nest/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStoragePort } from '../src/db/DbProvider';
import { nowIso } from '../src/lib/time';
import { useTheme, type AppTheme } from '../src/theme/ThemeProvider';

function newLocalVocab(word: string, meaning: string, now: string): VocabularyDto {
  return {
    id: newVocabId(),
    word,
    meaning,
    reading: null,
    sinoVietnamese: null,
    example: null,
    exampleMeaning: null,
    note: null,
    tags: [],
    jlptLevel: null,
    srsInterval: null,
    srsRepetition: null,
    srsEaseFactor: null,
    srsNextReview: null,
    folderIds: [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

/**
 * Tổng quan từ vựng (M3): danh sách từ còn sống + thêm nhanh (chống trùng
 * word+reading qua core) + xóa mềm (tombstone + updatedAt = now để sync đẩy).
 */
export default function Overview(): ReactElement {
  const port = useStoragePort();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [vocabs, setVocabs] = useState<VocabularyDto[]>([]);
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const allVocabs = await port.vocabs.all();
      setVocabs(allVocabs.filter((v) => v.deletedAt === null));
      setStatus('ready');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [port]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const quickAdd = useCallback(async () => {
    const cleanWord = word.trim();
    const cleanMeaning = meaning.trim();
    if (cleanWord === '' || cleanMeaning === '') {
      setFormError('Nhập đủ Từ và Nghĩa.');
      return;
    }
    const all = await port.vocabs.all();
    if (findDuplicate(all, cleanWord, null) !== undefined) {
      setFormError('Từ này đã có trong bộ từ.');
      return;
    }
    const now = nowIso();
    await port.vocabs.putMany([newLocalVocab(cleanWord, cleanMeaning, now)]);
    setWord('');
    setMeaning('');
    setFormError(null);
    await reload();
  }, [word, meaning, port, reload]);

  const remove = useCallback(
    async (id: string) => {
      const now = nowIso();
      const all = await port.vocabs.all();
      const target = all.find((v) => v.id === id);
      if (target === undefined) return;
      await port.vocabs.putMany([{ ...target, deletedAt: now, updatedAt: now }]);
      await reload();
    },
    [port, reload],
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Thêm nhanh một từ</Text>
        <TextInput
          style={styles.input}
          placeholder="Từ vựng"
          placeholderTextColor={theme.muted}
          value={word}
          onChangeText={setWord}
          accessibilityLabel="Từ vựng tiếng Nhật"
        />
        <TextInput
          style={styles.input}
          placeholder="Nghĩa"
          placeholderTextColor={theme.muted}
          value={meaning}
          onChangeText={setMeaning}
          accessibilityLabel="Nghĩa tiếng Việt"
        />
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          onPress={() => void quickAdd()}
        >
          <Text style={styles.addText}>Thêm từ</Text>
        </Pressable>
        {formError !== null ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {formError}
          </Text>
        ) : null}
      </View>
      {status === 'loading' ? (
        <ActivityIndicator size="large" />
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.error}>Lỗi: {error}</Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            onPress={() => void reload()}
          >
            <Text style={styles.addText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : vocabs.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyGlyph} accessible={false}>語</Text>
            <Text style={styles.emptyTitle}>Bắt đầu bộ từ của bạn</Text>
            <Text style={styles.centerText}>Thêm từ đầu tiên bằng biểu mẫu phía trên.</Text>
          </View>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={vocabs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.wordBadge} accessible={false}>
                <Text style={styles.wordBadgeText}>{item.word.slice(0, 1)}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowWord}>{item.word}</Text>
                <Text style={styles.rowMeaning}>{item.meaning}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                onPress={() => void remove(item.id)}
                accessibilityLabel={`Xóa ${item.word}`}
              >
                <Text style={styles.deleteText}>Xóa</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 18,
      paddingBottom: 12,
      gap: 12,
      backgroundColor: t.bg,
    },
    form: {
      gap: 10,
      padding: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    formTitle: {
      color: t.text,
      fontSize: 15,
      fontWeight: '800',
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.btnBg,
      color: t.text,
      borderRadius: 13,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
    },
    addButton: {
      minHeight: 48,
      justifyContent: 'center',
      backgroundColor: t.primary,
      borderRadius: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    addText: {
      color: t.primaryContrast,
      fontWeight: '700',
      fontSize: 16,
    },
    error: {
      color: t.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.72,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
    },
    centerText: {
      color: t.text,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyCard: {
      alignItems: 'center',
      gap: 8,
      padding: 22,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    emptyGlyph: {
      color: t.primary,
      fontSize: 34,
      fontWeight: '700',
    },
    emptyTitle: {
      color: t.text,
      fontSize: 17,
      fontWeight: '800',
    },
    list: {
      flex: 1,
    },
    listContent: {
      gap: 9,
      paddingBottom: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 72,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      gap: 12,
    },
    wordBadge: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: t.btnBg,
    },
    wordBadgeText: {
      color: t.primary,
      fontSize: 20,
      fontWeight: '800',
    },
    rowText: {
      flex: 1,
      gap: 3,
    },
    rowWord: {
      fontSize: 18,
      fontWeight: '800',
      color: t.text,
    },
    rowMeaning: {
      fontSize: 14,
      color: t.muted,
    },
    deleteButton: {
      minHeight: 44,
      minWidth: 54,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.danger,
    },
    deleteText: {
      color: t.danger,
      fontWeight: '600',
    },
  });
