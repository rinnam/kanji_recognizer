import {
  newFolderId,
  selectWordsInScope,
  summarize,
  type FolderDto,
  type VocabularyDto,
} from '@kanji-nest/core';
import { Link, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStoragePort } from '../../src/db/DbProvider';
import { nowIso } from '../../src/lib/time';
import { useScope } from '../../src/scope/ScopeProvider';
import { useTheme, type AppTheme } from '../../src/theme/ThemeProvider';

/**
 * Giao diện trang Học tập (Study Hub):
 * 1. Chọn phạm vi học chính (Chọn thư mục qua thẻ & modal danh sách đầy đủ).
 * 2. Tiến độ SRS hôm nay (Tới hạn, mới, đang học).
 * 3. Thẻ Flashcard & Quiz bố cục rộng rãi, thoáng mắt, không bị dồn ép.
 */
export default function Study(): ReactElement {
  const navigation = useNavigation();
  const port = useStoragePort();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { folderId, selectFolder } = useScope();

  const [loading, setLoading] = useState(true);
  const [vocabs, setVocabs] = useState<VocabularyDto[]>([]);
  const [folders, setFolders] = useState<FolderDto[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderError, setFolderError] = useState<string | null>(null);

  const reloadData = useCallback(async () => {
    try {
      const [allVocabs, allFolders] = await Promise.all([
        port.vocabs.all(),
        port.folders.all(),
      ]);
      setVocabs(allVocabs.filter((v) => v.deletedAt === null));
      setFolders(allFolders.filter((f) => f.deletedAt === null));
    } finally {
      setLoading(false);
    }
  }, [port]);

  const handleCreateFolder = useCallback(async () => {
    const cleanName = folderNameInput.trim();
    if (cleanName === '') {
      setFolderError('Vui lòng nhập tên thư mục.');
      return;
    }

    const allFolders = await port.folders.all();
    const exists = allFolders.some(
      (f) => f.deletedAt === null && f.name.toLowerCase() === cleanName.toLowerCase(),
    );
    if (exists) {
      setFolderError('Thư mục này đã tồn tại.');
      return;
    }

    const now = nowIso();
    const newId = newFolderId();
    const newFolder: FolderDto = {
      id: newId,
      name: cleanName,
      parentId: null,
      order: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await port.folders.putMany([newFolder]);
    setFolderNameInput('');
    setFolderError(null);
    setCreateFolderOpen(false);
    selectFolder(newId);
    await reloadData();
  }, [folderNameInput, port, selectFolder, reloadData]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        if (active) {
          await reloadData();
        }
      })();
      return () => {
        active = false;
      };
    }, [reloadData]),
  );

  // Danh sách từ vựng thuộc phạm vi thư mục đang chọn
  const scopeWords = useMemo(
    () => selectWordsInScope(vocabs, folders, folderId),
    [vocabs, folders, folderId],
  );

  // Thống kê SRS của phạm vi hiện tại
  const summary = useMemo(() => {
    return summarize(scopeWords, new Date());
  }, [scopeWords]);

  const activeFolderName = useMemo(() => {
    if (folderId === null) return 'Tất cả từ vựng';
    return folders.find((f) => f.id === folderId)?.name ?? 'Thư mục đã chọn';
  }, [folderId, folders]);

  const handleSelectFolder = (id: string | null) => {
    selectFolder(id);
    setPickerOpen(false);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Không gian học',
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* PHẦN 1: CHỌN PHẠM VI HỌC (THƯ MỤC) */}
        <View style={styles.scopeCard}>
          <View style={styles.scopeCardTop}>
            <View style={styles.scopeTitleGroup}>
              <Text style={styles.scopeCardBadge}>📁 PHẠM VI HỌC</Text>
              <Text style={styles.scopeCardName} numberOfLines={1}>
                {activeFolderName}
              </Text>
              <Text style={styles.scopeCardCount}>
                {scopeWords.length} từ vựng áp dụng cho Flashcard & Luyện tập
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đổi thư mục học"
              style={({ pressed }) => [styles.changeFolderBtn, pressed && styles.pressed]}
              onPress={() => setPickerOpen(true)}
            >
              <Text style={styles.changeFolderText}>Đổi thư mục</Text>
              <Text style={styles.changeFolderArrow}>▾</Text>
            </Pressable>
          </View>

          {/* Hàng chip chọn nhanh thư mục */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scopeChipsRow}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chọn tất cả từ vựng"
              accessibilityState={{ selected: folderId === null }}
              style={({ pressed }) => [
                styles.chip,
                folderId === null && styles.chipActive,
                pressed && styles.pressed,
              ]}
              onPress={() => handleSelectFolder(null)}
            >
              <Text
                style={[
                  styles.chipText,
                  folderId === null && styles.chipTextActive,
                ]}
              >
                Tất cả ({vocabs.length})
              </Text>
            </Pressable>
            {folders.map((f) => {
              const count = selectWordsInScope(vocabs, folders, f.id).length;
              const isSelected = folderId === f.id;
              return (
                <Pressable
                  key={f.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn thư mục ${f.name}`}
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.chip,
                    isSelected && styles.chipActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleSelectFolder(f.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextActive,
                    ]}
                  >
                    📁 {f.name} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* PHẦN 2: BẢNG TIẾN ĐỘ SRS HÔM NAY */}
        <View style={styles.srsPanel}>
          <View style={styles.srsHeader}>
            <Text style={styles.srsHeading}>Tiến độ ôn tập SRS hôm nay</Text>
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : summary.due > 0 ? (
              <View style={styles.dueHighlight}>
                <Text style={styles.dueHighlightText}>{summary.due} từ tới hạn</Text>
              </View>
            ) : (
              <Text style={styles.srsStatusAllGood}>Đã hoàn thành ✓</Text>
            )}
          </View>

          <View style={styles.srsStatsRow}>
            <View style={[styles.srsStatCard, summary.due > 0 && styles.srsStatCardAlert]}>
              <Text style={styles.srsStatLabel}>CẦN ÔN TẬP</Text>
              <Text style={[styles.srsStatNum, summary.due > 0 && styles.srsStatNumAlert]}>
                {loading ? '—' : summary.due}
              </Text>
              <Text style={styles.srsStatSub}>hôm nay</Text>
            </View>

            <View style={styles.srsStatCard}>
              <Text style={styles.srsStatLabel}>TỪ MỚI</Text>
              <Text style={styles.srsStatNum}>{loading ? '—' : summary.fresh}</Text>
              <Text style={styles.srsStatSub}>chưa qua thẻ</Text>
            </View>

            <View style={styles.srsStatCard}>
              <Text style={styles.srsStatLabel}>ĐANG HỌC</Text>
              <Text style={styles.srsStatNum}>{loading ? '—' : summary.learned}</Text>
              <Text style={styles.srsStatSub}>đã nạp thẻ</Text>
            </View>
          </View>
        </View>

        {/* PHẦN 3: THẺ FLASHCARD (BỐ CỤC THOÁNG ĐÃNG) */}
        <Link href="/flashcard" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở Flashcard"
            style={({ pressed }) => [styles.studyCard, styles.flashcardCard, pressed && styles.cardPressed]}
          >
            {/* Watermark chữ Hán chìm */}
            <View style={styles.stampBox} accessible={false}>
              <Text style={styles.stampKanji}>記</Text>
            </View>

            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconGlyph}>記</Text>
              </View>
              <View style={styles.cardTitleWrap}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>Flashcard</Text>
                  {summary.due > 0 && (
                    <Text style={styles.dueBadge}>{summary.due} thẻ đến hạn</Text>
                  )}
                </View>
                <Text style={styles.cardSubtitle}>暗記カード · Lật thẻ ôn tập ngắt quãng SM-2</Text>
              </View>
            </View>

            {/* Tính năng chính - trình bày thoáng, không chật chội */}
            <View style={styles.featuresRow}>
              <View style={styles.featureItem}>
                <Text style={styles.featureDot}>•</Text>
                <Text style={styles.featureText}>3 chế độ ôn</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureDot}>•</Text>
                <Text style={styles.featureText}>Lật thẻ 2 mặt</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureDot}>•</Text>
                <Text style={styles.featureText}>Xáo trộn thẻ</Text>
              </View>
            </View>

            <View style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>
                {summary.due > 0 ? `Ôn ${summary.due} thẻ đến hạn ngay` : 'Bắt đầu học Flashcard'}
              </Text>
              <Text style={styles.ctaArrow} accessible={false}>→</Text>
            </View>
          </Pressable>
        </Link>

        {/* PHẦN 4: THẺ LUYỆN TẬP / QUIZ (BỐ CỤC THOÁNG ĐÃNG) */}
        <Link href="/quiz" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở Luyện tập trắc nghiệm"
            style={({ pressed }) => [styles.studyCard, styles.quizCard, pressed && styles.cardPressed]}
          >
            {/* Watermark chữ Hán chìm */}
            <View style={styles.stampBox} accessible={false}>
              <Text style={styles.stampKanji}>問</Text>
            </View>

            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, styles.quizIconCircle]}>
                <Text style={[styles.iconGlyph, styles.quizIconGlyph]}>問</Text>
              </View>
              <View style={styles.cardTitleWrap}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>Luyện tập gõ</Text>
                  <Text style={styles.quizBadge}>PHẢN XẠ NHANH</Text>
                </View>
                <Text style={styles.cardSubtitle}>クイズ練習 · Nhìn chữ đọc & dịch nghĩa</Text>
              </View>
            </View>

            {/* Tính năng chính */}
            <View style={styles.featuresRow}>
              <View style={styles.featureItem}>
                <Text style={styles.featureDot}>•</Text>
                <Text style={styles.featureText}>Gõ Hiragana</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureDot}>•</Text>
                <Text style={styles.featureText}>Dịch nghĩa tiếng Việt</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureDot}>•</Text>
                <Text style={styles.featureText}>Tự động chuyển câu</Text>
              </View>
            </View>

            <View style={[styles.ctaButton, styles.quizCtaButton]}>
              <Text style={[styles.ctaButtonText, styles.quizCtaButtonText]}>Vào luyện tập ngay</Text>
              <Text style={[styles.ctaArrow, styles.quizCtaArrow]} accessible={false}>→</Text>
            </View>
          </Pressable>
        </Link>
      </ScrollView>

      {/* MODAL CHỌN THƯ MỤC HỌC CHI TIẾT */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Chọn phạm vi học</Text>
              <Pressable
                accessibilityRole="button"
                style={styles.modalAddFolderBtn}
                onPress={() => {
                  setFolderNameInput('');
                  setFolderError(null);
                  setCreateFolderOpen(true);
                }}
              >
                <Text style={styles.modalAddFolderText}>+ Thư mục</Text>
              </Pressable>
            </View>
            <Text style={styles.modalCaption}>
              Flashcard và Luyện tập sẽ chỉ hiển thị các từ vựng thuộc thư mục bạn chọn.
            </Text>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {/* Option: Tất cả từ vựng */}
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.modalItem,
                  folderId === null && styles.modalItemActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleSelectFolder(null)}
              >
                <View style={styles.modalItemLeft}>
                  <Text style={styles.modalItemIcon}>📚</Text>
                  <View>
                    <Text style={styles.modalItemTitle}>Tất cả từ vựng</Text>
                    <Text style={styles.modalItemSub}>{vocabs.length} từ trong toàn bộ kho từ</Text>
                  </View>
                </View>
                {folderId === null && <Text style={styles.modalCheck}>✓</Text>}
              </Pressable>

              {/* Danh sách các thư mục */}
              {folders.map((f) => {
                const count = selectWordsInScope(vocabs, folders, f.id).length;
                const isSelected = folderId === f.id;
                return (
                  <Pressable
                    key={f.id}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.modalItem,
                      isSelected && styles.modalItemActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleSelectFolder(f.id)}
                  >
                    <View style={styles.modalItemLeft}>
                      <Text style={styles.modalItemIcon}>📁</Text>
                      <View>
                        <Text style={styles.modalItemTitle}>{f.name}</Text>
                        <Text style={styles.modalItemSub}>{count} từ vựng</Text>
                      </View>
                    </View>
                    {isSelected && <Text style={styles.modalCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.modalCloseBtn, pressed && styles.pressed]}
              onPress={() => setPickerOpen(false)}
            >
              <Text style={styles.modalCloseText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL TẠO THƯ MỤC MỚI TRONG STUDY */}
      <Modal
        visible={createFolderOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setCreateFolderOpen(false)}
      >
        <View style={styles.dialogOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCreateFolderOpen(false)} />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Tạo thư mục mới</Text>
            <Text style={styles.dialogSubtitle}>
              Tạo thư mục để gom nhóm từ vựng và chọn làm phạm vi học.
            </Text>

            <TextInput
              style={styles.dialogInput}
              placeholder="Tên thư mục (ví dụ: Kanji N5...)"
              placeholderTextColor={theme.muted}
              value={folderNameInput}
              onChangeText={setFolderNameInput}
              autoFocus
              accessibilityLabel="Tên thư mục mới"
            />

            {folderError !== null && (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {folderError}
              </Text>
            )}

            <View style={styles.dialogButtonsRow}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.dialogCancelBtn, pressed && styles.pressed]}
                onPress={() => setCreateFolderOpen(false)}
              >
                <Text style={styles.dialogCancelBtnText}>Hủy</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.dialogSubmitBtn, pressed && styles.pressed]}
                onPress={() => void handleCreateFolder()}
              >
                <Text style={styles.dialogSubmitBtnText}>Tạo thư mục</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: t.bg,
    },
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 40,
      gap: 20,
    },
    // PHẦN 1: Thẻ Phạm vi học
    scopeCard: {
      backgroundColor: t.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
      gap: 14,
    },
    scopeCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    scopeTitleGroup: {
      flex: 1,
      gap: 4,
    },
    scopeCardBadge: {
      color: t.primary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    scopeCardName: {
      color: t.text,
      fontSize: 18,
      fontWeight: '800',
    },
    scopeCardCount: {
      color: t.muted,
      fontSize: 12,
      lineHeight: 16,
    },
    changeFolderBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: t.btnBg,
      borderWidth: 1,
      borderColor: t.btnBorder,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      minHeight: 38,
    },
    changeFolderText: {
      color: t.text,
      fontSize: 13,
      fontWeight: '700',
    },
    changeFolderArrow: {
      color: t.primary,
      fontSize: 14,
      fontWeight: '800',
    },
    scopeChipsRow: {
      gap: 8,
    },
    chip: {
      minHeight: 38,
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.btnBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: t.primary,
      borderColor: t.primary,
    },
    chipText: {
      color: t.text,
      fontSize: 13,
      fontWeight: '600',
    },
    chipTextActive: {
      color: t.primaryContrast,
      fontWeight: '800',
    },
    // PHẦN 2: Bảng tiến độ SRS
    srsPanel: {
      backgroundColor: t.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
      gap: 12,
    },
    srsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    srsHeading: {
      color: t.text,
      fontSize: 15,
      fontWeight: '800',
    },
    dueHighlight: {
      backgroundColor: t.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    dueHighlightText: {
      color: t.primaryContrast,
      fontSize: 12,
      fontWeight: '800',
    },
    srsStatusAllGood: {
      color: t.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    srsStatsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    srsStatCard: {
      flex: 1,
      backgroundColor: t.btnBg,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 10,
      gap: 2,
    },
    srsStatCardAlert: {
      borderWidth: 1,
      borderColor: t.primary,
    },
    srsStatLabel: {
      color: t.muted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    srsStatNum: {
      color: t.text,
      fontSize: 22,
      fontWeight: '800',
      lineHeight: 26,
    },
    srsStatNumAlert: {
      color: t.primary,
    },
    srsStatSub: {
      color: t.muted,
      fontSize: 11,
    },
    // PHẦN 3 & 4: Thẻ Flashcard & Quiz (Rộng rãi, thoáng đạt)
    studyCard: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      padding: 20,
      gap: 16,
    },
    flashcardCard: {
      borderColor: t.primary,
      borderWidth: 1.5,
    },
    quizCard: {
      borderWidth: 1.5,
      borderColor: t.border,
    },
    cardPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
    stampBox: {
      position: 'absolute',
      right: 16,
      top: 10,
      opacity: 0.06,
      zIndex: 0,
    },
    stampKanji: {
      fontSize: 96,
      fontWeight: '900',
      color: t.text,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      zIndex: 1,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quizIconCircle: {
      backgroundColor: t.btnBg,
      borderWidth: 1,
      borderColor: t.border,
    },
    iconGlyph: {
      color: t.primaryContrast,
      fontSize: 24,
      fontWeight: '800',
    },
    quizIconGlyph: {
      color: t.primary,
    },
    cardTitleWrap: {
      flex: 1,
      gap: 3,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardTitle: {
      color: t.text,
      fontSize: 19,
      fontWeight: '800',
    },
    dueBadge: {
      backgroundColor: t.primary,
      color: t.primaryContrast,
      fontSize: 11,
      fontWeight: '800',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      overflow: 'hidden',
    },
    quizBadge: {
      backgroundColor: t.btnBg,
      color: t.primary,
      fontSize: 10,
      fontWeight: '800',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: t.border,
      letterSpacing: 0.5,
    },
    cardSubtitle: {
      color: t.muted,
      fontSize: 13,
      fontWeight: '600',
    },
    featuresRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      paddingVertical: 4,
      zIndex: 1,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    featureDot: {
      color: t.primary,
      fontSize: 14,
      fontWeight: '800',
    },
    featureText: {
      color: t.text,
      fontSize: 13,
      fontWeight: '600',
      opacity: 0.85,
    },
    ctaButton: {
      minHeight: 48,
      backgroundColor: t.primary,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 16,
      zIndex: 1,
    },
    quizCtaButton: {
      backgroundColor: t.btnBg,
      borderWidth: 1,
      borderColor: t.btnBorder,
    },
    ctaButtonText: {
      color: t.primaryContrast,
      fontSize: 15,
      fontWeight: '800',
    },
    quizCtaButtonText: {
      color: t.text,
    },
    ctaArrow: {
      color: t.primaryContrast,
      fontSize: 16,
      fontWeight: '800',
    },
    quizCtaArrow: {
      color: t.primary,
    },
    // PHẦN 5: Thẻ Thêm từ vựng
    importCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      gap: 12,
    },
    importLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    importGlyphBox: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: t.btnBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.border,
    },
    importGlyph: {
      color: t.primary,
      fontSize: 20,
      fontWeight: '800',
    },
    importTextGroup: {
      flex: 1,
      gap: 2,
    },
    importTitle: {
      color: t.text,
      fontSize: 15,
      fontWeight: '800',
    },
    importSub: {
      color: t.muted,
      fontSize: 12,
      lineHeight: 16,
    },
    importArrow: {
      color: t.muted,
      fontSize: 24,
      fontWeight: '300',
    },
    // Modal chọn phạm vi học
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    modalBackdrop: {
      flex: 1,
    },
    modalSheet: {
      backgroundColor: t.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 36,
      maxHeight: '80%',
      gap: 12,
    },
    modalHandle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: t.border,
      alignSelf: 'center',
      marginBottom: 6,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    modalAddFolderBtn: {
      backgroundColor: t.btnBg,
      borderWidth: 1,
      borderColor: t.btnBorder,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
    },
    modalAddFolderText: {
      color: t.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    modalTitle: {
      color: t.text,
      fontSize: 20,
      fontWeight: '800',
    },
    modalCaption: {
      color: t.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    modalList: {
      marginTop: 6,
      maxHeight: 340,
    },
    modalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 8,
      backgroundColor: t.btnBg,
    },
    modalItemActive: {
      borderColor: t.primary,
      backgroundColor: t.surface,
    },
    modalItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    modalItemIcon: {
      fontSize: 20,
    },
    modalItemTitle: {
      color: t.text,
      fontSize: 15,
      fontWeight: '700',
    },
    modalItemSub: {
      color: t.muted,
      fontSize: 12,
    },
    modalCheck: {
      color: t.primary,
      fontSize: 18,
      fontWeight: '900',
    },
    modalCloseBtn: {
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: t.btnBg,
      borderWidth: 1,
      borderColor: t.btnBorder,
      marginTop: 4,
    },
    modalCloseText: {
      color: t.text,
      fontSize: 15,
      fontWeight: '700',
    },
    // Dialog Tạo thư mục
    dialogOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      paddingHorizontal: 20,
    },
    dialogCard: {
      width: '100%',
      backgroundColor: t.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: t.border,
      padding: 20,
      gap: 12,
      maxWidth: 380,
    },
    dialogTitle: {
      color: t.text,
      fontSize: 19,
      fontWeight: '800',
    },
    dialogSubtitle: {
      color: t.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    dialogInput: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.btnBg,
      color: t.text,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
    },
    errorText: {
      color: t.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    dialogButtonsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    dialogCancelBtn: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.btnBg,
    },
    dialogCancelBtnText: {
      color: t.text,
      fontSize: 14,
      fontWeight: '700',
    },
    dialogSubmitBtn: {
      flex: 2,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: t.primary,
    },
    dialogSubmitBtnText: {
      color: t.primaryContrast,
      fontSize: 14,
      fontWeight: '800',
    },
    pressed: {
      opacity: 0.72,
    },
  });
