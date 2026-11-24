import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { nihongoTheme } from '../../theme/nihongo-theme';
import type { AnalyzedToken, ShadowingLine } from './types';
import { speakJapanese } from '../../utils/speak-japanese';
import { formatTimestamp } from './shadowing-api';

interface CurrentSentenceViewProps {
  line: ShadowingLine | null;
  onSelectToken: (token: AnalyzedToken) => void;
  onReplayLine: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
}

const POS_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  particle: { border: '#0891B2', bg: '#ECFEFF', text: '#0E7490' },
  noun: { border: '#2563EB', bg: '#EFF6FF', text: '#1D4ED8' },
  verb: { border: '#059669', bg: '#ECFDF5', text: '#047857' },
  adjective: { border: '#DB2777', bg: '#FDF2F8', text: '#BE123C' },
  adverb: { border: '#D97706', bg: '#FFFBEB', text: '#B45309' },
  conjunction: { border: '#7C3AED', bg: '#F5F3FF', text: '#6D28D9' },
  symbol: { border: '#9CA3AF', bg: '#F9FAFB', text: '#4B5563' },
  other: { border: '#6B7280', bg: '#F9FAFB', text: '#4B5563' },
};

export function CurrentSentenceView({
  line,
  onSelectToken,
  onReplayLine,
  isLooping,
  onToggleLoop,
}: CurrentSentenceViewProps) {
  const [showTable, setShowTable] = useState(false);

  if (!line) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyTitle}>Chưa có phụ đề</Text>
        <Text style={styles.emptySubtitle}>Bấm phát video hoặc chọn 1 dòng phụ đề để bắt đầu luyện nghe.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Text style={styles.timeTag}>⏱️ {formatTimestamp(line.start)} - {formatTimestamp(line.start + line.duration)}</Text>
          <Text style={styles.tokenCountTag}>{line.tokens?.length ?? 0} từ</Text>
        </View>

        <View style={styles.actionIcons}>
          <Pressable
            style={[styles.smallBtn, isLooping && styles.smallBtnActive]}
            onPress={onToggleLoop}
          >
            <Text style={[styles.smallBtnText, isLooping && styles.smallBtnTextActive]}>
              {isLooping ? '🔁 Đang lặp' : '🔁 Lặp câu'}
            </Text>
          </Pressable>

          <Pressable style={styles.smallBtn} onPress={onReplayLine}>
            <Text style={styles.smallBtnText}>↩️ Nghe lại</Text>
          </Pressable>

          <Pressable style={styles.smallBtn} onPress={() => speakJapanese(line.text)}>
            <Text style={styles.smallBtnText}>🔊 Đọc mẫu</Text>
          </Pressable>
        </View>
      </View>

      {/* Main interactive sentence with furigana */}
      <View style={styles.sentenceBox}>
        <View style={styles.tokenRow}>
          {line.tokens && line.tokens.length > 0 ? (
            line.tokens.map((token, index) => {
              const posStyle = POS_COLORS[token.pos] || POS_COLORS.other;
              const hasReading = token.reading && token.reading !== token.surface;

              return (
                <Pressable
                  key={`${index}-${token.surface}`}
                  style={[
                    styles.tokenItem,
                    { borderBottomColor: posStyle.border },
                  ]}
                  onPress={() => onSelectToken(token)}
                >
                  <Text style={styles.readingText}>
                    {hasReading ? token.reading : ' '}
                  </Text>
                  <Text style={styles.surfaceText}>{token.surface}</Text>
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.rawText}>{line.text}</Text>
          )}
        </View>
      </View>

      {/* Toggle table button */}
      <View style={styles.footerRow}>
        <Pressable
          style={styles.toggleTableBtn}
          onPress={() => setShowTable((prev) => !prev)}
        >
          <Text style={styles.toggleTableText}>
            {showTable ? '▲ Thu gọn phân tích từ' : '▼ Bảng chi tiết từ loại & dạng gốc'}
          </Text>
        </Pressable>
      </View>

      {/* Morphological Analysis Table */}
      {showTable && line.tokens && line.tokens.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.tableCell, styles.cellIndex]}>#</Text>
              <Text style={[styles.tableCell, styles.cellWord]}>Từ</Text>
              <Text style={[styles.tableCell, styles.cellReading]}>Cách đọc</Text>
              <Text style={[styles.tableCell, styles.cellBase]}>Dạng gốc</Text>
              <Text style={[styles.tableCell, styles.cellPos]}>Loại từ</Text>
            </View>
            {line.tokens.map((token, idx) => {
              const posStyle = POS_COLORS[token.pos] || POS_COLORS.other;
              return (
                <Pressable
                  key={idx}
                  style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                  onPress={() => onSelectToken(token)}
                >
                  <Text style={[styles.tableCell, styles.cellIndex]}>{idx + 1}</Text>
                  <Text style={[styles.tableCell, styles.cellWord, { fontWeight: '700' }]}>{token.surface}</Text>
                  <Text style={[styles.tableCell, styles.cellReading]}>{token.reading || '—'}</Text>
                  <Text style={[styles.tableCell, styles.cellBase]}>{token.base || token.surface}</Text>
                  <View style={styles.cellPos}>
                    <View style={[styles.posChip, { backgroundColor: posStyle.bg }]}>
                      <Text style={[styles.posChipText, { color: posStyle.text }]}>{token.posRaw || token.pos}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    ...nihongoTheme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeTag: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.accent,
    backgroundColor: nihongoTheme.colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: nihongoTheme.radius.pill,
  },
  tokenCountTag: {
    fontSize: 12,
    fontWeight: '600',
    color: nihongoTheme.colors.textSecondary,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: nihongoTheme.radius.pill,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 6,
  },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  smallBtnActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  smallBtnTextActive: {
    color: '#FFFFFF',
  },
  sentenceBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    minHeight: 80,
    justifyContent: 'center',
  },
  tokenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 4,
  },
  tokenItem: {
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 2,
    borderBottomWidth: 2,
    borderRadius: 4,
  },
  readingText: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.accent,
    lineHeight: 14,
    minHeight: 14,
  },
  surfaceText: {
    fontSize: 20,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    lineHeight: 28,
  },
  rawText: {
    fontSize: 20,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
    lineHeight: 28,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: nihongoTheme.colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  toggleTableBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  toggleTableText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.accent,
  },
  tableScroll: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: nihongoTheme.colors.borderLight,
    paddingTop: 8,
  },
  table: {
    minWidth: 500,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: nihongoTheme.colors.borderLight,
  },
  tableHeaderRow: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: 8,
  },
  tableRowAlt: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
  },
  tableCell: {
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
  },
  cellIndex: { width: 36, color: nihongoTheme.colors.textMuted },
  cellWord: { width: 110 },
  cellReading: { width: 110, color: nihongoTheme.colors.accent },
  cellBase: { width: 110 },
  cellPos: { flex: 1 },
  posChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: nihongoTheme.radius.pill,
  },
  posChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
