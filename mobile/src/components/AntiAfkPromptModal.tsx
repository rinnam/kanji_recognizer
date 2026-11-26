import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { nihongoTheme } from '../theme/nihongo-theme';
import { ShieldCheckIcon } from './AppIcons';
import { useAntiAfkPrompt } from '../features/study-tracker/use-study-tracker';

export function AntiAfkPromptModal() {
  const { prompt, answerPrompt, dismissPrompt } = useAntiAfkPrompt();

  if (!prompt.visible) return null;

  return (
    <Modal visible={prompt.visible} transparent animationType="fade" onRequestClose={dismissPrompt}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.badge}>
              <ShieldCheckIcon size={15} color={nihongoTheme.colors.successText} />
              <Text style={styles.badgeText}>Kiểm tra chống treo máy</Text>
            </View>
            <View style={styles.countdownPill}>
              <Text style={styles.countdownText}>{prompt.secondsLeft}s</Text>
            </View>
          </View>

          <Text style={styles.title}>Bạn vẫn đang học tập trung chứ?</Text>
          <Text style={styles.question}>{prompt.question}</Text>

          <View style={styles.choicesCol}>
            {prompt.choices.map((choice, idx) => (
              <Pressable key={choice} style={styles.choiceBtn} onPress={() => answerPrompt(idx)}>
                <Text style={styles.choiceText}>{choice}</Text>
              </Pressable>
            ))}
          </View>

          {prompt.errorHint ? <Text style={styles.errorText}>{prompt.errorHint}</Text> : null}

          <Pressable style={styles.pauseBtn} onPress={dismissPrompt}>
            <Text style={styles.pauseBtnText}>Tôi đang nghỉ — Tạm dừng đồng hồ</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 30, 30, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 20,
    gap: 12,
    ...nihongoTheme.shadow.dock,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: nihongoTheme.colors.successBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.successText,
  },
  countdownPill: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  question: {
    fontSize: 14,
    lineHeight: 20,
    color: nihongoTheme.colors.textSecondary,
    fontWeight: '600',
  },
  choicesCol: {
    gap: 8,
  },
  choiceBtn: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  pauseBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  pauseBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: nihongoTheme.colors.textMuted,
  },
});
