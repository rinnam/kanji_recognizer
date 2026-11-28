import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';
import { libraryEndpoint } from '../../../src/library-source';
import { getUserScopedKey, readAuthSession } from '../../../src/features/auth/auth-store';
import { useMembership } from '../../../src/features/membership/membership-store';
import { recordMeaningfulStudyAction } from '../../../src/features/study-tracker/use-study-tracker';
import { speakJapanese } from '../../../src/utils/speak-japanese';

interface WritingCorrection {
  original: string;
  fixed: string;
  reasonVi: string;
}

interface GradedResult {
  totalScore: number;
  scores: {
    grammar: number;
    keigo: number;
    vocabulary: number;
    naturalness: number;
  };
  corrections: WritingCorrection[];
  improvedJa: string;
  improvedVi: string;
  summaryVi: string;
}

interface SavedEntry {
  id: string;
  promptTitle: string;
  style: string;
  text: string;
  savedAt: string;
  grade?: GradedResult;
}

const DRAFTS_KEY = 'kanji_nest_writing_drafts_v1';
const SUBMITTED_KEY = 'kanji_nest_writing_submitted_v1';
const LIVE_DRAFT_KEY = 'kanji_smart_writing_live_text_v1';

const WRITING_PROMPTS = [
  {
    id: 'email_leave',
    title: 'Email xin nghỉ phép (休暇申請メール)',
    style: 'Kính ngữ công sở (ビジネス敬語)',
    hint: 'Viết email gửi trưởng phòng xin nghỉ 1 ngày vì việc riêng / bị ốm, nêu rõ người bàn giao công việc.',
  },
  {
    id: 'email_horenso',
    title: 'Email báo cáo tiến độ dự án (進捗報告)',
    style: 'Kính ngữ công sở (ビジネス敬語)',
    hint: 'Báo cáo ngắn tiến độ tuần này, nêu 1 vấn đề đang gặp và đề xuất phương án xử lý.',
  },
  {
    id: 'email_thanks',
    title: 'Email cảm ơn sau phỏng vấn (面接お礼メール)',
    style: 'Kính ngữ công sở (ビジネス敬語)',
    hint: 'Cảm ơn nhà tuyển dụng đã dành thời gian phỏng vấn và nhấn mạnh lại mong muốn gia nhập công ty.',
  },
  {
    id: 'diary',
    title: 'Nhật ký cuối tuần (週末の日記)',
    style: 'Lịch sự (です・ます)',
    hint: 'Kể lại hoạt động cuối tuần vừa rồi của bạn và cảm nghĩ (khoảng 3–5 câu tiếng Nhật).',
  },
  {
    id: 'free',
    title: 'Tự do luyện viết tiếng Nhật',
    style: 'Lịch sự (です・ます)',
    hint: 'Viết bất kỳ đoạn văn, câu mẫu hoặc tin nhắn nào bạn muốn Sensei AI chấm và sửa lỗi.',
  },
] as const;

const STYLES = [
  'Kính ngữ công sở (ビジネス敬語)',
  'Lịch sự (です・ます)',
  'Thân mật (タメ口)',
] as const;

