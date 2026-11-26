import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FolderDto, VocabularyDto } from '../../../packages/contracts/src/study';
import { nihongoTheme } from '../theme/nihongo-theme';
import { getUserScopedKey } from '../features/auth/auth-store';
import {
  buildFolderDeckOptions,
  countDeckMatches,
  DEFAULT_GAME_DECK_SELECTION,
  type GameDeckSelection,
  type SrsFocusMode,
} from '../features/games/use-game-vocab';
import { recordMeaningfulStudyAction } from '../features/study-tracker/use-study-tracker';

const GAME_DECK_STORAGE_KEY = 'kanji_smart_last_game_deck_v1';
const JLPT_OPTIONS = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'] as const;
const LIMIT_OPTIONS = [
  { value: 10, label: '10 từ' },
  { value: 20, label: '20 từ' },
  { value: 30, label: '30 từ' },
  { value: 50, label: '50 từ' },
  { value: 0, label: 'Cả bộ' },
] as const;

export async function loadSavedGameDeckSelection(): Promise<GameDeckSelection> {
  try {
    const key = await getUserScopedKey(GAME_DECK_STORAGE_KEY);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return DEFAULT_GAME_DECK_SELECTION;
    const parsed = JSON.parse(raw) as Partial<GameDeckSelection>;
    const folderIds = Array.isArray(parsed.folderIds)
      ? parsed.folderIds.filter((x): x is string => typeof x === 'string')
      : [];
    const jlptLevel = typeof parsed.jlptLevel === 'string' ? parsed.jlptLevel : 'ALL';
    const srsFocus: SrsFocusMode =
      parsed.srsFocus === 'due' || parsed.srsFocus === 'new_learning' ? parsed.srsFocus : 'all';
    const limitCount =
      typeof parsed.limitCount === 'number' && Number.isFinite(parsed.limitCount) && parsed.limitCount >= 0
        ? parsed.limitCount
        : 20;
    return { folderIds, jlptLevel, srsFocus, limitCount };
  } catch {
    return DEFAULT_GAME_DECK_SELECTION;
  }
}

export async function saveGameDeckSelection(sel: GameDeckSelection): Promise<void> {
  try {
    const key = await getUserScopedKey(GAME_DECK_STORAGE_KEY);
    await AsyncStorage.setItem(key, JSON.stringify(sel));
  } catch {
    // ignore storage errors
  }
}

interface GameDeckSelectorProps {
  words: readonly VocabularyDto[];
  folders: readonly FolderDto[];
  value: GameDeckSelection;
  onChange: (next: GameDeckSelection) => void;
  accentColor?: string;
}

