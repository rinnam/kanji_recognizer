import {
  assembleImportWrites,
  buildPreview,
  byteLength,
  clampRows,
  defaultMappingByPosition,
  detectHeaderMapping,
  hasReplacementChar,
  mapRowsToRecords,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  newVocabId,
  parseCsv,
  parseMarkdownTable,
  type FolderDto,
  type ImportSummary,
  type PreviewRow,
  type VocabularyDto,
} from '@kanji-nest/core';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStoragePort } from '../src/db/DbProvider';
import { nowIso } from '../src/lib/time';
import { useScope } from '../src/scope/ScopeProvider';
import { useTheme, type AppTheme } from '../src/theme/ThemeProvider';

const PREVIEW_LIMIT = 30;

function statusColor(status: PreviewRow['status']): string {
  if (status === 'error') return '#a3301f';
  if (status === 'new') return '#b4532a';
  return '#8a7f6e';
}

function parseTextContent(text: string): string[][] {
  if (text.includes('|---') || text.includes('| ---')) return parseMarkdownTable(text);
  return parseCsv(text);
}

/**
 * Nhập từ file/dán (M5): chọn file văn bản (csv/tsv/md) hoặc dán → parse +
 * ánh xạ cột tự động → xem trước (Mới/Gắn/Trùng/Lỗi) → ghi qua port.
 * Logic parse/kiểm tra/tách ghi dùng lại core (chung với web).
 */
