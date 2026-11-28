import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { LinkExternalIcon, TrashIcon } from '../../components/AppIcons';
import { parseYouTubeVideoId } from '../shadowing/shadowing-api';
import { AdminConfirmModal } from './AdminConfirmModal';
import { adminTheme } from './admin-theme';
import {
  createAdminShadowingVideo,
  deleteAdminShadowingVideo,
  fetchAdminShadowingVideos,
  updateAdminShadowingVideo,
  type AdminShadowingStatus,
  type AdminShadowingVideoDto,
} from './admin-api';

interface AdminShadowingTabProps {
  refreshSignal?: number;
}

const LEVEL_PRESETS = ['N5 - N4', 'N4 - N3', 'N3 - N2', 'N2 - N1'] as const;

function openYouTubeUrl(videoId: string) {
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  void Linking.openURL(url);
}

export function AdminShadowingTab({ refreshSignal = 0 }: AdminShadowingTabProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | AdminShadowingStatus>('all');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  const [videos, setVideos] = useState<AdminShadowingVideoDto[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<AdminShadowingVideoDto | null>(null);
  const [fUrlOrId, setFUrlOrId] = useState('');
  const [fTitle, setFTitle] = useState('');
  const [fChannel, setFChannel] = useState('');
  const [fLevel, setFLevel] = useState('N4 - N3');
  const [fDuration, setFDuration] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fStatus, setFStatus] = useState<AdminShadowingStatus>('published');
  const [fSortOrder, setFSortOrder] = useState('0');

  const [deleteTarget, setDeleteTarget] = useState<AdminShadowingVideoDto | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 200);
    return () => clearTimeout(timer);
  }, [q]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchAdminShadowingVideos(statusFilter, debouncedQ);
      setVideos(res.videos);
      setLoadedOnce(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được danh sách video Shadowing.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedQ]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const prevRefreshRef = useRef(refreshSignal);
  useEffect(() => {
    if (prevRefreshRef.current === refreshSignal) return;
    prevRefreshRef.current = refreshSignal;
    void loadList();
  }, [refreshSignal, loadList]);

  const openCreateModal = () => {
    setEditingVideo(null);
    setFUrlOrId('');
    setFTitle('');
    setFChannel('');
    setFLevel('N4 - N3');
    setFDuration('');
    setFDescription('');
    setFStatus('published');
    setFSortOrder('0');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (v: AdminShadowingVideoDto) => {
    setEditingVideo(v);
    setFUrlOrId(v.videoId);
    setFTitle(v.title);
    setFChannel(v.channel);
    setFLevel(v.level);
    setFDuration(v.duration);
    setFDescription(v.description);
    setFStatus(v.status);
    setFSortOrder(String(v.sortOrder));
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (busy) return;
    const parsedId = parseYouTubeVideoId(fUrlOrId);
    if (!parsedId) {
      setErrorMsg('Link hoặc mã YouTube không hợp lệ (cần URL YouTube hoặc mã ID 11 ký tự).');
      return;
    }
    if (editingVideo && !fTitle.trim()) {
      setErrorMsg('Tiêu đề video không được để trống.');
      return;
    }

    setBusy(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    const sortNum = Number(fSortOrder.replace(/[^0-9]/g, '')) || 0;
    try {
      if (editingVideo) {
        const res = await updateAdminShadowingVideo(editingVideo.id, {
          urlOrId: fUrlOrId.trim(),
          title: fTitle.trim(),
          channel: fChannel.trim(),
          level: fLevel.trim(),
          duration: fDuration.trim(),
          description: fDescription.trim(),
          status: fStatus,
          sortOrder: sortNum,
        });
        setNoticeMsg(`Đã cập nhật video "${res.video.title}".`);
      } else {
        const res = await createAdminShadowingVideo({
          urlOrId: fUrlOrId.trim(),
          title: fTitle.trim(),
          channel: fChannel.trim(),
          level: fLevel.trim(),
          duration: fDuration.trim(),
          description: fDescription.trim(),
          status: fStatus,
          sortOrder: sortNum,
        });
        setNoticeMsg(`Đã thêm video "${res.video.title}".`);
      }
      setModalOpen(false);
      await loadList();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không lưu được video Shadowing.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleVisibility = async (v: AdminShadowingVideoDto) => {
    if (busy) return;
    const nextStatus: AdminShadowingStatus = v.status === 'published' ? 'hidden' : 'published';
    setBusy(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      await updateAdminShadowingVideo(v.id, { status: nextStatus });
      setNoticeMsg(
        nextStatus === 'hidden'
          ? `Đã ẩn video "${v.title}" khỏi ứng dụng học viên.`
          : `Đã hiển thị lại video "${v.title}".`,
      );
      await loadList();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không đổi được trạng thái video.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || busy) return;
    setBusy(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      await deleteAdminShadowingVideo(deleteTarget.id);
      setNoticeMsg(`Đã xóa video "${deleteTarget.title}".`);
      setDeleteTarget(null);
      await loadList();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không xóa được video.');
    } finally {
      setBusy(false);
    }
  };

  const previewVideoId = parseYouTubeVideoId(fUrlOrId);

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

      <View style={styles.card}>
        <View style={styles.rowBetweenWrap}>
          <View>
            <Text style={styles.cardTitle}>Video Shadowing ({videos.length})</Text>
            <Text style={styles.helperSub}>
              Quản lý danh sách video mẫu hiển thị trong tab &ldquo;Tất cả&rdquo; của học viên.
            </Text>
          </View>
          <Pressable style={styles.primaryBtnSmall} onPress={openCreateModal}>
            <Text style={styles.primaryBtnText}>+ Thêm link YouTube</Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Tìm theo tiêu đề, kênh, mã video..."
            placeholderTextColor={adminTheme.colors.textMuted}
            style={[styles.input, { flex: 1, minWidth: 220 }]}
          />
          <View style={styles.filterGroup}>
            {(
              [
                ['all', 'Tất cả'],
                ['published', 'Đang hiển thị'],
                ['hidden', 'Đang ẩn'],
              ] as const
            ).map(([st, lbl]) => (
              <Pressable
                key={st}
                style={[styles.chip, statusFilter === st && styles.chipDarkActive]}
                onPress={() => setStatusFilter(st)}
              >
                <Text style={[styles.chipText, statusFilter === st && styles.chipTextActive]}>
                  {lbl}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loading && !loadedOnce ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={adminTheme.colors.accent} />
          </View>
        ) : videos.length === 0 ? (
          <Text style={styles.emptyText}>
            {q.trim()
              ? 'Không tìm thấy video phù hợp.'
              : 'Chưa có video Shadowing nào trong mục này.'}
          </Text>
        ) : (
          <View style={styles.listGap}>
            {videos.map((v) => {
              const hidden = v.status === 'hidden';
              return (
                <View key={v.id} style={[styles.videoRow, hidden && styles.videoRowHidden]}>
                  <Image
                    source={{ uri: `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg` }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                  <View style={styles.videoMeta}>
                    <View style={styles.badgeRow}>
                      <View style={hidden ? styles.hiddenBadge : styles.publishedBadge}>
                        <Text style={hidden ? styles.hiddenBadgeText : styles.publishedBadgeText}>
                          {hidden ? 'Đang ẩn' : 'Đang hiển thị'}
                        </Text>
                      </View>
                      {v.level ? (
                        <View style={styles.levelBadge}>
                          <Text style={styles.levelBadgeText}>{v.level}</Text>
                        </View>
                      ) : null}
                      {v.duration ? (
                        <View style={styles.neutralBadge}>
                          <Text style={styles.neutralBadgeText}>{v.duration}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.codeTag}>{v.videoId}</Text>
                    </View>
                    <Text style={styles.itemTitle}>{v.title}</Text>
                    {v.channel ? <Text style={styles.itemSub}>Kênh: {v.channel}</Text> : null}
                    {v.description ? (
                      <Text style={styles.itemDesc} numberOfLines={2}>
                        {v.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable
                      style={styles.outlineBtnSmall}
                      onPress={() => openYouTubeUrl(v.videoId)}
                    >
                      <View style={styles.inlineIconText}>
                        <LinkExternalIcon size={13} color={adminTheme.colors.textPrimary} />
                        <Text style={styles.outlineBtnText}>YouTube</Text>
                      </View>
                    </Pressable>
                    <Pressable
                      style={hidden ? styles.showBtnSmall : styles.hideBtnSmall}
                      disabled={busy}
                      onPress={() => void handleToggleVisibility(v)}
                    >
                      <Text style={hidden ? styles.showBtnText : styles.hideBtnText}>
                        {hidden ? 'Hiện lại' : 'Ẩn video'}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.outlineBtnSmall} onPress={() => openEditModal(v)}>
                      <Text style={styles.outlineBtnText}>Sửa</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa video ${v.title}`}
                      style={styles.dangerIconBtn}
                      onPress={() => setDeleteTarget(v)}
                    >
                      <TrashIcon size={15} color={adminTheme.colors.dangerText} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>
                {editingVideo ? 'Chỉnh sửa video Shadowing' : 'Thêm video Shadowing mới'}
              </Text>
              <Pressable style={styles.closeBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.closeText}>Đóng</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollBody}>
              {previewVideoId ? (
                <Image
                  source={{ uri: `https://img.youtube.com/vi/${previewVideoId}/hqdefault.jpg` }}
                  style={styles.previewThumb}
                  resizeMode="cover"
                />
              ) : null}

              <Text style={styles.fieldLabel}>Link YouTube hoặc Video ID *</Text>
              <TextInput
                value={fUrlOrId}
                onChangeText={setFUrlOrId}
                placeholder="https://www.youtube.com/watch?v=... hoặc mã 11 ký tự"
                placeholderTextColor={adminTheme.colors.textMuted}
                autoCapitalize="none"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>
                {editingVideo ? 'Tiêu đề *' : 'Tiêu đề (để trống sẽ tự lấy từ YouTube)'}
              </Text>
              <TextInput
                value={fTitle}
                onChangeText={setFTitle}
                placeholder="Tên video hiển thị cho học viên"
                placeholderTextColor={adminTheme.colors.textMuted}
                style={styles.input}
              />

              <View style={styles.rowPair}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.fieldLabel}>Kênh / Nguồn</Text>
                  <TextInput
                    value={fChannel}
                    onChangeText={setFChannel}
                    placeholder="Tên kênh YouTube"
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={styles.input}
                  />
                </View>
                <View style={{ width: 110, gap: 4 }}>
                  <Text style={styles.fieldLabel}>Thời lượng</Text>
                  <TextInput
                    value={fDuration}
                    onChangeText={setFDuration}
                    placeholder="12:45"
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={styles.input}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Cấp độ gợi ý</Text>
              <View style={styles.filterGroup}>
                {LEVEL_PRESETS.map((preset) => (
                  <Pressable
                    key={preset}
                    style={[styles.chip, fLevel === preset && styles.chipActive]}
                    onPress={() => setFLevel(preset)}
                  >
                    <Text style={[styles.chipText, fLevel === preset && styles.chipTextActive]}>
                      {preset}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={fLevel}
                onChangeText={setFLevel}
                placeholder="vd: N4 - N3"
                placeholderTextColor={adminTheme.colors.textMuted}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Mô tả ngắn</Text>
              <TextInput
                value={fDescription}
                onChangeText={setFDescription}
                multiline
                placeholder="Nội dung chính và gợi ý luyện nghe..."
                placeholderTextColor={adminTheme.colors.textMuted}
                style={[styles.input, styles.textArea]}
              />

              <View style={styles.rowBetweenWrap}>
                <View style={styles.filterGroup}>
                  {(
                    [
                      ['published', 'Đang hiển thị'],
                      ['hidden', 'Đang ẩn'],
                    ] as const
                  ).map(([st, lbl]) => (
                    <Pressable
                      key={st}
                      style={[styles.chip, fStatus === st && styles.chipDarkActive]}
                      onPress={() => setFStatus(st)}
                    >
                      <Text style={[styles.chipText, fStatus === st && styles.chipTextActive]}>
                        {lbl}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.inlineRow}>
                  <Text style={styles.fieldLabel}>Thứ tự:</Text>
                  <TextInput
                    value={fSortOrder}
                    onChangeText={(txt) => setFSortOrder(txt.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    style={styles.orderInput}
                  />
                </View>
              </View>
            </ScrollView>

            <Pressable
              style={[styles.primaryBtn, (!fUrlOrId.trim() || busy) && styles.disabledBtn]}
              disabled={!fUrlOrId.trim() || busy}
              onPress={() => void handleSave()}
            >
              <Text style={styles.primaryBtnText}>
                {busy ? 'Đang lưu...' : editingVideo ? 'Lưu thay đổi' : 'Thêm video vào hệ thống'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <AdminConfirmModal
        visible={Boolean(deleteTarget)}
        title="Xóa video Shadowing?"
        message={
          deleteTarget
            ? `Video "${deleteTarget.title}" (${deleteTarget.videoId}) sẽ bị xóa khỏi danh sách hệ thống.`
            : ''
        }
        confirmLabel="Xóa video"
        tone="danger"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
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
  helperSub: { fontSize: 12, color: adminTheme.colors.textMuted, marginTop: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowBetweenWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
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
  videoRow: {
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderRadius: adminTheme.radius.md,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  videoRowHidden: { opacity: 0.72, backgroundColor: '#F4F4F5' },
  thumb: {
    width: 112,
    height: 63,
    borderRadius: 8,
    backgroundColor: '#18181B',
  },
  videoMeta: { flex: 1, minWidth: 220, gap: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  publishedBadge: {
    backgroundColor: adminTheme.colors.successBg,
    borderRadius: adminTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  publishedBadgeText: { fontSize: 11, fontWeight: '700', color: adminTheme.colors.successText },
  hiddenBadge: {
    backgroundColor: adminTheme.colors.chipBg,
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    borderRadius: adminTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hiddenBadgeText: { fontSize: 11, fontWeight: '700', color: adminTheme.colors.textMuted },
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
  codeTag: { fontSize: 11, fontWeight: '600', color: adminTheme.colors.textMuted },
  itemTitle: { fontSize: 14, fontWeight: '800', color: adminTheme.colors.textPrimary },
  itemSub: { fontSize: 12, color: adminTheme.colors.textSecondary },
  itemDesc: { fontSize: 12, color: adminTheme.colors.textMuted, lineHeight: 17 },
  rowActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  inlineIconText: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  outlineBtnSmall: {
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    backgroundColor: adminTheme.colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  outlineBtnText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textPrimary },
  hideBtnSmall: {
    borderWidth: 1,
    borderColor: adminTheme.colors.borderStrong,
    backgroundColor: adminTheme.colors.chipBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hideBtnText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textSecondary },
  showBtnSmall: {
    borderWidth: 1,
    borderColor: adminTheme.colors.successBorder,
    backgroundColor: adminTheme.colors.successBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  showBtnText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.successText },
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
  textArea: { minHeight: 72, textAlignVertical: 'top' },
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
    maxWidth: 520,
    maxHeight: '90%',
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.card,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 18,
    gap: 12,
  },
  modalScroll: { maxHeight: 460 },
  modalScrollBody: { gap: 8, paddingBottom: 4 },
  previewThumb: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    backgroundColor: '#18181B',
  },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textSecondary },
  rowPair: { flexDirection: 'row', gap: 8 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderInput: {
    width: 72,
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    borderRadius: adminTheme.radius.input,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    textAlign: 'center',
    color: adminTheme.colors.textPrimary,
  },
});
