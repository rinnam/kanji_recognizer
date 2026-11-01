import {
  findDuplicate,
  JLPT_LEVELS,
  newFolderId,
  newVocabId,
  type FolderDto,
  type JlptLevel,
  type VocabularyDto,
} from '@kanji-nest/core';
import { Link, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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
import { useTheme, type AppTheme } from '../../src/theme/ThemeProvider';

function newLocalVocab(
  word: string,
  meaning: string,
  reading: string | null,
  jlptLevel: JlptLevel | null,
  folderIds: string[],
  now: string,
): VocabularyDto {
  return {
    id: newVocabId(),
    word,
    meaning,
    reading: reading && reading.trim() !== '' ? reading.trim() : null,
    sinoVietnamese: null,
    example: null,
    exampleMeaning: null,
    note: null,
    tags: [],
    jlptLevel,
    srsInterval: null,
    srsRepetition: null,
    srsEaseFactor: null,
    srsNextReview: null,
    folderIds,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

/**
 * Trang quản lý từ vựng:
 * - Header in-page với tiêu đề & nút Thêm từ / Nhập file
 * - Tìm kiếm từ vựng (Kanji, Hiragana, Nghĩa)
 * - Lọc theo thư mục & cấp độ JLPT
 * - Quản lý thư mục (Đổi tên, Xóa thư mục)
 * - Thêm / Sửa từ vựng bằng Popup Modal (không đẩy layout)
 * - Nút "Sửa" và "Xóa" trực tiếp trên từng từ
 */
export default function Vocabulary(): ReactElement {
  const navigation = useNavigation();
  const port = useStoragePort();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [vocabs, setVocabs] = useState<VocabularyDto[]>([]);
  const [folders, setFolders] = useState<FolderDto[]>([]);

  // Tìm kiếm & Lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string | null>(null);
  const [selectedJlptFilter, setSelectedJlptFilter] = useState<JlptLevel | null>(null);

  // Popup Modal: Thêm hoặc Sửa từ vựng
  const [wordModalOpen, setWordModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalWord, setModalWord] = useState('');
  const [modalReading, setModalReading] = useState('');
  const [modalMeaning, setModalMeaning] = useState('');
  const [modalJlpt, setModalJlpt] = useState<JlptLevel | null>(null);
  const [modalFolderId, setModalFolderId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Popup Modal: Tạo thư mục mới (mở từ form thêm từ hoặc từ quản lý)
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderError, setFolderError] = useState<string | null>(null);

  // Popup Modal: Đổi tên thư mục
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);

  // Popup Modal: Quản lý thư mục (danh sách đầy đủ để sửa/xóa)
  const [manageFoldersOpen, setManageFoldersOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [allVocabs, allFolders] = await Promise.all([
        port.vocabs.all(),
        port.folders.all(),
      ]);
      setVocabs(allVocabs.filter((v) => v.deletedAt === null));
      setFolders(allFolders.filter((f) => f.deletedAt === null));
      setStatus('ready');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [port]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // Map folderId -> tên thư mục
  const folderNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of folders) {
      map.set(f.id, f.name);
    }
    return map;
  }, [folders]);

  // Lọc từ vựng theo thư mục, JLPT và tìm kiếm
  const filteredVocabs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return vocabs.filter((v) => {
      if (selectedFolderFilter !== null && !v.folderIds.includes(selectedFolderFilter)) {
        return false;
      }
      if (selectedJlptFilter !== null && v.jlptLevel !== selectedJlptFilter) {
        return false;
      }
      if (query === '') return true;
      const matchWord = v.word.toLowerCase().includes(query);
      const matchMeaning = v.meaning.toLowerCase().includes(query);
      const matchReading = v.reading ? v.reading.toLowerCase().includes(query) : false;
      return matchWord || matchMeaning || matchReading;
    });
  }, [vocabs, selectedFolderFilter, selectedJlptFilter, searchQuery]);

  // Mở popup Thêm từ mới
  const openAddModal = useCallback(() => {
    setEditingId(null);
    setModalWord('');
    setModalReading('');
    setModalMeaning('');
    setModalJlpt(null);
    setModalFolderId(selectedFolderFilter);
    setModalError(null);
    setWordModalOpen(true);
  }, [selectedFolderFilter]);

  // Đưa các hành động (Thêm từ, Nhập file) lên thanh Page Title Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Kho từ vựng',
      headerRight: () => (
        <View style={styles.navHeaderActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thêm từ vựng mới"
            style={({ pressed }) => [styles.headerAddBtn, pressed && styles.pressed]}
            onPress={openAddModal}
          >
            <Text style={styles.headerAddBtnText}>+ Thêm từ</Text>
          </Pressable>

          <Link href="/import" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nhập từ file"
              style={({ pressed }) => [styles.headerImportBtn, pressed && styles.pressed]}
            >
              <Text style={styles.headerImportBtnText}>📂</Text>
            </Pressable>
          </Link>
        </View>
      ),
    });
  }, [navigation, openAddModal, styles]);

  // Mở popup Chỉnh sửa từ vựng
  const openEditModal = (item: VocabularyDto) => {
    setEditingId(item.id);
    setModalWord(item.word);
    setModalReading(item.reading ?? '');
    setModalMeaning(item.meaning);
    setModalJlpt(item.jlptLevel);
    setModalFolderId(item.folderIds[0] ?? null);
    setModalError(null);
    setWordModalOpen(true);
  };

  // Lưu từ vựng (Thêm mới hoặc Cập nhật)
  const handleSaveWord = useCallback(async () => {
    const cleanWord = modalWord.trim();
    const cleanMeaning = modalMeaning.trim();
    const cleanReading = modalReading.trim() !== '' ? modalReading.trim() : null;

    if (cleanWord === '' || cleanMeaning === '') {
      setModalError('Vui lòng nhập đủ Từ vựng và Ý nghĩa.');
      return;
    }

    const all = await port.vocabs.all();
    const duplicate = findDuplicate(all, cleanWord, cleanReading);
    if (duplicate !== undefined && duplicate.id !== editingId) {
      setModalError('Từ này đã có trong bộ từ vựng.');
      return;
    }

    const now = nowIso();
    const targetFolderIds = modalFolderId ? [modalFolderId] : [];

    if (editingId === null) {
      // Thêm mới
      await port.vocabs.putMany([
        newLocalVocab(cleanWord, cleanMeaning, cleanReading, modalJlpt, targetFolderIds, now),
      ]);
    } else {
      // Chỉnh sửa
      const target = all.find((v) => v.id === editingId);
      if (target) {
        await port.vocabs.putMany([
          {
            ...target,
            word: cleanWord,
            meaning: cleanMeaning,
            reading: cleanReading,
            jlptLevel: modalJlpt,
            folderIds: targetFolderIds,
            updatedAt: now,
          },
        ]);
      }
    }

    setWordModalOpen(false);
    await reload();
  }, [modalWord, modalMeaning, modalReading, modalJlpt, modalFolderId, editingId, port, reload]);

  // Tạo thư mục mới
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
    const createdFolderId = newFolderId();
    const newFolder: FolderDto = {
      id: createdFolderId,
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
    if (wordModalOpen) {
      setModalFolderId(createdFolderId);
    }
    await reload();
  }, [folderNameInput, wordModalOpen, port, reload]);

  // Mở popup Đổi tên thư mục
  const openRenameFolder = (id: string, currentName: string) => {
    setRenamingFolderId(id);
    setRenameInput(currentName);
    setRenameError(null);
    setRenameFolderOpen(true);
  };

  // Lưu Đổi tên thư mục
  const handleSaveRenameFolder = useCallback(async () => {
    const cleanName = renameInput.trim();
    if (cleanName === '') {
      setRenameError('Tên thư mục không được để trống.');
      return;
    }

    const allFolders = await port.folders.all();
    const exists = allFolders.some(
      (f) =>
        f.deletedAt === null &&
        f.id !== renamingFolderId &&
        f.name.toLowerCase() === cleanName.toLowerCase(),
    );
    if (exists) {
      setRenameError('Tên thư mục này đã tồn tại.');
      return;
    }

    const now = nowIso();
    const target = allFolders.find((f) => f.id === renamingFolderId);
    if (target) {
      await port.folders.putMany([{ ...target, name: cleanName, updatedAt: now }]);
      setRenameFolderOpen(false);
      await reload();
    }
  }, [renameInput, renamingFolderId, port, reload]);

  // Xóa thư mục (soft delete có tombstone theo nguyên tắc đồng bộ)
  const handleDeleteFolder = useCallback(
    (folderId: string, folderName: string) => {
      Alert.alert(
        'Xóa thư mục',
        `Bạn có chắc muốn xóa thư mục "${folderName}"? Các từ vựng trong thư mục này sẽ chuyển về "Chưa phân loại" chứ không bị xóa.`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa thư mục',
            style: 'destructive',
            onPress: async () => {
              const now = nowIso();
              const allFolders = await port.folders.all();
              const target = allFolders.find((f) => f.id === folderId);
              if (!target) return;

              // 1. Đánh dấu xóa thư mục (tombstone)
              await port.folders.putMany([{ ...target, deletedAt: now, updatedAt: now }]);

              // 2. Cập nhật các từ vựng đang chứa folderId này
              const allVocabs = await port.vocabs.all();
              const toUpdate = allVocabs
                .filter((v) => v.deletedAt === null && v.folderIds.includes(folderId))
                .map((v) => ({
                  ...v,
                  folderIds: v.folderIds.filter((id) => id !== folderId),
                  updatedAt: now,
                }));
              if (toUpdate.length > 0) {
                await port.vocabs.putMany(toUpdate);
              }

              if (selectedFolderFilter === folderId) {
                setSelectedFolderFilter(null);
              }
              await reload();
            },
          },
        ],
      );
    },
    [selectedFolderFilter, port, reload],
  );

  // Xóa từ vựng
  const removeWord = useCallback(
    (id: string, wordText: string) => {
      Alert.alert('Xóa từ vựng', `Bạn có chắc muốn xóa "${wordText}"?`, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const now = nowIso();
            const all = await port.vocabs.all();
            const target = all.find((v) => v.id === id);
            if (target === undefined) return;
            await port.vocabs.putMany([{ ...target, deletedAt: now, updatedAt: now }]);
            await reload();
          },
        },
      ]);
    },
    [port, reload],
  );

  const selectedFolderName = selectedFolderFilter ? folderNameMap.get(selectedFolderFilter) : null;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* THANH TÌM KIẾM TỪ VỰNG */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon} accessible={false}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo từ, cách đọc hoặc nghĩa..."
          placeholderTextColor={theme.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          accessibilityLabel="Tìm kiếm từ vựng"
        />
        {searchQuery.trim() !== '' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa tìm kiếm"
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchBtn}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* BỘ LỌC THƯ MỤC */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedFolderFilter === null }}
            style={({ pressed }) => [
              styles.filterChip,
              selectedFolderFilter === null && styles.filterChipActive,
              pressed && styles.pressed,
            ]}
            onPress={() => setSelectedFolderFilter(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFolderFilter === null && styles.filterChipTextActive,
              ]}
            >
              Tất cả ({vocabs.length})
            </Text>
          </Pressable>
          {folders.map((f) => {
            const count = vocabs.filter((v) => v.folderIds.includes(f.id)).length;
            const isSelected = selectedFolderFilter === f.id;
            return (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => setSelectedFolderFilter(isSelected ? null : f.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  📁 {f.name} ({count})
                </Text>
              </Pressable>
            );
          })}

          {folders.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quản lý thư mục"
              style={({ pressed }) => [styles.manageFolderChip, pressed && styles.pressed]}
              onPress={() => setManageFoldersOpen(true)}
            >
              <Text style={styles.manageFolderChipText}>⚙ Quản lý</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>

      {/* THANH ĐIỀU KHIỂN NHANH KHI ĐANG CHỌN THƯ MỤC CỤ THỂ */}
      {selectedFolderFilter !== null && selectedFolderName && (
        <View style={styles.folderActionBar}>
          <Text style={styles.folderActionTitle} numberOfLines={1}>
            📁 {selectedFolderName} ({vocabs.filter((v) => v.folderIds.includes(selectedFolderFilter)).length} từ)
          </Text>
          <View style={styles.folderActionBtns}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.folderActionEditBtn, pressed && styles.pressed]}
              onPress={() => openRenameFolder(selectedFolderFilter, selectedFolderName)}
            >
              <Text style={styles.folderActionEditText}>✏ Đổi tên</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.folderActionDeleteBtn, pressed && styles.pressed]}
              onPress={() => handleDeleteFolder(selectedFolderFilter, selectedFolderName)}
            >
              <Text style={styles.folderActionDeleteText}>🗑 Xóa</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.folderActionClearBtn, pressed && styles.pressed]}
              onPress={() => setSelectedFolderFilter(null)}
            >
              <Text style={styles.folderActionClearText}>✕</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* BỘ LỌC CẤP ĐỘ JLPT (N5 - N1) */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedJlptFilter === null }}
            style={({ pressed }) => [
              styles.jlptChip,
              selectedJlptFilter === null && styles.jlptChipActive,
              pressed && styles.pressed,
            ]}
            onPress={() => setSelectedJlptFilter(null)}
          >
            <Text
              style={[
                styles.jlptChipText,
                selectedJlptFilter === null && styles.jlptChipTextActive,
              ]}
            >
              Mọi cấp độ
            </Text>
          </Pressable>
          {JLPT_LEVELS.map((lvl) => {
            const count = vocabs.filter((v) => v.jlptLevel === lvl).length;
            const isSelected = selectedJlptFilter === lvl;
            return (
              <Pressable
                key={lvl}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [
                  styles.jlptChip,
                  isSelected && styles.jlptChipActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => setSelectedJlptFilter(isSelected ? null : lvl)}
              >
                <Text
                  style={[
                    styles.jlptChipText,
                    isSelected && styles.jlptChipTextActive,
                  ]}
                >
                  {lvl} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* DANH SÁCH TỪ VỰNG */}
      {status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.centerText}>Đang tải từ vựng…</Text>
        </View>
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Lỗi: {error}</Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.emptyAddBtn, pressed && styles.pressed]}
            onPress={() => void reload()}
          >
            <Text style={styles.emptyAddBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : filteredVocabs.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyGlyph} accessible={false}>
              {searchQuery.trim() !== '' || selectedFolderFilter !== null || selectedJlptFilter !== null
                ? '🔍'
                : '語'}
            </Text>
            <Text style={styles.emptyTitle}>
              {searchQuery.trim() !== '' || selectedFolderFilter !== null || selectedJlptFilter !== null
                ? 'Không tìm thấy từ vựng'
                : 'Chưa có từ vựng'}
            </Text>
            <Text style={styles.centerText}>
              {searchQuery.trim() !== '' || selectedFolderFilter !== null || selectedJlptFilter !== null
                ? 'Không có từ nào khớp với bộ lọc. Thử chọn lại thư mục hoặc xóa từ khóa.'
                : 'Bắt đầu thêm từ mới vào kho từ vựng của bạn.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.emptyAddBtn, pressed && styles.pressed]}
              onPress={openAddModal}
            >
              <Text style={styles.emptyAddBtnText}>+ Thêm từ vựng ngay</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={filteredVocabs}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const folderLabels = item.folderIds
              .map((id) => folderNameMap.get(id))
              .filter(Boolean);

            return (
              <View style={styles.vocabRow}>
                {/* Badge chữ cái đầu */}
                <View style={styles.wordBadge} accessible={false}>
                  <Text style={styles.wordBadgeText}>{item.word.slice(0, 1)}</Text>
                </View>

                {/* Thông tin từ vựng */}
                <View style={styles.wordContent}>
                  <View style={styles.wordLine}>
                    <Text style={styles.rowWord}>{item.word}</Text>
                    {item.reading !== null && item.reading.trim() !== '' && (
                      <Text style={styles.rowReading}>【{item.reading}】</Text>
                    )}
                    {item.jlptLevel && (
                      <View style={styles.jlptBadge}>
                        <Text style={styles.jlptBadgeText}>{item.jlptLevel}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.rowMeaning}>{item.meaning}</Text>

                  {/* Thẻ thư mục nếu có */}
                  {folderLabels.length > 0 && (
                    <View style={styles.rowFolders}>
                      {folderLabels.map((name, idx) => (
                        <View key={`${item.id}-${idx}`} style={styles.folderTag}>
                          <Text style={styles.folderTagText}>📁 {name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* CÁC NÚT THAO TÁC: SỬA & XÓA */}
                <View style={styles.rowActions}>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
                    onPress={() => openEditModal(item)}
                    accessibilityLabel={`Sửa ${item.word}`}
                  >
                    <Text style={styles.editText}>Sửa</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                    onPress={() => removeWord(item.id, item.word)}
                    accessibilityLabel={`Xóa ${item.word}`}
                  >
                    <Text style={styles.deleteText}>Xóa</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* POPUP MODAL 1: THÊM / SỬA TỪ VỰNG */}
      <Modal
        visible={wordModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setWordModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setWordModalOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {editingId === null ? 'Thêm từ vựng mới' : 'Chỉnh sửa từ vựng'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng popup"
                onPress={() => setWordModalOpen(false)}
                style={styles.modalCloseIconBtn}
              >
                <Text style={styles.modalCloseIconText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalBodyScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.inputLabel}>TỪ VỰNG (KANJI / KANA) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: 日本語, 桜, たべる"
                placeholderTextColor={theme.muted}
                value={modalWord}
                onChangeText={setModalWord}
                accessibilityLabel="Từ vựng tiếng Nhật"
              />

              <Text style={styles.inputLabel}>CÁCH ĐỌC (HIRAGANA)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: にほんご, さくら"
                placeholderTextColor={theme.muted}
                value={modalReading}
                onChangeText={setModalReading}
                accessibilityLabel="Cách đọc Hiragana"
              />

              <Text style={styles.inputLabel}>Ý NGHĨA TIẾNG VIỆT *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Tiếng Nhật, hoa anh đào"
                placeholderTextColor={theme.muted}
                value={modalMeaning}
                onChangeText={setModalMeaning}
                accessibilityLabel="Nghĩa tiếng Việt"
              />

              {/* Chọn cấp độ JLPT */}
              <Text style={styles.inputLabel}>CẤP ĐỘ JLPT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.choiceChip,
                    modalJlpt === null && styles.choiceChipActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setModalJlpt(null)}
                >
                  <Text style={[styles.choiceChipText, modalJlpt === null && styles.choiceChipTextActive]}>
                    Không chọn
                  </Text>
                </Pressable>
                {JLPT_LEVELS.map((lvl) => {
                  const isSelected = modalJlpt === lvl;
                  return (
                    <Pressable
                      key={lvl}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.choiceChip,
                        isSelected && styles.choiceChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setModalJlpt(lvl)}
                    >
                      <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>
                        {lvl}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Chọn thư mục lưu trữ */}
              <View style={styles.folderChoiceHeader}>
                <Text style={styles.inputLabel}>LƯU VÀO THƯ MỤC</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setFolderNameInput('');
                    setFolderError(null);
                    setCreateFolderOpen(true);
                  }}
                >
                  <Text style={styles.addNewFolderLink}>+ Tạo thư mục mới</Text>
                </Pressable>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.choiceChip,
                    modalFolderId === null && styles.choiceChipActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setModalFolderId(null)}
                >
                  <Text style={[styles.choiceChipText, modalFolderId === null && styles.choiceChipTextActive]}>
                    Chưa phân loại
                  </Text>
                </Pressable>
                {folders.map((f) => {
                  const isSelected = modalFolderId === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.choiceChip,
                        isSelected && styles.choiceChipActive,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setModalFolderId(f.id)}
                    >
                      <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextActive]}>
                        📁 {f.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {modalError !== null && (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {modalError}
                </Text>
              )}

              <View style={styles.modalButtonsRow}>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.pressed]}
                  onPress={() => setWordModalOpen(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Hủy</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.modalSubmitBtn, pressed && styles.pressed]}
                  onPress={() => void handleSaveWord()}
                >
                  <Text style={styles.modalSubmitBtnText}>
                    {editingId === null ? 'Lưu từ vựng' : 'Cập nhật từ vựng'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* POPUP MODAL 2: TẠO THƯ MỤC MỚI */}
      <Modal
        visible={createFolderOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setCreateFolderOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.dialogOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setCreateFolderOpen(false)} />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Tạo thư mục mới</Text>
            <Text style={styles.dialogSubtitle}>
              Phân loại từ vựng theo giáo trình, cấp độ hoặc chủ đề học tập.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Tên thư mục (ví dụ: Kanji N5, Bài 1...)"
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

            <View style={styles.modalButtonsRow}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.pressed]}
                onPress={() => setCreateFolderOpen(false)}
              >
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.modalSubmitBtn, pressed && styles.pressed]}
                onPress={() => void handleCreateFolder()}
              >
                <Text style={styles.modalSubmitBtnText}>Tạo thư mục</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* POPUP MODAL 3: ĐỔI TÊN THƯ MỤC */}
      <Modal
        visible={renameFolderOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setRenameFolderOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.dialogOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setRenameFolderOpen(false)} />
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Đổi tên thư mục</Text>
            <Text style={styles.dialogSubtitle}>Nhập tên mới cho thư mục này.</Text>

            <TextInput
              style={styles.input}
              placeholder="Tên thư mục mới"
              placeholderTextColor={theme.muted}
              value={renameInput}
              onChangeText={setRenameInput}
              autoFocus
              accessibilityLabel="Tên mới của thư mục"
            />

            {renameError !== null && (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {renameError}
              </Text>
            )}

            <View style={styles.modalButtonsRow}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.pressed]}
                onPress={() => setRenameFolderOpen(false)}
              >
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.modalSubmitBtn, pressed && styles.pressed]}
                onPress={() => void handleSaveRenameFolder()}
              >
                <Text style={styles.modalSubmitBtnText}>Lưu tên mới</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* POPUP MODAL 4: QUẢN LÝ TẤT CẢ THƯ MỤC */}
      <Modal
        visible={manageFoldersOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setManageFoldersOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setManageFoldersOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Quản lý thư mục</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={() => setManageFoldersOpen(false)}
                style={styles.modalCloseIconBtn}
              >
                <Text style={styles.modalCloseIconText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              {folders.map((f) => {
                const count = vocabs.filter((v) => v.folderIds.includes(f.id)).length;
                return (
                  <View key={f.id} style={styles.manageFolderItem}>
                    <View style={styles.manageFolderInfo}>
                      <Text style={styles.manageFolderName}>📁 {f.name}</Text>
                      <Text style={styles.manageFolderCount}>{count} từ vựng</Text>
                    </View>
                    <View style={styles.manageFolderActions}>
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.folderActionEditBtn, pressed && styles.pressed]}
                        onPress={() => {
                          setManageFoldersOpen(false);
                          openRenameFolder(f.id, f.name);
                        }}
                      >
                        <Text style={styles.folderActionEditText}>✏ Đổi tên</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.folderActionDeleteBtn, pressed && styles.pressed]}
                        onPress={() => handleDeleteFolder(f.id, f.name)}
                      >
                        <Text style={styles.folderActionDeleteText}>🗑 Xóa</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.modalCloseFullBtn, pressed && styles.pressed]}
              onPress={() => setManageFoldersOpen(false)}
            >
              <Text style={styles.modalCloseFullText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
      paddingHorizontal: 16,
      paddingTop: 8,
      gap: 10,
    },
    // Navigation Header Right Actions
    navHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginRight: 14,
    },
    headerAddBtn: {
      backgroundColor: t.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      minHeight: 34,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerAddBtnText: {
      color: t.primaryContrast,
      fontSize: 12,
      fontWeight: '800',
    },
    headerImportBtn: {
      backgroundColor: t.btnBg,
      borderWidth: 1,
      borderColor: t.btnBorder,
      width: 34,
      height: 34,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerImportBtnText: {
      fontSize: 15,
    },
    // Search Box
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 12,
      minHeight: 44,
      gap: 8,
    },
    searchIcon: {
      fontSize: 14,
      opacity: 0.7,
    },
    searchInput: {
      flex: 1,
      color: t.text,
      fontSize: 14,
      paddingVertical: 8,
    },
    clearSearchBtn: {
      padding: 4,
    },
    clearSearchText: {
      color: t.muted,
      fontSize: 13,
      fontWeight: '700',
    },
    // Filters
    filterSection: {
      paddingVertical: 1,
    },
    filterChipsRow: {
      gap: 6,
    },
    filterChip: {
      minHeight: 32,
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterChipActive: {
      backgroundColor: t.primary,
      borderColor: t.primary,
    },
    filterChipText: {
      color: t.text,
      fontSize: 12,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: t.primaryContrast,
      fontWeight: '800',
    },
    manageFolderChip: {
      minHeight: 32,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.btnBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    manageFolderChipText: {
      color: t.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    // Folder Action Bar
    folderActionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.btnBg,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.btnBorder,
      gap: 8,
    },
    folderActionTitle: {
      flex: 1,
      color: t.text,
      fontSize: 12,
      fontWeight: '700',
    },
    folderActionBtns: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    folderActionEditBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    folderActionEditText: {
      color: t.text,
      fontSize: 11,
      fontWeight: '700',
    },
    folderActionDeleteBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: t.danger,
      backgroundColor: t.surface,
    },
    folderActionDeleteText: {
      color: t.danger,
      fontSize: 11,
      fontWeight: '700',
    },
    folderActionClearBtn: {
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    folderActionClearText: {
      color: t.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    jlptChip: {
      minHeight: 28,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.btnBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    jlptChipActive: {
      backgroundColor: t.text,
      borderColor: t.text,
    },
    jlptChipText: {
      color: t.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    jlptChipTextActive: {
      color: t.bg,
      fontWeight: '800',
    },
    // Vocab List
    list: {
      flex: 1,
      marginTop: 2,
    },
    listContent: {
      gap: 10,
      paddingBottom: 24,
    },
    vocabRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 13,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      gap: 10,
    },
    wordBadge: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: t.btnBg,
      borderWidth: 1,
      borderColor: t.border,
    },
    wordBadgeText: {
      color: t.primary,
      fontSize: 20,
      fontWeight: '800',
    },
    wordContent: {
      flex: 1,
      gap: 3,
    },
    wordLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    rowWord: {
      fontSize: 17,
      fontWeight: '800',
      color: t.text,
    },
    rowReading: {
      fontSize: 13,
      fontWeight: '600',
      color: t.primary,
    },
    jlptBadge: {
      backgroundColor: t.btnBg,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: t.border,
    },
    jlptBadgeText: {
      color: t.text,
      fontSize: 10,
      fontWeight: '800',
    },
    rowMeaning: {
      fontSize: 14,
      color: t.muted,
      lineHeight: 18,
    },
    rowFolders: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
    },
    folderTag: {
      backgroundColor: t.btnBg,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    folderTagText: {
      color: t.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    // Row Actions: Sửa & Xóa
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    editButton: {
      minHeight: 34,
      paddingHorizontal: 10,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 9,
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.btnBg,
    },
    editText: {
      color: t.text,
      fontSize: 12,
      fontWeight: '700',
    },
    deleteButton: {
      minHeight: 34,
      paddingHorizontal: 10,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 9,
      borderWidth: 1,
      borderColor: t.danger,
    },
    deleteText: {
      color: t.danger,
      fontSize: 12,
      fontWeight: '700',
    },
    // Center & Empty
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 20,
    },
    centerText: {
      color: t.muted,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 20,
    },
    emptyCard: {
      alignItems: 'center',
      gap: 8,
      padding: 24,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
      width: '100%',
    },
    emptyGlyph: {
      fontSize: 36,
      marginBottom: 4,
    },
    emptyTitle: {
      color: t.text,
      fontSize: 18,
      fontWeight: '800',
    },
    emptyAddBtn: {
      marginTop: 8,
      backgroundColor: t.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
    emptyAddBtnText: {
      color: t.primaryContrast,
      fontSize: 14,
      fontWeight: '800',
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    dialogOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      paddingHorizontal: 20,
    },
    modalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modalSheet: {
      backgroundColor: t.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 36,
      maxHeight: '88%',
    },
    modalHandle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: t.border,
      alignSelf: 'center',
      marginBottom: 10,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    modalTitle: {
      color: t.text,
      fontSize: 20,
      fontWeight: '800',
    },
    modalCloseIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.btnBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCloseIconText: {
      color: t.muted,
      fontSize: 14,
      fontWeight: '700',
    },
    modalBodyScroll: {
      maxHeight: 460,
    },
    inputLabel: {
      color: t.muted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginTop: 10,
      marginBottom: 4,
    },
    input: {
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
    chipsScroll: {
      gap: 8,
      paddingVertical: 4,
    },
    choiceChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.btnBg,
    },
    choiceChipActive: {
      backgroundColor: t.primary,
      borderColor: t.primary,
    },
    choiceChipText: {
      color: t.text,
      fontSize: 12,
      fontWeight: '600',
    },
    choiceChipTextActive: {
      color: t.primaryContrast,
      fontWeight: '800',
    },
    folderChoiceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
    },
    addNewFolderLink: {
      color: t.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    modalButtonsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
      marginBottom: 10,
    },
    modalCancelBtn: {
      flex: 1,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.btnBorder,
      backgroundColor: t.btnBg,
    },
    modalCancelBtnText: {
      color: t.text,
      fontSize: 14,
      fontWeight: '700',
    },
    modalSubmitBtn: {
      flex: 2,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: t.primary,
    },
    modalSubmitBtnText: {
      color: t.primaryContrast,
      fontSize: 14,
      fontWeight: '800',
    },
    errorText: {
      color: t.danger,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 6,
    },
    // Dialog Tạo & Đổi tên thư mục
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
    // Manage Folders Item
    manageFolderItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.btnBg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 8,
      gap: 10,
    },
    manageFolderInfo: {
      flex: 1,
      gap: 2,
    },
    manageFolderName: {
      color: t.text,
      fontSize: 15,
      fontWeight: '700',
    },
    manageFolderCount: {
      color: t.muted,
      fontSize: 12,
    },
    manageFolderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    modalCloseFullBtn: {
      minHeight: 46,
      backgroundColor: t.btnBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.btnBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
    },
    modalCloseFullText: {
      color: t.text,
      fontSize: 15,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.72,
    },
  });
