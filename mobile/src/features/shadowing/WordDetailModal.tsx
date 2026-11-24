import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { nihongoTheme } from '../../theme/nihongo-theme';
import type { AnalyzedToken } from './types';
import { speakJapanese } from '../../utils/speak-japanese';

interface WordDetailModalProps {
  token: AnalyzedToken | null;
  onClose: () => void;
}

const POS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  noun: { label: 'Danh từ (名詞)', color: '#2563EB', bg: '#EFF6FF' },
  verb: { label: 'Động từ (動詞)', color: '#059669', bg: '#ECFDF5' },
  adjective: { label: 'Tính từ (形容詞)', color: '#DB2777', bg: '#FDF2F8' },
  particle: { label: 'Trợ từ (助詞)', color: '#0891B2', bg: '#ECFEFF' },
  adverb: { label: 'Phó từ (副詞)', color: '#D97706', bg: '#FFFBEB' },
  conjunction: { label: 'Liên từ (接続詞)', color: '#7C3AED', bg: '#F5F3FF' },
  symbol: { label: 'Ký hiệu (記号)', color: '#4B5563', bg: '#F3F4F6' },
  other: { label: 'Khác', color: '#6B7280', bg: '#F9FAFB' },
};

export function WordDetailModal({ token, onClose }: WordDetailModalProps) {
  if (!token) return null;

  const posInfo = POS_LABELS[token.pos] || POS_LABELS.other;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleCol}>
            <Text style={styles.surface}>{token.surface}</Text>
            {token.reading && token.reading !== token.surface ? (
              <Text style={styles.reading}>{token.reading}</Text>
            ) : null}
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={[styles.posBadge, { backgroundColor: posInfo.bg }]}>
          <Text style={[styles.posText, { color: posInfo.color }]}>{posInfo.label}</Text>
          {token.posRaw ? <Text style={styles.posRaw}>• {token.posRaw}</Text> : null}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dạng từ điển:</Text>
          <Text style={styles.infoValue}>{token.base || token.surface}</Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={styles.ttsBtn}
            onPress={() => speakJapanese(token.surface)}
          >
            <Text style={styles.ttsIcon}>🔊</Text>
            <Text style={styles.ttsText}>Nghe phát âm</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    ...nihongoTheme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
    gap: 2,
  },
  surface: {
    fontSize: 28,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  reading: {
    fontSize: 15,
    fontWeight: '600',
    color: nihongoTheme.colors.accent,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  posBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: nihongoTheme.radius.pill,
    gap: 6,
  },
  posText: {
    fontSize: 13,
    fontWeight: '700',
  },
  posRaw: {
    fontSize: 12,
    color: nihongoTheme.colors.textMuted,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: nihongoTheme.colors.borderLight,
  },
  infoLabel: {
    fontSize: 14,
    color: nihongoTheme.colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: nihongoTheme.colors.textPrimary,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  ttsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nihongoTheme.colors.accentSoft,
    paddingVertical: 10,
    borderRadius: nihongoTheme.radius.button,
    gap: 6,
  },
  ttsIcon: {
    fontSize: 16,
  },
  ttsText: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.accent,
  },
});
