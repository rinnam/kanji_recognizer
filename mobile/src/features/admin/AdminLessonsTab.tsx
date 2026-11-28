import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  DownloadIcon,
  LinkExternalIcon,
  TrashIcon,
  UploadIcon,
  VolumeIcon,
} from '../../components/AppIcons';
import { parseCsv } from '../../import-parser';
import { speakJapanese } from '../../utils/speak-japanese';
import { getCachedAdminSession, readAdminSession } from '../auth/auth-store';
import {
  buildMaterialFileUrl,
  type JlptLevel,
  type LessonItemDto,
  type LessonMaterialDto,
  type LessonStatus,
  type SubscriptionTier,
} from '../lessons/lessons-api';
import { AdminConfirmModal } from './AdminConfirmModal';
import { adminTheme, downloadCsvFile } from './admin-theme';
import {
  addAdminLessonItem,
  addAdminLessonMaterialLink,
  bulkAddAdminLessonItems,
  createAdminLesson,
  deleteAdminLesson,
  deleteAdminLessonItem,
  deleteAdminLessonMaterial,
  fetchAdminLessonDetail,
  fetchAdminLessons,
  fileAssetToBase64,
  fileAssetToText,
  updateAdminLesson,
  updateAdminLessonItem,
  uploadAdminLessonMaterialFile,
  type AdminLessonDto,
} from './admin-api';

const JLPT_OPTIONS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const CATEGORIES = ['Từ vựng', 'Kanji', 'Ngữ pháp', 'Đọc hiểu', 'Tài liệu ôn thi'];

const SAMPLE_LESSON_CSV =
  'word,reading,meaning,sinoVietnamese,example,exampleMeaning\n' +
  '準備,じゅんび,"chuẩn bị",CHUẨN BỊ,試験の準備をします。,Tôi chuẩn bị cho kỳ thi.\n' +
  '復習,ふくしゅう,"ôn tập",PHỤC TẬP,毎日単語を復習します。,Mỗi ngày tôi đều ôn tập từ vựng.';

const SAMPLE_LESSON_CSV_ROWS: ReadonlyArray<ReadonlyArray<string>> = [
  ['準備', 'じゅんび', 'chuẩn bị', 'CHUẨN BỊ', '試験の準備をします。', 'Tôi chuẩn bị cho kỳ thi.'],
  ['復習', 'ふくしゅう', 'ôn tập', 'PHỤC TẬP', '毎日単語を復習します。', 'Mỗi ngày tôi đều ôn tập từ vựng.'],
];

function normalizeExternalLinkInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let candidate = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = candidate.startsWith('//') ? `https:${candidate}` : `https://${candidate}`;
  }
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (!parsed.hostname || !parsed.hostname.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function deriveLinkMaterialTitle(urlStr: string): string {
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    if (host.includes('drive.google.com')) return 'Tài liệu Google Drive';
    if (host.includes('docs.google.com')) return 'Tài liệu Google Docs';
    if (host.includes('sheets.google.com')) return 'Bảng tính Google Sheets';
    if (host.includes('slides.google.com')) return 'Slide Google';
    if (host.includes('youtu.be') || host.includes('youtube.com')) return 'Video YouTube';
    return `Tài liệu (${host.replace(/^www\./, '')})`;
  } catch {
    return 'Liên kết tài liệu';
  }
}

function parseLessonCsvText(rawText: string) {
  const rows = parseCsv(rawText).filter((r) => r.some((c) => c.trim().length > 0));
  if (rows.length === 0) return [];
  const first = rows[0].map((c) => c.trim().toLowerCase());
  const hasHeader =
    first.includes('word') ||
    first.includes('meaning') ||
    first.includes('từ') ||
    first.includes('nghĩa');
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return dataRows
    .map((cols) => ({
      word: (cols[0] ?? '').trim(),
      reading: (cols.length >= 3 ? cols[1] : cols[0])?.trim() || null,
      meaning: (cols.length >= 3 ? cols[2] : cols[1])?.trim() || '',
      sinoVietnamese: (cols[3] ?? '').trim() || null,
      example: (cols[4] ?? '').trim() || null,
      exampleMeaning: (cols[5] ?? '').trim() || null,
    }))
    .filter((it) => it.word.length > 0 && it.meaning.length > 0);
}

type DeleteConfirmTarget =
  | { kind: 'lesson'; lesson: AdminLessonDto }
  | { kind: 'material'; material: LessonMaterialDto }
  | { kind: 'item'; item: LessonItemDto };

function inferMimeType(fileName: string, rawMime?: string | null): string {
  const clean = (rawMime ?? '').trim().toLowerCase();
  if (clean && clean !== 'application/octet-stream') return clean;
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.pptx')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.wav')) return 'audio/wav';
  return 'application/pdf';
}

