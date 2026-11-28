import React, { useCallback, useEffect, useState } from 'react';
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
import { DownloadIcon, LinkExternalIcon, TrashIcon, UploadIcon, VolumeIcon } from '../../components/AppIcons';
import { parseCsv } from '../../import-parser';
import { nihongoTheme } from '../../theme/nihongo-theme';
import { speakJapanese } from '../../utils/speak-japanese';
import { getCachedAuthSession, readAuthSession } from '../auth/auth-store';
import {
  buildMaterialFileUrl,
  type JlptLevel,
  type LessonItemDto,
  type LessonMaterialDto,
  type LessonStatus,
  type SubscriptionTier,
} from '../lessons/lessons-api';
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
  updateAdminLesson,
  uploadAdminLessonMaterialFile,
  type AdminLessonDto,
} from './admin-api';

const JLPT_OPTIONS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const CATEGORIES = ['Từ vựng', 'Kanji', 'Ngữ pháp', 'Đọc hiểu', 'Tài liệu ôn thi'];

const SAMPLE_LESSON_CSV =
  'word,reading,meaning,sinoVietnamese,example,exampleMeaning\n' +
  '準備,じゅんび,"chuẩn bị",CHUẨN BỊ,試験の準備をします。,Tôi chuẩn bị cho kỳ thi.\n' +
  '復習,ふくしゅう,"ôn tập",PHỤC TẬP,毎日単語を復習します。,Mỗi ngày tôi đều ôn tập từ vựng.';

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

