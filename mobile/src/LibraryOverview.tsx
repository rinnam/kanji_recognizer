import { useDeferredValue, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Text, TextInput, View,
  useColorScheme, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { JLPT_LEVELS, type JlptLevel, type PullResult, type VocabularyDto } from '../../packages/contracts/src/study';
import { filterVocabularies } from '../../packages/core/src/filter-vocabulary';
import { buildFolderTree } from './workspace-model';
import { workspaceTheme, type WorkspaceTheme } from './workspace-theme';
import { FolderPanel } from './FolderPanel';
import type { FolderAction } from './folder-actions';
import { Control } from './WorkspaceButton';
import { WorkspaceEditor, type EditMode } from './WorkspaceEditor';
import { WorkspaceStudy, type StudyActions } from './WorkspaceStudy';
import type { WordInput } from './workspace-storage';

interface LibraryOverviewProps extends StudyActions {
  library?: PullResult;
  error?: string;
  status: string;
  busy: boolean;
  onEditWord?: (word: VocabularyDto, input: WordInput) => Promise<void>;
  onRetry?: () => void;
  sample?: boolean;
  onSample?: () => void;
  onAddWords?: (inputs: WordInput[], folderId: string | null) => Promise<void>;
  onFolderAction?: (action: FolderAction) => Promise<void>;
}


const allLabel = 'Tất cả từ vựng';
const pageSizes = [25, 50, 100] as const;
const columns = [
  { key: 'word', label: 'Từ', flex: 1.2 },
  { key: 'reading', label: 'Cách đọc', flex: 1 },
  { key: 'sinoVietnamese', label: 'Âm Hán Việt', flex: 1 },
  { key: 'meaning', label: 'Nghĩa', flex: 1.8 },
  { key: 'jlptLevel', label: 'JLPT', flex: 0.5 },
] as const;

const destinations = [
  { id: 'overview', label: 'Tổng quan', symbol: '▦' },
  { id: 'flashcard', label: 'Flashcard', symbol: '▱' },
  { id: 'quiz', label: 'Quiz', symbol: '✓' },
] as const;

export function LibraryOverview({ library, error, status: syncStatus, busy, onRetry, sample, onSample, onAddWords, onFolderAction, onEditWord, onRate, onSaveQuiz, onReset }: LibraryOverviewProps) {
  const systemTheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const compact = width <= 768;
  const [darkOverride, setDarkOverride] = useState<boolean>();
  const isDark = darkOverride ?? systemTheme === 'dark';
  const theme = useMemo(() => workspaceTheme(isDark), [isDark]);
  const { colors, styles } = theme;
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search);
  const [jlpt, setJlpt] = useState<JlptLevel | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [editor, setEditor] = useState<EditMode>();
  const [editing, setEditing] = useState<VocabularyDto>();
  const [speechError, setSpeechError] = useState('');
  const [destination, setDestination] = useState<(typeof destinations)[number]['id']>('overview');
  const [menu, setMenu] = useState<'jlpt' | 'size'>();
  const [order, setOrder] = useState<'newest' | 'added'>('newest');
  const [pageSize, setPageSize] = useState<(typeof pageSizes)[number]>(50);
  const [page, setPage] = useState(1);
  const folders = useMemo(() => buildFolderTree(library?.folders ?? [], library?.vocabularies ?? []), [library]);
  const selectedFolder = folders.find(({ folder }) => folder.id === folderId);
  const selectedScope = selectedFolder?.childIds;
  const rows = useMemo(() => {
    const words = library?.vocabularies ?? [];
    const scoped = selectedScope ? words.filter((item) => item.folderIds.some((id) => selectedScope.has(id))) : words;
    const filtered = filterVocabularies(scoped, { folderId: null, search: query, jlpt });
    return filtered.sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return (a.createdAt < b.createdAt ? -1 : 1) * (order === 'added' ? 1 : -1);
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }, [library, selectedScope, query, jlpt, order]);
  const studyWords = useMemo(() => (library?.vocabularies ?? []).filter(w => !w.deletedAt &&
    (!selectedScope || w.folderIds.some(id => selectedScope.has(id)))), [library, selectedScope]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visibleRows = rows.slice(start, start + pageSize);
  const liveCount = library?.vocabularies.filter((word) => word.deletedAt === null).length ?? 0;
  const status = sample ? 'Dữ liệu mẫu' : syncStatus;
  const activeName = selectedFolder?.folder.name ?? allLabel;
  const overview = destination === 'overview';

  function selectFolder(id: string | null) {
    setFolderId(id);
    setPage(1);
    setDrawer(false);
  }

  const sidebar = <FolderPanel theme={theme} library={library} rows={folders} selected={folderId}
    onSelect={selectFolder} onChange={onFolderAction} compact={compact} close={() => setDrawer(false)}
    maxHeight={compact ? height * 0.85 : height - 110} />;

  const themeButton = <Control theme={theme} label={isDark ? '☾ Tối' : '☀ Sáng'} onPress={() => setDarkOverride(!isDark)} />;
  const refresh = onRetry && <Control theme={theme} label="Làm mới từ server" disabled={busy} onPress={onRetry} />;
  const syncButton = onRetry && <Control theme={theme} label={compact ? 'Đồng bộ' : 'Đồng bộ ngay'} disabled={busy} onPress={onRetry} />;
  function rowActions(item: VocabularyDto) {
    return <View style={styles.actions}>
      <Control theme={theme} label="♪" accessibleLabel={`Nghe phát âm ${item.word}`} onPress={async () => {
        setSpeechError('');
        const failed = () => setSpeechError('Không phát được âm thanh. Kiểm tra giọng đọc tiếng Nhật trên thiết bị.');
        try {
          await Speech.stop();
          Speech.speak(item.reading || item.word, { language: 'ja-JP', onError: failed });
        } catch { failed(); }
      }} />
      {onEditWord && !(sample && item.id.startsWith('sample-')) &&
        <Control theme={theme} label="Sửa" accessibleLabel={`Sửa ${item.word}`} onPress={() => {
          setEditing(item);
          setEditor('word');
        }} />}
    </View>;
  }
  const tabs = (mobile: boolean) => destinations.map(({ id, label, symbol }) => (
    <Control key={id} theme={theme} label={`${symbol} ${label}`} selected={destination === id} compactTab
      layout={mobile ? styles.navItem : undefined} onPress={() => setDestination(id)} />
  ));
  const libraryActions = <View style={styles.actions}>
    <Control theme={theme} label={compact ? '+ Thêm từ' : 'Thêm từ'} disabled={!onAddWords}
      onPress={() => setEditor('word')} />
    <Control theme={theme} label={compact ? 'Nhập từ' : 'Nhập từ file / dán'} disabled={!onAddWords}
      onPress={() => setEditor('import')} />
  </View>;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.header, !compact && styles.headerWide]}>
        {compact ? <View style={styles.headerWide}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text accessibilityRole="header" style={styles.title}>Kanji Nest</Text>
            <Text accessibilityLiveRegion="polite" style={styles.muted}>{status}</Text>
          </View>
          <View style={[styles.actions, { justifyContent: 'flex-end' }]}>{syncButton}{themeButton}</View>
        </View> : <Text accessibilityRole="header" style={styles.title}>Kanji Nest</Text>}
        <View style={[styles.searchGroup, compact ? styles.searchCompact : styles.searchWide]}>
          <TextInput
            accessibilityLabel="Tìm từ, nghĩa, cách đọc"
            placeholder="Từ, nghĩa, cách đọc..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={(value) => { setSearch(value); setPage(1); }}
            style={[styles.search, !compact && { maxWidth: 448 }]}
          />
          <Text style={styles.muted}>JLPT</Text>
          <Control theme={theme} label={`${jlpt ?? 'Tất cả'} ⌄`} onPress={() => setMenu('jlpt')} />
        </View>
        {!compact && <View style={styles.actions}>
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            {status}
          </Text>
          {syncButton}{refresh}{themeButton}
        </View>}
      </View>

      <View style={[styles.body, compact && { padding: 10 }]}>
        {!compact && sidebar}
        <View style={[styles.content, compact && { gap: 8 }]}>
          <View style={[styles.toolbar, width >= 1180 && styles.headerWide]}>
            {compact
              ? <Control theme={theme} label={`Thư mục: ${activeName}`} onPress={() => setDrawer(true)} />
              : <Text style={styles.muted}>Đang chọn: <Text style={styles.pill}>{activeName}</Text></Text>}
            {!compact && <View style={styles.tabs}>{tabs(false)}</View>}
            {overview && libraryActions}
          </View>
          {!overview ? <WorkspaceStudy key={`${destination}-${folderId}-${studyWords.map(({ id }) => id).sort().join(',')}`}
            onRate={onRate} onSaveQuiz={onSaveQuiz} onReset={onReset}
            onEdit={onEditWord && !sample ? word => { setEditing(word); setEditor('word'); } : undefined}
            mode={destination} theme={theme} words={studyWords} /> : <>
          <View style={[styles.actions, { justifyContent: 'space-between' }]}>
            <View style={styles.actions}>
              <Control theme={theme} label="Thứ tự thêm" selected={order === 'added'}
                onPress={() => { setOrder('added'); setPage(1); }} />
              <Control theme={theme} label="Mới nhất" selected={order === 'newest'}
                onPress={() => { setOrder('newest'); setPage(1); }} />
            </View>
            <Control theme={theme} label={`Mỗi trang: ${pageSize} ⌄`} onPress={() => setMenu('size')} />
          </View>
          <Text style={styles.muted}>
            {selectedFolder?.folder.name ?? 'Tất cả từ'} · {rows.length ? start + 1 : 0}–{start + visibleRows.length} / {rows.length} từ
          </Text>
          {!compact && <View style={[styles.row, styles.tableHeader]}>
            {columns.map(({ key, label, flex }) => (
              <Text key={key} accessibilityRole="header" style={[styles.muted, { flex, fontWeight: '600' }]}>{label}</Text>
            ))}
            <Text style={[styles.muted, { width: 100 }]}>Thao tác</Text>
          </View>}
          {error && <Text accessibilityRole="alert" style={styles.field}>{error}</Text>}
          {!!speechError && <Text accessibilityRole="alert" style={styles.field}>{speechError}</Text>}
          {!library && error && onRetry && <Control theme={theme} label="Thử lại" onPress={onRetry} />}
          {!library && !error ? (
            <ActivityIndicator accessibilityLabel="Đang tải thư viện" color={colors.primary} />
          ) : library && (
            <FlatList
              data={visibleRows}
              key={`${currentPage}-${folderId ?? ''}-${jlpt ?? ''}-${order}`}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<View style={styles.studyCard}>
                <Text style={styles.field}>{liveCount ? 'Không có từ vựng phù hợp.' : 'Chưa có từ trong thư viện.'}</Text>
                {onSample && !liveCount && <Control theme={theme} label="Xem dữ liệu mẫu" onPress={onSample} />}
              </View>}
              renderItem={({ item }) => (
                compact ? <View style={styles.wordCard}>
                  <View style={styles.headerWide}>
                    <Text style={[styles.title, { flexShrink: 1 }]}>{item.word}</Text>
                    {item.jlptLevel && <Text style={styles.pill}>{item.jlptLevel}</Text>}
                  </View>
                  {item.reading && item.reading !== item.word && <Text style={styles.muted}>{item.reading}</Text>}
                  <Text style={styles.field}>{item.meaning}</Text>
                  {item.sinoVietnamese && <Text style={styles.muted}>Âm Hán Việt: {item.sinoVietnamese}</Text>}
                  {rowActions(item)}
                </View> : <View style={styles.row}>
                  {columns.map(({ key, label, flex }) => (
                    <Text key={key} style={[
                      styles.field, { flex }, key === 'word' && { fontWeight: '700', fontSize: 17 },
                    ]}>
                      {item[key] ?? '—'}
                    </Text>
                  ))}
                  <View style={{ width: 100 }}>{rowActions(item)}</View>
                </View>
              )}
            />
          )}
          {rows.length > pageSize && (
            <View style={styles.actions}>
              <Control theme={theme} label="Trang trước" disabled={currentPage === 1} onPress={() => setPage(currentPage - 1)} />
              <Text style={styles.muted}>Trang {currentPage} / {pageCount}</Text>
              <Control theme={theme} label="Trang sau" disabled={currentPage === pageCount} onPress={() => setPage(currentPage + 1)} />
            </View>
          )}
          </>}
        </View>
      </View>
      {compact && <View style={styles.bottomNav}>{tabs(true)}</View>}
      {editor && <WorkspaceEditor mode={editor} theme={theme} initial={editing}
        existing={(library?.vocabularies ?? []).filter((row) => row.id !== editing?.id && row.deletedAt === null &&
          (folderId === null || row.folderIds.includes(folderId)))}
        onClose={() => { setEditor(undefined); setEditing(undefined); }}
        onSave={async (entries) => {
          if (editing) {
            const current = library?.vocabularies.find(row => row.id === editing.id);
            if (!current || current.deletedAt || current.updatedAt !== editing.updatedAt) {
              throw new Error('Từ đã thay đổi. Đóng cửa sổ và mở lại để sửa bản mới nhất.');
            }
            await onEditWord?.(current, entries[0]);
          }
          else {
            await onAddWords?.(entries, folderId);
            if (sample && folderId?.startsWith('sample-')) setFolderId(null);
            setSearch('');
            setJlpt(null);
            setOrder('newest');
            setPage(1);
          }
        }} />}
      <Modal visible={compact && drawer} transparent onRequestClose={() => setDrawer(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: 12 }}>
          {sidebar}
        </SafeAreaView>
      </Modal>
      <Modal visible={menu !== undefined} transparent onRequestClose={() => setMenu(undefined)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0006', justifyContent: 'center', alignItems: 'center' }}>
          <View style={styles.sidebar} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={styles.title}>{menu === 'jlpt' ? 'Chọn cấp JLPT' : 'Số từ mỗi trang'}</Text>
            {menu === 'jlpt'
              ? [null, ...JLPT_LEVELS].map((level) => (
                <Control key={level ?? 'all'} theme={theme} label={level ?? 'Tất cả'} selected={jlpt === level}
                  onPress={() => { setJlpt(level); setPage(1); setMenu(undefined); }} />
              ))
              : pageSizes.map((size) => (
                <Control key={size} theme={theme} label={String(size)} selected={pageSize === size}
                  onPress={() => { setPageSize(size); setPage(1); setMenu(undefined); }} />
              ))}
            <Control theme={theme} label="Đóng" onPress={() => setMenu(undefined)} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