function formatBytes(size: number | null): string {
  if (!size || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function openExternalUrl(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  void Linking.openURL(url);
}

interface AdminLessonsTabProps {
  refreshSignal?: number;
}

export function AdminLessonsTab({ refreshSignal = 0 }: AdminLessonsTabProps) {
  const [levelFilter, setLevelFilter] = useState<'ALL' | JlptLevel>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | LessonStatus>('all');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  const [lessons, setLessons] = useState<AdminLessonDto[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // Create Lesson Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLevel, setNewLevel] = useState<JlptLevel>('N3');
  const [newCategory, setNewCategory] = useState('Từ vựng');
  const [newSummary, setNewSummary] = useState('');
  const [newAccessTier, setNewAccessTier] = useState<SubscriptionTier>('free');
  const [newStatus, setNewStatus] = useState<LessonStatus>('published');

  // Detail Editor State
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLevel, setEditLevel] = useState<JlptLevel>('N3');
  const [editCategory, setEditCategory] = useState('Từ vựng');
  const [editSummary, setEditSummary] = useState('');
  const [editContentMd, setEditContentMd] = useState('');
  const [editAccessTier, setEditAccessTier] = useState<SubscriptionTier>('free');
  const [editStatus, setEditStatus] = useState<LessonStatus>('published');
  const [editSortOrder, setEditSortOrder] = useState('0');
  const [items, setItems] = useState<LessonItemDto[]>([]);
  const [materials, setMaterials] = useState<LessonMaterialDto[]>([]);

  // Material Forms (Progressive Disclosure)
  const [showUploadMeta, setShowUploadMeta] = useState(false);
  const [matFileTitle, setMatFileTitle] = useState('');
  const [matFileDesc, setMatFileDesc] = useState('');
  const [matLinkTitle, setMatLinkTitle] = useState('');
  const [matLinkUrl, setMatLinkUrl] = useState('');
  const [matLinkDesc, setMatLinkDesc] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);

  // Single Vocab (Add / Inline Edit) & CSV Bulk Import Forms
  const [showVocabForm, setShowVocabForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [vWord, setVWord] = useState('');
  const [vReading, setVReading] = useState('');
  const [vMeaning, setVMeaning] = useState('');
  const [vSino, setVSino] = useState('');
  const [vExample, setVExample] = useState('');
  const [vExampleVi, setVExampleVi] = useState('');
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  // Confirm Dialog Target
  const [confirmTarget, setConfirmTarget] = useState<DeleteConfirmTarget | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  const clearVocabInputs = () => {
    setEditingItemId(null);
    setVWord('');
    setVReading('');
    setVMeaning('');
    setVSino('');
    setVExample('');
    setVExampleVi('');
  };

  const resetDetailDisclosure = () => {
    setShowUploadMeta(false);
    setShowLinkForm(false);
    setShowVocabForm(false);
    setCsvOpen(false);
    setCsvFileName(null);
    clearVocabInputs();
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchAdminLessons(levelFilter, statusFilter, debouncedQ);
      setLessons(res.lessons);
      setLoadedOnce(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được danh sách bài học.');
    } finally {
      setLoading(false);
    }
  }, [levelFilter, statusFilter, debouncedQ]);

  const loadDetail = useCallback(async (lessonId: string, resetPanels = false) => {
    setBusy(true);
    setErrorMsg(null);
    if (resetPanels) {
      resetDetailDisclosure();
    }
    try {
      const data = await fetchAdminLessonDetail(lessonId);
      const l = data.lesson;
      setActiveLessonId(l.id);
      setEditTitle(l.title);
      setEditLevel(l.jlptLevel);
      setEditCategory(l.category);
      setEditSummary(l.summary);
      setEditContentMd(l.contentMd);
      setEditAccessTier(l.accessTier);
      setEditStatus(l.status);
      setEditSortOrder(String(l.sortOrder));
      setItems(data.items);
      setMaterials(data.materials);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được chi tiết bài học.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const prevRefreshRef = useRef(refreshSignal);
  useEffect(() => {
    if (prevRefreshRef.current === refreshSignal) return;
    prevRefreshRef.current = refreshSignal;
    void loadList();
    if (activeLessonId) {
      void loadDetail(activeLessonId);
    }
  }, [refreshSignal, loadList, loadDetail, activeLessonId]);

  const handleExitEditor = () => {
    setActiveLessonId(null);
    resetDetailDisclosure();
  };

  const handleCreateLesson = async () => {
    if (!newTitle.trim() || busy) return;
    setBusy(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      const res = await createAdminLesson({
        title: newTitle.trim(),
        jlptLevel: newLevel,
        category: newCategory,
        summary: newSummary.trim(),
        contentMd: '',
        accessTier: newAccessTier,
        status: newStatus,
        sortOrder: 0,
      });
      setCreateOpen(false);
      setNewTitle('');
      setNewSummary('');
      setNoticeMsg(`Đã tạo bài học "${res.lesson.title}".`);
      await loadList();
      await loadDetail(res.lesson.id, true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tạo được bài học.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!activeLessonId || !editTitle.trim() || busy) return;
    setBusy(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      await updateAdminLesson(activeLessonId, {
        title: editTitle.trim(),
        jlptLevel: editLevel,
        category: editCategory,
        summary: editSummary.trim(),
        contentMd: editContentMd,
        accessTier: editAccessTier,
        status: editStatus,
        sortOrder: Number(editSortOrder.replace(/[^0-9]/g, '')) || 0,
      });
      setNoticeMsg('Đã lưu thông tin bài học.');
      await loadList();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không lưu được bài học.');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadFile = async () => {
    if (!activeLessonId || busy) return;
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'text/plain',
          'text/markdown',
          'application/vnd.openxmlformats-officedocument.*',
          'audio/*',
        ],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      setBusy(true);
      const base64Data = await fileAssetToBase64(asset.uri);
      const fileName = asset.name || 'tai-lieu.pdf';
      const mimeType = inferMimeType(fileName, asset.mimeType);
      const title = matFileTitle.trim() || fileName.replace(/\.[^.]+$/, '');
      await uploadAdminLessonMaterialFile(activeLessonId, {
        title,
        fileName,
        mimeType,
        base64Data,
        description: matFileDesc.trim(),
      });
      setMatFileTitle('');
      setMatFileDesc('');
      setShowUploadMeta(false);
      setNoticeMsg(`Đã tải lên tài liệu "${title}".`);
      await Promise.all([loadDetail(activeLessonId), loadList()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Tải lên tài liệu thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddLink = async () => {
    if (!activeLessonId || busy) return;
    setErrorMsg(null);
    setNoticeMsg(null);
    const normalizedUrl = normalizeExternalLinkInput(matLinkUrl);
    if (!normalizedUrl) {
      setErrorMsg('Vui lòng nhập đường dẫn tài liệu hợp lệ (vd: https://drive.google.com/...).');
      return;
    }
    const resolvedTitle = matLinkTitle.trim() || deriveLinkMaterialTitle(normalizedUrl);
    setBusy(true);
    try {
      await addAdminLessonMaterialLink(activeLessonId, {
        title: resolvedTitle,
        externalUrl: normalizedUrl,
        description: matLinkDesc.trim(),
      });
      setMatLinkTitle('');
      setMatLinkUrl('');
      setMatLinkDesc('');
      setShowLinkForm(false);
      setNoticeMsg(`Đã gắn liên kết "${resolvedTitle}".`);
      await Promise.all([loadDetail(activeLessonId), loadList()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thêm được liên kết.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenMaterial = (mat: LessonMaterialDto) => {
    if (mat.materialType === 'link' && mat.externalUrl) {
      openExternalUrl(mat.externalUrl);
      return;
    }
    const cached = getCachedAdminSession();
    if (cached?.accessToken) {
      openExternalUrl(buildMaterialFileUrl(mat.id, cached.accessToken));
      return;
    }
    void readAdminSession().then((session) => {
      openExternalUrl(buildMaterialFileUrl(mat.id, session?.accessToken ?? null));
    });
  };

  const handlePickCsvFile = async () => {
    if (!activeLessonId || busy) return;
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/csv',
          'application/vnd.ms-excel',
          'text/plain',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      const text = await fileAssetToText(asset.uri);
      const parsedCount = parseLessonCsvText(text).length;
      setCsvText(text);
      setCsvFileName(asset.name || 'tu-vung.csv');
      if (parsedCount === 0) {
        setErrorMsg(`Đã mở "${asset.name || 'CSV'}" nhưng chưa thấy dòng từ + nghĩa hợp lệ nào.`);
      } else {
        setNoticeMsg(`Đã đọc ${parsedCount} từ vựng từ "${asset.name || 'tệp CSV'}". Bấm "Nhập danh sách vào bài" để lưu.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không đọc được tệp CSV đã chọn.');
    }
  };

  const handleDownloadSampleCsv = () => {
    setErrorMsg(null);
    const downloaded = downloadCsvFile(
      'mau-tu-vung-bai-hoc.csv',
      ['word', 'reading', 'meaning', 'sinoVietnamese', 'example', 'exampleMeaning'],
      SAMPLE_LESSON_CSV_ROWS,
    );
    if (!downloaded) {
      setCsvText(SAMPLE_LESSON_CSV);
      setCsvFileName('mau-tu-vung-bai-hoc.csv');
      setNoticeMsg('Đã điền dữ liệu mẫu CSV vào ô nhập.');
    }
  };

  const handleStartEditItem = (item: LessonItemDto) => {
    setEditingItemId(item.id);
    setVWord(item.word);
    setVReading(item.reading ?? '');
    setVMeaning(item.meaning);
    setVSino(item.sinoVietnamese ?? '');
    setVExample(item.example ?? '');
    setVExampleVi(item.exampleMeaning ?? '');
    setCsvOpen(false);
    setShowVocabForm(true);
  };

  const handleToggleVocabForm = () => {
    if (showVocabForm) {
      setShowVocabForm(false);
      clearVocabInputs();
      return;
    }
    clearVocabInputs();
    setCsvOpen(false);
    setShowVocabForm(true);
  };

  const handleSaveVocabItem = async () => {
    if (!activeLessonId || !vWord.trim() || !vMeaning.trim() || busy) return;
    setBusy(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    const payload = {
      word: vWord.trim(),
      reading: vReading.trim() || null,
      meaning: vMeaning.trim(),
      sinoVietnamese: vSino.trim() || null,
      example: vExample.trim() || null,
      exampleMeaning: vExampleVi.trim() || null,
    };

    try {
      if (editingItemId) {
        await updateAdminLessonItem(activeLessonId, editingItemId, payload);
        clearVocabInputs();
        setShowVocabForm(false);
        setNoticeMsg(`Đã cập nhật từ "${payload.word}".`);
      } else {
        await addAdminLessonItem(activeLessonId, payload);
        clearVocabInputs();
        setNoticeMsg(`Đã thêm từ "${payload.word}" vào bài học.`);
      }
      await Promise.all([loadDetail(activeLessonId), loadList()]);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : editingItemId
            ? 'Không cập nhật được từ vựng.'
            : 'Không thêm được từ vựng.',
      );
    } finally {
      setBusy(false);
    }
  };

  const parsedCsvItems = React.useMemo(() => parseLessonCsvText(csvText), [csvText]);

  const handleBulkImportCsv = async () => {
    if (!activeLessonId || busy) return;
    if (!csvText.trim()) {
      setErrorMsg('Vui lòng chọn tệp CSV từ máy hoặc dán dữ liệu CSV trước khi nhập.');
      return;
    }
    const parsedItems = parseLessonCsvText(csvText);
    if (parsedItems.length === 0) {
      setErrorMsg('Không tìm thấy dòng từ vựng hợp lệ nào (cần ít nhất cột word và meaning).');
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      const res = await bulkAddAdminLessonItems(activeLessonId, parsedItems);
      setCsvText('');
      setCsvFileName(null);
      setCsvOpen(false);
      setNoticeMsg(`Đã nhập ${res.addedCount} từ vựng vào bài học.`);
      await Promise.all([loadDetail(activeLessonId), loadList()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không nhập được CSV.');
    } finally {
      setBusy(false);
    }
  };

  const handleExecuteConfirmDelete = async () => {
    if (!confirmTarget || busy) return;
    const target = confirmTarget;
    setBusy(true);
    setErrorMsg(null);
    setNoticeMsg(null);

    try {
      if (target.kind === 'lesson') {
        await deleteAdminLesson(target.lesson.id);
        if (activeLessonId === target.lesson.id) {
          handleExitEditor();
        }
        setNoticeMsg(`Đã xóa bài học "${target.lesson.title}".`);
        await loadList();
      } else if (target.kind === 'material' && activeLessonId) {
        await deleteAdminLessonMaterial(activeLessonId, target.material.id);
        setNoticeMsg(`Đã xóa tài liệu "${target.material.title}".`);
        await Promise.all([loadDetail(activeLessonId), loadList()]);
      } else if (target.kind === 'item' && activeLessonId) {
        await deleteAdminLessonItem(activeLessonId, target.item.id);
        if (editingItemId === target.item.id) {
          clearVocabInputs();
          setShowVocabForm(false);
        }
        setNoticeMsg(`Đã xóa từ "${target.item.word}".`);
        await Promise.all([loadDetail(activeLessonId), loadList()]);
      }
      setConfirmTarget(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Thao tác xóa thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}
      {noticeMsg ? (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>{noticeMsg}</Text>
        </View>
      ) : null}

      {activeLessonId ? (
        /* Selected Lesson Content & Materials Editor */
        <View style={styles.editorStack}>
          <Pressable style={styles.backLinkBtn} onPress={handleExitEditor}>
            <Text style={styles.backLinkText}>← Quay lại danh sách bài học</Text>
          </Pressable>

          {/* Metadata Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Thông tin bài học</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Tiêu đề bài học"
              placeholderTextColor={adminTheme.colors.textMuted}
              style={styles.input}
            />
            <View style={styles.filterGroup}>
              {JLPT_OPTIONS.map((lv) => (
                <Pressable
                  key={lv}
                  style={[styles.chip, editLevel === lv && styles.chipActive]}
                  onPress={() => setEditLevel(lv)}
                >
                  <Text style={[styles.chipText, editLevel === lv && styles.chipTextActive]}>
                    {lv}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.filterGroup}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.chip, editCategory === cat && styles.chipActive]}
                  onPress={() => setEditCategory(cat)}
                >
                  <Text style={[styles.chipText, editCategory === cat && styles.chipTextActive]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.rowBetweenWrap}>
              <View style={styles.filterGroup}>
                {(
                  [
                    ['free', 'Miễn phí'],
                    ['plus', 'Plus'],
                    ['pro', 'Pro AI'],
                  ] as const
                ).map(([t, lbl]) => (
                  <Pressable
                    key={t}
                    style={[styles.chip, editAccessTier === t && styles.chipActive]}
                    onPress={() => setEditAccessTier(t)}
                  >
                    <Text style={[styles.chipText, editAccessTier === t && styles.chipTextActive]}>
                      {lbl}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.filterGroup}>
                {(
                  [
                    ['published', 'Công khai'],
                    ['draft', 'Bản nháp'],
                  ] as const
                ).map(([st, lbl]) => (
                  <Pressable
                    key={st}
                    style={[styles.chip, editStatus === st && styles.chipDarkActive]}
                    onPress={() => setEditStatus(st)}
                  >
                    <Text style={[styles.chipText, editStatus === st && styles.chipTextActive]}>
                      {lbl}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <TextInput
              value={editSummary}
              onChangeText={setEditSummary}
              placeholder="Tóm tắt ngắn gọn nội dung bài"
              placeholderTextColor={adminTheme.colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={editContentMd}
              onChangeText={setEditContentMd}
              multiline
              placeholder="Ghi chú bài giảng / điểm ngữ pháp cần nhớ..."
              placeholderTextColor={adminTheme.colors.textMuted}
              style={[styles.input, styles.textArea]}
            />
            <View style={styles.rowBetween}>
              <Text style={styles.mutedLabel}>Thứ tự hiển thị</Text>
              <TextInput
                value={editSortOrder}
                onChangeText={(v) => setEditSortOrder(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                style={styles.orderInput}
              />
            </View>
            <Pressable style={styles.primaryBtn} disabled={busy} onPress={() => void handleSaveMetadata()}>
              <Text style={styles.primaryBtnText}>{busy ? 'Đang lưu...' : 'Lưu thông tin bài học'}</Text>
            </Pressable>
          </View>

          {/* Materials Upload & Link Card */}
          <View style={styles.card}>
            <View style={styles.rowBetweenWrap}>
              <Text style={styles.cardTitle}>Tài liệu đính kèm ({materials.length})</Text>
              <View style={styles.filterGroup}>
                <Pressable
                  style={styles.outlineBtn}
                  onPress={() => setShowUploadMeta((v) => !v)}
                >
                  <Text style={styles.outlineBtnText}>
                    {showUploadMeta ? 'Ẩn tùy chọn tệp' : 'Tên / Mô tả tệp'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.outlineBtn}
                  onPress={() => setShowLinkForm((v) => !v)}
                >
                  <Text style={styles.outlineBtnText}>
                    {showLinkForm ? 'Đóng gắn link' : '+ Gắn link'}
                  </Text>
                </Pressable>
                <Pressable style={styles.uploadBtn} disabled={busy} onPress={() => void handleUploadFile()}>
                  <UploadIcon size={14} color={adminTheme.colors.accentHover} />
                  <Text style={styles.uploadBtnText}>Tải lên tệp</Text>
                </Pressable>
              </View>
            </View>

            {showUploadMeta ? (
              <View style={styles.subBox}>
                <TextInput
                  value={matFileTitle}
                  onChangeText={setMatFileTitle}
                  placeholder="Tên hiển thị (mặc định: tên tệp)"
                  placeholderTextColor={adminTheme.colors.textMuted}
                  style={styles.input}
                />
                <TextInput
                  value={matFileDesc}
                  onChangeText={setMatFileDesc}
                  placeholder="Mô tả ngắn"
                  placeholderTextColor={adminTheme.colors.textMuted}
                  style={styles.input}
                />
              </View>
            ) : null}

            {showLinkForm ? (
              <View style={styles.subBox}>
                <TextInput
                  value={matLinkTitle}
                  onChangeText={setMatLinkTitle}
                  placeholder="Tên tài liệu (tùy chọn — tự đặt nếu để trống)"
                  placeholderTextColor={adminTheme.colors.textMuted}
                  style={styles.input}
                />
                <TextInput
                  value={matLinkUrl}
                  onChangeText={setMatLinkUrl}
                  placeholder="https://drive.google.com/..."
                  placeholderTextColor={adminTheme.colors.textMuted}
                  autoCapitalize="none"
                  style={styles.input}
                />
                <TextInput
                  value={matLinkDesc}
                  onChangeText={setMatLinkDesc}
                  placeholder="Ghi chú ngắn"
                  placeholderTextColor={adminTheme.colors.textMuted}
                  style={styles.input}
                />
                <Pressable style={styles.primaryBtn} disabled={busy} onPress={() => void handleAddLink()}>
                  <Text style={styles.primaryBtnText}>Thêm liên kết tài liệu</Text>
                </Pressable>
              </View>
            ) : null}

            {materials.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có tài liệu đính kèm nào.</Text>
            ) : (
              materials.map((m) => (
                <View key={m.id} style={styles.itemRow}>
                  <Pressable style={styles.itemLeft} onPress={() => void handleOpenMaterial(m)}>
                    <View style={styles.badgeRow}>
                      {m.materialType === 'file' ? (
                        <DownloadIcon size={15} color={adminTheme.colors.accentHover} />
                      ) : (
                        <LinkExternalIcon size={15} color={adminTheme.colors.accentHover} />
                      )}
                      <Text style={styles.itemTitle}>{m.title}</Text>
                    </View>
                    <Text style={styles.itemSub}>
                      {m.materialType === 'file'
                        ? `${m.fileName ?? 'Tệp'} ${formatBytes(m.fileSize) ? `· ${formatBytes(m.fileSize)}` : ''}`
                        : m.externalUrl}
                      {m.description ? ` · ${m.description}` : ''}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Xóa tài liệu ${m.title}`}
                    style={styles.dangerIconBtn}
                    onPress={() => setConfirmTarget({ kind: 'material', material: m })}
                  >
                    <TrashIcon size={15} color={adminTheme.colors.dangerText} />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          {/* Vocabulary Items Card */}
          <View style={styles.card}>
            <View style={styles.rowBetweenWrap}>
              <Text style={styles.cardTitle}>Từ vựng trong bài ({items.length})</Text>
              <View style={styles.filterGroup}>
                <Pressable
                  style={styles.outlineBtn}
                  onPress={() => {
                    setShowVocabForm(false);
                    setCsvOpen((v) => !v);
                  }}
                >
                  <Text style={styles.outlineBtnText}>{csvOpen ? 'Đóng CSV' : 'Nhập CSV'}</Text>
                </Pressable>
                <Pressable style={styles.primaryBtnSmall} onPress={handleToggleVocabForm}>
                  <Text style={styles.primaryBtnText}>
                    {showVocabForm ? 'Đóng' : '+ Thêm từ'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {csvOpen ? (
              <View style={styles.subBox}>
                <Text style={styles.itemSub}>
                  Cột: word, reading, meaning, sinoVietnamese, example, exampleMeaning
                </Text>
                <View style={styles.filterGroup}>
                  <Pressable
                    style={styles.uploadBtn}
                    disabled={busy}
                    onPress={() => void handlePickCsvFile()}
                  >
                    <UploadIcon size={14} color={adminTheme.colors.accentHover} />
                    <Text style={styles.uploadBtnText}>Chọn tệp CSV từ máy</Text>
                  </Pressable>
                  <Pressable style={styles.outlineBtn} onPress={handleDownloadSampleCsv}>
                    <Text style={styles.outlineBtnText}>Tải file CSV mẫu</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setCsvText(SAMPLE_LESSON_CSV);
                      setCsvFileName(null);
                    }}
                  >
                    <Text style={styles.sampleLink}>Điền mẫu vào ô</Text>
                  </Pressable>
                </View>
                {csvFileName || parsedCsvItems.length > 0 ? (
                  <Text style={styles.itemSub}>
                    {csvFileName ? `Tệp: ${csvFileName} · ` : ''}
                    Phát hiện {parsedCsvItems.length} dòng từ vựng hợp lệ
                  </Text>
                ) : null}
                <TextInput
                  value={csvText}
                  onChangeText={(txt) => {
                    setCsvText(txt);
                    if (!txt.trim()) setCsvFileName(null);
                  }}
                  multiline
                  placeholder={SAMPLE_LESSON_CSV}
                  placeholderTextColor={adminTheme.colors.textMuted}
                  style={[styles.input, styles.textArea]}
                />
                <Pressable
                  style={[styles.primaryBtn, (busy || parsedCsvItems.length === 0) && styles.disabledBtn]}
                  disabled={busy}
                  onPress={() => void handleBulkImportCsv()}
                >
                  <Text style={styles.primaryBtnText}>
                    {busy
                      ? 'Đang nhập...'
                      : parsedCsvItems.length > 0
                        ? `Nhập ${parsedCsvItems.length} từ vào bài`
                        : 'Nhập danh sách vào bài'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {showVocabForm ? (
              <View style={styles.subBox}>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionSubTitle}>
                    {editingItemId ? 'Chỉnh sửa từ vựng' : 'Thêm từ vựng mới'}
                  </Text>
                  <Pressable
                    style={styles.outlineBtnSmall}
                    onPress={() => {
                      clearVocabInputs();
                      setShowVocabForm(false);
                    }}
                  >
                    <Text style={styles.outlineBtnText}>Hủy</Text>
                  </Pressable>
                </View>
                <View style={styles.rowPair}>
                  <TextInput
                    value={vWord}
                    onChangeText={setVWord}
                    placeholder="Từ Nhật / Kanji *"
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TextInput
                    value={vReading}
                    onChangeText={setVReading}
                    placeholder="Cách đọc (Kana)"
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
                <View style={styles.rowPair}>
                  <TextInput
                    value={vMeaning}
                    onChangeText={setVMeaning}
                    placeholder="Nghĩa tiếng Việt *"
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={[styles.input, { flex: 2 }]}
                  />
                  <TextInput
                    value={vSino}
                    onChangeText={setVSino}
                    placeholder="Hán Việt"
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
                <TextInput
                  value={vExample}
                  onChangeText={setVExample}
                  placeholder="Câu ví dụ tiếng Nhật"
                  placeholderTextColor={adminTheme.colors.textMuted}
                  style={styles.input}
                />
                <TextInput
                  value={vExampleVi}
                  onChangeText={setVExampleVi}
                  placeholder="Nghĩa câu ví dụ"
                  placeholderTextColor={adminTheme.colors.textMuted}
                  style={styles.input}
                />
                <Pressable
                  style={[styles.primaryBtn, (!vWord.trim() || !vMeaning.trim() || busy) && styles.disabledBtn]}
                  disabled={!vWord.trim() || !vMeaning.trim() || busy}
                  onPress={() => void handleSaveVocabItem()}
                >
                  <Text style={styles.primaryBtnText}>
                    {busy ? 'Đang lưu...' : editingItemId ? 'Lưu thay đổi' : '+ Thêm từ vào bài'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {items.length === 0 ? (
              <Text style={styles.emptyText}>Chưa có từ vựng nào trong bài học này.</Text>
            ) : (
              items.map((it) => (
                <View key={it.id} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.itemTitle}>{it.word}</Text>
                      {it.reading ? <Text style={styles.itemSub}>({it.reading})</Text> : null}
                      {it.sinoVietnamese ? <Text style={styles.sinoTag}>{it.sinoVietnamese}</Text> : null}
                    </View>
                    <Text style={styles.itemMeaning}>{it.meaning}</Text>
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Nghe phát âm ${it.word}`}
                      style={styles.iconBtn}
                      onPress={() => void speakJapanese(it.reading || it.word)}
                    >
                      <VolumeIcon size={15} color={adminTheme.colors.accentHover} />
                    </Pressable>
                    <Pressable
                      style={styles.outlineBtnSmall}
                      onPress={() => handleStartEditItem(it)}
                    >
                      <Text style={styles.outlineBtnText}>Sửa</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa từ ${it.word}`}
                      style={styles.dangerIconBtn}
                      onPress={() => setConfirmTarget({ kind: 'item', item: it })}
                    >
                      <TrashIcon size={15} color={adminTheme.colors.dangerText} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      ) : (
        /* Lesson Catalog List */
        <View style={styles.card}>
          <View style={styles.rowBetweenWrap}>
            <Text style={styles.cardTitle}>Bài học &amp; Tài liệu ({lessons.length})</Text>
            <View style={styles.filterGroup}>
              {q ? (
                <Pressable style={styles.outlineBtn} onPress={() => setQ('')}>
                  <Text style={styles.outlineBtnText}>Xóa tìm kiếm</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.primaryBtnSmall} onPress={() => setCreateOpen(true)}>
                <Text style={styles.primaryBtnText}>+ Tạo bài học mới</Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Tìm tên bài học, chủ đề..."
            placeholderTextColor={adminTheme.colors.textMuted}
            style={styles.input}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterGroup}>
            {(['ALL', ...JLPT_OPTIONS] as const).map((lv) => (
              <Pressable
                key={lv}
                style={[styles.chip, levelFilter === lv && styles.chipActive]}
                onPress={() => setLevelFilter(lv)}
              >
                <Text style={[styles.chipText, levelFilter === lv && styles.chipTextActive]}>
                  {lv === 'ALL' ? 'Tất cả cấp' : lv}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.filterGroup}>
            {(
              [
                ['all', 'Tất cả trạng thái'],
                ['published', 'Công khai'],
                ['draft', 'Bản nháp'],
              ] as const
            ).map(([st, lbl]) => (
              <Pressable
                key={st}
                style={[styles.chip, statusFilter === st && styles.chipDarkActive]}
                onPress={() => setStatusFilter(st)}
              >
                <Text style={[styles.chipText, statusFilter === st && styles.chipTextActive]}>{lbl}</Text>
              </Pressable>
            ))}
          </View>

          {loading && !loadedOnce ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={adminTheme.colors.accent} />
            </View>
          ) : lessons.length === 0 ? (
            <Text style={styles.emptyText}>
              {q.trim()
                ? 'Không tìm thấy bài học phù hợp.'
                : 'Chưa có bài học nào. Hãy bấm "+ Tạo bài học mới".'}
            </Text>
          ) : (
            <View style={styles.listGap}>
              {lessons.map((l) => (
                <View key={l.id} style={styles.lessonRow}>
                  <View style={styles.itemLeft}>
                    <View style={styles.badgeRow}>
                      <View style={styles.levelBadge}>
                        <Text style={styles.levelBadgeText}>{l.jlptLevel}</Text>
                      </View>
                      <View style={styles.neutralBadge}>
                        <Text style={styles.neutralBadgeText}>{l.category}</Text>
                      </View>
                      <View style={styles.tierBadge}>
                        <Text style={styles.tierBadgeText}>
                          {l.accessTier === 'free' ? 'Miễn phí' : l.accessTier.toUpperCase()}
                        </Text>
                      </View>
                      {l.status === 'draft' ? (
                        <View style={styles.draftBadge}>
                          <Text style={styles.draftBadgeText}>Nháp</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.itemTitle}>{l.title}</Text>
                    <Text style={styles.itemSub}>
                      {l.itemCount} từ vựng · {l.materialCount} tài liệu
                    </Text>
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable style={styles.outlineBtn} onPress={() => void loadDetail(l.id, true)}>
                      <Text style={styles.outlineBtnText}>Nội dung</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa bài học ${l.title}`}
                      style={styles.dangerIconBtn}
                      onPress={() => setConfirmTarget({ kind: 'lesson', lesson: l })}
                    >
                      <TrashIcon size={15} color={adminTheme.colors.dangerText} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Create Lesson Modal */}
      <Modal
        visible={createOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Tạo bài học mới</Text>
              <Pressable style={styles.closeBtn} onPress={() => setCreateOpen(false)}>
                <Text style={styles.closeText}>Đóng</Text>
              </Pressable>
            </View>

            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Tên bài học (vd: Từ vựng công sở N3)"
              placeholderTextColor={adminTheme.colors.textMuted}
              style={styles.input}
            />

            <Text style={styles.mutedLabel}>Cấp độ JLPT</Text>
            <View style={styles.filterGroup}>
              {JLPT_OPTIONS.map((lv) => (
                <Pressable
                  key={lv}
                  style={[styles.chip, newLevel === lv && styles.chipActive]}
                  onPress={() => setNewLevel(lv)}
                >
                  <Text style={[styles.chipText, newLevel === lv && styles.chipTextActive]}>{lv}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.mutedLabel}>Chủ đề</Text>
            <View style={styles.filterGroup}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.chip, newCategory === cat && styles.chipActive]}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text style={[styles.chipText, newCategory === cat && styles.chipTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.mutedLabel}>Quyền xem &amp; Trạng thái</Text>
            <View style={styles.filterGroup}>
              {(
                [
                  ['free', 'Miễn phí'],
                  ['plus', 'Plus'],
                  ['pro', 'Pro AI'],
                ] as const
              ).map(([t, lbl]) => (
                <Pressable
                  key={t}
                  style={[styles.chip, newAccessTier === t && styles.chipActive]}
                  onPress={() => setNewAccessTier(t)}
                >
                  <Text style={[styles.chipText, newAccessTier === t && styles.chipTextActive]}>{lbl}</Text>
                </Pressable>
              ))}
              {(
                [
                  ['published', 'Công khai'],
                  ['draft', 'Nháp'],
                ] as const
              ).map(([st, lbl]) => (
                <Pressable
                  key={st}
                  style={[styles.chip, newStatus === st && styles.chipDarkActive]}
                  onPress={() => setNewStatus(st)}
                >
                  <Text style={[styles.chipText, newStatus === st && styles.chipTextActive]}>{lbl}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={newSummary}
              onChangeText={setNewSummary}
              placeholder="Mô tả ngắn bài học"
              placeholderTextColor={adminTheme.colors.textMuted}
              style={styles.input}
            />

            <Pressable
              style={[styles.primaryBtn, (!newTitle.trim() || busy) && styles.disabledBtn]}
              disabled={!newTitle.trim() || busy}
              onPress={() => void handleCreateLesson()}
            >
              <Text style={styles.primaryBtnText}>
                {busy ? 'Đang tạo...' : 'Tạo bài học & Soạn nội dung →'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <AdminConfirmModal
        visible={Boolean(confirmTarget)}
        title={
          confirmTarget?.kind === 'lesson'
            ? 'Xác nhận xóa bài học'
            : confirmTarget?.kind === 'material'
              ? 'Xác nhận xóa tài liệu'
              : 'Xác nhận xóa từ vựng'
        }
        message={
          confirmTarget?.kind === 'lesson'
            ? `Bài học "${confirmTarget.lesson.title}" cùng toàn bộ từ vựng và tài liệu đính kèm sẽ bị xóa vĩnh viễn.`
            : confirmTarget?.kind === 'material'
              ? `Xóa tài liệu "${confirmTarget.material.title}" khỏi bài học này?`
              : confirmTarget?.kind === 'item'
                ? `Xóa từ "${confirmTarget.item.word}" (${confirmTarget.item.meaning}) khỏi bài học?`
                : ''
        }
        confirmLabel={
          confirmTarget?.kind === 'lesson'
            ? 'Xóa bài học'
            : confirmTarget?.kind === 'material'
              ? 'Xóa tài liệu'
              : 'Xóa từ vựng'
        }
        tone="danger"
        busy={busy}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => void handleExecuteConfirmDelete()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  editorStack: { gap: 14 },
  errorBanner: {
    backgroundColor: adminTheme.colors.dangerBg,
    borderWidth: 1,
    borderColor: adminTheme.colors.dangerBorder,
    borderRadius: adminTheme.radius.md,
    padding: 12,
  },
  errorText: { color: adminTheme.colors.dangerText, fontSize: 13, fontWeight: '600' },
  noticeBanner: {
    backgroundColor: adminTheme.colors.successBg,
    borderWidth: 1,
    borderColor: adminTheme.colors.successBorder,
    borderRadius: adminTheme.radius.md,
    padding: 12,
  },
  noticeText: { color: adminTheme.colors.successText, fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.card,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: adminTheme.colors.textPrimary },
  sectionSubTitle: { fontSize: 13, fontWeight: '800', color: adminTheme.colors.textPrimary },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowBetweenWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: adminTheme.radius.pill,
    backgroundColor: adminTheme.colors.chipBg,
  },
  chipActive: { backgroundColor: adminTheme.colors.accent },
  chipDarkActive: { backgroundColor: adminTheme.colors.textPrimary },
  chipText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  loadingWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: adminTheme.colors.textMuted, paddingVertical: 8 },
  listGap: { gap: 10 },
  lessonRow: {
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderRadius: adminTheme.radius.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemRow: {
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderRadius: adminTheme.radius.md,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemLeft: { flex: 1, minWidth: 0, gap: 3 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  levelBadge: {
    backgroundColor: adminTheme.colors.accentSoft,
    borderRadius: adminTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelBadgeText: { fontSize: 11, fontWeight: '800', color: adminTheme.colors.accentHover },
  neutralBadge: {
    backgroundColor: adminTheme.colors.chipBg,
    borderRadius: adminTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  neutralBadgeText: { fontSize: 11, fontWeight: '700', color: adminTheme.colors.textSecondary },
  tierBadge: {
    backgroundColor: adminTheme.colors.infoBg,
    borderRadius: adminTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tierBadgeText: { fontSize: 11, fontWeight: '700', color: adminTheme.colors.infoText },
  draftBadge: {
    backgroundColor: adminTheme.colors.warningBg,
    borderRadius: adminTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  draftBadgeText: { fontSize: 11, fontWeight: '700', color: adminTheme.colors.warningText },
  itemTitle: { fontSize: 14, fontWeight: '800', color: adminTheme.colors.textPrimary },
  itemSub: { fontSize: 12, color: adminTheme.colors.textSecondary },
  itemMeaning: { fontSize: 13, color: adminTheme.colors.textPrimary },
  sinoTag: { fontSize: 11, fontWeight: '700', color: adminTheme.colors.accentHover },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    backgroundColor: adminTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: adminTheme.colors.dangerBorder,
    backgroundColor: adminTheme.colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLinkBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  backLinkText: { fontSize: 13, fontWeight: '700', color: adminTheme.colors.accentHover },
  input: {
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: adminTheme.colors.textPrimary,
  },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  orderInput: {
    width: 78,
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    textAlign: 'center',
    color: adminTheme.colors.textPrimary,
  },
  mutedLabel: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textSecondary },
  subBox: {
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    borderRadius: adminTheme.radius.md,
    padding: 12,
    gap: 8,
  },
  rowPair: { flexDirection: 'row', gap: 8 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: adminTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: adminTheme.colors.accentBorder,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  uploadBtnText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.accentHover },
  outlineBtn: {
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  outlineBtnSmall: {
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    backgroundColor: adminTheme.colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  outlineBtnText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textPrimary },
  sampleLink: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.accentHover },
  primaryBtnSmall: {
    backgroundColor: adminTheme.colors.accent,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryBtn: {
    backgroundColor: adminTheme.colors.accent,
    borderRadius: adminTheme.radius.input,
    paddingVertical: 11,
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.55 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  closeBtn: {
    backgroundColor: adminTheme.colors.chipBg,
    borderRadius: adminTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textPrimary },
  modalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(24, 24, 27, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.card,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 18,
    gap: 10,
  },
});
