import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FolderDto, VocabularyDto } from '../../../packages/contracts/src/study';
import { speakJapanese } from '../../src/utils/speak-japanese';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { sampleLibrary } from '../../src/sample-library';
import {
  createLocalWord,
  readLocalWorkspace,
  readServerCache,
  saveLocalWorkspace,
  saveServerCache,
} from '../../src/workspace-storage';
import { libraryEndpoint, loadLibrary, pushLibrary } from '../../src/library-source';
import { deletionPreview, folderWrites, type FolderAction } from '../../src/folder-actions';
import { overlayPending } from '../../src/sync-merge';
import {
  applyQuizletRating,
  createInitialCardState,
  getQuizletOptions,
  hydrateQuizletStates,
  pickNextQuizletCard,
  type QuizletCardState,
  type QuizletRating,
} from '../../src/features/flashcards/quizlet-srs';

const SRS_SESSION_STORAGE_KEY = 'kanji_nest_quizlet_srs_session_v1';
const SRS_OPTIONS_STORAGE_KEY = 'kanji_nest_quizlet_srs_options_v1';

interface QuizletOptionsConfig {
  sortingMode: 'srs' | 'basic';
  newCardsPerDay: number;
  autoTts: boolean;
  frontSide: 'japanese' | 'vietnamese';
}

const DEFAULT_OPTIONS: QuizletOptionsConfig = {
  sortingMode: 'srs',
  newCardsPerDay: 100,
  autoTts: false,
  frontSide: 'japanese',
};

type Mode = 'flashcard' | 'quiz' | 'library';

