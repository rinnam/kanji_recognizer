import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { HandwritingModal } from '../../src/features/handwriting/HandwritingModal';

const TABS = [
  { key: 'words', label: 'Từ vựng' },
  { key: 'kanji', label: 'Hán tự' },
  { key: 'videos', label: 'Video' },
] as const;

export default function LookupScreen() {
  const params = useLocalSearchParams<{ q?: string; kind?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [activeTab, setActiveTab] = useState<'words' | 'kanji' | 'videos'>(
    params.kind === 'kanji' || params.kind === 'videos' ? params.kind : 'words',
  );
  const [handwritingOpen, setHandwritingOpen] = useState(false);

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Tra cứu" subtitle="Từ điển Nhật - Việt, Hán tự và ví dụ video" />

      <View style={styles.searchCard}>
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Nhập Kanji, Kana, Romaji hoặc tiếng Việt..."
            placeholderTextColor={nihongoTheme.colors.textMuted}
            style={styles.input}
          />
          <Pressable style={styles.handwritingBtn} onPress={() => setHandwritingOpen(true)}>
            <Text style={styles.handwritingText}>Viết tay</Text>
          </Pressable>
        </View>

        <View style={styles.tabsRow}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>
          {query.trim() ? `Chưa có dữ liệu tra cứu cho "${query.trim()}"` : 'Lịch sử tra cứu'}
        </Text>
        <Text style={styles.emptyDesc}>
          {query.trim()
            ? 'Giao diện đang ở trạng thái chưa đổ dữ liệu từ điển.'
            : 'Các từ vựng, Hán tự bạn tra gần đây sẽ hiển thị tại đây.'}
        </Text>
      </View>

      <HandwritingModal
        visible={handwritingOpen}
        onClose={() => setHandwritingOpen(false)}
        onSelectKanji={(kanji) => {
          setQuery(kanji);
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
  handwritingBtn: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
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
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  tabPillActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 28,
    alignItems: 'center',
    gap: 6,
    ...nihongoTheme.shadow.card,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    textAlign: 'center',
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
    maxWidth: 460,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  closeText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
  },
  canvasBox: {
    height: 220,
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: nihongoTheme.colors.borderWarm,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasHint: {
    color: nihongoTheme.colors.textMuted,
    fontSize: 13,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  outlineBtnText: {
    fontWeight: '700',
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
  },
  candidatesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  candidateChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: nihongoTheme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candidateText: {
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
  },
});
