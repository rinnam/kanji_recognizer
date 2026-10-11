import { newVocabId, findDuplicate, type VocabularyDto } from '@kanji-nest/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactElement } from 'react';
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
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [vocabs, setVocabs] = useState<VocabularyDto[]>([]);
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const all = await port.vocabs.all();
      setVocabs(all.filter((v) => v.deletedAt === null));
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
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Từ vựng"
          value={word}
          onChangeText={setWord}
        />
        <TextInput
          style={styles.input}
          placeholder="Nghĩa"
          value={meaning}
          onChangeText={setMeaning}
        />
        <Pressable style={styles.addButton} onPress={() => void quickAdd()}>
          <Text style={styles.addText}>Thêm từ</Text>
        </Pressable>
        {formError !== null ? <Text style={styles.error}>{formError}</Text> : null}
      </View>
      {status === 'loading' ? (
        <ActivityIndicator size="large" />
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.error}>Lỗi: {error}</Text>
          <Pressable style={styles.addButton} onPress={() => void reload()}>
            <Text style={styles.addText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : vocabs.length === 0 ? (
        <View style={styles.center}>
          <Text>Chưa có từ nào — thêm từ đầu tiên ở trên.</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={vocabs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowWord}>{item.word}</Text>
                <Text style={styles.rowMeaning}>{item.meaning}</Text>
              </View>
              <Pressable
                style={styles.deleteButton}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  form: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#8a7f6e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#b4532a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: '#a3301f',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d8cfbe',
    gap: 8,
  },
  rowText: {
    flex: 1,
  },
  rowWord: {
    fontSize: 17,
    fontWeight: '700',
  },
  rowMeaning: {
    fontSize: 14,
    opacity: 0.7,
  },
  deleteButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a3301f',
  },
  deleteText: {
    color: '#a3301f',
    fontWeight: '600',
  },
});