export default function Import(): ReactElement {
  const port = useStoragePort();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { folderId } = useScope();
  const [vocabs, setVocabs] = useState<VocabularyDto[]>([]);
  const [folders, setFolders] = useState<FolderDto[]>([]);
  const [pasted, setPasted] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PreviewRow[] | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [allVocabs, allFolders] = await Promise.all([
      port.vocabs.all(),
      port.folders.all(),
    ]);
    setVocabs(allVocabs);
    setFolders(allFolders.filter((f) => f.deletedAt === null));
  }, [port]);

  useFocusEffect(
    useCallback(() => {
      void reload().catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      );
    }, [reload]),
  );

  const analyze = useCallback(
    (text: string) => {
      setError(null);
      setDoneMessage(null);
      setWarnings([]);
      if (byteLength(text) > MAX_IMPORT_BYTES) {
        setError(`File quá lớn (tối đa ${MAX_IMPORT_BYTES / 1024 / 1024}MB).`);
        setPreviews(null);
        setSummary(null);
        return;
      }
      if (text.trim() === '') {
        setError('Nội dung rỗng.');
        setPreviews(null);
        setSummary(null);
        return;
      }
      const rows = parseTextContent(text);
      const { rows: kept, truncated } = clampRows(rows);
      if (truncated) {
        setWarnings((prev) => [...prev, `Chỉ xét ${MAX_IMPORT_ROWS} dòng đầu.`]);
      }
      if (hasReplacementChar(text)) {
        setWarnings((prev) => [...prev, 'File có thể không phải UTF-8.']);
      }
      const first = kept[0] ?? [];
      const detected = detectHeaderMapping(first);
      const mapping =
        detected ?? defaultMappingByPosition(first.length);
      const records = mapRowsToRecords(kept, mapping, detected !== null);
      const result = buildPreview(records, {
        vocabs,
        folders,
        targetFolderId: folderId,
      });
      setPreviews(result.rows);
      setSummary(result.summary);
    },
    [vocabs, folders, folderId],
  );

  const pickFile = async (): Promise<void> => {
    setWorking(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/*', 'application/json'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      setFileName(asset.name);
      const text = await new File(asset.uri).text();
      analyze(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setWorking(false);
    }
  };

  const doImport = async (): Promise<void> => {
    if (previews === null) return;
    setWorking(true);
    try {
      const plan = assembleImportWrites(previews, vocabs, folderId, nowIso(), newVocabId);
      await port.vocabs.putMany(plan.rows);
      await reload();
      setPreviews(null);
      setSummary(null);
      setPasted('');
      setFileName(null);
      setDoneMessage(`Đã thêm ${plan.added} · Gắn ${plan.linked} từ.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setWorking(false);
    }
  };

  const targetName =
    folderId === null
      ? 'Tất cả (không gán thư mục)'
      : (folders.find((f) => f.id === folderId)?.name ?? 'Thư mục đã chọn');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>1. Nguồn</Text>
        <Pressable style={styles.primaryButton} onPress={() => void pickFile()}>
          <Text style={styles.primaryText}>Chọn file văn bản</Text>
        </Pressable>
        {fileName !== null ? <Text style={styles.bodyText}>File: {fileName}</Text> : null}
        <TextInput
          style={styles.paste}
          placeholder={'Hoặc dán nội dung (Từ + Nghĩa, cách nhau bằng Tab/phẩy)…'}
          placeholderTextColor={theme.muted}
          value={pasted}
          onChangeText={setPasted}
          multiline
          textAlignVertical="top"
        />
        <Pressable
          style={styles.secondaryButton}
          onPress={() => analyze(pasted)}
          disabled={pasted.trim() === ''}
        >
          <Text style={styles.secondaryText}>Dùng văn bản đã dán</Text>
        </Pressable>
        {working ? <ActivityIndicator /> : null}
        {error !== null ? <Text style={styles.error}>{error}</Text> : null}
        {warnings.map((w) => (
          <Text key={w} style={styles.warning}>
            {w}
          </Text>
        ))}
        {doneMessage !== null ? <Text style={styles.done}>{doneMessage}</Text> : null}
        {summary !== null ? (
          <>
            <Text style={styles.heading}>2. Xem trước</Text>
            <Text style={styles.bodyText}>
              {summary.total} dòng: {summary.new} mới · {summary.link} gắn ·{' '}
              {summary.duplicate} trùng · {summary.error} lỗi
            </Text>
            <Text style={styles.bodyText}>Thư mục đích: {targetName}</Text>
            {previews?.slice(0, PREVIEW_LIMIT).map((row) => (
              <View key={row.line} style={styles.previewRow}>
                <Text style={styles.previewLine}>#{row.line}</Text>
                <View style={styles.previewText}>
                  <Text style={styles.previewWord}>
                    {row.record.word} — {row.record.meaning}
                  </Text>
                  <Text style={{ color: statusColor(row.status) }}>
                    {row.status === 'new'
                      ? 'Mới'
                      : row.status === 'link'
                        ? 'Gắn vào thư mục'
                        : row.status === 'duplicate'
                          ? 'Trùng (bỏ qua)'
                          : `Lỗi: ${row.reason ?? ''}`}
                  </Text>
                </View>
              </View>
            ))}
            <Pressable
              style={styles.primaryButton}
              onPress={() => void doImport()}
              disabled={summary.new + summary.link === 0}
            >
              <Text style={styles.primaryText}>
                Nhập {summary.new + summary.link} từ
              </Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    scroll: {
      padding: 16,
      gap: 10,
    },
    heading: {
      fontSize: 17,
      fontWeight: '800',
      color: t.text,
    },
    bodyText: {
      color: t.text,
    },
    primaryButton: {
      backgroundColor: t.primary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryText: {
      color: t.primaryContrast,
      fontWeight: '700',
      fontSize: 16,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.btnBg,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryText: {
      color: t.btnFg,
      fontWeight: '600',
    },
    paste: {
      minHeight: 120,
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.btnBg,
      color: t.text,
      borderRadius: 8,
      padding: 10,
      fontSize: 15,
    },
    error: {
      color: t.danger,
    },
    warning: {
      color: t.muted,
    },
    done: {
      fontWeight: '700',
      color: t.primary,
    },
    previewRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    previewLine: {
      width: 44,
      opacity: 0.6,
      color: t.text,
    },
    previewText: {
      flex: 1,
      gap: 2,
    },
    previewWord: {
      color: t.text,
    },
  });
