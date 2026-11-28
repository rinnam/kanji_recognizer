import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { HandwritingModal } from '../../src/features/handwriting/HandwritingModal';
import { libraryEndpoint, loadLibrary } from '../../src/library-source';
import { saveServerCache } from '../../src/workspace-storage';
import { getUserScopedKey, readAuthSession } from '../../src/features/auth/auth-store';
import { recordMeaningfulStudyAction } from '../../src/features/study-tracker/use-study-tracker';
import { speakJapanese } from '../../src/utils/speak-japanese';
import { useIsMobilePhone } from '../../src/utils/device';

interface SimpleFolder {
  id: string;
  name: string;
}

interface DictionaryWordEntry {
  id: string;
  word: string;
  reading: string;
  meaningVi: string;
  meaningEn?: string;
  sinoVietnamese?: string | null;
  jlpt: string[];
  partsOfSpeech: string[];
  source: 'library' | 'jisho';
}

interface DictionaryKanjiEntry {
  kanji: string;
  strokeCount: number | null;
  jlpt: number | null;
  grade: number | null;
  onReadings: string[];
  kunReadings: string[];
  meaningsEn: string[];
  meaningsVi: string;
}

const HISTORY_KEY = 'kanji_nest_lookup_history_v1';
const DEFAULT_LOOKUP_FOLDER_NAME = 'Từ vựng đã tra cứu';

type JlptTag = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
const VALID_JLPT = new Set<JlptTag>(['N1', 'N2', 'N3', 'N4', 'N5']);

function resolveJlptLevel(jlpt: string[]): JlptTag | null {
  for (const raw of jlpt) {
    const normalized = raw.trim().toUpperCase() as JlptTag;
    if (VALID_JLPT.has(normalized)) return normalized;
  }
  return null;
}

const TABS = [
  { key: 'words', label: 'Từ vựng' },
  { key: 'kanji', label: 'Hán tự' },
] as const;

