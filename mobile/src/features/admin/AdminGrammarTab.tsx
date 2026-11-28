import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TrashIcon } from '../../components/AppIcons';
import { GRAMMAR_CATEGORIES, type GrammarCategory } from '../grammar/grammar-api';
import type { JlptLevel } from '../lessons/lessons-api';
import { AdminConfirmModal } from './AdminConfirmModal';
import { adminTheme } from './admin-theme';
import {
  createAdminGrammarBlitz,
  createAdminGrammarPoint,
  createAdminGrammarStar,
  deleteAdminGrammarBlitz,
  deleteAdminGrammarPoint,
  deleteAdminGrammarStar,
  fetchAdminGrammarBlitz,
  fetchAdminGrammarPoints,
  fetchAdminGrammarStar,
  updateAdminGrammarBlitz,
  updateAdminGrammarPoint,
  updateAdminGrammarStar,
  type AdminGrammarBlitzDto,
  type AdminGrammarExampleDto,
  type AdminGrammarPointDto,
  type AdminGrammarStarDto,
  type AdminGrammarStatus,
} from './admin-api';

interface AdminGrammarTabProps {
  refreshSignal?: number;
}

type GrammarSubTab = 'points' | 'star' | 'blitz';
const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  GRAMMAR_CATEGORIES.map((c) => [c.key, c.label]),
);

type DeleteTarget =
  | { kind: 'point'; item: AdminGrammarPointDto }
  | { kind: 'star'; item: AdminGrammarStarDto }
  | { kind: 'blitz'; item: AdminGrammarBlitzDto };

