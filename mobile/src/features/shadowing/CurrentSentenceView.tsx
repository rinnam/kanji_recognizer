import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { nihongoTheme } from '../../theme/nihongo-theme';
import type { AnalyzedToken, ShadowingLine } from './types';
import { speakJapanese } from '../../utils/speak-japanese';
import { formatTimestamp, translateJapaneseApi } from './shadowing-api';
import { ClockIcon, RepeatIcon, ResetIcon, VolumeIcon } from '../../components/AppIcons';

interface CurrentSentenceViewProps {
  line: ShadowingLine | null;
  onSelectToken: (token: AnalyzedToken) => void;
  onReplayLine: () => void;
  onBeforeSpeak?: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  showTranslation?: boolean;
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

const POS_VI_MAP: Record<string, string> = {
  名詞: 'Danh từ',
  代名詞: 'Đại từ',
  固有名詞: 'Danh từ riêng',
  サ変接続: 'Kết hợp する',
  形容動詞語幹: 'Tính từ な',
  数: 'Số từ',
  接尾: 'Hậu tố',
  非自立: 'Phụ thuộc',
  自立: 'Độc lập',
  一般: 'Thông thường',
  動詞: 'Động từ',
  助動詞: 'Trợ động từ',
  助詞: 'Trợ từ',
  格助詞: 'Cách',
  接続助詞: 'Nối câu',
  終助詞: 'Cuối câu',
  係助詞: 'Nhấn mạnh',
  副助詞: 'Phó trợ từ',
  連体化: 'Bổ nghĩa',
  並立助詞: 'Liệt kê',
  形容詞: 'Tính từ い',
  副詞: 'Phó từ',
  接続詞: 'Liên từ',
  連体詞: 'Định từ',
  感動詞: 'Thán từ',
  接頭詞: 'Tiền tố',
  フィラー: 'Từ đệm',
  記号: 'Ký hiệu',
  読点: 'Dấu phẩy',
  句点: 'Dấu chấm',
  括弧開: 'Mở ngoặc',
  括弧閉: 'Đóng ngoặc',
  空白: 'Khoảng trắng',
};

const POS_FALLBACK_VI: Record<string, string> = {
  particle: 'Trợ từ',
  noun: 'Danh từ',
  verb: 'Động từ',
  adjective: 'Tính từ',
  adverb: 'Phó từ',
  conjunction: 'Liên từ',
  symbol: 'Ký hiệu',
  other: 'Khác',
};

function formatPosVietnamese(posRaw?: string, pos?: string): string {
  if (!posRaw) return POS_FALLBACK_VI[pos ?? 'other'] ?? 'Khác';
  const parts = posRaw
    .split(/[·・,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p && p !== '*');
  const translated = parts.map((p) => POS_VI_MAP[p] ?? p);
  return translated.length > 0 ? translated.join(' · ') : (POS_FALLBACK_VI[pos ?? 'other'] ?? 'Khác');
}

export function CurrentSentenceView({
  line,
  onSelectToken,
  onReplayLine,
  onBeforeSpeak,
  isLooping,
  onToggleLoop,
  showTranslation = true,
}: CurrentSentenceViewProps) {
  const [translation, setTranslation] = useState<string>('');
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (!showTranslation || !line?.text) {
      setTranslation('');
      return;
    }
    const controller = new AbortController();
    setTranslating(true);
    void translateJapaneseApi(line.text, controller.signal)
      .then((vi) => setTranslation(vi))
      .catch(() => setTranslation(''))
      .finally(() => setTranslating(false));
    return () => controller.abort();
  }, [line?.text, showTranslation]);

  if (!line) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyTitle}>Chưa có phụ đề</Text>
        <Text style={styles.emptySubtitle}>Bấm phát video hoặc chọn 1 dòng phụ đề để bắt đầu luyện nghe.</Text>
      </View>
    );
  }

  const visibleTokens = (line.tokens ?? []).filter((t) => t.surface.trim().length > 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={[styles.timeTag, { flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
            <ClockIcon size={13} color={nihongoTheme.colors.accentHover} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.accentHover }}>
              {formatTimestamp(line.start)} - {formatTimestamp(line.start + line.duration)}
            </Text>
          </View>
        </View>

        <View style={styles.actionIcons}>
          <Pressable
            style={[styles.smallIconBtn, isLooping && styles.smallBtnActive]}
            onPress={onToggleLoop}
            accessibilityLabel={isLooping ? 'Tắt lặp câu' : 'Lặp câu'}
          >
            <RepeatIcon size={15} color={isLooping ? '#FFFFFF' : '#6E6055'} />
          </Pressable>

          <Pressable
            style={styles.smallIconBtn}
            onPress={onReplayLine}
            accessibilityLabel="Nghe lại câu này"
          >
            <ResetIcon size={15} color="#6E6055" />
          </Pressable>

          <Pressable
            style={styles.smallIconBtn}
            onPress={() => {
              onBeforeSpeak?.();
              speakJapanese(line.text);
            }}
            accessibilityLabel="Đọc mẫu tiếng Nhật"
          >
            <VolumeIcon size={15} color={nihongoTheme.colors.accentHover} />
          </Pressable>
        </View>
      </View>

      {/* Main interactive sentence with furigana */}
      <View style={styles.sentenceBox}>
        <View style={styles.tokenRow}>
          {visibleTokens.length > 0 ? (
            visibleTokens.map((token, index) => {
              const posStyle = POS_COLORS[token.pos] || POS_COLORS.other;
              const hasReading = token.reading && token.reading !== token.surface;

              return (
                <Pressable
                  key={`${index}-${token.surface}`}
                  style={[
                    styles.tokenItem,
                    { borderBottomColor: posStyle.border, backgroundColor: posStyle.bg },
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
        {showTranslation ? (
          <Text style={styles.translationText}>
            {translating ? 'Đang dịch tiếng Việt…' : translation || 'Chưa có bản dịch'}
          </Text>
        ) : null}
      </View>
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
  smallIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    justifyContent: 'center',
    alignItems: 'center',
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
    overflow: 'hidden',
  },
  tokenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 4,
    width: '100%',
  },
  tokenItem: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderBottomWidth: 3,
    borderRadius: 6,
    maxWidth: '100%',
    flexShrink: 1,
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
  translationText: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: nihongoTheme.colors.borderWarm,
    fontSize: 14,
    fontStyle: 'italic',
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 20,
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