export function GameDeckSelector({
  words,
  folders,
  value,
  onChange,
  accentColor = nihongoTheme.colors.accent,
}: GameDeckSelectorProps) {
  const [folderQuery, setFolderQuery] = useState('');

  const folderOptions = useMemo(
    () => buildFolderDeckOptions(folders, words),
    [folders, words],
  );

  // Strip deleted/stale persisted folder IDs automatically once folders have loaded
  useEffect(() => {
    if (value.folderIds.length === 0) return;
    const validIds = new Set(folderOptions.map((o) => o.id));
    const cleaned = value.folderIds.filter((id) => validIds.has(id));
    if (cleaned.length !== value.folderIds.length) {
      onChange({ ...value, folderIds: cleaned });
    }
  }, [folderOptions, value, onChange]);

  const filteredFolderOptions = useMemo(() => {
    const q = folderQuery.trim().toLowerCase();
    if (!q) return folderOptions;
    return folderOptions.filter((o) => o.fullPath.toLowerCase().includes(q));
  }, [folderOptions, folderQuery]);

  const allValidCount = useMemo(
    () =>
      countDeckMatches(
        words,
        { folderIds: [], jlptLevel: 'ALL', srsFocus: 'all', limitCount: 0 },
        folders,
      ),
    [words, folders],
  );

  const jlptCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const lv of JLPT_OPTIONS) {
      map[lv] = countDeckMatches(
        words,
        { folderIds: value.folderIds, jlptLevel: lv, srsFocus: 'all', limitCount: 0 },
        folders,
      );
    }
    return map;
  }, [words, folders, value.folderIds]);

  const srsCounts = useMemo(() => {
    const base = { folderIds: value.folderIds, jlptLevel: value.jlptLevel, limitCount: 0 };
    return {
      all: countDeckMatches(words, { ...base, srsFocus: 'all' }, folders),
      due: countDeckMatches(words, { ...base, srsFocus: 'due' }, folders),
      new_learning: countDeckMatches(words, { ...base, srsFocus: 'new_learning' }, folders),
    };
  }, [words, folders, value.folderIds, value.jlptLevel]);

  const matchedCount = useMemo(
    () => countDeckMatches(words, value, folders),
    [words, folders, value],
  );

  const effectiveCount =
    value.limitCount > 0 ? Math.min(value.limitCount, matchedCount) : matchedCount;

  const updateSelection = (patch: Partial<GameDeckSelection>) => {
    recordMeaningfulStudyAction('game_deck_filter');
    onChange({ ...value, ...patch });
  };

  const toggleFolder = (folderId: string) => {
    const exists = value.folderIds.includes(folderId);
    const nextIds = exists
      ? value.folderIds.filter((id) => id !== folderId)
      : [...value.folderIds, folderId];
    updateSelection({ folderIds: nextIds });
  };

  return (
    <View style={styles.container}>
      {/* 1. Folder / Deck Selector */}
      <View style={styles.sectionBlock}>
        <Text style={styles.label}>
          1. Chọn bộ từ / Thư mục học ({value.folderIds.length === 0 ? 'Tất cả' : `${value.folderIds.length} bộ`})
        </Text>

        {folderOptions.length > 6 ? (
          <TextInput
            value={folderQuery}
            onChangeText={setFolderQuery}
            placeholder="Tìm bộ từ / bài học..."
            placeholderTextColor={nihongoTheme.colors.textMuted}
            style={styles.searchInput}
          />
        ) : null}

        <ScrollView
          style={folderOptions.length > 6 ? styles.folderScroll : undefined}
          nestedScrollEnabled
          contentContainerStyle={styles.row}
        >
          <Pressable
            style={[
              styles.chip,
              value.folderIds.length === 0 && { backgroundColor: accentColor },
            ]}
            onPress={() => updateSelection({ folderIds: [] })}
          >
            <Text
              style={[
                styles.chipText,
                value.folderIds.length === 0 && styles.chipTextActive,
              ]}
            >
              Tất cả bộ từ ({allValidCount})
            </Text>
          </Pressable>

          {filteredFolderOptions.map((opt) => {
            const active = value.folderIds.includes(opt.id);
            return (
              <Pressable
                key={opt.id}
                style={[styles.chip, active && { backgroundColor: accentColor }]}
                onPress={() => toggleFolder(opt.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {opt.fullPath} ({opt.count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {folderOptions.length === 0 ? (
          <Text style={styles.hintText}>
            Chưa có thư mục riêng — bạn có thể chia nhóm theo cấp JLPT và số lượng từ bên dưới.
          </Text>
        ) : null}
      </View>

      {/* 2. JLPT Filter within selected folders */}
      <View style={styles.sectionBlock}>
        <Text style={styles.label}>2. Lọc cấp JLPT (trong bộ đang chọn)</Text>
        <View style={styles.row}>
          {JLPT_OPTIONS.map((lv) => {
            const active = value.jlptLevel === lv;
            const cnt = jlptCounts[lv] ?? 0;
            return (
              <Pressable
                key={lv}
                style={[styles.chip, active && { backgroundColor: accentColor }]}
                onPress={() => updateSelection({ jlptLevel: lv })}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {lv === 'ALL' ? `Tất cả (${cnt})` : `${lv} (${cnt})`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 3. SRS Focus */}
      <View style={styles.sectionBlock}>
        <Text style={styles.label}>3. Trọng tâm ôn (SRS)</Text>
        <View style={styles.row}>
          {(
            [
              ['all', `Tất cả trong bộ (${srsCounts.all})`],
              ['due', `Đến hạn ôn SRS (${srsCounts.due})`],
              ['new_learning', `Từ mới / chưa thuộc (${srsCounts.new_learning})`],
            ] as const
          ).map(([modeKey, modeLabel]) => {
            const active = value.srsFocus === modeKey;
            return (
              <Pressable
                key={modeKey}
                style={[styles.chip, active && { backgroundColor: accentColor }]}
                onPress={() => updateSelection({ srsFocus: modeKey })}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{modeLabel}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 4. Focused Batch Limit */}
      <View style={styles.sectionBlock}>
        <Text style={styles.label}>4. Số từ học lượt này (chia nhỏ để nhớ sâu)</Text>
        <View style={styles.row}>
          {LIMIT_OPTIONS.map((opt) => {
            const active = value.limitCount === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.chip, active && { backgroundColor: accentColor }]}
                onPress={() => updateSelection({ limitCount: opt.value })}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 5. Live Match Preview Banner */}
      {matchedCount > 0 ? (
        <View style={styles.previewOk}>
          <Text style={styles.previewOkText}>
            Sẵn sàng: {effectiveCount} từ sẽ đưa vào lượt chơi (trên tổng {matchedCount} từ khớp bộ lọc)
          </Text>
        </View>
      ) : (
        <View style={styles.previewEmpty}>
          <Text style={styles.previewEmptyText}>
            Không có từ nào khớp bộ lọc hiện tại.
          </Text>
          <Pressable
            style={styles.resetFilterBtn}
            onPress={() => onChange(DEFAULT_GAME_DECK_SELECTION)}
          >
            <Text style={styles.resetFilterText}>Đặt lại bộ lọc</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  sectionBlock: {
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.textSecondary,
  },
  searchInput: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
  },
  folderScroll: {
    maxHeight: 165,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  hintText: {
    fontSize: 12,
    color: nihongoTheme.colors.textMuted,
    fontStyle: 'italic',
  },
  previewOk: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  previewOkText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: nihongoTheme.colors.successText,
  },
  previewEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: nihongoTheme.colors.warningBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  previewEmptyText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: nihongoTheme.colors.warningText,
  },
  resetFilterBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: nihongoTheme.radius.pill,
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resetFilterText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#B45309',
  },
});