export function AdminGrammarTab({ refreshSignal = 0 }: AdminGrammarTabProps) {
  const [subTab, setSubTab] = useState<GrammarSubTab>('points');
  const [levelFilter, setLevelFilter] = useState<'ALL' | JlptLevel>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [blitzKindFilter, setBlitzKindFilter] = useState<'all' | 'particle' | 'conjugation'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminGrammarStatus>('all');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  const [points, setPoints] = useState<AdminGrammarPointDto[]>([]);
  const [starList, setStarList] = useState<AdminGrammarStarDto[]>([]);
  const [blitzList, setBlitzList] = useState<AdminGrammarBlitzDto[]>([]);
  const [totals, setTotals] = useState({ points: 0, star: 0, blitz: 0 });
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // Shared Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<GrammarSubTab>('points');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mLevel, setMLevel] = useState<JlptLevel>('N3');
  const [mStatus, setMStatus] = useState<AdminGrammarStatus>('published');
  const [mSortOrder, setMSortOrder] = useState('0');

  // Point Fields
  const [pCategory, setPCategory] = useState<GrammarCategory>('time_sequence');
  const [pPattern, setPPattern] = useState('');
  const [pStructure, setPStructure] = useState('');
  const [pMeaningVi, setPMeaningVi] = useState('');
  const [pNuanceVi, setPNuanceVi] = useState('');
  const [pExamples, setPExamples] = useState<AdminGrammarExampleDto[]>([]);

  // Star Fields
  const [sMeaningVi, setSMeaningVi] = useState('');
  const [sPrefixJa, setSPrefixJa] = useState('');
  const [sSuffixJa, setSSuffixJa] = useState('');
  const [sParts, setSParts] = useState<[string, string, string, string]>(['', '', '', '']);
  const [sStarIndex, setSStarIndex] = useState<0 | 1 | 2 | 3>(2);
  const [sExplanationVi, setSExplanationVi] = useState('');

  // Blitz Fields
  const [bKind, setBKind] = useState<'particle' | 'conjugation'>('particle');
  const [bPromptMain, setBPromptMain] = useState('');
  const [bPromptSub, setBPromptSub] = useState('');
  const [bMeaningVi, setBMeaningVi] = useState('');
  const [bChoices, setBChoices] = useState<[string, string, string, string]>(['', '', '', '']);
  const [bCorrectIdx, setBCorrectIdx] = useState<0 | 1 | 2 | 3>(0);
  const [bTipVi, setBTipVi] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 200);
    return () => clearTimeout(timer);
  }, [q]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (subTab === 'points') {
        const res = await fetchAdminGrammarPoints({
          level: levelFilter,
          category: categoryFilter,
          status: statusFilter,
          q: debouncedQ,
        });
        setPoints(res.points);
        setTotals(res.totals);
      } else if (subTab === 'star') {
        const res = await fetchAdminGrammarStar({
          level: levelFilter,
          status: statusFilter,
          q: debouncedQ,
        });
        setStarList(res.questions);
      } else {
        const res = await fetchAdminGrammarBlitz({
          kind: blitzKindFilter,
          level: levelFilter,
          status: statusFilter,
          q: debouncedQ,
        });
        setBlitzList(res.questions);
      }
      setLoadedOnce(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được dữ liệu ngữ pháp JLPT.');
    } finally {
      setLoading(false);
    }
  }, [subTab, levelFilter, categoryFilter, blitzKindFilter, statusFilter, debouncedQ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const prevRefreshRef = useRef(refreshSignal);
  useEffect(() => {
    if (prevRefreshRef.current === refreshSignal) return;
    prevRefreshRef.current = refreshSignal;
    void loadData();
  }, [refreshSignal, loadData]);

  const openCreateModal = () => {
    setModalKind(subTab);
    setEditingId(null);
    setMLevel(levelFilter === 'ALL' ? 'N3' : levelFilter);
    setMStatus('published');
    setMSortOrder('0');
    setErrorMsg(null);

    if (subTab === 'points') {
      setPCategory((categoryFilter === 'ALL' ? 'time_sequence' : categoryFilter) as GrammarCategory);
      setPPattern('');
      setPStructure('');
      setPMeaningVi('');
      setPNuanceVi('');
      setPExamples([{ ja: '', reading: '', vi: '' }]);
    } else if (subTab === 'star') {
      setSMeaningVi('');
      setSPrefixJa('');
      setSSuffixJa('');
      setSParts(['', '', '', '']);
      setSStarIndex(2);
      setSExplanationVi('');
    } else {
      setBKind(blitzKindFilter === 'conjugation' ? 'conjugation' : 'particle');
      setBPromptMain('');
      setBPromptSub('');
      setBMeaningVi('');
      setBChoices(['', '', '', '']);
      setBCorrectIdx(0);
      setBTipVi('');
    }
    setModalOpen(true);
  };

  const openEditPoint = (p: AdminGrammarPointDto) => {
    setModalKind('points');
    setEditingId(p.id);
    setMLevel(p.level);
    setMStatus(p.status);
    setMSortOrder(String(p.sortOrder));
    setPCategory((CATEGORY_LABELS[p.category] ? p.category : 'state_attitude') as GrammarCategory);
    setPPattern(p.pattern);
    setPStructure(p.structure);
    setPMeaningVi(p.meaningVi);
    setPNuanceVi(p.nuanceVi);
    setPExamples(p.examples.length > 0 ? p.examples : [{ ja: '', reading: '', vi: '' }]);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditStar = (s: AdminGrammarStarDto) => {
    setModalKind('star');
    setEditingId(s.id);
    setMLevel(s.level);
    setMStatus(s.status);
    setMSortOrder(String(s.sortOrder));
    setSMeaningVi(s.meaningVi);
    setSPrefixJa(s.prefixJa);
    setSSuffixJa(s.suffixJa);
    setSParts([s.parts[0] ?? '', s.parts[1] ?? '', s.parts[2] ?? '', s.parts[3] ?? '']);
    setSStarIndex(s.starIndex);
    setSExplanationVi(s.explanationVi);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditBlitz = (b: AdminGrammarBlitzDto) => {
    setModalKind('blitz');
    setEditingId(b.id);
    setMLevel(b.level);
    setMStatus(b.status);
    setMSortOrder(String(b.sortOrder));
    setBKind(b.kind);
    setBPromptMain(b.promptMain);
    setBPromptSub(b.promptSub);
    setBMeaningVi(b.meaningVi);
    const ch: [string, string, string, string] = [
      b.choices[0] ?? '',
      b.choices[1] ?? '',
      b.choices[2] ?? '',
      b.choices[3] ?? '',
    ];
    setBChoices(ch);
    const foundIdx = ch.findIndex((c) => c === b.correct);
    setBCorrectIdx((foundIdx >= 0 && foundIdx <= 3 ? foundIdx : 0) as 0 | 1 | 2 | 3);
    setBTipVi(b.tipVi);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (busy) return;
    setErrorMsg(null);
    setNoticeMsg(null);
    const sortOrder = Number(mSortOrder.replace(/[^0-9]/g, '')) || 0;

    try {
      if (modalKind === 'points') {
        if (!pPattern.trim() || !pStructure.trim() || !pMeaningVi.trim()) {
          setErrorMsg('Vui lòng nhập đầy đủ Mẫu ngữ pháp, Cấu trúc và Nghĩa tiếng Việt.');
          return;
        }
        const cleanedExamples = pExamples
          .map((ex) => ({ ja: ex.ja.trim(), reading: ex.reading.trim(), vi: ex.vi.trim() }))
          .filter((ex) => ex.ja.length > 0 && ex.vi.length > 0);
        setBusy(true);
        const payload = {
          level: mLevel,
          category: pCategory,
          pattern: pPattern.trim(),
          structure: pStructure.trim(),
          meaningVi: pMeaningVi.trim(),
          nuanceVi: pNuanceVi.trim(),
          examples: cleanedExamples,
          status: mStatus,
          sortOrder,
        };
        if (editingId) {
          await updateAdminGrammarPoint(editingId, payload);
          setNoticeMsg(`Đã cập nhật mẫu "${payload.pattern}".`);
        } else {
          await createAdminGrammarPoint(payload);
          setNoticeMsg(`Đã thêm mẫu ngữ pháp "${payload.pattern}".`);
        }
      } else if (modalKind === 'star') {
        const trimmedParts = sParts.map((p) => p.trim()) as [string, string, string, string];
        if (!sMeaningVi.trim() || trimmedParts.some((p) => !p)) {
          setErrorMsg('Câu ghép ★ cần nhập đủ nghĩa tiếng Việt và 4 mảnh ghép.');
          return;
        }
        setBusy(true);
        const payload = {
          level: mLevel,
          meaningVi: sMeaningVi.trim(),
          prefixJa: sPrefixJa.trim(),
          suffixJa: sSuffixJa.trim(),
          parts: trimmedParts,
          starIndex: sStarIndex,
          explanationVi: sExplanationVi.trim(),
          status: mStatus,
          sortOrder,
        };
        if (editingId) {
          await updateAdminGrammarStar(editingId, payload);
          setNoticeMsg('Đã cập nhật câu ghép ★.');
        } else {
          await createAdminGrammarStar(payload);
          setNoticeMsg('Đã thêm câu ghép ★ mới.');
        }
      } else {
        const trimmedChoices = bChoices.map((c) => c.trim()) as [string, string, string, string];
        const correctVal = trimmedChoices[bCorrectIdx] ?? '';
        if (!bPromptMain.trim() || !bMeaningVi.trim() || trimmedChoices.some((c) => !c) || !correctVal) {
          setErrorMsg('Câu hỏi Blitz cần nhập câu hỏi, nghĩa và đủ 4 phương án.');
          return;
        }
        setBusy(true);
        const payload = {
          kind: bKind,
          level: mLevel,
          promptMain: bPromptMain.trim(),
          promptSub: bPromptSub.trim(),
          meaningVi: bMeaningVi.trim(),
          correct: correctVal,
          choices: trimmedChoices,
          tipVi: bTipVi.trim(),
          status: mStatus,
          sortOrder,
        };
        if (editingId) {
          await updateAdminGrammarBlitz(editingId, payload);
          setNoticeMsg('Đã cập nhật câu hỏi Blitz.');
        } else {
          await createAdminGrammarBlitz(payload);
          setNoticeMsg('Đã thêm câu hỏi Blitz mới.');
        }
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không lưu được dữ liệu.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStatus = async (
    kind: GrammarSubTab,
    id: string,
    currentStatus: AdminGrammarStatus,
    label: string,
  ) => {
    if (busy) return;
    const nextStatus: AdminGrammarStatus = currentStatus === 'published' ? 'hidden' : 'published';
    setBusy(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      if (kind === 'points') {
        await updateAdminGrammarPoint(id, { status: nextStatus });
      } else if (kind === 'star') {
        await updateAdminGrammarStar(id, { status: nextStatus });
      } else {
        await updateAdminGrammarBlitz(id, { status: nextStatus });
      }
      setNoticeMsg(
        nextStatus === 'hidden'
          ? `Đã ẩn "${label}" khỏi ứng dụng học viên.`
          : `Đã hiển thị lại "${label}".`,
      );
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không đổi được trạng thái.');
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
      if (deleteTarget.kind === 'point') {
        await deleteAdminGrammarPoint(deleteTarget.item.id);
        setNoticeMsg(`Đã xóa mẫu "${deleteTarget.item.pattern}".`);
      } else if (deleteTarget.kind === 'star') {
        await deleteAdminGrammarStar(deleteTarget.item.id);
        setNoticeMsg('Đã xóa câu ghép ★.');
      } else {
        await deleteAdminGrammarBlitz(deleteTarget.item.id);
        setNoticeMsg('Đã xóa câu hỏi Blitz.');
      }
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không xóa được mục đã chọn.');
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

      <View style={styles.card}>
        <View style={styles.rowBetweenWrap}>
          <View>
            <Text style={styles.cardTitle}>Ngữ pháp JLPT</Text>
            <Text style={styles.helperSub}>
              {totals.points} mẫu ngữ pháp · {totals.star} câu ghép ★ · {totals.blitz} câu phản xạ Blitz
            </Text>
          </View>
          <Pressable style={styles.primaryBtnSmall} onPress={openCreateModal}>
            <Text style={styles.primaryBtnText}>
              {subTab === 'points'
                ? '+ Thêm mẫu ngữ pháp'
                : subTab === 'star'
                  ? '+ Thêm câu ghép ★'
                  : '+ Thêm câu Blitz'}
            </Text>
          </Pressable>
        </View>

        {/* Sub Tabs */}
        <View style={styles.filterGroup}>
          {(
            [
              ['points', 'Mẫu ngữ pháp'],
              ['star', 'Câu ghép ★'],
              ['blitz', 'Phản xạ Blitz'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              style={[styles.tabPill, subTab === key && styles.tabPillActive]}
              onPress={() => setSubTab(key)}
            >
              <Text style={[styles.tabPillText, subTab === key && styles.tabPillTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Search + Level + Status Filters */}
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={
            subTab === 'points'
              ? 'Tìm mẫu ngữ pháp, cấu trúc, nghĩa tiếng Việt...'
              : subTab === 'star'
                ? 'Tìm câu ghép ★ theo nghĩa hoặc mảnh câu...'
                : 'Tìm câu hỏi trợ từ / chia thể...'
          }
          placeholderTextColor={adminTheme.colors.textMuted}
          style={styles.input}
        />

        <View style={styles.rowBetweenWrap}>
          <View style={styles.filterGroup}>
            {(['ALL', ...JLPT_LEVELS] as const).map((lv) => (
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
          </View>

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

        {subTab === 'points' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterGroup}
          >
            <Pressable
              style={[styles.chip, categoryFilter === 'ALL' && styles.chipDarkActive]}
              onPress={() => setCategoryFilter('ALL')}
            >
              <Text style={[styles.chipText, categoryFilter === 'ALL' && styles.chipTextActive]}>
                Tất cả chủ đề
              </Text>
            </Pressable>
            {GRAMMAR_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                style={[styles.chip, categoryFilter === cat.key && styles.chipDarkActive]}
                onPress={() => setCategoryFilter(cat.key)}
              >
                <Text
                  style={[styles.chipText, categoryFilter === cat.key && styles.chipTextActive]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : subTab === 'blitz' ? (
          <View style={styles.filterGroup}>
            {(
              [
                ['all', 'Cả trợ từ & chia thể'],
                ['particle', 'Trợ từ'],
                ['conjugation', 'Chia thể'],
              ] as const
            ).map(([k, lbl]) => (
              <Pressable
                key={k}
                style={[styles.chip, blitzKindFilter === k && styles.chipDarkActive]}
                onPress={() => setBlitzKindFilter(k)}
              >
                <Text style={[styles.chipText, blitzKindFilter === k && styles.chipTextActive]}>
                  {lbl}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {loading && !loadedOnce ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={adminTheme.colors.accent} />
          </View>
        ) : subTab === 'points' ? (
          points.length === 0 ? (
            <Text style={styles.emptyText}>Không có mẫu ngữ pháp phù hợp.</Text>
          ) : (
            <View style={styles.listGap}>
              {points.map((p) => {
                const hidden = p.status === 'hidden';
                return (
                  <View key={p.id} style={[styles.itemRow, hidden && styles.itemRowHidden]}>
                    <View style={styles.itemLeft}>
                      <View style={styles.badgeRow}>
                        <View style={styles.levelBadge}>
                          <Text style={styles.levelBadgeText}>{p.level}</Text>
                        </View>
                        <View style={styles.neutralBadge}>
                          <Text style={styles.neutralBadgeText}>
                            {CATEGORY_LABELS[p.category] ?? p.category}
                          </Text>
                        </View>
                        <View style={hidden ? styles.hiddenBadge : styles.publishedBadge}>
                          <Text style={hidden ? styles.hiddenBadgeText : styles.publishedBadgeText}>
                            {hidden ? 'Đang ẩn' : 'Đang hiển thị'}
                          </Text>
                        </View>
                        <Text style={styles.metaSmall}>{p.examples.length} ví dụ</Text>
                      </View>
                      <Text style={styles.itemTitle}>{p.pattern}</Text>
                      <Text style={styles.structureText}>{p.structure}</Text>
                      <Text style={styles.itemSub}>{p.meaningVi}</Text>
                    </View>
                    <View style={styles.rowActions}>
                      <Pressable
                        style={hidden ? styles.showBtnSmall : styles.hideBtnSmall}
                        disabled={busy}
                        onPress={() => void handleToggleStatus('points', p.id, p.status, p.pattern)}
                      >
                        <Text style={hidden ? styles.showBtnText : styles.hideBtnText}>
                          {hidden ? 'Hiện' : 'Ẩn'}
                        </Text>
                      </Pressable>
                      <Pressable style={styles.outlineBtnSmall} onPress={() => openEditPoint(p)}>
                        <Text style={styles.outlineBtnText}>Sửa</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Xóa ${p.pattern}`}
                        style={styles.dangerIconBtn}
                        onPress={() => setDeleteTarget({ kind: 'point', item: p })}
                      >
                        <TrashIcon size={15} color={adminTheme.colors.dangerText} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : subTab === 'star' ? (
          starList.length === 0 ? (
            <Text style={styles.emptyText}>Không có câu ghép ★ phù hợp.</Text>
          ) : (
            <View style={styles.listGap}>
              {starList.map((s) => {
                const hidden = s.status === 'hidden';
                return (
                  <View key={s.id} style={[styles.itemRow, hidden && styles.itemRowHidden]}>
                    <View style={styles.itemLeft}>
                      <View style={styles.badgeRow}>
                        <View style={styles.levelBadge}>
                          <Text style={styles.levelBadgeText}>{s.level}</Text>
                        </View>
                        <View style={hidden ? styles.hiddenBadge : styles.publishedBadge}>
                          <Text style={hidden ? styles.hiddenBadgeText : styles.publishedBadgeText}>
                            {hidden ? 'Đang ẩn' : 'Đang hiển thị'}
                          </Text>
                        </View>
                        <Text style={styles.metaSmall}>★ tại ô {s.starIndex + 1}</Text>
                      </View>
                      <Text style={styles.itemTitle}>
                        {s.prefixJa} [{s.parts.join(' / ')}] {s.suffixJa}
                      </Text>
                      <Text style={styles.itemSub}>{s.meaningVi}</Text>
                    </View>
                    <View style={styles.rowActions}>
                      <Pressable
                        style={hidden ? styles.showBtnSmall : styles.hideBtnSmall}
                        disabled={busy}
                        onPress={() => void handleToggleStatus('star', s.id, s.status, s.meaningVi)}
                      >
                        <Text style={hidden ? styles.showBtnText : styles.hideBtnText}>
                          {hidden ? 'Hiện' : 'Ẩn'}
                        </Text>
                      </Pressable>
                      <Pressable style={styles.outlineBtnSmall} onPress={() => openEditStar(s)}>
                        <Text style={styles.outlineBtnText}>Sửa</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Xóa câu ghép"
                        style={styles.dangerIconBtn}
                        onPress={() => setDeleteTarget({ kind: 'star', item: s })}
                      >
                        <TrashIcon size={15} color={adminTheme.colors.dangerText} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : blitzList.length === 0 ? (
          <Text style={styles.emptyText}>Không có câu hỏi Blitz phù hợp.</Text>
        ) : (
          <View style={styles.listGap}>
            {blitzList.map((b) => {
              const hidden = b.status === 'hidden';
              return (
                <View key={b.id} style={[styles.itemRow, hidden && styles.itemRowHidden]}>
                  <View style={styles.itemLeft}>
                    <View style={styles.badgeRow}>
                      <View style={styles.levelBadge}>
                        <Text style={styles.levelBadgeText}>{b.level}</Text>
                      </View>
                      <View style={styles.neutralBadge}>
                        <Text style={styles.neutralBadgeText}>
                          {b.kind === 'particle' ? 'Trợ từ' : 'Chia thể'}
                        </Text>
                      </View>
                      <View style={hidden ? styles.hiddenBadge : styles.publishedBadge}>
                        <Text style={hidden ? styles.hiddenBadgeText : styles.publishedBadgeText}>
                          {hidden ? 'Đang ẩn' : 'Đang hiển thị'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.itemTitle}>{b.promptMain}</Text>
                    <Text style={styles.itemSub}>
                      Đáp án: <Text style={{ fontWeight: '800' }}>{b.correct}</Text> · {b.meaningVi}
                    </Text>
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable
                      style={hidden ? styles.showBtnSmall : styles.hideBtnSmall}
                      disabled={busy}
                      onPress={() => void handleToggleStatus('blitz', b.id, b.status, b.promptMain)}
                    >
                      <Text style={hidden ? styles.showBtnText : styles.hideBtnText}>
                        {hidden ? 'Hiện' : 'Ẩn'}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.outlineBtnSmall} onPress={() => openEditBlitz(b)}>
                      <Text style={styles.outlineBtnText}>Sửa</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Xóa câu hỏi Blitz"
                      style={styles.dangerIconBtn}
                      onPress={() => setDeleteTarget({ kind: 'blitz', item: b })}
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

      {/* Add / Edit Modal */}
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
                {editingId ? 'Chỉnh sửa' : 'Thêm mới'}{' '}
                {modalKind === 'points'
                  ? 'mẫu ngữ pháp'
                  : modalKind === 'star'
                    ? 'câu ghép ★'
                    : 'câu phản xạ Blitz'}
              </Text>
              <Pressable style={styles.closeBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.closeText}>Đóng</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollBody}>
              <Text style={styles.fieldLabel}>Cấp độ JLPT</Text>
              <View style={styles.filterGroup}>
                {JLPT_LEVELS.map((lv) => (
                  <Pressable
                    key={lv}
                    style={[styles.chip, mLevel === lv && styles.chipActive]}
                    onPress={() => setMLevel(lv)}
                  >
                    <Text style={[styles.chipText, mLevel === lv && styles.chipTextActive]}>
                      {lv}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {modalKind === 'points' ? (
                <>
                  <Text style={styles.fieldLabel}>Nhóm ý nghĩa</Text>
                  <View style={styles.filterGroup}>
                    {GRAMMAR_CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat.key}
                        style={[styles.chip, pCategory === cat.key && styles.chipDarkActive]}
                        onPress={() => setPCategory(cat.key)}
                      >
                        <Text
                          style={[styles.chipText, pCategory === cat.key && styles.chipTextActive]}
                        >
                          {cat.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>Mẫu ngữ pháp *</Text>
                  <TextInput
                    value={pPattern}
                    onChangeText={setPPattern}
                    placeholder="vd: 〜うちに"
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={styles.input}
                  />

                  <Text style={styles.fieldLabel}>Cấu trúc kết hợp *</Text>
                  <TextInput
                    value={pStructure}
                    onChangeText={setPStructure}
                    placeholder="vd: Vる / Vている / Vない + うちに"
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={styles.input}
                  />

                  <Text style={styles.fieldLabel}>Nghĩa tiếng Việt *</Text>
                  <TextInput
                    value={pMeaningVi}
                    onChangeText={setPMeaningVi}
                    placeholder="Nhân lúc..., trong khi..."
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={styles.input}
                  />

                  <Text style={styles.fieldLabel}>Sắc thái / Lưu ý dùng</Text>
                  <TextInput
                    value={pNuanceVi}
                    onChangeText={setPNuanceVi}
                    multiline
                    placeholder="Phân biệt với mẫu tương tự, trường hợp hay nhầm..."
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={[styles.input, styles.textAreaSmall]}
                  />

                  <View style={styles.rowBetween}>
                    <Text style={styles.fieldLabel}>Câu ví dụ ({pExamples.length})</Text>
                    <Pressable
                      style={styles.outlineBtnSmall}
                      onPress={() =>
                        setPExamples((prev) => [...prev, { ja: '', reading: '', vi: '' }])
                      }
                    >
                      <Text style={styles.outlineBtnText}>+ Thêm ví dụ</Text>
                    </Pressable>
                  </View>
                  {pExamples.map((ex, idx) => (
                    <View key={idx} style={styles.exampleBox}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.metaSmall}>Ví dụ #{idx + 1}</Text>
                        {pExamples.length > 1 ? (
                          <Pressable
                            onPress={() =>
                              setPExamples((prev) => prev.filter((_, i) => i !== idx))
                            }
                          >
                            <Text style={styles.removeLink}>Xóa</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <TextInput
                        value={ex.ja}
                        onChangeText={(val) =>
                          setPExamples((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, ja: val } : item)),
                          )
                        }
                        placeholder="Câu tiếng Nhật (ja)"
                        placeholderTextColor={adminTheme.colors.textMuted}
                        style={styles.input}
                      />
                      <TextInput
                        value={ex.reading}
                        onChangeText={(val) =>
                          setPExamples((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, reading: val } : item)),
                          )
                        }
                        placeholder="Cách đọc Kana"
                        placeholderTextColor={adminTheme.colors.textMuted}
                        style={styles.input}
                      />
                      <TextInput
                        value={ex.vi}
                        onChangeText={(val) =>
                          setPExamples((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, vi: val } : item)),
                          )
                        }
                        placeholder="Nghĩa tiếng Việt (vi)"
                        placeholderTextColor={adminTheme.colors.textMuted}
                        style={styles.input}
                      />
                    </View>
                  ))}
                </>
              ) : modalKind === 'star' ? (
                <>
                  <Text style={styles.fieldLabel}>Nghĩa câu tiếng Việt *</Text>
                  <TextInput
                    value={sMeaningVi}
                    onChangeText={setSMeaningVi}
                    placeholder="vd: Xin vui lòng đừng quên đồ..."
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={styles.input}
                  />
                  <View style={styles.rowPair}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.fieldLabel}>Phần đầu (prefix)</Text>
                      <TextInput
                        value={sPrefixJa}
                        onChangeText={setSPrefixJa}
                        placeholder="教室に"
                        placeholderTextColor={adminTheme.colors.textMuted}
                        style={styles.input}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.fieldLabel}>Phần cuối (suffix)</Text>
                      <TextInput
                        value={sSuffixJa}
                        onChangeText={setSSuffixJa}
                        placeholder="くださいね。"
                        placeholderTextColor={adminTheme.colors.textMuted}
                        style={styles.input}
                      />
                    </View>
                  </View>
                  <Text style={styles.fieldLabel}>4 mảnh ghép theo đúng thứ tự * (chọn ô ★)</Text>
                  {[0, 1, 2, 3].map((idx) => (
                    <View key={idx} style={styles.choiceEditRow}>
                      <Pressable
                        style={[
                          styles.starBadgePick,
                          sStarIndex === idx && styles.starBadgePickActive,
                        ]}
                        onPress={() => setSStarIndex(idx as 0 | 1 | 2 | 3)}
                      >
                        <Text
                          style={[
                            styles.starBadgePickText,
                            sStarIndex === idx && styles.chipTextActive,
                          ]}
                        >
                          {sStarIndex === idx ? `★ #${idx + 1}` : `#${idx + 1}`}
                        </Text>
                      </Pressable>
                      <TextInput
                        value={sParts[idx]}
                        onChangeText={(txt) =>
                          setSParts((prev) => {
                            const next = [...prev] as [string, string, string, string];
                            next[idx] = txt;
                            return next;
                          })
                        }
                        placeholder={`Mảnh ${idx + 1}`}
                        placeholderTextColor={adminTheme.colors.textMuted}
                        style={[styles.input, { flex: 1 }]}
                      />
                    </View>
                  ))}
                  <Text style={styles.fieldLabel}>Giải thích đáp án</Text>
                  <TextInput
                    value={sExplanationVi}
                    onChangeText={setSExplanationVi}
                    multiline
                    placeholder="Giải thích cấu trúc kết nối..."
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={[styles.input, styles.textAreaSmall]}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>Loại câu hỏi</Text>
                  <View style={styles.filterGroup}>
                    {(
                      [
                        ['particle', 'Trợ từ'],
                        ['conjugation', 'Chia thể'],
                      ] as const
                    ).map(([k, lbl]) => (
                      <Pressable
                        key={k}
                        style={[styles.chip, bKind === k && styles.chipDarkActive]}
                        onPress={() => setBKind(k)}
                      >
                        <Text style={[styles.chipText, bKind === k && styles.chipTextActive]}>
                          {lbl}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>Câu hỏi chính *</Text>
                  <TextInput
                    value={bPromptMain}
                    onChangeText={setBPromptMain}
                    placeholder="電車 [ ？ ] 会社へ通っています。"
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={styles.input}
                  />

                  <Text style={styles.fieldLabel}>Gợi ý ngữ cảnh</Text>
                  <TextInput
                    value={bPromptSub}
                    onChangeText={setBPromptSub}
                    placeholder="Đi làm bằng tàu điện"
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={styles.input}
                  />

                  <Text style={styles.fieldLabel}>Nghĩa tiếng Việt *</Text>
                  <TextInput
                    value={bMeaningVi}
                    onChangeText={setBMeaningVi}
                    placeholder="Tôi đi làm bằng tàu điện."
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={styles.input}
                  />

                  <Text style={styles.fieldLabel}>4 phương án * (chạm ô tròn bên trái để chọn đáp án đúng)</Text>
                  {[0, 1, 2, 3].map((idx) => (
                    <View key={idx} style={styles.choiceEditRow}>
                      <Pressable
                        style={[
                          styles.starBadgePick,
                          bCorrectIdx === idx && styles.correctBadgePickActive,
                        ]}
                        onPress={() => setBCorrectIdx(idx as 0 | 1 | 2 | 3)}
                      >
                        <Text
                          style={[
                            styles.starBadgePickText,
                            bCorrectIdx === idx && styles.chipTextActive,
                          ]}
                        >
                          {bCorrectIdx === idx ? 'Đúng' : `PA ${idx + 1}`}
                        </Text>
                      </Pressable>
                      <TextInput
                        value={bChoices[idx]}
                        onChangeText={(txt) =>
                          setBChoices((prev) => {
                            const next = [...prev] as [string, string, string, string];
                            next[idx] = txt;
                            return next;
                          })
                        }
                        placeholder={`Phương án ${idx + 1}`}
                        placeholderTextColor={adminTheme.colors.textMuted}
                        style={[styles.input, { flex: 1 }]}
                      />
                    </View>
                  ))}

                  <Text style={styles.fieldLabel}>Mẹo ghi nhớ</Text>
                  <TextInput
                    value={bTipVi}
                    onChangeText={setBTipVi}
                    multiline
                    placeholder="Mẹo phân biệt nhanh..."
                    placeholderTextColor={adminTheme.colors.textMuted}
                    style={[styles.input, styles.textAreaSmall]}
                  />
                </>
              )}

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
                      style={[styles.chip, mStatus === st && styles.chipDarkActive]}
                      onPress={() => setMStatus(st)}
                    >
                      <Text style={[styles.chipText, mStatus === st && styles.chipTextActive]}>
                        {lbl}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.inlineRow}>
                  <Text style={styles.fieldLabel}>Thứ tự:</Text>
                  <TextInput
                    value={mSortOrder}
                    onChangeText={(txt) => setMSortOrder(txt.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    style={styles.orderInput}
                  />
                </View>
              </View>
            </ScrollView>

            <Pressable
              style={[styles.primaryBtn, busy && styles.disabledBtn]}
              disabled={busy}
              onPress={() => void handleSaveModal()}
            >
              <Text style={styles.primaryBtnText}>
                {busy ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo mới'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <AdminConfirmModal
        visible={Boolean(deleteTarget)}
        title="Xác nhận xóa"
        message={
          deleteTarget?.kind === 'point'
            ? `Xóa mẫu ngữ pháp "${deleteTarget.item.pattern}"?`
            : deleteTarget?.kind === 'star'
              ? 'Xóa câu ghép ★ này khỏi ngân hàng JLPT?'
              : deleteTarget?.kind === 'blitz'
                ? 'Xóa câu hỏi Blitz này?'
                : ''
        }
        confirmLabel="Xóa"
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
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: adminTheme.radius.input,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    backgroundColor: adminTheme.colors.surfaceSubtle,
  },
  tabPillActive: {
    borderColor: adminTheme.colors.accent,
    backgroundColor: adminTheme.colors.accentSoft,
  },
  tabPillText: { fontSize: 13, fontWeight: '700', color: adminTheme.colors.textSecondary },
  tabPillTextActive: { color: adminTheme.colors.accentHover },
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
  itemRow: {
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderRadius: adminTheme.radius.md,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemRowHidden: { opacity: 0.72, backgroundColor: '#F4F4F5' },
  itemLeft: { flex: 1, minWidth: 220, gap: 4 },
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
  metaSmall: { fontSize: 11, color: adminTheme.colors.textMuted, fontWeight: '600' },
  itemTitle: { fontSize: 14, fontWeight: '800', color: adminTheme.colors.textPrimary },
  structureText: { fontSize: 12, fontWeight: '600', color: adminTheme.colors.accentHover },
  itemSub: { fontSize: 13, color: adminTheme.colors.textSecondary },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  textAreaSmall: { minHeight: 64, textAlignVertical: 'top' },
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
    maxWidth: 560,
    maxHeight: '92%',
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.card,
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    padding: 18,
    gap: 12,
  },
  modalScroll: { maxHeight: 490 },
  modalScrollBody: { gap: 8, paddingBottom: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textSecondary },
  exampleBox: {
    borderWidth: 1,
    borderColor: adminTheme.colors.border,
    backgroundColor: adminTheme.colors.surfaceSubtle,
    borderRadius: adminTheme.radius.md,
    padding: 10,
    gap: 6,
  },
  removeLink: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.dangerText },
  rowPair: { flexDirection: 'row', gap: 8 },
  choiceEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starBadgePick: {
    width: 64,
    paddingVertical: 9,
    borderRadius: adminTheme.radius.input,
    backgroundColor: adminTheme.colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBadgePickActive: { backgroundColor: adminTheme.colors.accent },
  correctBadgePickActive: { backgroundColor: adminTheme.colors.successText },
  starBadgePickText: { fontSize: 12, fontWeight: '700', color: adminTheme.colors.textSecondary },
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
