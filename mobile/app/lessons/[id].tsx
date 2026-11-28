import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import {
  DownloadIcon,
  LinkExternalIcon,
  LockClosedIcon,
  VolumeIcon,
} from '../../src/components/AppIcons';
import { TopHeader } from '../../src/components/TopHeader';
import { getCachedAuthSession, readAuthSession } from '../../src/features/auth/auth-store';
import {
  buildMaterialFileUrl,
  fetchPublicLessonDetail,
  saveLessonToFlashcardsApi,
  type LessonMaterialDto,
  type PublicLessonDetailResponse,
} from '../../src/features/lessons/lessons-api';
import { recordMeaningfulStudyAction } from '../../src/features/study-tracker/use-study-tracker';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { speakJapanese } from '../../src/utils/speak-japanese';

function openExternalUrl(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  void Linking.openURL(url);
}

function formatBytes(size: number | null): string {
  if (!size || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [hideMeaning, setHideMeaning] = useState(false);
  const [detail, setDetail] = useState<PublicLessonDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savingFlashcards, setSavingFlashcards] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchPublicLessonDetail(id);
      setDetail(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được nội dung bài học.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail]),
  );

  const handleOpenMaterial = async (mat: LessonMaterialDto) => {
    recordMeaningfulStudyAction('lesson_material_open');
    if (mat.materialType === 'link' && mat.externalUrl) {
      openExternalUrl(mat.externalUrl);
      return;
    }
    const session = getCachedAuthSession() ?? (await readAuthSession());
    openExternalUrl(buildMaterialFileUrl(mat.id, session?.accessToken ?? null));
  };

  const handleSaveToFlashcards = async () => {
    if (!id || savingFlashcards) return;
    setSavingFlashcards(true);
    setErrorMsg(null);
    setSavedFeedback(null);
    try {
      const res = await saveLessonToFlashcardsApi(id);
      recordMeaningfulStudyAction('lesson_save_flashcards');
      setSavedFeedback(
        `Đã lưu ${res.addedCount} từ vào thư mục "${res.folderName}"${
          res.skippedCount > 0 ? ` (${res.skippedCount} từ đã có sẵn)` : ''
        }.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không lưu được vào Flashcard.');
    } finally {
      setSavingFlashcards(false);
    }
  };

  const lesson = detail?.lesson;

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title={lesson?.title ?? 'Chi tiết bài học'}
        subtitle={
          lesson
            ? `${lesson.jlptLevel} · ${lesson.category} · ${lesson.itemCount} từ vựng`
            : 'Thư viện bài học'
        }
        rightSlot={
          <Pressable
            style={styles.primaryPill}
            onPress={() => router.push('/practice/flashcard-quiz')}
          >
            <Text style={styles.primaryPillText}>Flashcard</Text>
          </Pressable>
        }
      />

      {errorMsg ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centerCard}>
          <ActivityIndicator color={nihongoTheme.colors.accent} />
          <Text style={styles.emptyDesc}>Đang tải nội dung bài học...</Text>
        </View>
      ) : !detail || !lesson ? (
        <View style={styles.centerCard}>
          <Text style={styles.emptyTitle}>Không tìm thấy bài học</Text>
          <Pressable style={styles.outlineBtn} onPress={() => router.replace('/lessons')}>
            <Text style={styles.outlineBtnText}>Quay lại danh sách bài học</Text>
          </Pressable>
        </View>
      ) : detail.locked ? (
        <View style={styles.centerCard}>
          <LockClosedIcon size={28} color={nihongoTheme.colors.accentHover} />
          <Text style={styles.emptyTitle}>
            Bài học dành cho gói {lesson.accessTier === 'pro' ? 'Pro AI' : 'Plus'} trở lên
          </Text>
          <Text style={styles.emptyDesc}>
            Nâng cấp tài khoản để xem trọn bộ {lesson.itemCount} từ vựng và {lesson.materialCount} tài liệu đính kèm của bài học này.
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.push('/billing?tab=plans')}
          >
            <Text style={styles.primaryBtnText}>Xem gói sử dụng →</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.contentGap}>
          {/* Summary & Lecture Notes */}
          {lesson.summary || lesson.contentMd ? (
            <View style={styles.card}>
              {lesson.summary ? <Text style={styles.summaryText}>{lesson.summary}</Text> : null}
              {lesson.contentMd ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Ghi chú bài giảng</Text>
                  <Text style={styles.notesBody}>{lesson.contentMd}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Attached Materials */}
          {detail.materials.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Tài liệu đính kèm ({detail.materials.length})
              </Text>
              <View style={styles.listGap}>
                {detail.materials.map((m) => (
                  <Pressable
                    key={m.id}
                    style={styles.materialRow}
                    onPress={() => void handleOpenMaterial(m)}
                  >
                    <View style={styles.materialIcon}>
                      {m.materialType === 'file' ? (
                        <DownloadIcon size={17} color={nihongoTheme.colors.accentHover} />
                      ) : (
                        <LinkExternalIcon size={17} color={nihongoTheme.colors.accentHover} />
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.materialTitle}>{m.title}</Text>
                      <Text style={styles.materialSub}>
                        {m.materialType === 'file'
                          ? `${m.fileName ?? 'Tệp tài liệu'}${formatBytes(m.fileSize) ? ` · ${formatBytes(m.fileSize)}` : ''}`
                          : m.externalUrl}
                        {m.description ? ` · ${m.description}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.openMatText}>
                      {m.materialType === 'file' ? 'Tải / Xem' : 'Mở link'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* Controls Bar: Hide Meaning + Save to Flashcards */}
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Ẩn nghĩa để tự ôn</Text>
              <Switch
                value={hideMeaning}
                onValueChange={(val) => {
                  recordMeaningfulStudyAction('lesson_toggle');
                  setHideMeaning(val);
                }}
                trackColor={{ false: '#E5DDD4', true: nihongoTheme.colors.accent }}
              />
            </View>

            {detail.items.length > 0 ? (
              <Pressable
                style={[styles.primaryBtn, savingFlashcards && styles.disabledBtn]}
                disabled={savingFlashcards}
                onPress={() => void handleSaveToFlashcards()}
              >
                <Text style={styles.primaryBtnText}>
                  {savingFlashcards
                    ? 'Đang lưu vào Flashcard...'
                    : `+ Lưu ${detail.items.length} từ vào Flashcard`}
                </Text>
              </Pressable>
            ) : null}

            {savedFeedback ? (
              <View style={styles.savedBox}>
                <Text style={styles.savedText}>{savedFeedback}</Text>
                <Pressable onPress={() => router.push('/practice/flashcard-quiz')}>
                  <Text style={styles.savedLink}>Mở Flashcard ngay →</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Vocabulary Items List */}
          {detail.items.length === 0 ? (
            <View style={styles.centerCard}>
              <Text style={styles.emptyTitle}>Chưa có từ vựng trong bài học này</Text>
              <Text style={styles.emptyDesc}>
                Danh sách từ vựng cho bài học này đang được cập nhật.
              </Text>
            </View>
          ) : (
            <View style={styles.listGap}>
              {detail.items.map((item) => (
                <View key={item.id} style={styles.vocabCard}>
                  <View style={styles.vocabTop}>
                    <View style={styles.vocabHeadLeft}>
                      <Text style={styles.vocabWord}>{item.word}</Text>
                      {item.reading && item.reading !== item.word ? (
                        <Text style={styles.vocabReading}>{item.reading}</Text>
                      ) : null}
                      {item.sinoVietnamese ? (
                        <View style={styles.sinoBadge}>
                          <Text style={styles.sinoBadgeText}>{item.sinoVietnamese}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Pressable
                      style={styles.ttsBtn}
                      onPress={() => {
                        recordMeaningfulStudyAction('lesson_tts');
                        void speakJapanese(item.reading || item.word);
                      }}
                    >
                      <VolumeIcon size={16} color={nihongoTheme.colors.accentHover} />
                    </Pressable>
                  </View>

                  {!hideMeaning ? (
                    <>
                      <Text style={styles.vocabMeaning}>{item.meaning}</Text>
                      {item.example ? (
                        <View style={styles.exampleBox}>
                          <Text style={styles.exampleJa}>{item.example}</Text>
                          {item.exampleMeaning ? (
                            <Text style={styles.exampleVi}>{item.exampleMeaning}</Text>
                          ) : null}
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.hiddenHint}>Nghĩa đang được ẩn</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  contentGap: { gap: 14 },
  primaryPill: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  primaryPillText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  centerCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: nihongoTheme.colors.textPrimary, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: nihongoTheme.colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: nihongoTheme.colors.textPrimary },
  summaryText: { fontSize: 14, color: nihongoTheme.colors.textPrimary, lineHeight: 20 },
  notesBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    gap: 4,
  },
  notesLabel: { fontSize: 12, fontWeight: '800', color: nihongoTheme.colors.textSecondary },
  notesBody: { fontSize: 13, color: nihongoTheme.colors.textPrimary, lineHeight: 20 },
  listGap: { gap: 10 },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderLight,
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
  },
  materialIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: nihongoTheme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialTitle: { fontSize: 14, fontWeight: '700', color: nihongoTheme.colors.textPrimary },
  materialSub: { fontSize: 12, color: nihongoTheme.colors.textSecondary },
  openMatText: { fontSize: 12, fontWeight: '800', color: nihongoTheme.colors.accentHover },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: nihongoTheme.colors.textPrimary },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.6 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  outlineBtnText: { fontSize: 13, fontWeight: '700', color: nihongoTheme.colors.textPrimary },
  savedBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: nihongoTheme.radius.md,
    padding: 10,
    gap: 4,
  },
  savedText: { fontSize: 13, fontWeight: '600', color: '#1B873F' },
  savedLink: { fontSize: 13, fontWeight: '800', color: nihongoTheme.colors.accentHover },
  vocabCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 8,
    ...nihongoTheme.shadow.card,
  },
  vocabTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  vocabHeadLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  vocabWord: { fontSize: 20, fontWeight: '800', color: nihongoTheme.colors.textPrimary },
  vocabReading: { fontSize: 14, color: nihongoTheme.colors.textSecondary, fontWeight: '600' },
  sinoBadge: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sinoBadgeText: { fontSize: 11, fontWeight: '700', color: nihongoTheme.colors.accentHover },
  ttsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: nihongoTheme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vocabMeaning: { fontSize: 15, fontWeight: '700', color: nihongoTheme.colors.textPrimary },
  hiddenHint: { fontSize: 12, color: nihongoTheme.colors.textMuted, fontStyle: 'italic' },
  exampleBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.md,
    padding: 10,
    gap: 3,
  },
  exampleJa: { fontSize: 13, color: nihongoTheme.colors.textPrimary, fontWeight: '600' },
  exampleVi: { fontSize: 12, color: nihongoTheme.colors.textSecondary },
});
