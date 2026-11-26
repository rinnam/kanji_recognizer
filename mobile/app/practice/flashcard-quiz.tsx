import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import type { FolderDto, VocabularyDto } from '../../../packages/contracts/src/study';
import { speakJapanese } from '../../src/utils/speak-japanese';
import {
  AiFlashcardModal,
  type AiExtractedCard,
} from '../../src/features/flashcards/AiFlashcardModal';
import { parseCsv } from '../../src/import-parser';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { CatFrame } from '../../src/CatFrame';
import { BulbIcon, ClockIcon, ResetIcon, ShuffleIcon, VolumeIcon } from '../../src/components/AppIcons';
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
import { getUserScopedKey } from '../../src/features/auth/auth-store';
import { recordMeaningfulStudyAction } from '../../src/features/study-tracker/use-study-tracker';
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
  const { width } = useWindowDimensions();
  const isCompact = width < 640;
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

  // Quick add / edit / bulk import word & library pagination state
  const [addWordOpen, setAddWordOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [mnemonicMap, setMnemonicMap] = useState<
    Record<string, { radicalBreakdown: string; storyVi: string; usageTipVi: string }>
  >({});
  const [mnemonicLoading, setMnemonicLoading] = useState(false);
  const [importText, setImportText] = useState('');
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [newWord, setNewWord] = useState('');
  const [newReading, setNewReading] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newHanViet, setNewHanViet] = useState('');
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
  const [quizMode, setQuizMode] = useState<'random' | 'jp_to_vi' | 'vi_to_jp'>('random');
  const [quizShuffled, setQuizShuffled] = useState(false);
  const [quizShuffleSeed, setQuizShuffleSeed] = useState(0);
  const [quizAutoSecInput, setQuizAutoSecInput] = useState('2');
  const [quizIndex, setQuizIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [quizResult, setQuizResult] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [quizScore, setQuizScore] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const persistSrsSession = useCallback(
    async (
      nextStates: Record<string, QuizletCardState>,
      nextBatch: number,
      nextCardId: string | null,
      nextFolderId: string | null,
    ) => {
      try {
        const sessionKey = await getUserScopedKey(SRS_SESSION_STORAGE_KEY);
        await AsyncStorage.setItem(
          sessionKey,
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
      const sessionKey = await getUserScopedKey(SRS_SESSION_STORAGE_KEY);
      const raw = await AsyncStorage.getItem(sessionKey);
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
    void getUserScopedKey(SRS_OPTIONS_STORAGE_KEY)
      .then((optKey) => AsyncStorage.getItem(optKey))
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
      void getUserScopedKey(SRS_OPTIONS_STORAGE_KEY)
        .then((optKey) => AsyncStorage.setItem(optKey, JSON.stringify(next)))
        .catch(() => undefined);
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

  const dueReviewCount = useMemo(
    () => activeWordIds.filter((id) => srsStates[id]?.stage === 'review' || srsStates[id]?.stage === 'learning').length,
    [activeWordIds, srsStates],
  );
  const dueNewCount = useMemo(
    () => activeWordIds.filter((id) => !srsStates[id] || srsStates[id].stage === 'new').length,
    [activeWordIds, srsStates],
  );
  const reviewedCount = useMemo(
    () => activeWordIds.filter((id) => srsStates[id] && srsStates[id].stage !== 'new').length,
    [activeWordIds, srsStates],
  );
  const completedCount = useMemo(
    () => activeWordIds.filter((id) => srsStates[id]?.stage === 'graduated').length,
    [activeWordIds, srsStates],
  );
  const quizWords = useMemo(() => {
    if (!quizShuffled) return activeWords;
    const copy = [...activeWords];
    let seed = quizShuffleSeed + 1;
    for (let i = copy.length - 1; i > 0; i -= 1) {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      const j = seed % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [activeWords, quizShuffled, quizShuffleSeed]);

  const roundDone = activeWordIds.length > 0 && completedCount >= activeWordIds.length;
  const currentQuiz = quizWords[quizIndex % Math.max(quizWords.length, 1)];

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
    if (editingWordId) {
      const existing = words.find((w) => w.id === editingWordId);
      if (existing) {
        const updated: VocabularyDto = {
          ...existing,
          word: newWord.trim(),
          reading: newReading.trim() || newWord.trim(),
          meaning: newMeaning.trim(),
          sinoVietnamese: newHanViet.trim() || null,
          updatedAt: new Date(Math.max(Date.now(), Date.parse(existing.updatedAt) + 1)).toISOString(),
        };
        setWords((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
        if (connected) {
          const controller = new AbortController();
          void pushLibrary({ folders: [], vocabularies: [updated] }, controller.signal).catch(() => undefined);
        }
      }
      setEditingWordId(null);
    } else {
      const created: VocabularyDto = {
        ...createLocalWord(
          {
            word: newWord.trim(),
            reading: newReading.trim() || newWord.trim(),
            meaning: newMeaning.trim(),
            jlptLevel: 'N3',
          },
          folderId,
        ),
        sinoVietnamese: newHanViet.trim() || null,
      };
      setWords((prev) => [created, ...prev]);
      if (connected) {
        const controller = new AbortController();
        void pushLibrary({ folders: [], vocabularies: [created] }, controller.signal).catch(() => undefined);
      }
    }
    setNewWord('');
    setNewReading('');
    setNewMeaning('');
    setNewHanViet('');
    setAddWordOpen(false);
  };

  const handleDeleteWord = (item: VocabularyDto) => {
    const now = new Date(Math.max(Date.now(), Date.parse(item.updatedAt) + 1)).toISOString();
    const deleted: VocabularyDto = { ...item, updatedAt: now, deletedAt: now };
    setWords((prev) => prev.filter((w) => w.id !== item.id));
    if (connected) {
      const controller = new AbortController();
      void pushLibrary({ folders: [], vocabularies: [deleted] }, controller.signal).catch(() => undefined);
    }
  };

  const SAMPLE_CSV =
    'word,reading,meaning,sinoVietnamese,jlptLevel,example,exampleMeaning\n' +
    '就職,しゅうしょく,"xin được việc, đi làm",TỰU CHỨC,N3,卒業したら、日本の会社に就職したいです。,Sau khi tốt nghiệp tôi muốn xin việc ở công ty Nhật.\n' +
    '正確な,せいかくな,chính xác,CHÍNH XÁC,N3,正確な情報を伝えてください。,Hãy truyền đạt thông tin chính xác.';

  const handleDownloadSampleCsv = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob(['\uFEFF' + SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kanji_nest_template.csv';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    setImportText(SAMPLE_CSV);
  };

  const handlePickImportFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'text/tab-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      if (Platform.OS === 'web') {
        const resp = await fetch(asset.uri);
        const text = await resp.text();
        setImportText(text);
      } else {
        const text = await FileSystem.readAsStringAsync(asset.uri);
        setImportText(text);
      }
    } catch {
      // ignore picker cancel/error
    }
  };

  const handleBulkImport = () => {
    if (!importText.trim()) return;
    const rows = parseCsv(importText).filter((r) => r.some((cell) => cell.trim().length > 0));
    if (rows.length === 0) return;

    const first = rows[0].map((c) => c.trim().toLowerCase());
    const hasHeader = first.includes('word') || first.includes('meaning') || first.includes('từ');
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const createdList: VocabularyDto[] = [];
    for (const cols of dataRows) {
      const word = (cols[0] ?? '').trim();
      const reading = (cols.length >= 3 ? cols[1] : cols[0])?.trim() ?? '';
      const meaning = (cols.length >= 3 ? cols[2] : cols[1])?.trim() ?? '';
      const sinoVietnamese = (cols[3] ?? '').trim() || null;
      const rawLevel = (cols[4] ?? '').trim().toUpperCase();
      const jlptLevel = (['N1', 'N2', 'N3', 'N4', 'N5'].includes(rawLevel) ? rawLevel : 'N3') as VocabularyDto['jlptLevel'];
      const example = (cols[5] ?? '').trim() || null;
      const exampleMeaning = (cols[6] ?? '').trim() || null;
      if (!word || !meaning) continue;
      createdList.push({
        ...createLocalWord({ word, reading, meaning, jlptLevel: jlptLevel ?? 'N3' }, folderId),
        sinoVietnamese,
        example,
        exampleMeaning,
      });
    }
    if (createdList.length === 0) return;
    setWords((prev) => [...createdList, ...prev]);
    setImportText('');
    setImportOpen(false);
    if (connected) {
      const controller = new AbortController();
      void pushLibrary({ folders: [], vocabularies: createdList }, controller.signal).catch(() => undefined);
    }
  };

  const handleImportAiCards = (aiCards: AiExtractedCard[]) => {
    const targetFolderId = folderId;
    const createdList: VocabularyDto[] = aiCards
      .filter((c) => c.word.trim() && c.meaning.trim())
      .map((c) => {
        const lvl = (['N1', 'N2', 'N3', 'N4', 'N5'].includes(c.jlptLevel)
          ? c.jlptLevel
          : 'N3') as VocabularyDto['jlptLevel'];
        return {
          ...createLocalWord({ word: c.word, reading: c.reading, meaning: c.meaning, jlptLevel: lvl }, targetFolderId),
          sinoVietnamese: c.sinoVietnamese || null,
          example: c.example || null,
          exampleMeaning: c.exampleMeaning || null,
        };
      });
    if (createdList.length === 0) return;
    setWords((prev) => [...createdList, ...prev]);
    if (connected) {
      const controller = new AbortController();
      void pushLibrary({ folders: [], vocabularies: createdList }, controller.signal).catch(() => undefined);
    }
  };

  const handleFetchMnemonic = async (card: VocabularyDto) => {
    if (mnemonicMap[card.id] || mnemonicLoading) return;
    setMnemonicLoading(true);
    try {
      const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
      const res = await fetch(`${base}/ai/flashcards/mnemonic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: card.word,
          reading: card.reading,
          meaning: card.meaning,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        radicalBreakdown?: string;
        storyVi?: string;
        usageTipVi?: string;
      };
      setMnemonicMap((prev) => ({
        ...prev,
        [card.id]: {
          radicalBreakdown: data.radicalBreakdown ?? '',
          storyVi: data.storyVi ?? '',
          usageTipVi: data.usageTipVi ?? '',
        },
      }));
    } catch {
      // ignore transient AI failure
    } finally {
      setMnemonicLoading(false);
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
    recordMeaningfulStudyAction(`flashcard_rate_${rating}`);
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

  const currentQuizDirection: 'jp_to_vi' | 'vi_to_jp' =
    quizMode === 'random' ? (quizIndex % 2 === 0 ? 'jp_to_vi' : 'vi_to_jp') : quizMode;

  const handleCheckQuiz = () => {
    if (!currentQuiz || !answer.trim()) return;
    recordMeaningfulStudyAction('quiz_check');
    const normalized = answer.trim().toLowerCase();
    const targets =
      currentQuizDirection === 'jp_to_vi'
        ? [currentQuiz.meaning, currentQuiz.reading]
        : [currentQuiz.word, currentQuiz.reading];
    const valid = targets
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
      .map((s) => s.trim().toLowerCase());
    const ok = valid.some((v) => v === normalized || v.includes(normalized));
    setQuizResult(ok ? 'correct' : 'wrong');
    if (ok) setQuizScore((s) => s + 1);
  };

  const handleNextQuiz = useCallback(() => {
    setAnswer('');
    setQuizResult('idle');
    setShowHint(false);
    setQuizIndex((i) => (i + 1) % Math.max(quizWords.length, 1));
  }, [quizWords.length]);

  const handleResetQuiz = () => {
    setQuizIndex(0);
    setQuizScore(0);
    setAnswer('');
    setQuizResult('idle');
    setShowHint(false);
    if (quizShuffled) setQuizShuffleSeed((s) => s + 1);
  };

  useEffect(() => {
    if (mode !== 'quiz' || quizResult === 'idle') return;
    const sec = Number(quizAutoSecInput);
    if (!Number.isFinite(sec) || sec <= 0) return;
    const timer = setTimeout(() => {
      handleNextQuiz();
    }, sec * 1000);
    return () => clearTimeout(timer);
  }, [mode, quizResult, quizAutoSecInput, handleNextQuiz]);

  // Web keyboard shortcuts (ported from frontend/src/features/flashcard & quiz keymaps)
  const keyStateRef = useRef({
    mode,
    hasModal: folderModalOpen || optionsOpen || importOpen || aiModalOpen,
    currentCard,
    currentQuiz,
    quizResult,
    answer,
    handleRate,
    handleCheckQuiz,
    handleNextQuiz,
  });
  keyStateRef.current = {
    mode,
    hasModal: folderModalOpen || optionsOpen || importOpen || aiModalOpen,
    currentCard,
    currentQuiz,
    quizResult,
    answer,
    handleRate,
    handleCheckQuiz,
    handleNextQuiz,
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      const st = keyStateRef.current;
      if (st.hasModal || event.ctrlKey || event.altKey || event.metaKey) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      const isTyping =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(target?.isContentEditable);

      if (st.mode === 'flashcard') {
        if (isTyping || !st.currentCard) return;
        if (event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space') {
          if (tag === 'BUTTON') return;
          event.preventDefault();
          setFlipped((v) => !v);
          return;
        }
        if (event.key === 'r' || event.key === 'R' || event.code === 'KeyR') {
          event.preventDefault();
          void speakJapanese(st.currentCard.reading || st.currentCard.word);
          return;
        }
        const ratingMap: Record<string, QuizletRating> = {
          '1': 'repeat',
          '2': 'hard',
          '3': 'okay',
          '4': 'easy',
          Digit1: 'repeat',
          Digit2: 'hard',
          Digit3: 'okay',
          Digit4: 'easy',
        };
        const rating = ratingMap[event.key] ?? ratingMap[event.code];
        if (rating) {
          event.preventDefault();
          st.handleRate(rating);
        }
        return;
      }

      if (st.mode === 'quiz' && st.currentQuiz) {
        if (event.isComposing) return;
        if (event.key === 'Enter') {
          if (st.quizResult !== 'idle') {
            event.preventDefault();
            st.handleNextQuiz();
          } else if (!isTyping && st.answer.trim()) {
            event.preventDefault();
            st.handleCheckQuiz();
          }
          return;
        }
        if (event.key === 'Shift') {
          setShowHint((v) => !v);
          return;
        }
        if (!isTyping && (event.key === 'r' || event.key === 'R' || event.code === 'KeyR')) {
          event.preventDefault();
          void speakJapanese(st.currentQuiz.reading || st.currentQuiz.word);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Flashcard & Quiz"
        rightSlot={
          <View style={styles.headerRight}>
            <Pressable style={styles.ttsBtn} onPress={() => setOptionsOpen(true)} accessibilityLabel="Cài đặt">
              <Text style={styles.ttsText}>{isCompact ? '⚙' : '⚙ Cài đặt'}</Text>
            </Pressable>
            <Pressable style={styles.ttsBtn} onPress={() => void fetchFromBackend()} accessibilityLabel="Đồng bộ">
              <Text style={styles.ttsText}>{isCompact ? '↻' : '↻ Đồng bộ'}</Text>
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
          {/* Compact Today's SRS Plan + 3-Layer Segmented Progress Bar */}
          <View style={styles.srsProgressWrap}>
            <View style={styles.srsHeaderRow}>
              <Text style={styles.progressFraction}>
                {completedCount} / {activeWordIds.length} hoàn thành
              </Text>
              <View style={styles.quizletPills}>
                <View style={styles.reviewPill}>
                  <Text style={styles.reviewPillText}>Cần ôn: {dueReviewCount}</Text>
                </View>
                <View style={styles.learningBadge}>
                  <Text style={styles.learningBadgeText}>Thẻ mới: {dueNewCount}</Text>
                </View>
                <View style={styles.knownBadge}>
                  <Text style={styles.knownBadgeText}>Đã xong: {completedCount}</Text>
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
              <Pressable
                style={styles.flashcard}
                onPress={() => {
                  recordMeaningfulStudyAction('flashcard_flip');
                  setFlipped((v) => !v);
                }}
              >
                <View pointerEvents="none" style={styles.catFrameOverlay}>
                  <CatFrame color="#A89A8E" />
                </View>

                <View style={styles.cardTopRow}>
                  <View style={styles.cardTopLeft}>
                    <Text style={styles.flipTag}>⇄ BẤM ĐỂ LẬT</Text>
                    {currentCardState.stage === 'new' ? (
                      <View style={styles.newPill}>
                        <Text style={styles.newPillText}>New</Text>
                      </View>
                    ) : currentCardState.stage === 'review' ? (
                      <View style={styles.reviewPill}>
                        <Text style={styles.reviewPillText}>Review</Text>
                      </View>
                    ) : (
                      <View style={styles.learningBadge}>
                        <Text style={styles.learningBadgeText}>Đang ôn</Text>
                      </View>
                    )}
                  </View>
                  <Pressable style={styles.ttsBtn} onPress={() => speak(currentCard.reading || currentCard.word)}>
                    <Text style={styles.ttsText}>🔊 Nghe</Text>
                  </Pressable>
                </View>

                <View style={styles.cardCenter}>
                  {flipped ? (
                    <View style={styles.backBox}>
                      <View style={styles.readingRow}>
                        <Text style={styles.readingText}>
                          {options.frontSide === 'japanese' ? currentCard.reading : currentCard.word}
                        </Text>
                      </View>
                      <Text style={styles.meaningLarge}>
                        {options.frontSide === 'japanese' ? currentCard.meaning : currentCard.reading}
                      </Text>
                      {currentCard.sinoVietnamese ? (
                        <Text style={styles.hanVietText}>{currentCard.sinoVietnamese}</Text>
                      ) : null}
                      {currentCard.example ? (
                        <View style={styles.exampleBox}>
                          <Text style={styles.exampleLabel}>VÍ DỤ</Text>
                          <Text style={styles.exampleJp}>{currentCard.example}</Text>
                          {currentCard.exampleMeaning ? (
                            <Text style={styles.exampleVi}>{currentCard.exampleMeaning}</Text>
                          ) : null}
                        </View>
                      ) : null}
                      {mnemonicMap[currentCard.id] ? (
                        <View style={styles.exampleBox}>
                          <Text style={styles.exampleLabel}>MẸO NHỚ KANJI (AI)</Text>
                          {mnemonicMap[currentCard.id]!.radicalBreakdown ? (
                            <Text style={styles.exampleJp}>{mnemonicMap[currentCard.id]!.radicalBreakdown}</Text>
                          ) : null}
                          <Text style={styles.exampleVi}>{mnemonicMap[currentCard.id]!.storyVi}</Text>
                          {mnemonicMap[currentCard.id]!.usageTipVi ? (
                            <Text style={styles.exampleVi}>{mnemonicMap[currentCard.id]!.usageTipVi}</Text>
                          ) : null}
                        </View>
                      ) : (
                        <Pressable
                          style={[styles.modeToggle, { marginTop: 8 }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            void handleFetchMnemonic(currentCard);
                          }}
                        >
                          <Text style={styles.modeToggleText}>
                            {mnemonicLoading ? 'Đang tạo mẹo nhớ AI...' : 'Mẹo nhớ Kanji (AI)'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.kanjiLarge}>
                      {options.frontSide === 'japanese' ? currentCard.word : currentCard.meaning}
                    </Text>
                  )}
                </View>

                <View style={styles.cardSpacer} />
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

      {/* MODE 2: TYPING QUIZ (3 modes + Sino-Vietnamese hint + CatFrame style) */}
      {mode === 'quiz' && currentQuiz ? (
        <View style={styles.section}>
          <View style={[styles.quizCatCard, isCompact && styles.quizCatCardCompact]}>
            <View pointerEvents="none" style={styles.catFrameOverlay}>
              <CatFrame color="#A89A8E" />
            </View>

            <View style={styles.quizTopBar}>
              <View style={styles.quizModeRow}>
                {(
                  [
                    ['random', 'Ngẫu nhiên'],
                    ['jp_to_vi', isCompact ? 'Nhật → Việt' : 'Dạng 1 (Nhật → Việt)'],
                    ['vi_to_jp', isCompact ? 'Việt → Nhật' : 'Dạng 2 (Việt → Nhật)'],
                  ] as const
                ).map(([key, label]) => {
                  const active = quizMode === key;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.quizModeChip, active && styles.quizModeChipActive]}
                      onPress={() => {
                        setQuizMode(key);
                        setQuizResult('idle');
                        setAnswer('');
                        setShowHint(false);
                      }}
                    >
                      <Text style={[styles.quizModeText, active && styles.quizModeTextActive]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.quizToolsRow}>
                <Pressable
                  style={[styles.toolIconBtn, quizShuffled && styles.toolIconBtnActive]}
                  onPress={() => {
                    setQuizShuffled((v) => !v);
                    setQuizShuffleSeed((s) => s + 1);
                    setQuizIndex(0);
                    setQuizResult('idle');
                    setAnswer('');
                  }}
                  accessibilityLabel="Xáo trộn câu hỏi"
                >
                  <ShuffleIcon size={16} color={quizShuffled ? '#A64B24' : '#4A3E35'} />
                </Pressable>
                <Pressable
                  style={styles.toolIconBtn}
                  onPress={handleResetQuiz}
                  accessibilityLabel="Reset Quiz"
                >
                  <ResetIcon size={16} color="#4A3E35" />
                </Pressable>
                <View style={styles.timerBox}>
                  <ClockIcon size={15} color="#6E6055" />
                  <TextInput
                    value={quizAutoSecInput}
                    onChangeText={(val) => setQuizAutoSecInput(val.replace(/[^0-9]/g, '').slice(0, 2))}
                    keyboardType="numeric"
                    style={styles.timerInput}
                    accessibilityLabel="Số giây tự chuyển câu"
                  />
                  <Text style={styles.timerUnit}>s</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardTopRow}>
              <Text style={styles.progressText}>
                Câu {(quizIndex % activeWords.length) + 1}/{activeWords.length} · {quizScore}đ
              </Text>
              <View style={styles.headerRight}>
                <Pressable style={styles.iconPillBtn} onPress={() => setShowHint((v) => !v)}>
                  <BulbIcon size={14} color={nihongoTheme.colors.accentHover} />
                  <Text style={styles.ttsText}>{isCompact ? 'Gợi ý' : 'Gợi ý Hán Việt'}</Text>
                </Pressable>
                <Pressable style={styles.iconPillBtn} onPress={() => speak(currentQuiz.reading || currentQuiz.word)}>
                  <VolumeIcon size={14} color={nihongoTheme.colors.accentHover} />
                  {!isCompact ? <Text style={styles.ttsText}>Nghe</Text> : null}
                </Pressable>
              </View>
            </View>

            <Text style={styles.kanjiLarge}>
              {currentQuizDirection === 'jp_to_vi' ? currentQuiz.word : currentQuiz.meaning}
            </Text>

            <View style={styles.hintSlot}>
              {showHint ? (
                <View style={styles.hintBox}>
                  <Text style={styles.hintText} numberOfLines={1}>
                    💡 Âm Hán Việt:{' '}
                    {currentQuiz.sinoVietnamese
                      ? currentQuiz.sinoVietnamese
                      : currentQuiz.reading
                        ? `(Không có Hán Việt · Gợi ý chữ đầu: ${currentQuiz.reading.slice(0, 2)}…)`
                        : 'Chưa có gợi ý'}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Answer feedback directly under the question inside the CatFrame card */}
            <View style={styles.feedbackSlot}>
              {quizResult !== 'idle' ? (
                <View style={[styles.feedbackBox, quizResult === 'correct' ? styles.feedbackOk : styles.feedbackWrong]}>
                  <Text
                    style={quizResult === 'correct' ? styles.feedbackOkText : styles.feedbackWrongText}
                    numberOfLines={2}
                  >
                    {quizResult === 'correct'
                      ? `✓ Chính xác! ${currentQuiz.word} (${currentQuiz.reading}) — ${currentQuiz.meaning}`
                      : `✕ Đáp án đúng: ${currentQuiz.word} (${currentQuiz.reading}) — ${currentQuiz.meaning}`}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Input & Check button right below the CatFrame card */}
          <TextInput
            value={answer}
            onChangeText={setAnswer}
            onSubmitEditing={handleCheckQuiz}
            placeholder={currentQuizDirection === 'jp_to_vi' ? 'Nhập nghĩa tiếng Việt...' : 'Nhập từ tiếng Nhật / Kana...'}
            placeholderTextColor={nihongoTheme.colors.textMuted}
            style={styles.quizInputOutside}
          />

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

          <View style={styles.quizActions}>
            <Pressable
              style={[styles.addWordTrigger, { flex: 1 }]}
              onPress={() => {
                setEditingWordId(null);
                setNewWord('');
                setNewReading('');
                setNewMeaning('');
                setNewHanViet('');
                setImportOpen(false);
                setAddWordOpen((v) => !v);
              }}
            >
              <Text style={styles.addWordTriggerText}>{addWordOpen ? '− Đóng' : '+ Thêm từ mới'}</Text>
            </Pressable>
            <Pressable
              style={[styles.addWordTrigger, { flex: 1 }]}
              onPress={() => {
                setAddWordOpen(false);
                setImportOpen((v) => !v);
              }}
            >
              <Text style={styles.addWordTriggerText}>{importOpen ? '− Đóng Import' : 'Import CSV'}</Text>
            </Pressable>
            <Pressable
              style={[styles.addWordTrigger, { flex: 1, backgroundColor: nihongoTheme.colors.accentSoft }]}
              onPress={() => {
                setAddWordOpen(false);
                setImportOpen(false);
                setAiModalOpen(true);
              }}
            >
              <Text style={[styles.addWordTriggerText, { color: nihongoTheme.colors.accentHover }]}>
                Tạo bằng AI (Ảnh/Text)
              </Text>
            </Pressable>
          </View>

          {importOpen ? (
            <View style={styles.card}>
              <Text style={styles.optionLabel}>Import chuẩn CSV / TSV (giống Frontend)</Text>
              <Text style={styles.optionDesc}>
                Cột chuẩn: word, reading, meaning, sinoVietnamese, jlptLevel, example, exampleMeaning
              </Text>
              <View style={styles.quizModeRow}>
                <Pressable style={styles.smallPill} onPress={() => void handlePickImportFile()}>
                  <Text style={styles.smallPillText}>📂 Chọn file .csv / .txt</Text>
                </Pressable>
                <Pressable style={styles.smallPill} onPress={() => setImportText(SAMPLE_CSV)}>
                  <Text style={styles.smallPillText}>📋 Điền mẫu CSV</Text>
                </Pressable>
                <Pressable style={styles.smallPill} onPress={handleDownloadSampleCsv}>
                  <Text style={styles.smallPillText}>⬇ Tải file mẫu (.csv)</Text>
                </Pressable>
              </View>
              <TextInput
                value={importText}
                onChangeText={setImportText}
                multiline
                placeholder={SAMPLE_CSV}
                placeholderTextColor={nihongoTheme.colors.textMuted}
                style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
              />
              <Pressable style={styles.primaryBtn} onPress={handleBulkImport}>
                <Text style={styles.primaryBtnText}>Nhập danh sách vào thư mục</Text>
              </Pressable>
            </View>
          ) : null}

          {addWordOpen ? (
            <View style={styles.card}>
              <Text style={styles.optionLabel}>{editingWordId ? 'Sửa từ vựng' : 'Thêm từ mới'}</Text>
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
              <TextInput
                value={newHanViet}
                onChangeText={setNewHanViet}
                placeholder="Âm Hán Việt (không bắt buộc)"
                placeholderTextColor={nihongoTheme.colors.textMuted}
                style={styles.input}
              />
              <Pressable style={styles.primaryBtn} onPress={() => void handleAddWord()}>
                <Text style={styles.primaryBtnText}>{editingWordId ? 'Cập nhật từ' : 'Lưu từ mới'}</Text>
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
                    <View style={styles.rowActions}>
                      <Pressable style={styles.ttsBtn} onPress={() => speak(item.reading || item.word)}>
                        <Text style={styles.ttsText}>🔊</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setEditingWordId(item.id);
                          setNewWord(item.word);
                          setNewReading(item.reading ?? '');
                          setNewMeaning(item.meaning);
                          setNewHanViet(item.sinoVietnamese ?? '');
                          setImportOpen(false);
                          setAddWordOpen(true);
                        }}
                      >
                        <Text style={styles.actionText}>Sửa</Text>
                      </Pressable>
                      <Pressable onPress={() => handleDeleteWord(item)}>
                        <Text style={[styles.actionText, styles.deleteText]}>Xóa</Text>
                      </Pressable>
                    </View>
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
      <AiFlashcardModal
        visible={aiModalOpen}
        folderName={
          folderId === null
            ? 'Tất cả thư mục'
            : folders.find((f) => f.id === folderId)?.name ?? 'Thư mục hiện tại'
        }
        onClose={() => setAiModalOpen(false)}
        onImportCards={handleImportAiCards}
      />
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
  planCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 14,
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  planTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  planRow: {
    flexDirection: 'row',
    gap: 8,
  },
  planBox: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  planNumReview: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
  },
  planNumNew: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  planNumDone: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.successText,
  },
  planLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: nihongoTheme.colors.textSecondary,
    marginTop: 2,
  },
  reviewPill: {
    backgroundColor: '#DBEAFE',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reviewPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
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
    minHeight: 360,
    backgroundColor: '#FDF8F0',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#C87D55',
    padding: 22,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    ...nihongoTheme.shadow.card,
  },
  catFrameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.55,
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flipTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#7A6F66',
  },
  cardCenter: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    zIndex: 2,
  },
  cardSpacer: {
    height: 32,
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meaningLarge: {
    fontSize: 30,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    textAlign: 'center',
  },
  exampleBox: {
    marginTop: 10,
    width: '100%',
    maxWidth: 480,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: '#E6DCD1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 3,
  },
  exampleLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8C7E72',
  },
  exampleJp: {
    fontSize: 14,
    fontWeight: '600',
    color: nihongoTheme.colors.textPrimary,
  },
  exampleVi: {
    fontSize: 13,
    fontStyle: 'italic',
    color: nihongoTheme.colors.textSecondary,
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
  iconPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  ttsText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
    fontSize: 12,
  },
  kanjiLarge: {
    fontSize: 52,
    lineHeight: 64,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    textAlign: 'center',
    marginVertical: 8,
  },
  backBox: {
    alignItems: 'center',
    gap: 6,
  },
  readingText: {
    fontSize: 20,
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
  quizCatCard: {
    minHeight: 350,
    backgroundColor: '#FDF8F0',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#C87D55',
    padding: 22,
    gap: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    ...nihongoTheme.shadow.card,
  },
  quizCatCardCompact: {
    minHeight: 235,
    padding: 14,
    gap: 8,
  },
  quizTopBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  quizToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D6C7B8',
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIconBtnActive: {
    backgroundColor: '#F3D9C6',
    borderColor: '#C87D55',
  },
  toolIconText: {
    fontSize: 16,
    color: nihongoTheme.colors.textPrimary,
  },
  toolIconTextActive: {
    color: '#A64B24',
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D6C7B8',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  timerIcon: {
    fontSize: 13,
  },
  timerInput: {
    width: 30,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D6C7B8',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    paddingVertical: 0,
  },
  timerUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  quizModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quizModeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  quizModeChipActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  quizModeText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  quizModeTextActive: {
    color: '#FFFFFF',
  },
  hintSlot: {
    height: 42,
    justifyContent: 'center',
  },
  hintBox: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
  quizPromptLabel: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    textAlign: 'center',
  },
  quizInputOutside: {
    backgroundColor: '#FDF8F0',
    borderWidth: 1.5,
    borderColor: '#C87D55',
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    textAlign: 'center',
    color: nihongoTheme.colors.textPrimary,
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
  feedbackSlot: {
    height: 48,
    justifyContent: 'center',
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