export function AdminLessonsTab() {
  const [levelFilter, setLevelFilter] = useState<'ALL' | JlptLevel>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | LessonStatus>('all');
  const [lessons, setLessons] = useState<AdminLessonDto[]>([]);
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

  // Material Forms
  const [matFileTitle, setMatFileTitle] = useState('');
  const [matFileDesc, setMatFileDesc] = useState('');
  const [matLinkTitle, setMatLinkTitle] = useState('');
  const [matLinkUrl, setMatLinkUrl] = useState('');
  const [matLinkDesc, setMatLinkDesc] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);

  // Single Vocab & CSV Bulk Import Forms
  const [vWord, setVWord] = useState('');
  const [vReading, setVReading] = useState('');
  const [vMeaning, setVMeaning] = useState('');
  const [vSino, setVSino] = useState('');
  const [vExample, setVExample] = useState('');
  const [vExampleVi, setVExampleVi] = useState('');
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  const loadList = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchAdminLessons(levelFilter, statusFilter);
      setLessons(res.lessons);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được danh sách bài học.');
    } finally {
      setLoading(false);
    }
  }, [levelFilter, statusFilter]);

  const loadDetail = useCallback(async (lessonId: string) => {
    setBusy(true);
    setErrorMsg(null);
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
      await loadDetail(res.lesson.id);
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

  const handleDeleteLesson = async (lesson: AdminLessonDto) => {
    if (busy) return;
    setBusy(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      await deleteAdminLesson(lesson.id);
      if (activeLessonId === lesson.id) setActiveLessonId(null);
      setNoticeMsg(`Đã xóa bài học "${lesson.title}".`);
      await loadList();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không xóa được bài học.');
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
      setNoticeMsg(`Đã tải lên tài liệu "${title}".`);
      await Promise.all([loadDetail(activeLessonId), loadList()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Tải lên tài liệu thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddLink = async () => {
    if (!activeLessonId || !matLinkTitle.trim() || !matLinkUrl.trim() || busy) return;
    setBusy(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      await addAdminLessonMaterialLink(activeLessonId, {
        title: matLinkTitle.trim(),
        externalUrl: matLinkUrl.trim(),
        description: matLinkDesc.trim(),
      });
      setMatLinkTitle('');
      setMatLinkUrl('');
      setMatLinkDesc('');
      setShowLinkForm(false);
      setNoticeMsg('Đã thêm liên kết tài liệu.');
      await Promise.all([loadDetail(activeLessonId), loadList()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thêm được liên kết.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!activeLessonId || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await deleteAdminLessonMaterial(activeLessonId, materialId);
      await Promise.all([loadDetail(activeLessonId), loadList()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không xóa được tài liệu.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenMaterial = async (mat: LessonMaterialDto) => {
    if (mat.materialType === 'link' && mat.externalUrl) {
      openExternalUrl(mat.externalUrl);
      return;
    }
    const session = getCachedAuthSession() ?? (await readAuthSession());
    openExternalUrl(buildMaterialFileUrl(mat.id, session?.accessToken ?? null));
  };

  const handleAddSingleItem = async () => {
    if (!activeLessonId || !vWord.trim() || !vMeaning.trim() || busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await addAdminLessonItem(activeLessonId, {
        word: vWord.trim(),
        reading: vReading.trim() || null,
        meaning: vMeaning.trim(),
        sinoVietnamese: vSino.trim() || null,
        example: vExample.trim() || null,
        exampleMeaning: vExampleVi.trim() || null,
      });
      setVWord('');
      setVReading('');
      setVMeaning('');
      setVSino('');
      setVExample('');
      setVExampleVi('');
      await Promise.all([loadDetail(activeLessonId), loadList()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thêm được từ vựng.');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkImportCsv = async () => {
    if (!activeLessonId || !csvText.trim() || busy) return;
    const rows = parseCsv(csvText).filter((r) => r.some((c) => c.trim().length > 0));
    if (rows.length === 0) return;
    const first = rows[0].map((c) => c.trim().toLowerCase());
    const hasHeader = first.includes('word') || first.includes('meaning') || first.includes('từ');
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const parsedItems = dataRows
      .map((cols) => ({
        word: (cols[0] ?? '').trim(),
        reading: (cols.length >= 3 ? cols[1] : cols[0])?.trim() || null,
        meaning: (cols.length >= 3 ? cols[2] : cols[1])?.trim() || '',
        sinoVietnamese: (cols[3] ?? '').trim() || null,
        example: (cols[4] ?? '').trim() || null,
        exampleMeaning: (cols[5] ?? '').trim() || null,
      }))
      .filter((it) => it.word.length > 0 && it.meaning.length > 0);

    if (parsedItems.length === 0) {
      setErrorMsg('Không tìm thấy dòng từ vựng hợp lệ nào trong CSV.');
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await bulkAddAdminLessonItems(activeLessonId, parsedItems);
      setCsvText('');
      setCsvOpen(false);
      setNoticeMsg(`Đã nhập ${res.addedCount} từ vựng vào bài học.`);
      await Promise.all([loadDetail(activeLessonId), loadList()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không nhập được CSV.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!activeLessonId || busy) return;
    setBusy(true);
    try {
      await deleteAdminLessonItem(activeLessonId, itemId);
      await Promise.all([loadDetail(activeLessonId), loadList()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không xóa được từ vựng.');
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
          <Pressable style={styles.backLinkBtn} onPress={() => setActiveLessonId(null)}>
            <Text style={styles.backLinkText}>← Quay lại danh sách bài học</Text>
          </Pressable>

          {/* Metadata Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Thông tin bài học</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Tiêu đề bài học"
              style={styles.input}
            />
            <View style={styles.filterGroup}>
              {JLPT_OPTIONS.map((lv) => (
                <Pressable
                  key={lv}
                  style={[styles.chip, editLevel === lv && styles.chipActive]}
                  onPress={() => setEditLevel(lv)}
                >
                  <Text style={[styles.chipText, editLevel === lv && styles.chipTextActive]}>{lv}</Text>
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
                  <Text style={[styles.chipText, editCategory === cat && styles.chipTextActive]}>{cat}</Text>
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
                    style={[styles.chip, editStatus === st && styles.chipActive]}
                    onPress={() => setEditStatus(st)}
                  >
                    <Text style={[styles.chipText, editStatus === st && styles.chipTextActive]}>{lbl}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <TextInput
              value={editSummary}
              onChangeText={setEditSummary}
              placeholder="Tóm tắt ngắn gọn nội dung bài..."
              style={styles.input}
            />
            <TextInput
              value={editContentMd}
              onChangeText={setEditContentMd}
              multiline
              placeholder="Ghi chú bài giảng / điểm ngữ pháp cần nhớ cho học viên..."
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
            <Text style={styles.cardTitle}>Tài liệu đính kèm ({materials.length})</Text>
            <TextInput
              value={matFileTitle}
              onChangeText={setMatFileTitle}
              placeholder="Tên hiển thị tài liệu (tùy chọn, mặc định lấy tên tệp)"
              style={styles.input}
            />
            <TextInput
              value={matFileDesc}
              onChangeText={setMatFileDesc}
              placeholder="Mô tả ngắn (tùy chọn)"
              style={styles.input}
            />
            <View style={styles.filterGroup}>
              <Pressable style={styles.uploadBtn} disabled={busy} onPress={() => void handleUploadFile()}>
                <UploadIcon size={15} color={nihongoTheme.colors.accentHover} />
                <Text style={styles.uploadBtnText}>Tải lên tệp (PDF, Ảnh, DOCX, Audio...)</Text>
              </Pressable>
              <Pressable
                style={styles.outlineBtn}
                onPress={() => setShowLinkForm((v) => !v)}
              >
                <Text style={styles.outlineBtnText}>{showLinkForm ? 'Đóng thêm link' : '+ Gắn link tài liệu'}</Text>
              </Pressable>
            </View>

            {showLinkForm ? (
              <View style={styles.subBox}>
                <TextInput
                  value={matLinkTitle}
                  onChangeText={setMatLinkTitle}
                  placeholder="Tên tài liệu (vd: Đề cương ngữ pháp N3)"
                  style={styles.input}
                />
                <TextInput
                  value={matLinkUrl}
                  onChangeText={setMatLinkUrl}
                  placeholder="https://drive.google.com/..."
                  autoCapitalize="none"
                  style={styles.input}
                />
                <TextInput
                  value={matLinkDesc}
                  onChangeText={setMatLinkDesc}
                  placeholder="Ghi chú ngắn"
                  style={styles.input}
                />
                <Pressable style={styles.primaryBtn} disabled={busy} onPress={() => void handleAddLink()}>
                  <Text style={styles.primaryBtnText}>Thêm liên kết tài liệu</Text>
                </Pressable>
              </View>
            ) : null}

            {materials.map((m) => (
              <View key={m.id} style={styles.itemRow}>
                <Pressable style={styles.itemLeft} onPress={() => void handleOpenMaterial(m)}>
                  <View style={styles.badgeRow}>
                    {m.materialType === 'file' ? (
                      <DownloadIcon size={15} color={nihongoTheme.colors.accentHover} />
                    ) : (
                      <LinkExternalIcon size={15} color={nihongoTheme.colors.accentHover} />
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
                <Pressable onPress={() => void handleDeleteMaterial(m.id)}>
                  <TrashIcon size={16} color="#DC2626" />
                </Pressable>
              </View>
            ))}
          </View>

          {/* Vocabulary Items Card */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Từ vựng trong bài ({items.length})</Text>
              <Pressable style={styles.outlineBtn} onPress={() => setCsvOpen((v) => !v)}>
                <Text style={styles.outlineBtnText}>{csvOpen ? 'Đóng CSV' : 'Nhập nhanh CSV'}</Text>
              </Pressable>
            </View>

            {csvOpen ? (
              <View style={styles.subBox}>
                <Text style={styles.itemSub}>
                  Cột: word, reading, meaning, sinoVietnamese, example, exampleMeaning
                </Text>
                <Pressable onPress={() => setCsvText(SAMPLE_LESSON_CSV)}>
                  <Text style={styles.sampleLink}>Điền mẫu CSV</Text>
                </Pressable>
                <TextInput
                  value={csvText}
                  onChangeText={setCsvText}
                  multiline
                  placeholder={SAMPLE_LESSON_CSV}
                  style={[styles.input, styles.textArea]}
                />
                <Pressable style={styles.primaryBtn} disabled={busy} onPress={() => void handleBulkImportCsv()}>
                  <Text style={styles.primaryBtnText}>Nhập danh sách vào bài</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.subBox}>
              <View style={styles.rowPair}>
                <TextInput
                  value={vWord}
                  onChangeText={setVWord}
                  placeholder="Từ Nhật / Kanji *"
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  value={vReading}
                  onChangeText={setVReading}
                  placeholder="Cách đọc (Kana)"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <View style={styles.rowPair}>
                <TextInput
                  value={vMeaning}
                  onChangeText={setVMeaning}
                  placeholder="Nghĩa tiếng Việt *"
                  style={[styles.input, { flex: 2 }]}
                />
                <TextInput
                  value={vSino}
                  onChangeText={setVSino}
                  placeholder="Hán Việt"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <TextInput
                value={vExample}
                onChangeText={setVExample}
                placeholder="Câu ví dụ tiếng Nhật (tùy chọn)"
                style={styles.input}
              />
              <TextInput
                value={vExampleVi}
                onChangeText={setVExampleVi}
                placeholder="Nghĩa câu ví dụ (tùy chọn)"
                style={styles.input}
              />
              <Pressable style={styles.primaryBtn} disabled={busy} onPress={() => void handleAddSingleItem()}>
                <Text style={styles.primaryBtnText}>+ Thêm từ vào bài</Text>
              </Pressable>
            </View>

            {items.map((it) => (
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
                  <Pressable onPress={() => void speakJapanese(it.reading || it.word)}>
                    <VolumeIcon size={16} color={nihongoTheme.colors.accentHover} />
                  </Pressable>
                  <Pressable onPress={() => void handleDeleteItem(it.id)}>
                    <TrashIcon size={16} color="#DC2626" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        /* Lesson Catalog List */
        <View style={styles.card}>
          <View style={styles.rowBetweenWrap}>
            <Text style={styles.cardTitle}>Bài học &amp; Tài liệu ({lessons.length})</Text>
            <Pressable style={styles.primaryBtnSmall} onPress={() => setCreateOpen(true)}>
              <Text style={styles.primaryBtnText}>+ Tạo bài học mới</Text>
            </Pressable>
          </View>

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
                style={[styles.chip, statusFilter === st && styles.chipActive]}
                onPress={() => setStatusFilter(st)}
              >
                <Text style={[styles.chipText, statusFilter === st && styles.chipTextActive]}>{lbl}</Text>
              </Pressable>
            ))}
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={nihongoTheme.colors.accent} />
            </View>
          ) : lessons.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có bài học nào. Hãy bấm &ldquo;+ Tạo bài học mới&rdquo;.</Text>
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
                    <Pressable style={styles.outlineBtn} onPress={() => void loadDetail(l.id)}>
                      <Text style={styles.outlineBtnText}>Nội dung</Text>
                    </Pressable>
                    <Pressable onPress={() => void handleDeleteLesson(l)}>
                      <TrashIcon size={16} color="#DC2626" />
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
              <Pressable onPress={() => setCreateOpen(false)}>
                <Text style={styles.closeText}>Đóng</Text>
              </Pressable>
            </View>

            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Tên bài học (vd: Từ vựng công sở N3 - Bài 1)"
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
                  style={[styles.chip, newStatus === st && styles.chipActive]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  editorStack: { gap: 14 },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  noticeBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
  },
  noticeText: { color: '#1B873F', fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: nihongoTheme.colors.textPrimary },
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
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  chipActive: { backgroundColor: nihongoTheme.colors.accent },
  chipText: { fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  loadingWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: nihongoTheme.colors.textMuted, paddingVertical: 12 },
  listGap: { gap: 10 },
  lessonRow: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderLight,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemRow: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderLight,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.md,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemLeft: { flex: 1, minWidth: 0, gap: 3 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  levelBadge: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelBadgeText: { fontSize: 11, fontWeight: '800', color: nihongoTheme.colors.accentHover },
  neutralBadge: { backgroundColor: '#EFEAE4', borderRadius: nihongoTheme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  neutralBadgeText: { fontSize: 11, fontWeight: '700', color: nihongoTheme.colors.textSecondary },
  tierBadge: { backgroundColor: '#EEF2FF', borderRadius: nihongoTheme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  tierBadgeText: { fontSize: 11, fontWeight: '700', color: '#4338CA' },
  draftBadge: { backgroundColor: '#FFF7ED', borderRadius: nihongoTheme.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  draftBadgeText: { fontSize: 11, fontWeight: '700', color: '#C25E00' },
  itemTitle: { fontSize: 14, fontWeight: '800', color: nihongoTheme.colors.textPrimary },
  itemSub: { fontSize: 12, color: nihongoTheme.colors.textSecondary },
  itemMeaning: { fontSize: 13, color: nihongoTheme.colors.textPrimary },
  sinoTag: { fontSize: 11, fontWeight: '700', color: nihongoTheme.colors.accentHover },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backLinkBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  backLinkText: { fontSize: 13, fontWeight: '700', color: nihongoTheme.colors.accentHover },
  input: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
  },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  orderInput: {
    width: 78,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    textAlign: 'center',
    color: nihongoTheme.colors.textPrimary,
  },
  mutedLabel: { fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.textSecondary },
  subBox: {
    backgroundColor: '#FAF7F3',
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderLight,
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    gap: 8,
  },
  rowPair: { flexDirection: 'row', gap: 8 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  uploadBtnText: { fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.accentHover },
  outlineBtn: {
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  outlineBtnText: { fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.textPrimary },
  sampleLink: { fontSize: 12, fontWeight: '700', color: nihongoTheme.colors.accentHover },
  primaryBtnSmall: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 11,
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.55 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  closeText: { fontSize: 13, fontWeight: '700', color: nihongoTheme.colors.accentHover },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28,25,23,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 10,
    ...nihongoTheme.shadow.dock,
  },
});
