import { useRef, useState } from 'react';
import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { normalizeAnswer } from '../../packages/core/src/grade';
import { parseCsv } from './import-parser';
import { Control } from './WorkspaceButton';
import type { WorkspaceTheme } from './workspace-theme';
import type { WordInput } from './workspace-storage';

export type EditMode = 'word' | 'import' | 'folder';

const maxTextLength = 100_000;

export function WorkspaceEditor({ mode, theme, existing, initial, onClose, onSave }: {
  mode: EditMode;
  theme: WorkspaceTheme;
  existing: readonly WordInput[];
  initial?: WordInput;
  onClose: () => void;
  onSave: (entries: WordInput[], folder: string) => Promise<void>;
}) {
  const { styles, colors } = theme;
  const [word, setWord] = useState(initial?.word ?? '');
  const [reading, setReading] = useState(initial?.reading ?? '');
  const [meaning, setMeaning] = useState(initial?.meaning ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const title = initial ? 'Sửa từ' : mode === 'word' ? 'Thêm từ' : mode === 'folder' ? 'Thêm thư mục' : 'Nhập từ file / dán';

  async function pick() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset || !/\.(csv|tsv|txt)$/i.test(asset.name) || (asset.size ?? 0) > maxTextLength * 4) {
        throw new Error('Chọn file CSV, TSV hoặc TXT dưới 400 KB.');
      }
      const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();
      if (text.length > maxTextLength) throw new Error('File vượt quá giới hạn nội dung.');
      setWord(text);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không đọc được file.');
    }
  }

  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      let entries: WordInput[] = [];
      if (mode === 'folder') {
        if (!word.trim()) throw new Error('Nhập tên thư mục.');
      } else if (mode === 'word') {
        if (!word.trim() || !meaning.trim()) throw new Error('Nhập từ và nghĩa để lưu.');
        entries = [{ word: word.trim(), meaning: meaning.trim(), reading: reading.trim() || null, jlptLevel: initial?.jlptLevel ?? null }];
      } else {
        const rows = parseCsv(word).filter((row) => row.some((value) => value.trim()));
        if (rows[0] && ['từ', 'word'].includes(normalizeAnswer(rows[0][0])) &&
            ['nghĩa', 'meaning'].includes(normalizeAnswer(rows[0][1] ?? ''))) rows.shift();
        if (!rows.length || rows.length > 500) throw new Error('Nhập từ 1 đến 500 dòng.');
        entries = rows.map((row, index) => {
          const [term, definition, pronunciation] = row.map((value) => value.trim());
          if (!term || !definition || row.length > 3) throw new Error(`Dòng ${index + 1} cần có từ và nghĩa.`);
          return { word: term, meaning: definition, reading: pronunciation || null, jlptLevel: null };
        });
      }
      const key = (entry: WordInput) => JSON.stringify([normalizeAnswer(entry.word), normalizeAnswer(entry.reading ?? '')]);
      const seen = new Set(existing.map(key));
      for (const entry of entries) {
        const id = key(entry);
        if (seen.has(id)) throw new Error(`Từ đã có trong phạm vi này: ${entry.word}`);
        seen.add(id);
      }
      await onSave(entries, word.trim());
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lưu được dữ liệu.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal transparent onRequestClose={() => { if (!lock.current) onClose(); }}>
      <SafeAreaView style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editorWrap}>
          <ScrollView style={styles.dialog} contentContainerStyle={{ gap: 10, padding: 16 }}
            keyboardShouldPersistTaps="handled" accessibilityViewIsModal>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            {mode === 'import' && <>
              <Text style={styles.muted}>Mỗi dòng gồm: từ, nghĩa, cách đọc (tùy chọn). Dùng dấu phẩy hoặc tab để tách cột.</Text>
              <Control theme={theme} label="Chọn file CSV / TSV / TXT" onPress={() => void pick()} disabled={busy} />
            </>}
            <TextInput accessibilityLabel={mode === 'folder' ? 'Tên thư mục' : mode === 'import' ? 'Danh sách từ' : 'Từ'}
              placeholder={mode === 'folder' ? 'Tên thư mục' : mode === 'import' ? 'Dán danh sách từ' : 'Từ'}
              value={word} onChangeText={setWord} editable={!busy} maxLength={mode === 'import' ? maxTextLength : 200}
              multiline={mode === 'import'} placeholderTextColor={colors.muted}
              style={[styles.input, mode === 'import' && { minHeight: 112, textAlignVertical: 'top' }]} />
            {mode === 'word' && <>
              <TextInput accessibilityLabel="Cách đọc" placeholder="Cách đọc (tùy chọn)" value={reading}
                onChangeText={setReading} editable={!busy} placeholderTextColor={colors.muted} style={styles.input} />
              <TextInput accessibilityLabel="Nghĩa" placeholder="Nghĩa" value={meaning}
                onChangeText={setMeaning} editable={!busy} placeholderTextColor={colors.muted} style={styles.input} />
            </>}
            {error !== '' && <Text accessibilityRole="alert" style={styles.field}>{error}</Text>}
            <View style={styles.actions}>
              <Control theme={theme} label={busy ? 'Đang lưu…' : 'Lưu trên thiết bị'} selected disabled={busy} onPress={() => void submit()} />
              <Control theme={theme} label="Hủy" disabled={busy} onPress={onClose} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