export default function LookupScreen() {
  const isPhone = useIsMobilePhone();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; kind?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [activeTab, setActiveTab] = useState<'words' | 'kanji'>(
    params.kind === 'kanji' ? 'kanji' : 'words',
  );
  const [handwritingOpen, setHandwritingOpen] = useState(false);

  const [words, setWords] = useState<DictionaryWordEntry[]>([]);
  const [kanjiList, setKanjiList] = useState<DictionaryKanjiEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  // Save to Flashcard modal state
  const [savingWord, setSavingWord] = useState<DictionaryWordEntry | null>(null);
  const [folders, setFolders] = useState<SimpleFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [savingBusy, setSavingBusy] = useState(false);

  const searchAbortRef = useRef<AbortController | null>(null);
  const searchSeqRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void getUserScopedKey(HISTORY_KEY)
      .then((hKey) => AsyncStorage.getItem(hKey))
      .then((raw) => {
        if (!raw) {
          setHistory([]);
          return;
        }
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            setHistory(parsed.filter((x): x is string => typeof x === 'string').slice(0, 15));
          }
        } catch {
          // ignore
        }
      });
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      searchAbortRef.current?.abort();
    };
  }, []);

  const pushHistory = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setHistory((prev) => {
      const next = [clean, ...prev.filter((item) => item !== clean)].slice(0, 15);
      void getUserScopedKey(HISTORY_KEY).then((hKey) =>
        AsyncStorage.setItem(hKey, JSON.stringify(next)),
      );
      return next;
    });
  }, []);

  const runSearch = useCallback(
    async (rawTerm: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      searchAbortRef.current?.abort();

      const term = rawTerm.trim();
      const seq = ++searchSeqRef.current;

      if (!term) {
        searchAbortRef.current = null;
        setWords([]);
        setKanjiList([]);
        setErrorMsg(null);
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      searchAbortRef.current = controller;
      setLoading(true);
      setErrorMsg(null);
      try {
        const session = await readAuthSession();
        if (controller.signal.aborted || seq !== searchSeqRef.current) return;
        const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
        const headers: Record<string, string> = {};
        if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
        const res = await fetch(`${base}/dictionary/search?q=${encodeURIComponent(term)}`, {
          headers,
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          words?: DictionaryWordEntry[];
          kanji?: DictionaryKanjiEntry[];
        };
        if (controller.signal.aborted || seq !== searchSeqRef.current) return;
        setWords(data.words ?? []);
        setKanjiList(data.kanji ?? []);
        pushHistory(term);
        recordMeaningfulStudyAction('lookup_search');
      } catch (err) {
        if (controller.signal.aborted || seq !== searchSeqRef.current) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setErrorMsg('Không kết nối được máy chủ từ điển. Vui lòng thử lại sau.');
      } finally {
        if (seq === searchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [pushHistory],
  );

  useEffect(() => {
    const term = query.trim();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (!term) {
      searchAbortRef.current?.abort();
      searchSeqRef.current += 1;
      setWords([]);
      setKanjiList([]);
      setErrorMsg(null);
      setLoading(false);
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void runSearch(term);
    }, 350);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [query, runSearch]);

  const openSaveModal = async (entry: DictionaryWordEntry) => {
    setSavingWord(entry);
    setSavedNotice(null);
    setSaveError(null);
    setNewFolderName('');
    setLoadingFolders(true);
    try {
      const controller = new AbortController();
      const lib = await loadLibrary(controller.signal);
      const endpoint = libraryEndpoint;
      if (endpoint) {
        void saveServerCache(endpoint, lib).catch(() => undefined);
      }
      setFolders(
        lib.folders
          .filter((f) => !f.deletedAt)
          .map((f) => ({ id: f.id, name: f.name })),
      );
    } catch {
      setFolders([]);
      setSaveError('Không tải được danh sách thư mục. Bạn vẫn có thể tạo thư mục mới.');
    } finally {
      setLoadingFolders(false);
    }
  };

  const extractApiError = async (res: Response, fallback: string): Promise<string> => {
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      return body.message || body.error || fallback;
    } catch {
      return fallback;
    }
  };

  const persistWordToFolder = async (
    entry: DictionaryWordEntry,
    folder: SimpleFolder,
  ): Promise<boolean> => {
    const session = await readAuthSession();
    const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
    const res = await fetch(`${base}/vocabularies`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        word: entry.word,
        reading: entry.reading || null,
        meaning: entry.meaningVi,
        sinoVietnamese: entry.sinoVietnamese ?? null,
        jlptLevel: resolveJlptLevel(entry.jlpt),
        folderIds: [folder.id],
      }),
    });
    if (res.status === 409) {
      setSaveError(`Từ "${entry.word}" đã có trong thư mục "${folder.name}".`);
      return false;
    }
    if (!res.ok) {
      const msg = await extractApiError(res, `Không thể lưu từ này (HTTP ${res.status}).`);
      setSaveError(msg);
      return false;
    }

    setWords((prev) =>
      prev.map((w) => (w.id === entry.id ? { ...w, source: 'library' as const } : w)),
    );
    const endpoint = libraryEndpoint;
    if (endpoint) {
      const syncController = new AbortController();
      void loadLibrary(syncController.signal)
        .then((fresh) => saveServerCache(endpoint, fresh))
        .catch(() => undefined);
    }
    setSavedNotice(`Đã lưu "${entry.word}" vào thư mục "${folder.name}".`);
    setSavingWord(null);
    return true;
  };

  const handleSaveToFolder = async (folder: SimpleFolder) => {
    if (!savingWord || savingBusy) return;
    setSavingBusy(true);
    setSaveError(null);
    try {
      await persistWordToFolder(savingWord, folder);
    } catch {
      setSaveError('Không thể kết nối máy chủ để lưu từ. Hãy thử lại.');
    } finally {
      setSavingBusy(false);
    }
  };

  const handleCreateAndSave = async (rawName: string) => {
    if (!savingWord || savingBusy) return;
    const name = rawName.trim();
    if (!name) {
      setSaveError('Vui lòng nhập tên thư mục mới.');
      return;
    }
    setSavingBusy(true);
    setSaveError(null);
    try {
      const existing = folders.find((f) => f.name.trim().toLowerCase() === name.toLowerCase());
      let targetFolder = existing;
      if (!targetFolder) {
        const session = await readAuthSession();
        const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
        const createRes = await fetch(`${base}/folders`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name }),
        });
        if (!createRes.ok) {
          const msg = await extractApiError(
            createRes,
            `Không thể tạo thư mục (HTTP ${createRes.status}).`,
          );
          setSaveError(msg);
          return;
        }
        const created = (await createRes.json()) as { id: string; name: string };
        targetFolder = { id: created.id, name: created.name };
        setFolders((prev) => [...prev, targetFolder!]);
      }
      const saved = await persistWordToFolder(savingWord, targetFolder);
      if (saved) setNewFolderName('');
    } catch {
      setSaveError('Không thể tạo thư mục hoặc lưu từ. Hãy thử lại.');
    } finally {
      setSavingBusy(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    void getUserScopedKey(HISTORY_KEY).then((hKey) => AsyncStorage.removeItem(hKey));
  };

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Tra cứu"
        subtitle={isPhone ? undefined : 'Tra từ Nhật–Việt & vẽ tay nhận diện Kanji'}
      />

      <View style={styles.searchCard}>
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void runSearch(query)}
            placeholder="Nhập Kanji, Kana, Romaji hoặc tiếng Anh/Việt..."
            placeholderTextColor={nihongoTheme.colors.textMuted}
            style={styles.input}
          />
          {query.length > 0 ? (
            <Pressable style={styles.clearBtn} onPress={() => setQuery('')}>
              <Text style={styles.clearText}>✕</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.handwritingBtn} onPress={() => setHandwritingOpen(true)}>
            <Text style={styles.handwritingText}>Viết tay</Text>
          </Pressable>
        </View>

        <View style={styles.tabsRow}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const count = tab.key === 'words' ? words.length : kanjiList.length;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                  {query.trim() && count > 0 ? ` (${count})` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {savedNotice ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>{savedNotice}</Text>
          <Pressable
            style={styles.noticeLinkBtn}
            onPress={() => router.push('/practice/flashcard-quiz')}
          >
            <Text style={styles.noticeLinkText}>Mở Flashcard →</Text>
          </Pressable>
        </View>
      ) : null}

      {errorMsg ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator color={nihongoTheme.colors.accent} />
          <Text style={styles.emptyDesc}>Đang tra cứu từ điển...</Text>
        </View>
      ) : !query.trim() ? (
        <View style={styles.emptyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.emptyTitle}>Lịch sử tra cứu</Text>
            {history.length > 0 ? (
              <Pressable onPress={clearHistory}>
                <Text style={styles.clearHistoryText}>Xóa tất cả</Text>
              </Pressable>
            ) : null}
          </View>
          {history.length === 0 ? (
            <Text style={styles.emptyDesc}>
              Gõ từ cần tra hoặc bấm &quot;Viết tay&quot; để vẽ chữ Hán trên canvas.
            </Text>
          ) : (
            <View style={styles.historyWrap}>
              {history.map((term) => (
                <Pressable key={term} style={styles.historyChip} onPress={() => setQuery(term)}>
                  <Text style={styles.historyChipText}>{term}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ) : activeTab === 'words' ? (
        words.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Không tìm thấy từ vựng cho &quot;{query.trim()}&quot;</Text>
            <Text style={styles.emptyDesc}>Thử nhập bằng Kana, Romaji hoặc chuyển sang tab Hán tự.</Text>
          </View>
        ) : (
          <View style={styles.listGap}>
            {words.map((item) => (
              <View key={item.id} style={styles.resultCard}>
                <View style={styles.resultTop}>
                  <View style={styles.wordBlock}>
                    <Text style={styles.wordText}>{item.word}</Text>
                    {item.reading && item.reading !== item.word ? (
                      <Text style={styles.readingText}>{item.reading}</Text>
                    ) : null}
                  </View>
                  <View style={styles.badgeRow}>
                    {item.source === 'library' ? (
                      <View style={styles.libBadge}>
                        <Text style={styles.libBadgeText}>Trong thư viện</Text>
                      </View>
                    ) : null}
                    {item.jlpt.map((lvl) => (
                      <View key={lvl} style={styles.jlptBadge}>
                        <Text style={styles.jlptBadgeText}>{lvl}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {item.sinoVietnamese ? (
                  <Text style={styles.sinoText}>Hán Việt: {item.sinoVietnamese}</Text>
                ) : null}

                <Text style={styles.meaningVi}>{item.meaningVi}</Text>
                {item.meaningEn && item.meaningEn !== item.meaningVi ? (
                  <Text style={styles.meaningEn}>{item.meaningEn}</Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <Text style={styles.posText}>{item.partsOfSpeech.join(' · ')}</Text>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.iconActionBtn}
                      onPress={() => speakJapanese(item.reading || item.word)}
                    >
                      <Text style={styles.iconActionText}>Nghe phát âm</Text>
                    </Pressable>
                    {item.source !== 'library' ? (
                      <Pressable style={styles.saveActionBtn} onPress={() => void openSaveModal(item)}>
                        <Text style={styles.saveActionText}>+ Lưu Flashcard</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )
      ) : kanjiList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Chưa có chữ Hán nào cho &quot;{query.trim()}&quot;</Text>
          <Text style={styles.emptyDesc}>Hãy nhập chữ Kanji hoặc bấm &quot;Viết tay&quot; để vẽ chữ Hán.</Text>
        </View>
      ) : (
        <View style={styles.listGap}>
          {kanjiList.map((k) => (
            <View key={k.kanji} style={styles.kanjiCard}>
              <View style={styles.kanjiHeader}>
                <View style={styles.kanjiGlyphBox}>
                  <Text style={styles.kanjiGlyph}>{k.kanji}</Text>
                </View>
                <View style={styles.kanjiMeta}>
                  <Text style={styles.meaningVi}>{k.meaningsVi}</Text>
                  {k.meaningsEn.length > 0 ? (
                    <Text style={styles.meaningEn}>{k.meaningsEn.join(', ')}</Text>
                  ) : null}
                  <View style={styles.badgeRow}>
                    {k.strokeCount ? (
                      <View style={styles.metaPill}>
                        <Text style={styles.metaPillText}>{k.strokeCount} nét</Text>
                      </View>
                    ) : null}
                    {k.jlpt ? (
                      <View style={styles.jlptBadge}>
                        <Text style={styles.jlptBadgeText}>JLPT N{k.jlpt}</Text>
                      </View>
                    ) : null}
                    {k.grade ? (
                      <View style={styles.metaPill}>
                        <Text style={styles.metaPillText}>Lớp {k.grade}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.readingsBox}>
                <View style={styles.readingLine}>
                  <Text style={styles.readingLabel}>On&apos;yomi:</Text>
                  <Text style={styles.readingValues}>
                    {k.onReadings.length > 0 ? k.onReadings.join(' · ') : '—'}
                  </Text>
                </View>
                <View style={styles.readingLine}>
                  <Text style={styles.readingLabel}>Kun&apos;yomi:</Text>
                  <Text style={styles.readingValues}>
                    {k.kunReadings.length > 0 ? k.kunReadings.join(' · ') : '—'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Save to Flashcard Folder Picker Modal */}
      <Modal
        visible={savingWord !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSavingWord(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lưu vào Flashcard</Text>
              <Pressable style={styles.modalCloseBtn} onPress={() => setSavingWord(null)}>
                <Text style={styles.modalClose}>Đóng</Text>
              </Pressable>
            </View>
            {savingWord ? (
              <Text style={styles.modalSub}>
                {savingWord.word} ({savingWord.reading || '—'}) — {savingWord.meaningVi}
              </Text>
            ) : null}
            {saveError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{saveError}</Text>
              </View>
            ) : null}

            {loadingFolders ? (
              <View style={styles.modalLoadingRow}>
                <ActivityIndicator color={nihongoTheme.colors.accent} />
                <Text style={styles.modalSub}>Đang tải danh sách thư mục...</Text>
              </View>
            ) : folders.length === 0 ? (
              <View style={styles.emptyFolderFlow}>
                <Text style={styles.modalHint}>
                  Bạn chưa có thư mục Flashcard nào. Tạo thư mục để lưu từ này:
                </Text>
                <Pressable
                  style={[styles.primaryCreateBtn, savingBusy && styles.btnDisabled]}
                  disabled={savingBusy}
                  onPress={() => void handleCreateAndSave(DEFAULT_LOOKUP_FOLDER_NAME)}
                >
                  <Text style={styles.primaryCreateBtnText}>
                    {savingBusy ? 'Đang lưu...' : `+ Tạo "${DEFAULT_LOOKUP_FOLDER_NAME}" & Lưu`}
                  </Text>
                </Pressable>
                <View style={styles.createFolderRow}>
                  <TextInput
                    value={newFolderName}
                    onChangeText={setNewFolderName}
                    placeholder="Hoặc nhập tên thư mục mới (vd: JLPT N3)..."
                    placeholderTextColor={nihongoTheme.colors.textMuted}
                    style={styles.newFolderInput}
                    onSubmitEditing={() => void handleCreateAndSave(newFolderName)}
                  />
                  <Pressable
                    style={[
                      styles.createSaveSmallBtn,
                      (!newFolderName.trim() || savingBusy) && styles.btnDisabled,
                    ]}
                    disabled={!newFolderName.trim() || savingBusy}
                    onPress={() => void handleCreateAndSave(newFolderName)}
                  >
                    <Text style={styles.createSaveSmallText}>Tạo &amp; Lưu</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.emptyFolderFlow}>
                <Text style={styles.modalHint}>Chọn thư mục để lưu:</Text>
                <ScrollView style={styles.folderList}>
                  {folders.map((f) => (
                    <Pressable
                      key={f.id}
                      style={[styles.folderOption, savingBusy && styles.btnDisabled]}
                      disabled={savingBusy}
                      onPress={() => void handleSaveToFolder(f)}
                    >
                      <Text style={styles.folderOptionText}>{f.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.createFolderRow}>
                  <TextInput
                    value={newFolderName}
                    onChangeText={setNewFolderName}
                    placeholder="Hoặc tạo thư mục mới..."
                    placeholderTextColor={nihongoTheme.colors.textMuted}
                    style={styles.newFolderInput}
                    onSubmitEditing={() => void handleCreateAndSave(newFolderName)}
                  />
                  <Pressable
                    style={[
                      styles.createSaveSmallBtn,
                      (!newFolderName.trim() || savingBusy) && styles.btnDisabled,
                    ]}
                    disabled={!newFolderName.trim() || savingBusy}
                    onPress={() => void handleCreateAndSave(newFolderName)}
                  >
                    <Text style={styles.createSaveSmallText}>+ Tạo &amp; Lưu</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <HandwritingModal
        visible={handwritingOpen}
        onClose={() => setHandwritingOpen(false)}
        onSelectKanji={(kanji) => {
          setQuery((prev) => `${prev}${kanji}`);
          setActiveTab('kanji');
        }}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  searchCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 12,
    marginBottom: 14,
    ...nihongoTheme.shadow.card,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: nihongoTheme.colors.textPrimary,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  clearText: {
    fontSize: 14,
    color: nihongoTheme.colors.textMuted,
    fontWeight: '700',
  },
  handwritingBtn: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: 'center',
  },
  handwritingText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
    fontSize: 13,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
  tabPillActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: nihongoTheme.colors.successBg,
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    marginBottom: 12,
  },
  noticeText: {
    flex: 1,
    color: '#15803D',
    fontWeight: '700',
    fontSize: 13,
  },
  noticeLinkBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  noticeLinkText: {
    color: '#15803D',
    fontWeight: '800',
    fontSize: 12,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 20,
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearHistoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  historyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
  historyChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: nihongoTheme.colors.textPrimary,
  },
  listGap: {
    gap: 12,
  },
  resultCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 8,
    ...nihongoTheme.shadow.card,
  },
  resultTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  wordBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  wordText: {
    fontSize: 24,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  readingText: {
    fontSize: 14,
    fontWeight: '600',
    color: nihongoTheme.colors.accentHover,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  libBadge: {
    backgroundColor: nihongoTheme.colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: nihongoTheme.radius.pill,
  },
  libBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  jlptBadge: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: nihongoTheme.radius.pill,
  },
  jlptBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  metaPill: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: nihongoTheme.radius.pill,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  sinoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A5B37',
  },
  meaningVi: {
    fontSize: 15,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  meaningEn: {
    fontSize: 12,
    color: nihongoTheme.colors.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: nihongoTheme.colors.borderLight,
  },
  posText: {
    fontSize: 11,
    color: nihongoTheme.colors.textMuted,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
  iconActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  saveActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.accent,
  },
  saveActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  kanjiCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  kanjiHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  kanjiGlyphBox: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#FDF8F0',
    borderWidth: 1.2,
    borderColor: '#C87D55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kanjiGlyph: {
    fontSize: 40,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  kanjiMeta: {
    flex: 1,
    gap: 6,
  },
  readingsBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    gap: 6,
  },
  readingLine: {
    flexDirection: 'row',
    gap: 8,
  },
  readingLabel: {
    width: 72,
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.textSecondary,
  },
  readingValues: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: nihongoTheme.colors.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(28, 25, 23, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: nihongoTheme.radius.card,
    padding: 18,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  modalCloseBtn: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  modalClose: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  modalSub: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
  },
  modalHint: {
    fontSize: 13,
    fontWeight: '600',
    color: nihongoTheme.colors.textSecondary,
  },
  modalErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: nihongoTheme.radius.md,
    padding: 10,
  },
  modalErrorText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#DC2626',
  },
  modalLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  emptyFolderFlow: {
    gap: 10,
  },
  primaryCreateBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  primaryCreateBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  createFolderRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  newFolderInput: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
  },
  createSaveSmallBtn: {
    backgroundColor: nihongoTheme.colors.textPrimary,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  createSaveSmallText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.55,
  },
  folderList: {
    maxHeight: 240,
  },
  folderOption: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    marginBottom: 8,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
  },
  folderOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
});