export default function WritingScreen() {
  const router = useRouter();
  const { summary, tier, refresh: refreshMembership } = useMembership();
  const [tab, setTab] = useState<'prompts' | 'drafts' | 'submitted'>('prompts');
  const [selectedPrompt, setSelectedPrompt] = useState<(typeof WRITING_PROMPTS)[number]>(WRITING_PROMPTS[0]);
  const [style, setStyle] = useState<string>(WRITING_PROMPTS[0].style);
  const [text, setText] = useState('');
  const [grading, setGrading] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [result, setResult] = useState<GradedResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<SavedEntry[]>([]);
  const [submitted, setSubmitted] = useState<SavedEntry[]>([]);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const applyLatestGrade = (
    graded: GradedResult,
    meta?: { promptTitle?: string; style?: string; text?: string } | null,
  ) => {
    setResult(graded);
    if (meta?.text) {
      setText((prev) => (prev.trim() ? prev : meta.text || ''));
    }
    setSubmitted((prev) => {
      if (prev.some((e) => e.grade?.improvedJa === graded.improvedJa)) return prev;
      const entry: SavedEntry = {
        id: `sub-${Date.now()}`,
        promptTitle: meta?.promptTitle || selectedPrompt.title,
        style: meta?.style || style,
        text: (meta?.text || text).trim(),
        savedAt: new Date().toLocaleString('vi-VN'),
        grade: graded,
      };
      const nextSub = [entry, ...prev].slice(0, 20);
      void getUserScopedKey(SUBMITTED_KEY).then((k) =>
        AsyncStorage.setItem(k, JSON.stringify(nextSub)),
      );
      return nextSub;
    });
  };

  const startPollingLatest = () => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(() => {
      void (async () => {
        try {
          const session = await readAuthSession();
          if (!session?.accessToken) return;
          const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
          const res = await fetch(`${base}/ai/writing/latest`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          });
          if (!res.ok) return;
          const job = (await res.json()) as {
            status: 'none' | 'running' | 'ready' | 'failed';
            payloadMeta?: { promptTitle?: string; style?: string; text?: string } | null;
            result?: GradedResult | null;
            errorMessage?: string | null;
          };
          if (job.status === 'ready' && job.result) {
            stopPolling();
            applyLatestGrade(job.result, job.payloadMeta);
            setRecoveryNotice(null);
            setGrading(false);
            void refreshMembership();
          } else if (job.status === 'failed') {
            stopPolling();
            setRecoveryNotice(null);
            setGrading(false);
            setErrorMsg(job.errorMessage || 'Không chấm được bài viết AI (bạn không bị trừ lượt).');
          }
        } catch {
          // retry on next tick
        }
      })();
    }, 2000);
  };

  useEffect(() => {
    let active = true;
    void getUserScopedKey(DRAFTS_KEY)
      .then((k) => AsyncStorage.getItem(k))
      .then((raw) => {
        if (!raw || !active) return;
        try {
          setDrafts(JSON.parse(raw) as SavedEntry[]);
        } catch {
          // ignore
        }
      });
    void getUserScopedKey(SUBMITTED_KEY)
      .then((k) => AsyncStorage.getItem(k))
      .then((raw) => {
        if (!raw || !active) return;
        try {
          setSubmitted(JSON.parse(raw) as SavedEntry[]);
        } catch {
          // ignore
        }
      });
    void getUserScopedKey(LIVE_DRAFT_KEY)
      .then((k) => AsyncStorage.getItem(k))
      .then((raw) => {
        if (raw && active) setText((prev) => (prev ? prev : raw));
      });

    void (async () => {
      try {
        const session = await readAuthSession();
        if (!session?.accessToken || !active) return;
        const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
        const res = await fetch(`${base}/ai/writing/latest`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        if (!res.ok || !active) return;
        const job = (await res.json()) as {
          status: 'none' | 'running' | 'ready' | 'failed';
          payloadMeta?: { promptTitle?: string; style?: string; text?: string } | null;
          result?: GradedResult | null;
          errorMessage?: string | null;
        };
        if (!active) return;
        if (job.status === 'running') {
          if (job.payloadMeta?.text) setText(job.payloadMeta.text);
          setGrading(true);
          setRecoveryNotice(
            'Sensei AI đang hoàn tất bài chấm trước đó (F5 hoặc đổi tab sẽ không bị mất lượt)...',
          );
          startPollingLatest();
        } else if (job.status === 'ready' && job.result) {
          applyLatestGrade(job.result, job.payloadMeta);
        }
      } catch {
        // offline
      }
    })();

    return () => {
      active = false;
      stopPolling();
    };
  }, []);

  const handleSaveDraft = () => {
    if (!text.trim()) return;
    const entry: SavedEntry = {
      id: `draft-${Date.now()}`,
      promptTitle: selectedPrompt.title,
      style,
      text: text.trim(),
      savedAt: new Date().toLocaleString('vi-VN'),
    };
    const next = [entry, ...drafts].slice(0, 20);
    setDrafts(next);
    void getUserScopedKey(DRAFTS_KEY).then((k) => AsyncStorage.setItem(k, JSON.stringify(next)));
    setNotice('Đã lưu vào mục Bản nháp!');
  };

  const handleGrade = async () => {
    if (!text.trim() || grading) return;
    recordMeaningfulStudyAction('writing_grade');
    let keepPolling = false;
    setGrading(true);
    setRecoveryNotice(null);
    setErrorMsg(null);
    setQuotaBlocked(false);
    setNotice(null);

    try {
      const session = await readAuthSession();
      const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
      const res = await fetch(`${base}/ai/writing/grade`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          promptTitle: selectedPrompt.title,
          style,
          text: text.trim(),
        }),
      });
      if (res.status === 202) {
        const pending = (await res.json().catch(() => ({}))) as { message?: string };
        keepPolling = true;
        setRecoveryNotice(
          pending.message || 'Sensei AI đang hoàn tất bài chấm trước đó (không mất lượt)...',
        );
        startPollingLatest();
        return;
      }
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string };
        if (res.status === 403) {
          setQuotaBlocked(true);
          setErrorMsg(errData.message || 'Bạn đã dùng hết lượt chấm Luyện viết AI tuần này.');
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const graded = (await res.json()) as GradedResult;
      applyLatestGrade(graded, { promptTitle: selectedPrompt.title, style, text: text.trim() });
      void refreshMembership();
    } catch {
      setErrorMsg('Không gọi được Sensei AI chấm bài (có thể Google AI đang bận). Hãy thử lại sau vài giây.');
    } finally {
      if (!keepPolling) setGrading(false);
    }
  };

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Luyện viết AI"
      />

      <View style={styles.quotaStrip}>
        <Text style={styles.quotaText}>
          {summary.usage.writingLimitWeek === null
            ? `${summary.subscription.planName} · Không giới hạn chấm AI`
            : `${summary.subscription.planName} · Đã dùng ${summary.usage.writingUsedWeek}/${summary.usage.writingLimitWeek} bài tuần này`}
        </Text>
        {tier !== 'pro' ? (
          <Pressable style={styles.quotaUpgradeBtn} onPress={() => router.push('/billing?tab=plans')}>
            <Text style={styles.quotaUpgradeText}>Nâng cấp</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabsRow}>
        {(
          [
            ['prompts', 'Viết bài'],
            ['drafts', `Bản nháp (${drafts.length})`],
            ['submitted', `Đã chấm (${submitted.length})`],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.tabPill, tab === key && styles.tabPillActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'prompts' ? (
        <View style={styles.sectionGap}>
          {/* Prompt Picker */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Đề luyện viết</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalChipsRow}
            >
              {WRITING_PROMPTS.map((p) => {
                const active = p.id === selectedPrompt.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      setSelectedPrompt(p);
                      setStyle(p.style);
                    }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.title}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.promptHint}>{selectedPrompt.hint}</Text>

            <Text style={styles.sectionLabel}>Văn phong</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalChipsRow}
            >
              {STYLES.map((st) => (
                <Pressable
                  key={st}
                  style={[styles.chip, style === st && styles.chipActive]}
                  onPress={() => setStyle(st)}
                >
                  <Text style={[styles.chipText, style === st && styles.chipTextActive]}>{st}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Editor */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Bài viết tiếng Nhật của bạn</Text>
              <Text style={styles.counter}>{text.length} ký tự</Text>
            </View>

            <TextInput
              value={text}
              onChangeText={(val) => {
                recordMeaningfulStudyAction('writing_typing');
                setText(val);
                void getUserScopedKey(LIVE_DRAFT_KEY)
                  .then((k) => AsyncStorage.setItem(k, val))
                  .catch(() => undefined);
              }}
              multiline
              placeholder="Ví dụ: お疲れ様です。明日は体調が悪いため、お休みをいただいてもよろしいでしょうか..."
              placeholderTextColor={nihongoTheme.colors.textMuted}
              style={styles.editor}
            />

            {recoveryNotice ? (
              <View style={styles.recoveryBanner}>
                <ActivityIndicator size="small" color={nihongoTheme.colors.accentHover} />
                <Text style={styles.recoveryText}>{recoveryNotice}</Text>
              </View>
            ) : null}
            {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
            {errorMsg ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.errorText}>{errorMsg}</Text>
                {quotaBlocked ? (
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => router.push('/billing?tab=plans')}
                  >
                    <Text style={styles.primaryBtnText}>Nâng cấp gói Plus / Pro →</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View style={styles.footerRow}>
              <Pressable style={styles.outlineBtn} onPress={handleSaveDraft}>
                <Text style={styles.outlineBtnText}>Lưu nháp</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, (grading || !text.trim()) && styles.btnDisabled]}
                disabled={grading || !text.trim()}
                onPress={() => void handleGrade()}
              >
                {grading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text
                    style={[
                      styles.primaryBtnText,
                      (grading || !text.trim()) && styles.primaryBtnTextDisabled,
                    ]}
                  >
                    Chấm bài bằng Sensei AI →
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Sensei Grading Result */}
          {result ? (
            <View style={styles.resultCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.resultTitle}>Kết quả chấm của Sensei AI</Text>
                <View style={styles.totalBadge}>
                  <Text style={styles.totalBadgeText}>{result.totalScore} / 100đ</Text>
                </View>
              </View>

              <View style={styles.scoreGrid}>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreVal}>{result.scores.grammar}</Text>
                  <Text style={styles.scoreLbl}>Ngữ pháp</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreVal}>{result.scores.keigo}</Text>
                  <Text style={styles.scoreLbl}>Kính ngữ</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreVal}>{result.scores.vocabulary}</Text>
                  <Text style={styles.scoreLbl}>Từ vựng</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreVal}>{result.scores.naturalness}</Text>
                  <Text style={styles.scoreLbl}>Tự nhiên</Text>
                </View>
              </View>

              <Text style={styles.summaryText}>{result.summaryVi}</Text>

              {result.corrections.length > 0 ? (
                <View style={styles.corrSection}>
                  <Text style={styles.sectionLabel}>Chi tiết lỗi cần sửa ({result.corrections.length})</Text>
                  {result.corrections.map((c, idx) => (
                    <View key={idx} style={styles.corrItem}>
                      <Text style={styles.corrOrig}>✗ {c.original}</Text>
                      <Text style={styles.corrFixed}>✓ {c.fixed}</Text>
                      <Text style={styles.corrReason}>{c.reasonVi}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.improvedBox}>
                <View style={styles.rowBetween}>
                  <Text style={styles.improvedLabel}>Bản viết lại chuẩn người Nhật:</Text>
                  <Pressable onPress={() => void speakJapanese(result.improvedJa)}>
                    <Text style={styles.listenLink}>Nghe phát âm</Text>
                  </Pressable>
                </View>
                <Text style={styles.improvedJa}>{result.improvedJa}</Text>
                {result.improvedVi ? <Text style={styles.improvedVi}>{result.improvedVi}</Text> : null}
              </View>
            </View>
          ) : null}
        </View>
      ) : tab === 'drafts' ? (
        <View style={styles.sectionGap}>
          {drafts.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.promptHint}>Chưa có bản nháp nào được lưu.</Text>
            </View>
          ) : (
            drafts.map((item) => (
              <Pressable
                key={item.id}
                style={styles.card}
                onPress={() => {
                  setText(item.text);
                  setStyle(item.style);
                  setTab('prompts');
                }}
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{item.promptTitle}</Text>
                  <Text style={styles.counter}>{item.savedAt}</Text>
                </View>
                <Text style={styles.promptHint} numberOfLines={3}>
                  {item.text}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <View style={styles.sectionGap}>
          {submitted.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.promptHint}>Chưa có bài viết nào được Sensei AI chấm.</Text>
            </View>
          ) : (
            submitted.map((item) => (
              <Pressable
                key={item.id}
                style={styles.card}
                onPress={() => {
                  setText(item.text);
                  setStyle(item.style);
                  setResult(item.grade ?? null);
                  setTab('prompts');
                }}
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{item.promptTitle}</Text>
                  {item.grade ? (
                    <View style={styles.totalBadge}>
                      <Text style={styles.totalBadgeText}>{item.grade.totalScore}đ</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.counter}>{item.savedAt} · {item.style}</Text>
                <Text style={styles.promptHint} numberOfLines={3}>
                  {item.text}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
  tabPillActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  sectionGap: {
    gap: 14,
  },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  horizontalChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
  chipActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  promptHint: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 19,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  counter: {
    fontSize: 12,
    color: nihongoTheme.colors.textMuted,
    fontWeight: '600',
  },
  editor: {
    minHeight: 150,
    backgroundColor: '#FDF8F0',
    borderWidth: 1.2,
    borderColor: '#E5D5C3',
    borderRadius: nihongoTheme.radius.md,
    padding: 14,
    fontSize: 15,
    lineHeight: 24,
    color: nihongoTheme.colors.textPrimary,
    textAlignVertical: 'top',
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingBottom: 14,
  },
  outlineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: nihongoTheme.radius.button,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: nihongoTheme.radius.button,
  },
  btnDisabled: {
    backgroundColor: '#E5DDD4',
    opacity: 1,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryBtnTextDisabled: {
    color: '#7C6D60',
  },
  resultCard: {
    backgroundColor: '#FDF8F0',
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1.2,
    borderColor: '#C87D55',
    padding: 18,
    gap: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  totalBadge: {
    backgroundColor: nihongoTheme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: nihongoTheme.radius.pill,
  },
  totalBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  scoreGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    borderColor: '#E5D5C3',
    paddingVertical: 10,
    alignItems: 'center',
  },
  scoreVal: {
    fontSize: 18,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  scoreLbl: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textMuted,
  },
  summaryText: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 20,
  },
  corrSection: {
    gap: 8,
  },
  corrItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    borderColor: '#E5D5C3',
    padding: 11,
    gap: 3,
  },
  corrOrig: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '700',
  },
  corrFixed: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '800',
  },
  corrReason: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
  },
  improvedBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: nihongoTheme.radius.md,
    borderWidth: 1,
    borderColor: '#C87D55',
    padding: 14,
    gap: 6,
  },
  improvedLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9A5B37',
  },
  listenLink: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  improvedJa: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 24,
    color: nihongoTheme.colors.textPrimary,
  },
  improvedVi: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 20,
  },
  quotaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  quotaText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  quotaUpgradeBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quotaUpgradeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  recoveryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recoveryText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: nihongoTheme.colors.accentHover,
    lineHeight: 18,
  },
});