export default function FlashcardQuizPracticeScreen() {
  const [mode, setMode] = useState<Mode>('flashcard');
  const [folders, setFolders] = useState<FolderDto[]>(sampleLibrary.folders);
  const [words, setWords] = useState<VocabularyDto[]>(sampleLibrary.vocabularies);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('Đang kết nối backend…');
  const [connected, setConnected] = useState(false);

  // Folder manager modal state
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderQuery, setFolderQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [movingFolderId, setMovingFolderId] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Quick add word & library pagination state
  const [addWordOpen, setAddWordOpen] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newReading, setNewReading] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [libQuery, setLibQuery] = useState('');
  const [libLimit, setLibLimit] = useState(40);

  // Exact Quizlet Spaced Repetition session state
  const [srsStates, setSrsStates] = useState<Record<string, QuizletCardState>>({});
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [batchNewCount, setBatchNewCount] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [srsFeedback, setSrsFeedback] = useState<string | null>(null);

  // Quizlet Options modal state
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [options, setOptions] = useState<QuizletOptionsConfig>(DEFAULT_OPTIONS);
  const [newCardsInput, setNewCardsInput] = useState(String(DEFAULT_OPTIONS.newCardsPerDay));

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [quizResult, setQuizResult] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [quizScore, setQuizScore] = useState(0);

  const persistSrsSession = useCallback(
    async (
      nextStates: Record<string, QuizletCardState>,
      nextBatch: number,
      nextCardId: string | null,
      nextFolderId: string | null,
    ) => {
      try {
        await AsyncStorage.setItem(
          SRS_SESSION_STORAGE_KEY,
          JSON.stringify({
            states: nextStates,
            batchNewCount: nextBatch,
            currentCardId: nextCardId,
            folderId: nextFolderId,
          }),
        );
      } catch {
        // ignore storage errors
      }
    },
    [],
  );

  const fetchFromBackend = useCallback(async () => {
    const controller = new AbortController();
    setSyncStatus('Đang tải từ backend…');
    let savedLocal: Record<string, QuizletCardState> = {};
    let savedBatch = 0;
    let savedCurrentId: string | null = null;
    let savedFolderId: string | null = null;
    try {
      const raw = await AsyncStorage.getItem(SRS_SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          states?: Record<string, QuizletCardState>;
          batchNewCount?: number;
          currentCardId?: string | null;
          folderId?: string | null;
        };
        savedLocal = parsed.states ?? {};
        savedBatch = parsed.batchNewCount ?? 0;
        savedCurrentId = parsed.currentCardId ?? null;
        savedFolderId = parsed.folderId ?? null;
      }
    } catch {
      // ignore malformed storage
    }

    // 1) Local-First: load cached library from device storage immediately (works 100% offline)
    if (libraryEndpoint) {
      const cached = await readServerCache(libraryEndpoint).catch(() => undefined);
      if (cached && cached.vocabularies.length > 0) {
        const cachedFolders = cached.folders.filter((f) => !f.deletedAt);
        const cachedWords = cached.vocabularies.filter((v) => !v.deletedAt);
        setFolders(cachedFolders);
        setWords(cachedWords);
        setSrsStates(hydrateQuizletStates(cachedWords, savedLocal));
        setBatchNewCount(savedBatch);
        setCurrentCardId(savedCurrentId);
        if (savedFolderId && cachedFolders.some((f) => f.id === savedFolderId)) {
          setFolderId(savedFolderId);
        }
      }
    }

    // 2) Background sync from Backend when online
    try {
      const result = await loadLibrary(controller.signal);
      if (libraryEndpoint) {
        void saveServerCache(libraryEndpoint, result).catch(() => undefined);
      }
      const liveFolders = result.folders.filter((f) => !f.deletedAt);
      const liveWords = result.vocabularies.filter((v) => !v.deletedAt);
      setFolders(liveFolders);
      setWords(liveWords);
      setSrsStates(hydrateQuizletStates(liveWords, savedLocal));
      setBatchNewCount(savedBatch);
      setCurrentCardId(savedCurrentId);
      if (savedFolderId && liveFolders.some((f) => f.id === savedFolderId)) {
        setFolderId(savedFolderId);
      }
      setConnected(true);
      setSyncStatus(`Đã nối Backend (${libraryEndpoint ?? 'local'})`);
    } catch {
      setConnected(false);
      setSyncStatus('Chế độ offline (dùng dữ liệu lưu trên máy)');
      const local = await readLocalWorkspace().catch(() => undefined);
      if (local && local.vocabularies.length > 0) {
        const localWords = local.vocabularies.filter((v) => !v.deletedAt);
        setWords(localWords);
        setSrsStates(hydrateQuizletStates(localWords, savedLocal));
      }
    }
  }, []);

  useEffect(() => {
    void fetchFromBackend();
    void AsyncStorage.getItem(SRS_OPTIONS_STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<QuizletOptionsConfig>;
        const merged: QuizletOptionsConfig = { ...DEFAULT_OPTIONS, ...parsed };
        setOptions(merged);
        setNewCardsInput(String(merged.newCardsPerDay));
      })
      .catch(() => undefined);
  }, [fetchFromBackend]);

  const updateOptions = (patch: Partial<QuizletOptionsConfig>) => {
    setOptions((prev) => {
      const next = { ...prev, ...patch };
      void AsyncStorage.setItem(SRS_OPTIONS_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  };

  const descendantMap = useMemo(() => {
    const childrenByParent = new Map<string, string[]>();
    for (const f of folders) {
      if (f.parentId) {
        const list = childrenByParent.get(f.parentId) ?? [];
        list.push(f.id);
        childrenByParent.set(f.parentId, list);
      }
    }
    const map = new Map<string, Set<string>>();
    const collect = (id: string): Set<string> => {
      const cached = map.get(id);
      if (cached) return cached;
      const set = new Set<string>([id]);
      for (const childId of childrenByParent.get(id) ?? []) {
        for (const desc of collect(childId)) set.add(desc);
      }
      map.set(id, set);
      return set;
    };
    for (const f of folders) collect(f.id);
    return map;
  }, [folders]);

  const folderTreeRows = useMemo(() => {
    const byParent = new Map<string | null, FolderDto[]>();
    for (const f of folders) {
      const key = f.parentId ?? null;
      const list = byParent.get(key) ?? [];
      list.push(f);
      byParent.set(key, list);
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
    }
    const rows: { folder: FolderDto; depth: number; count: number }[] = [];
    const visit = (parentId: string | null, depth: number) => {
      for (const f of byParent.get(parentId) ?? []) {
        const scopeIds = descendantMap.get(f.id) ?? new Set([f.id]);
        const count = words.filter((w) => w.folderIds.some((fid) => scopeIds.has(fid))).length;
        rows.push({ folder: f, depth, count });
        visit(f.id, depth + 1);
      }
    };
    visit(null, 0);
    const q = folderQuery.trim().toLowerCase();
    return q ? rows.filter((r) => r.folder.name.toLowerCase().includes(q)) : rows;
  }, [folders, words, folderQuery, descendantMap]);

  const selectedFolderName = useMemo(() => {
    if (!folderId) return 'Tất cả thư mục';
    return folders.find((f) => f.id === folderId)?.name ?? 'Tất cả thư mục';
  }, [folders, folderId]);

  const activeWords = useMemo(() => {
    if (!folderId) return words;
    const scopeIds = descendantMap.get(folderId) ?? new Set([folderId]);
    return words.filter((w) => w.folderIds.some((fid) => scopeIds.has(fid)));
  }, [words, folderId, descendantMap]);

  const activeWordIds = useMemo(() => {
    const ids = activeWords.map((w) => w.id);
    const limit = Math.max(1, options.newCardsPerDay);
    let newSeen = 0;
    return ids.filter((id) => {
      const st = srsStates[id];
      if (st && st.stage !== 'new') return true;
      if (newSeen < limit) {
        newSeen += 1;
        return true;
      }
      return false;
    });
  }, [activeWords, options.newCardsPerDay, srsStates]);

  const effectiveCardId = useMemo(() => {
    if (currentCardId && activeWordIds.includes(currentCardId)) {
      const st = srsStates[currentCardId];
      if (!st || st.stage !== 'graduated') return currentCardId;
    }
    return pickNextQuizletCard(activeWordIds, srsStates, batchNewCount).nextId;
  }, [activeWordIds, currentCardId, srsStates, batchNewCount]);

  const currentCard = useMemo(
    () => (effectiveCardId ? activeWords.find((w) => w.id === effectiveCardId) : undefined),
    [activeWords, effectiveCardId],
  );
  const currentCardState = useMemo(
    () => (effectiveCardId ? (srsStates[effectiveCardId] ?? createInitialCardState(effectiveCardId)) : undefined),
    [effectiveCardId, srsStates],
  );
  const quizletOptions = useMemo(
    () => (currentCardState ? getQuizletOptions(currentCardState) : []),
    [currentCardState],
  );

  const reviewedCount = useMemo(
    () => activeWordIds.filter((id) => srsStates[id] && srsStates[id].stage !== 'new').length,
    [activeWordIds, srsStates],
  );
  const completedCount = useMemo(
    () => activeWordIds.filter((id) => srsStates[id]?.stage === 'graduated').length,
    [activeWordIds, srsStates],
  );
  const roundDone = activeWordIds.length > 0 && completedCount >= activeWordIds.length;
  const currentQuiz = activeWords[quizIndex % Math.max(activeWords.length, 1)];

  const resetRound = () => {
    const activeSet = new Set(activeWordIds);
    const nextStates: Record<string, QuizletCardState> = {};
    for (const [id, st] of Object.entries(srsStates)) {
      if (!activeSet.has(id)) nextStates[id] = st;
    }
    setSrsStates(nextStates);
    setCurrentCardId(null);
    setBatchNewCount(0);
    setFlipped(false);
    setSrsFeedback(null);
    void persistSrsSession(nextStates, 0, null, folderId);
  };

  const selectFolder = (id: string | null) => {
    setFolderId(id);
    setCurrentCardId(null);
    setBatchNewCount(0);
    setFlipped(false);
    setQuizIndex(0);
    setQuizResult('idle');
    setFolderModalOpen(false);
    void persistSrsSession(srsStates, 0, null, id);
  };

  const applyFolderAction = async (action: FolderAction) => {
    try {
      setFolderError(null);
      const writes = folderWrites({ folders, vocabularies: words }, action);
      const nextFolders = overlayPending(folders, writes.folders).filter((f) => !f.deletedAt);
      const nextWords = overlayPending(words, writes.vocabularies).filter((w) => !w.deletedAt);
      setFolders(nextFolders);
      setWords(nextWords);
      if (action.kind === 'remove' && folderId === action.id) {
        setFolderId(null);
      }
      if (connected) {
        const controller = new AbortController();
        await pushLibrary(writes, controller.signal);
      }
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : 'Không thể cập nhật thư mục.');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await applyFolderAction({ kind: 'create', parentId: folderId, name: newFolderName.trim() });
    setNewFolderName('');
  };

  const handleRenameFolder = async (id: string) => {
    if (!editingFolderName.trim()) return;
    await applyFolderAction({ kind: 'rename', id, name: editingFolderName.trim() });
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const handleDeleteFolder = async (id: string) => {
    const preview = deletionPreview({ folders, vocabularies: words }, id);
    await applyFolderAction({ kind: 'remove', id, signature: preview.signature });
  };

  const handleMoveFolder = async (targetParentId: string | null) => {
    if (!movingFolderId || movingFolderId === targetParentId) {
      setMovingFolderId(null);
      return;
    }
    await applyFolderAction({ kind: 'move', id: movingFolderId, parentId: targetParentId });
    setMovingFolderId(null);
  };

  const handleAddWord = async () => {
    if (!newWord.trim() || !newMeaning.trim()) return;
    const created = createLocalWord(
      {
        word: newWord.trim(),
        reading: newReading.trim() || newWord.trim(),
        meaning: newMeaning.trim(),
        jlptLevel: 'N3',
      },
      folderId,
    );
    setWords((prev) => [created, ...prev]);
    setNewWord('');
    setNewReading('');
    setNewMeaning('');
    setAddWordOpen(false);
    if (connected) {
      const controller = new AbortController();
      void pushLibrary({ folders: [], vocabularies: [created] }, controller.signal).catch(() => undefined);
    }
  };

  const speak = (text: string) => {
    void speakJapanese(text);
  };

  useEffect(() => {
    if (mode !== 'flashcard' || !options.autoTts || !currentCard) return;
    if (options.frontSide === 'japanese') {
      speak(currentCard.reading || currentCard.word);
    }
  }, [mode, options.autoTts, options.frontSide, currentCard]);

  const handleRate = (rating: QuizletRating) => {
    if (!currentCard || !currentCardState) return;
    const nowMs = Date.now();
    const { next, graduatedDays, feedback } = applyQuizletRating(currentCardState, rating, nowMs);
    const nextStates = { ...srsStates, [currentCard.id]: next };
    const nextBatch = currentCardState.stage === 'new' ? batchNewCount + 1 : batchNewCount;
    const picked = pickNextQuizletCard(activeWordIds, nextStates, nextBatch, currentCard.id);

    const finalBatch = picked.resetBatch ? 0 : nextBatch;
    setSrsStates(nextStates);
    setBatchNewCount(finalBatch);
    setCurrentCardId(picked.nextId);
    setFlipped(false);
    setSrsFeedback(feedback);
    void persistSrsSession(nextStates, finalBatch, picked.nextId, folderId);

    // Persist graduated/learning SRS state to backend / local workspace
    const intervalDays = graduatedDays ?? 0;
    const nextReviewDate = new Date(nowMs + Math.max(intervalDays, 1) * 86_400_000);
    const updatedCard: VocabularyDto = {
      ...currentCard,
      updatedAt: new Date(nowMs).toISOString(),
      srsInterval: intervalDays || currentCard.srsInterval,
      srsRepetition: graduatedDays ? (currentCard.srsRepetition ?? 0) + 1 : 0,
      srsEaseFactor: currentCard.srsEaseFactor,
      srsNextReview: nextReviewDate.toISOString(),
    };
    setWords((prev) => prev.map((w) => (w.id === updatedCard.id ? updatedCard : w)));
    if (connected) {
      const controller = new AbortController();
      void pushLibrary({ folders: [], vocabularies: [updatedCard] }, controller.signal).catch(() => undefined);
    } else {
      void readLocalWorkspace()
        .then((local) =>
          saveLocalWorkspace({
            ...local,
            vocabularies: [...local.vocabularies.filter((w) => w.id !== updatedCard.id), updatedCard],
          }),
        )
        .catch(() => undefined);
    }
  };

  const handleCheckQuiz = () => {
    if (!currentQuiz || !answer.trim()) return;
    const normalized = answer.trim().toLowerCase();
    const valid = [currentQuiz.word, currentQuiz.reading, currentQuiz.meaning]
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
      .map((s) => s.trim().toLowerCase());
    const ok = valid.some((v) => v === normalized || v.includes(normalized));
    setQuizResult(ok ? 'correct' : 'wrong');
    if (ok) setQuizScore((s) => s + 1);
  };

  const handleNextQuiz = () => {
    setAnswer('');
    setQuizResult('idle');
    setQuizIndex((i) => (i + 1) % Math.max(activeWords.length, 1));
  };

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Flashcard & Quiz"
        rightSlot={
          <View style={styles.headerRight}>
            <Pressable style={styles.ttsBtn} onPress={() => setOptionsOpen(true)}>
              <Text style={styles.ttsText}>⚙ Cài đặt</Text>
            </Pressable>
            <Pressable style={styles.ttsBtn} onPress={() => void fetchFromBackend()}>
              <Text style={styles.ttsText}>↻ Đồng bộ</Text>
            </Pressable>
          </View>
        }
      />

      {/* Quizlet-style Options Modal */}
      <Modal visible={optionsOpen} transparent animationType="fade" onRequestClose={() => setOptionsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cài đặt học (Options)</Text>
              <Pressable onPress={() => setOptionsOpen(false)}>
                <Text style={styles.modalClose}>Đóng</Text>
              </Pressable>
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Sắp xếp thẻ (Flashcard sorting)</Text>
                <Text style={styles.optionDesc}>Chọn chế độ lặp lại ngắt quãng 4 mức hoặc cơ bản 2 nút</Text>
              </View>
              <Pressable
                style={styles.smallPill}
                onPress={() =>
                  updateOptions({ sortingMode: options.sortingMode === 'srs' ? 'basic' : 'srs' })
                }
              >
                <Text style={styles.smallPillText}>
                  {options.sortingMode === 'srs' ? 'Spaced repetition ▾' : 'Cơ bản (2 nút) ▾'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Số thẻ mới mỗi ngày</Text>
                <Text style={styles.optionDesc}>Thêm nhiều thẻ hơn sẽ làm các phiên ôn sau dài hơn.</Text>
              </View>
              <TextInput
                value={newCardsInput}
                onChangeText={(val) => {
                  const digits = val.replace(/[^0-9]/g, '');
                  setNewCardsInput(digits);
                  const n = Number(digits);
                  if (n > 0) updateOptions({ newCardsPerDay: n });
                }}
                keyboardType="numeric"
                style={styles.numInput}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Tự động phát âm (Text to speech)</Text>
                <Text style={styles.optionDesc}>Tự đọc tiếng Nhật khi hiện thẻ mới</Text>
              </View>
              <Switch
                value={options.autoTts}
                onValueChange={(v) => updateOptions({ autoTts: v })}
                trackColor={{ false: '#E5DDD4', true: nihongoTheme.colors.accent }}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Mặt trước (Front)</Text>
                <Text style={styles.optionDesc}>Chọn ngôn ngữ hiển thị ở mặt trước thẻ</Text>
              </View>
              <Pressable
                style={styles.smallPill}
                onPress={() =>
                  updateOptions({
                    frontSide: options.frontSide === 'japanese' ? 'vietnamese' : 'japanese',
                  })
                }
              >
                <Text style={styles.smallPillText}>
                  {options.frontSide === 'japanese' ? 'Tiếng Nhật ▾' : 'Tiếng Việt ▾'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.optionFooter}>
              <Pressable
                onPress={() => {
                  resetRound();
                  setOptionsOpen(false);
                }}
              >
                <Text style={styles.resetDangerText}>Đặt lại tiến trình SRS (Reset Spaced Repetition)</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mode Switcher */}
      <View style={styles.tabsRow}>
        {(
          [
            ['flashcard', 'Flashcard'],
            ['quiz', 'Quiz gõ từ'],
            ['library', 'Thư viện từ'],
          ] as const
        ).map(([key, label]) => {
          const active = mode === key;
          return (
            <Pressable key={key} style={[styles.tabPill, active && styles.tabPillActive]} onPress={() => setMode(key)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Compact Folder Picker Bar */}
      <Pressable style={styles.folderBar} onPress={() => setFolderModalOpen(true)}>
        <View style={styles.folderBarLeft}>
          <Text style={styles.folderBarIcon}>📁</Text>
          <View>
            <Text style={styles.folderBarLabel}>Thư mục đang học</Text>
            <Text style={styles.folderBarValue}>
              {selectedFolderName} · {activeWords.length} từ
            </Text>
          </View>
        </View>
        <View style={styles.folderBarBtn}>
          <Text style={styles.folderBarBtnText}>Quản lý & Chọn ▾</Text>
        </View>
      </Pressable>

      {/* Searchable Hierarchical Folder Manager Modal */}
      <Modal
        visible={folderModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quản lý thư mục ({folders.length})</Text>
              <Pressable onPress={() => setFolderModalOpen(false)}>
                <Text style={styles.modalClose}>Đóng</Text>
              </Pressable>
            </View>

            {/* Quick create folder */}
            <View style={styles.createRow}>
              <TextInput
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder={folderId ? `Thêm thư mục con trong "${selectedFolderName}"...` : 'Tên thư mục mới...'}
                placeholderTextColor={nihongoTheme.colors.textMuted}
                style={styles.modalSearch}
              />
              <Pressable style={styles.createBtn} onPress={() => void handleCreateFolder()}>
                <Text style={styles.createBtnText}>+ Thêm</Text>
              </Pressable>
            </View>

            <TextInput
              value={folderQuery}
              onChangeText={setFolderQuery}
              placeholder="Tìm tên thư mục..."
              placeholderTextColor={nihongoTheme.colors.textMuted}
              style={styles.modalSearch}
            />

            {movingFolderId ? (
              <View style={styles.moveBanner}>
                <Text style={styles.moveBannerText}>Chọn thư mục cha muốn di chuyển vào:</Text>
                <View style={styles.moveBannerActions}>
                  <Pressable style={styles.smallPill} onPress={() => void handleMoveFolder(null)}>
                    <Text style={styles.smallPillText}>Đưa ra gốc</Text>
                  </Pressable>
                  <Pressable style={styles.smallPill} onPress={() => setMovingFolderId(null)}>
                    <Text style={styles.smallPillText}>Hủy</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {folderError ? <Text style={styles.errorText}>{folderError}</Text> : null}

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator>
              <Pressable
                style={[styles.treeRow, folderId === null && styles.treeRowActive]}
                onPress={() => selectFolder(null)}
              >
                <Text style={[styles.treeName, folderId === null && styles.treeNameActive]}>Tất cả thư mục</Text>
                <Text style={styles.treeCount}>{words.length} từ</Text>
              </Pressable>

              {folderTreeRows.map(({ folder, depth, count }) => {
                const active = folderId === folder.id;
                const isEditing = editingFolderId === folder.id;
                return (
                  <View
                    key={folder.id}
                    style={[styles.treeRow, { paddingLeft: 12 + depth * 16 }, active && styles.treeRowActive]}
                  >
                    {isEditing ? (
                      <View style={styles.editRow}>
                        <TextInput
                          value={editingFolderName}
                          onChangeText={setEditingFolderName}
                          style={styles.inlineInput}
                          autoFocus
                        />
                        <Pressable style={styles.smallPill} onPress={() => void handleRenameFolder(folder.id)}>
                          <Text style={styles.smallPillText}>Lưu</Text>
                        </Pressable>
                        <Pressable onPress={() => setEditingFolderId(null)}>
                          <Text style={styles.actionText}>Hủy</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <Pressable
                          style={styles.treeSelectArea}
                          onPress={() => (movingFolderId ? void handleMoveFolder(folder.id) : selectFolder(folder.id))}
                        >
                          <Text style={[styles.treeName, active && styles.treeNameActive]}>
                            {depth > 0 ? '└ ' : '📁 '}
                            {folder.name}
                          </Text>
                          <Text style={styles.treeCount}>{count}</Text>
                        </Pressable>
                        <View style={styles.rowActions}>
                          <Pressable
                            onPress={() => {
                              setEditingFolderId(folder.id);
                              setEditingFolderName(folder.name);
                            }}
                          >
                            <Text style={styles.actionText}>Sửa</Text>
                          </Pressable>
                          <Pressable onPress={() => setMovingFolderId(folder.id)}>
                            <Text style={styles.actionText}>Chuyển</Text>
                          </Pressable>
                          <Pressable onPress={() => void handleDeleteFolder(folder.id)}>
                            <Text style={[styles.actionText, styles.deleteText]}>Xóa</Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODE 1: EXACT QUIZLET SPACED REPETITION */}
      {mode === 'flashcard' ? (
        <View style={styles.section}>
          {/* 3-Layer Segmented Progress Bar (Gray base + Orange reviewed + Green completed) */}
          <View style={styles.srsProgressWrap}>
            <View style={styles.srsHeaderRow}>
              <Text style={styles.progressFraction}>
                {completedCount} / {activeWordIds.length} hoàn thành
              </Text>
              <View style={styles.quizletPills}>
                <View style={styles.learningBadge}>
                  <Text style={styles.learningBadgeText}>Đã xem: {reviewedCount}</Text>
                </View>
                <View style={styles.knownBadge}>
                  <Text style={styles.knownBadgeText}>Hoàn thành: {completedCount}</Text>
                </View>
              </View>
            </View>
            <View style={styles.segmentedTrack}>
              <View
                style={[
                  styles.segmentedReviewed,
                  { width: `${activeWordIds.length ? (reviewedCount / activeWordIds.length) * 100 : 0}%` },
                ]}
              />
              <View
                style={[
                  styles.segmentedCompleted,
                  { width: `${activeWordIds.length ? (completedCount / activeWordIds.length) * 100 : 0}%` },
                ]}
              />
            </View>
          </View>

          {roundDone ? (
            <View style={styles.card}>
              <Text style={styles.summaryTitle}>Hoàn thành phiên SRS!</Text>
              <Text style={styles.summaryDesc}>
                Bạn đã hoàn thành toàn bộ {completedCount} / {activeWordIds.length} thẻ trong thư mục này.
              </Text>
              <View style={styles.quizActions}>
                <Pressable style={styles.primaryBtn} onPress={resetRound}>
                  <Text style={styles.primaryBtnText}>Học lại từ đầu</Text>
                </Pressable>
              </View>
            </View>
          ) : currentCard && currentCardState ? (
            <>
              <Pressable style={styles.flashcard} onPress={() => setFlipped((v) => !v)}>
                <View style={styles.cardTopRow}>
                  {currentCardState.stage === 'new' ? (
                    <View style={styles.newPill}>
                      <Text style={styles.newPillText}>New</Text>
                    </View>
                  ) : (
                    <View style={styles.learningBadge}>
                      <Text style={styles.learningBadgeText}>Đang ôn</Text>
                    </View>
                  )}
                  <Pressable style={styles.ttsBtn} onPress={() => speak(currentCard.reading || currentCard.word)}>
                    <Text style={styles.ttsText}>🔊 Nghe</Text>
                  </Pressable>
                </View>

                <Text style={styles.kanjiLarge}>
                  {options.frontSide === 'japanese' ? currentCard.word : currentCard.meaning}
                </Text>

                {flipped ? (
                  <View style={styles.backBox}>
                    {options.frontSide === 'japanese' ? (
                      <>
                        <Text style={styles.readingText}>{currentCard.reading}</Text>
                        <Text style={styles.meaningText}>{currentCard.meaning}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.meaningText}>{currentCard.word}</Text>
                        <Text style={styles.readingText}>{currentCard.reading}</Text>
                      </>
                    )}
                    {currentCard.sinoVietnamese ? (
                      <Text style={styles.hanVietText}>{currentCard.sinoVietnamese}</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.flipHint}>Chạm vào thẻ để lật xem đáp án</Text>
                )}
              </Pressable>

              {options.sortingMode === 'basic' ? (
                <View style={styles.quizletActions}>
                  <Pressable style={styles.stillLearningBtn} onPress={() => handleRate('repeat')}>
                    <Text style={styles.stillLearningText}>✕ Đang học</Text>
                  </Pressable>
                  <Pressable style={styles.knowBtn} onPress={() => handleRate('easy')}>
                    <Text style={styles.knowText}>✓ Đã biết</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.ratingRow}>
                  {quizletOptions.map((opt) => (
                    <Pressable key={opt.rating} style={styles.ratingBtn} onPress={() => handleRate(opt.rating)}>
                      <Text style={styles.ratingLabel}>{opt.label}</Text>
                      <Text style={styles.ratingHint}>{opt.intervalLabel}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.summaryDesc}>Thư mục này chưa có từ vựng nào.</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* MODE 2: TYPING QUIZ */}
      {mode === 'quiz' && currentQuiz ? (
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.progressText}>
              Câu {(quizIndex % activeWords.length) + 1} / {activeWords.length} · Điểm: {quizScore}
            </Text>
            <Pressable style={styles.ttsBtn} onPress={() => speak(currentQuiz.reading || currentQuiz.word)}>
              <Text style={styles.ttsText}>🔊 Nghe</Text>
            </Pressable>
          </View>

          <Text style={styles.quizPromptLabel}>Nhập cách đọc (Kana) hoặc nghĩa của từ sau:</Text>
          <Text style={styles.kanjiLarge}>{currentQuiz.word}</Text>

          <TextInput
            value={answer}
            onChangeText={setAnswer}
            onSubmitEditing={handleCheckQuiz}
            placeholder="Nhập đáp án..."
            placeholderTextColor={nihongoTheme.colors.textMuted}
            style={styles.input}
          />

          {quizResult !== 'idle' ? (
            <View style={[styles.feedbackBox, quizResult === 'correct' ? styles.feedbackOk : styles.feedbackWrong]}>
              <Text style={quizResult === 'correct' ? styles.feedbackOkText : styles.feedbackWrongText}>
                {quizResult === 'correct'
                  ? `Chính xác! ${currentQuiz.reading} — ${currentQuiz.meaning}`
                  : `Đáp án đúng: ${currentQuiz.reading} — ${currentQuiz.meaning}`}
              </Text>
            </View>
          ) : null}

          <View style={styles.quizActions}>
            <Pressable style={styles.primaryBtn} onPress={quizResult === 'idle' ? handleCheckQuiz : handleNextQuiz}>
              <Text style={styles.primaryBtnText}>{quizResult === 'idle' ? 'Kiểm tra' : 'Câu tiếp theo →'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* MODE 3: LIBRARY + QUICK ADD WORD (Paginated for instant render) */}
      {mode === 'library' ? (
        <View style={styles.list}>
          <TextInput
            value={libQuery}
            onChangeText={(v) => {
              setLibQuery(v);
              setLibLimit(40);
            }}
            placeholder={`Tìm trong ${activeWords.length} từ...`}
            placeholderTextColor={nihongoTheme.colors.textMuted}
            style={styles.input}
          />

          <Pressable style={styles.addWordTrigger} onPress={() => setAddWordOpen((v) => !v)}>
            <Text style={styles.addWordTriggerText}>{addWordOpen ? '− Đóng biểu mẫu' : '+ Thêm từ mới vào thư mục'}</Text>
          </Pressable>

          {addWordOpen ? (
            <View style={styles.card}>
              <TextInput
                value={newWord}
                onChangeText={setNewWord}
                placeholder="Từ tiếng Nhật (Kanji/Kana)"
                placeholderTextColor={nihongoTheme.colors.textMuted}
                style={styles.input}
              />
              <TextInput
                value={newReading}
                onChangeText={setNewReading}
                placeholder="Cách đọc (Hiragana)"
                placeholderTextColor={nihongoTheme.colors.textMuted}
                style={styles.input}
              />
              <TextInput
                value={newMeaning}
                onChangeText={setNewMeaning}
                placeholder="Nghĩa tiếng Việt"
                placeholderTextColor={nihongoTheme.colors.textMuted}
                style={styles.input}
              />
              <Pressable style={styles.primaryBtn} onPress={() => void handleAddWord()}>
                <Text style={styles.primaryBtnText}>Lưu từ mới</Text>
              </Pressable>
            </View>
          ) : null}

          {(() => {
            const q = libQuery.trim().toLowerCase();
            const filtered = q
              ? activeWords.filter(
                  (w) =>
                    w.word.toLowerCase().includes(q) ||
                    (w.reading ?? '').toLowerCase().includes(q) ||
                    w.meaning.toLowerCase().includes(q),
                )
              : activeWords;
            const visible = filtered.slice(0, libLimit);
            const remaining = filtered.length - visible.length;
            return (
              <>
                {visible.map((item) => (
                  <View key={item.id} style={styles.wordCard}>
                    <View style={styles.wordLeft}>
                      <Text style={styles.wordKanji}>{item.word}</Text>
                      <Text style={styles.wordReading}>{item.reading}</Text>
                    </View>
                    <View style={styles.wordMid}>
                      <Text style={styles.wordMeaning}>{item.meaning}</Text>
                      {item.sinoVietnamese ? <Text style={styles.wordHanViet}>{item.sinoVietnamese}</Text> : null}
                    </View>
                    <Pressable style={styles.ttsBtn} onPress={() => speak(item.reading || item.word)}>
                      <Text style={styles.ttsText}>🔊</Text>
                    </Pressable>
                  </View>
                ))}
                {remaining > 0 ? (
                  <Pressable style={styles.outlineBtn} onPress={() => setLibLimit((n) => n + 40)}>
                    <Text style={styles.outlineBtnText}>Xem thêm 40 từ (còn {remaining} từ)</Text>
                  </Pressable>
                ) : null}
              </>
            );
          })()}
        </View>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: nihongoTheme.colors.borderLight,
  },
  optionInfo: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  optionDesc: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
  },
  numInput: {
    width: 72,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    color: nihongoTheme.colors.textPrimary,
  },
  optionFooter: {
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  resetDangerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.surface,
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
  folderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 16,
    ...nihongoTheme.shadow.card,
  },
  folderBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  folderBarIcon: {
    fontSize: 18,
  },
  folderBarLabel: {
    fontSize: 11,
    color: nihongoTheme.colors.textMuted,
    fontWeight: '600',
  },
  folderBarValue: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  folderBarBtn: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  folderBarBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 12, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '85%',
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    padding: 18,
    gap: 10,
    ...nihongoTheme.shadow.dock,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  modalClose: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  createRow: {
    flexDirection: 'row',
    gap: 8,
  },
  createBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalSearch: {
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
  moveBanner: {
    backgroundColor: nihongoTheme.colors.warningBg,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  moveBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.warningText,
  },
  moveBannerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallPill: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  modalList: {
    maxHeight: 360,
  },
  treeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingRight: 10,
    borderRadius: 12,
    marginBottom: 4,
    gap: 8,
  },
  treeRowActive: {
    backgroundColor: nihongoTheme.colors.accentSoft,
  },
  treeSelectArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  treeName: {
    fontSize: 14,
    fontWeight: '600',
    color: nihongoTheme.colors.textPrimary,
    flexShrink: 1,
  },
  treeNameActive: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '800',
  },
  treeCount: {
    fontSize: 12,
    fontWeight: '600',
    color: nihongoTheme.colors.textMuted,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  deleteText: {
    color: '#C62828',
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
  },
  section: {
    gap: 14,
  },
  srsProgressWrap: {
    gap: 8,
  },
  progressFraction: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  segmentedTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EAE4DD',
    overflow: 'hidden',
    position: 'relative',
  },
  segmentedReviewed: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FF983A',
    borderRadius: 5,
  },
  segmentedCompleted: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#18AE79',
    borderRadius: 5,
  },
  feedbackCaption: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  newPill: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  srsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  quizletPills: {
    flexDirection: 'row',
    gap: 8,
  },
  learningBadge: {
    backgroundColor: nihongoTheme.colors.warningBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  learningBadgeText: {
    color: nihongoTheme.colors.warningText,
    fontWeight: '700',
    fontSize: 12,
  },
  knownBadge: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  knownBadgeText: {
    color: nihongoTheme.colors.successText,
    fontWeight: '700',
    fontSize: 12,
  },
  modeToggle: {
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  flashcard: {
    minHeight: 280,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    ...nihongoTheme.shadow.card,
  },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 22,
    gap: 14,
    ...nihongoTheme.shadow.card,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    textAlign: 'center',
  },
  summaryDesc: {
    fontSize: 14,
    color: nihongoTheme.colors.textSecondary,
    textAlign: 'center',
  },
  cardTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  ttsBtn: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ttsText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
    fontSize: 12,
  },
  kanjiLarge: {
    fontSize: 40,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    textAlign: 'center',
    marginVertical: 12,
  },
  backBox: {
    alignItems: 'center',
    gap: 4,
  },
  readingText: {
    fontSize: 18,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  meaningText: {
    fontSize: 16,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  hanVietText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textMuted,
    letterSpacing: 0.6,
  },
  flipHint: {
    fontSize: 13,
    color: nihongoTheme.colors.textMuted,
  },
  quizletActions: {
    flexDirection: 'row',
    gap: 12,
  },
  stillLearningBtn: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.warningBg,
    borderWidth: 1,
    borderColor: '#F6C892',
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 15,
    alignItems: 'center',
  },
  stillLearningText: {
    color: nihongoTheme.colors.warningText,
    fontWeight: '800',
    fontSize: 15,
  },
  knowBtn: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.successBg,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 15,
    alignItems: 'center',
  },
  knowText: {
    color: nihongoTheme.colors.successText,
    fontWeight: '800',
    fontSize: 15,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingBtn: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
    ...nihongoTheme.shadow.card,
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  ratingHint: {
    fontSize: 11,
    fontWeight: '600',
    color: nihongoTheme.colors.accentHover,
  },
  quizPromptLabel: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    textAlign: 'center',
  },
  input: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: nihongoTheme.colors.textPrimary,
  },
  feedbackBox: {
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
  },
  feedbackOk: {
    backgroundColor: nihongoTheme.colors.successBg,
  },
  feedbackWrong: {
    backgroundColor: nihongoTheme.colors.warningBg,
  },
  feedbackOkText: {
    color: nihongoTheme.colors.successText,
    fontWeight: '700',
    fontSize: 13,
  },
  feedbackWrongText: {
    color: nihongoTheme.colors.warningText,
    fontWeight: '700',
    fontSize: 13,
  },
  quizActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 13,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: nihongoTheme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  addWordTrigger: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addWordTriggerText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
    fontSize: 13,
  },
  list: {
    gap: 10,
  },
  wordCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  wordLeft: {
    minWidth: 96,
  },
  wordKanji: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  wordReading: {
    fontSize: 12,
    color: nihongoTheme.colors.accentHover,
    fontWeight: '600',
  },
  wordMid: {
    flex: 1,
    gap: 2,
  },
  wordMeaning: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  wordHanViet: {
    fontSize: 11,
    color: nihongoTheme.colors.textMuted,
    fontWeight: '700',
  },
});
