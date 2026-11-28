import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { CoinKsIcon, CrownIcon, LockClosedIcon } from '../../../src/components/AppIcons';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';
import { libraryEndpoint } from '../../../src/library-source';
import {
  getCachedAuthSession,
  getUserScopedKey,
  readAuthSession,
} from '../../../src/features/auth/auth-store';
import {
  MembershipApiError,
  startSpeakingSession,
  useMembership,
} from '../../../src/features/membership/membership-store';
import { useIsMobilePhone } from '../../../src/utils/device';

export const INTERVIEW_CV_STORAGE_KEY = 'kanji_nest_interview_cv_v1';
export const SPEAKING_SESSION_STORAGE_KEY = 'kanji_smart_speaking_session_v1';

interface ScenarioItem {
  id: string;
  category?: 'interview' | 'roleplay';
  title: string;
  companyName: string;
  interviewerName: string;
  interviewerRole: string;
  level: string;
  description: string;
  defaultCv: string;
}

const FALLBACK_SCENARIOS: ScenarioItem[] = [
  {
    id: 'it_engineer',
    category: 'interview',
    title: 'Phỏng vấn Kỹ sư IT (ITエンジニア)',
    companyName: 'Mirai Tech Japan Inc.',
    interviewerName: 'Sato Yuki (佐藤 由紀)',
    interviewerRole: 'Trưởng phòng Kỹ thuật (開発部長)',
    level: 'N3 – N2',
    description:
      'Phỏng vấn chuẩn Nhật với các câu hỏi đào sâu vào CV và dự án IT của bạn.',
    defaultCv:
      'Chuyên ngành: Công nghệ thông tin (Năm 4). Kỹ năng: TypeScript, React, Node.js, PostgreSQL. Dự án nổi bật: Xây dựng ứng dụng học tiếng Nhật Kanji Smart (Flashcard SRS, game đối kháng WebSocket). Chứng chỉ: JLPT N3. Điểm mạnh: Tự học nhanh, làm việc nhóm tốt.',
  },
  {
    id: 'baito',
    category: 'interview',
    title: 'Phỏng vấn làm thêm (アルバイト)',
    companyName: 'Sakura Coffee Tokyo',
    interviewerName: 'Tanaka Kenji (田中 健二)',
    interviewerRole: 'Quản lý cửa hàng (店長)',
    level: 'N4 – N3',
    description:
      'Luyện trả lời câu hỏi về kinh nghiệm phục vụ, lịch làm việc và xử lý tình huống khách hàng.',
    defaultCv:
      'Du học sinh năm 2 tại Tokyo. Từng làm phục vụ quán cafe 6 tháng ở Việt Nam. Có thể làm 4 buổi/tuần (tối thứ 2, 4, 6 và cuối tuần). Trình độ tiếng Nhật: N3. Điểm mạnh: Luôn đúng giờ, giao tiếp thân thiện và cười tươi với khách.',
  },
  {
    id: 'study_abroad',
    category: 'interview',
    title: 'Phỏng vấn Du học / Trường Nhật ngữ',
    companyName: 'Học viện Nhật ngữ Kibou',
    interviewerName: 'Yamada Haruo (山田 春夫)',
    interviewerRole: 'Cán bộ tuyển sinh (入試担当)',
    level: 'N4 – N3',
    description:
      'Phỏng vấn hồ sơ học tập, kế hoạch tài chính và mục tiêu học tập tại Nhật.',
    defaultCv:
      'Tốt nghiệp THPT loại Giỏi, đã học tiếng Nhật 1 năm (đạt N4, đang ôn N3). Gia đình hỗ trợ tài chính ổn định. Mục tiêu: Học trường Nhật ngữ 1.5 năm đạt N2, sau đó thi vào đại học chuyên ngành Kinh tế hoặc CNTT tại Nhật.',
  },
  {
    id: 'roleplay_horenso',
    category: 'roleplay',
    title: 'Họp Horenso (報連相) với sếp Nhật',
    companyName: 'Phòng Dự án IT · Tokyo',
    interviewerName: 'Takahashi PM (高橋 マネージャー)',
    interviewerRole: 'Quản lý dự án (PM)',
    level: 'N3 – N2',
    description:
      'Luyện báo cáo tiến độ, thông báo sự cố và xin ý kiến giải pháp chuẩn công sở Nhật.',
    defaultCv: 'Bối cảnh: Báo cáo tiến độ task tuần này và trao đổi về một bug nhỏ có thể làm chậm 1 ngày.',
  },
  {
    id: 'roleplay_clinic',
    category: 'roleplay',
    title: 'Đi khám bệnh tại Nhật (病院での診察)',
    companyName: 'Phòng khám Nội khoa Shinjuku',
    interviewerName: 'Bác sĩ Kobayashi (小林 先生)',
    interviewerRole: 'Bác sĩ nội khoa (医師)',
    level: 'N4 – N3',
    description:
      'Luyện mô tả triệu chứng, tiền sử dị ứng thuốc và hỏi cách dùng thuốc tại phòng khám.',
    defaultCv: 'Bối cảnh: Bị sốt 38 độ từ tối hôm qua, đau họng và mệt nên đi khám bác sĩ.',
  },
  {
    id: 'roleplay_restaurant',
    category: 'roleplay',
    title: 'Gọi món & Xử lý tình huống tại Nhà hàng Nhật',
    companyName: 'Nhà hàng Washoku Sakura',
    interviewerName: 'Nhân viên Suzuki (鈴木 スタッフ)',
    interviewerRole: 'Nhân viên phục vụ (ホール担当)',
    level: 'N5 – N4',
    description:
      'Luyện đặt bàn, gọi món gợi ý, báo dị ứng thực phẩm và thanh toán tại nhà hàng.',
    defaultCv: 'Bối cảnh: Đi ăn tối tại quán ăn Nhật, muốn hỏi món đặc sản và báo không ăn được đồ cay.',
  },
];

async function assetToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const s = String(reader.result ?? '');
        const idx = s.indexOf(',');
        resolve(idx >= 0 ? s.slice(idx + 1) : s);
      };
      reader.onerror = () => reject(new Error('Read failed'));
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

export default function SpeakingLobbyScreen() {
  const router = useRouter();
  const { summary, tier, ksBalance, refresh: refreshMembership } = useMembership();
  const [scenarios, setScenarios] = useState<ScenarioItem[]>(FALLBACK_SCENARIOS);
  const [categoryTab, setCategoryTab] = useState<'interview' | 'roleplay'>('interview');
  const [selectedId, setSelectedId] = useState<string>('it_engineer');
  const [cvText, setCvText] = useState<string>(FALLBACK_SCENARIOS[0]!.defaultCv);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [cvFocusTopics, setCvFocusTopics] = useState<string[]>([]);
  const [parsingCv, setParsingCv] = useState(false);
  const [startingBusy, setStartingBusy] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paywallModal, setPaywallModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    allowShop: boolean;
  }>({ open: false, title: '', message: '', allowShop: false });

  const visibleScenarios = scenarios.filter(
    (s) => (s.category ?? 'interview') === categoryTab,
  );

  const handleSwitchCategory = (nextCat: 'interview' | 'roleplay') => {
    setCategoryTab(nextCat);
    const first = scenarios.find((s) => (s.category ?? 'interview') === nextCat);
    if (first) {
      setSelectedId(first.id);
      if (nextCat === 'roleplay' || !cvFileName) {
        setCvText(first.defaultCv);
      }
    }
  };

  useEffect(() => {
    const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
    void fetch(`${base}/interview/scenarios`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { scenarios?: ScenarioItem[] } | null) => {
        if (data?.scenarios && data.scenarios.length > 0) {
          setScenarios(data.scenarios);
          setSelectedId(data.scenarios[0]!.id);
          setCvText(data.scenarios[0]!.defaultCv);
        }
      })
      .catch(() => {
        // use fallback scenarios
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectScenario = (item: ScenarioItem) => {
    setSelectedId(item.id);
    if (!cvFileName) {
      setCvText(item.defaultCv);
    }
  };

  const handleUploadRealCv = async () => {
    setCvError(null);
    if (tier !== 'pro') {
      setPaywallModal({
        open: true,
        title: 'Upload & phân tích CV thật (Độc quyền Pro AI)',
        message:
          'Tính năng đọc CV PDF/Ảnh thật để AI đặt 3 câu hỏi chuyên sâu chỉ mở cho gói Chuyên sâu (Pro AI). Hãy nâng cấp gói Pro để mở khóa!',
        allowShop: false,
      });
      return;
    }
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setParsingCv(true);
      const base64Data = await assetToBase64(asset.uri);
      const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
      const session = getCachedAuthSession() ?? (await readAuthSession());
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
      const resp = await fetch(`${base}/interview/parse-cv`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fileName: asset.name || 'cv.pdf',
          mimeType: asset.mimeType || 'application/pdf',
          base64Data,
        }),
      });
      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { message?: string };
        if (resp.status === 403) {
          setPaywallModal({
            open: true,
            title: 'Cần nâng cấp gói Pro AI',
            message: body.message || 'Upload CV chỉ hỗ trợ ở gói Pro AI.',
            allowShop: false,
          });
          return;
        }
        throw new Error(`HTTP ${resp.status}`);
      }
      const parsed = (await resp.json()) as { summary?: string; focusTopics?: string[] };
      if (parsed.summary) {
        setCvText(parsed.summary);
        setCvFileName(asset.name || 'CV của bạn');
        setCvFocusTopics(parsed.focusTopics ?? []);
      }
    } catch {
      setCvError('Không đọc được tệp CV. Hãy thử file PDF/ảnh dưới 8MB hoặc dán trực tiếp nội dung CV.');
    } finally {
      setParsingCv(false);
    }
  };

  const handleStart = async () => {
    if (startingBusy) return;
    setStartingBusy(true);
    setCvError(null);
    try {
      const granted = await startSpeakingSession(selectedId);
      const sessionKey = await getUserScopedKey(SPEAKING_SESSION_STORAGE_KEY);
      await AsyncStorage.setItem(
        sessionKey,
        JSON.stringify({
          scenarioId: selectedId,
          speakingSessionToken: granted.speakingSessionToken,
          accessMode: granted.accessMode,
          fullRubric: granted.fullRubric,
          viaDescription: granted.viaDescription,
          savedAt: Date.now(),
        }),
      );
      await AsyncStorage.setItem(INTERVIEW_CV_STORAGE_KEY, cvText.trim());
      void refreshMembership();
      router.push({
        pathname: '/practice/speaking/room',
        params: { scenarioId: selectedId },
      });
    } catch (err) {
      const isItEngineer = selectedId === 'it_engineer';
      const msg =
        err instanceof MembershipApiError
          ? err.message
          : 'Bạn cần gói Plus / Pro AI hoặc vé Xu KS hợp lệ để vào phòng 3D.';
      setPaywallModal({
        open: true,
        title: isItEngineer ? 'Độc quyền gói Pro AI' : 'Kịch bản Luyện nói 3D đang khóa',
        message: msg,
        allowShop: !isItEngineer,
      });
    } finally {
      setStartingBusy(false);
    }
  };

  const isPhone = useIsMobilePhone();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;
  const selectedScenario = scenarios.find((s) => s.id === selectedId) ?? scenarios[0];

  if (isPhone) {
    return (
      <AppShell>
        <TopHeader
          mode="subpage"
          title="Luyện nói & Phỏng vấn 3D"
          subtitle="Tính năng dành riêng cho trình duyệt máy tính"
        />
        <View style={styles.cvCard}>
          <View style={styles.cardTitleRow}>
            <LockClosedIcon size={17} color={nihongoTheme.colors.textPrimary} />
            <Text style={styles.cardTitle}>Đã khóa trên giao diện điện thoại</Text>
          </View>
          <Text style={styles.cardDesc}>
            Không gian Phỏng vấn &amp; Roleplay 3D cùng AI yêu cầu màn hình rộng và âm thanh trình duyệt máy tính để thao tác với bối cảnh 3D chuẩn Nhật. Hãy mở Kanji Smart trên máy tính (Web PC) để luyện tập tính năng này nhé!
          </Text>
          <Pressable style={styles.startBtn} onPress={() => router.replace('/practice')}>
            <Text style={styles.startBtnText}>← Quay lại mục Luyện tập</Text>
          </Pressable>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Phỏng vấn & Roleplay 3D cùng AI"
        subtitle="Phỏng vấn chuẩn Nhật & tình huống đời sống 3D"
      />

      {/* Membership + KS Wallet Strip */}
      <View style={[styles.memberStrip, isNarrow && styles.memberStripNarrow]}>
        <View style={[styles.memberLeft, !isNarrow && styles.memberLeftWide]}>
          <View style={styles.tierBadge}>
            <CrownIcon size={14} color={nihongoTheme.colors.accentHover} />
            <Text style={styles.tierBadgeText}>{summary.subscription.planName}</Text>
          </View>
          <Text style={styles.memberSubText}>
            {tier === 'pro'
              ? 'Full 6 kịch bản 3D · Upload CV · Chấm PREP/STAR không giới hạn'
              : tier === 'plus'
                ? `Plus: còn ${Math.max(0, 3 - summary.usage.speakingLifeToday)}/3 lượt Đời sống · ${Math.max(0, 1 - summary.usage.speakingWorkToday)}/1 lượt Công sở hôm nay`
                : 'Miễn phí: Nói 3D AI đang khóa — nâng cấp Plus/Pro hoặc tích Xu KS đổi vé lẻ'}
          </Text>
        </View>
        <View style={styles.memberActions}>
          <Pressable style={styles.ksChipBtn} onPress={() => router.push('/billing?tab=shop')}>
            <CoinKsIcon size={14} color={nihongoTheme.colors.accentHover} />
            <Text style={styles.ksChipText}>{ksBalance.toLocaleString('vi-VN')} KS</Text>
          </Pressable>
          <Pressable style={styles.upgradeSmallBtn} onPress={() => router.push('/billing?tab=plans')}>
            <Text style={styles.upgradeSmallText}>
              {tier === 'pro' ? 'Quản lý gói' : 'Nâng cấp Pro'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.catTabsRow}>
        <Pressable
          style={[styles.catTab, categoryTab === 'interview' && styles.catTabActive]}
          onPress={() => handleSwitchCategory('interview')}
        >
          <Text style={[styles.catTabText, categoryTab === 'interview' && styles.catTabTextActive]}>
            Phỏng vấn xin việc (3D)
          </Text>
        </Pressable>
        <Pressable
          style={[styles.catTab, categoryTab === 'roleplay' && styles.catTabActive]}
          onPress={() => handleSwitchCategory('roleplay')}
        >
          <Text style={[styles.catTabText, categoryTab === 'roleplay' && styles.catTabTextActive]}>
            Roleplay Đời sống &amp; Công sở (3D)
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={nihongoTheme.colors.accent} />
        </View>
      ) : (
        <View style={styles.sectionGap}>
          {/* Scenario Cards */}
          <View style={styles.grid}>
            {visibleScenarios.map((item) => {
              const active = item.id === selectedId;
              const access = summary.scenarioAccess[item.id];
              const isAllowed = access?.allowed ?? false;
              const badgeText =
                access?.badgeLabel ??
                (item.id === 'it_engineer' ? 'Độc quyền Pro AI' : 'Cần gói Plus/Pro hoặc Xu KS');
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.scenarioCard,
                    active && styles.scenarioCardActive,
                    !isAllowed && styles.scenarioCardLocked,
                  ]}
                  onPress={() => handleSelectScenario(item)}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardTopLeft}>
                      <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>{item.level}</Text>
                      </View>
                      <View
                        style={[
                          styles.accessPill,
                          isAllowed ? styles.accessPillOpen : styles.accessPillLocked,
                        ]}
                      >
                        {!isAllowed ? <LockClosedIcon size={11} color={nihongoTheme.colors.warningText} /> : null}
                        <Text
                          style={[
                            styles.accessPillText,
                            isAllowed ? styles.accessTextOpen : styles.accessTextLocked,
                          ]}
                        >
                          {badgeText}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.companyLabel}>{item.companyName}</Text>
                  </View>

                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDesc}>{item.description}</Text>

                  <View style={styles.interviewerBox}>
                    <Text style={styles.interviewerLabel}>
                      {(item.category ?? 'interview') === 'roleplay' ? 'Nhân vật đối thoại:' : 'Hội đồng phỏng vấn:'}
                    </Text>
                    <Text style={styles.interviewerValue}>
                      {item.interviewerName} · {item.interviewerRole}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Real CV Upload (Interview) or Situation Notes (Roleplay) */}
          <View style={styles.cvCard}>
            <View style={styles.cvHeader}>
              <Text style={styles.cvTitle}>
                {categoryTab === 'interview'
                  ? 'Hồ sơ ứng tuyển / CV thật (履歴書)'
                  : 'Ghi chú bối cảnh Roleplay (tùy chỉnh)'}
              </Text>
              {categoryTab === 'interview' ? (
                <View style={styles.cvHeaderActions}>
                  <Pressable
                    style={[styles.uploadBtn, tier !== 'pro' && styles.uploadBtnLocked]}
                    disabled={parsingCv}
                    onPress={() => void handleUploadRealCv()}
                  >
                    {parsingCv ? (
                      <ActivityIndicator size="small" color={nihongoTheme.colors.accentHover} />
                    ) : tier === 'pro' ? (
                      <Text style={styles.uploadBtnText}>+ Tải lên CV (PDF / Ảnh / TXT)</Text>
                    ) : (
                      <View style={styles.uploadBtnInner}>
                        <LockClosedIcon size={13} color={nihongoTheme.colors.accentHover} />
                        <Text style={styles.uploadBtnText}>Tải lên CV (Chỉ gói Pro AI)</Text>
                      </View>
                    )}
                  </Pressable>
                  {selectedScenario ? (
                    <Pressable
                      onPress={() => {
                        setCvFileName(null);
                        setCvFocusTopics([]);
                        setCvText(selectedScenario.defaultCv);
                      }}
                    >
                      <Text style={styles.resetCvText}>CV mẫu</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : selectedScenario ? (
                <Pressable onPress={() => setCvText(selectedScenario.defaultCv)}>
                  <Text style={styles.resetCvText}>Bối cảnh mẫu</Text>
                </Pressable>
              ) : null}
            </View>

            {cvFileName ? (
              <View style={styles.parsedBadge}>
                <Text style={styles.parsedBadgeText}>
                  AI đã đọc CV: {cvFileName} — Sẽ đặt 3 câu hỏi xoáy vào các chi tiết bên dưới!
                </Text>
              </View>
            ) : (
              <Text style={styles.cvHint}>
                {categoryTab === 'interview'
                  ? 'Tải lên CV (PDF/ảnh) hoặc chỉnh sửa trực tiếp nội dung bên dưới.'
                  : 'Mô tả ngắn tình huống bạn muốn AI nhập vai cùng.'}
              </Text>
            )}

            {cvFocusTopics.length > 0 ? (
              <View style={styles.topicsWrap}>
                {cvFocusTopics.map((t, i) => (
                  <View key={i} style={styles.topicChip}>
                    <Text style={styles.topicText}>AI sẽ hỏi: {t}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {cvError ? <Text style={styles.cvErrorText}>{cvError}</Text> : null}

            <TextInput
              value={cvText}
              onChangeText={setCvText}
              multiline
              numberOfLines={5}
              placeholder={
                categoryTab === 'interview'
                  ? 'Nhập hoặc dán nội dung CV...'
                  : 'Ví dụ: đi ăn chay 4 người, báo trễ deadline...'
              }
              placeholderTextColor={nihongoTheme.colors.textMuted}
              style={styles.cvInput}
            />

            <Pressable
              style={[styles.startBtn, startingBusy && styles.startBtnBusy]}
              disabled={startingBusy}
              onPress={() => void handleStart()}
            >
              {startingBusy ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.startBtnText}>
                  {categoryTab === 'roleplay'
                    ? `Vào bối cảnh Roleplay 3D (${selectedScenario?.companyName}) →`
                    : `Vào phòng phỏng vấn 3D (${selectedScenario?.companyName}) →`}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Paywall Upgrade / Redeem Modal */}
      <Modal
        visible={paywallModal.open}
        transparent
        animationType="fade"
        onRequestClose={() => setPaywallModal((p) => ({ ...p, open: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <LockClosedIcon size={18} color={nihongoTheme.colors.accentHover} />
              <Text style={styles.modalTitle}>{paywallModal.title}</Text>
            </View>
            <Text style={styles.modalBody}>{paywallModal.message}</Text>
            <View style={styles.modalActionsCol}>
              <Pressable
                style={styles.startBtn}
                onPress={() => {
                  setPaywallModal((p) => ({ ...p, open: false }));
                  router.push('/billing?tab=plans');
                }}
              >
                <Text style={styles.startBtnText}>Nâng cấp gói Plus / Pro AI (Demo) →</Text>
              </Pressable>
              {paywallModal.allowShop ? (
                <Pressable
                  style={styles.shopModalBtn}
                  onPress={() => {
                    setPaywallModal((p) => ({ ...p, open: false }));
                    router.push('/billing?tab=shop');
                  }}
                >
                  <Text style={styles.shopModalBtnText}>
                    Hoặc đổi vé bằng Xu KS (Hiện có {ksBalance} KS)
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                style={styles.closeModalBtn}
                onPress={() => setPaywallModal((p) => ({ ...p, open: false }))}
              >
                <Text style={styles.closeModalText}>Để sau</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  catTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  catTab: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
  },
  catTabActive: {
    backgroundColor: nihongoTheme.colors.accent,
    borderColor: nihongoTheme.colors.accent,
  },
  catTabText: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.textSecondary,
  },
  catTabTextActive: {
    color: '#FFFFFF',
  },
  bannerCard: {
    backgroundColor: '#FDF8F0',
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1.2,
    borderColor: '#C87D55',
    padding: 16,
    gap: 6,
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  bannerSteps: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 20,
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center',
  },
  sectionGap: {
    gap: 16,
  },
  grid: {
    gap: 12,
  },
  scenarioCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1.2,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 8,
    ...nihongoTheme.shadow.card,
  },
  scenarioCardActive: {
    borderColor: nihongoTheme.colors.accent,
    backgroundColor: '#FFFBF5',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelBadge: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: nihongoTheme.radius.pill,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  companyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textMuted,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 19,
  },
  interviewerBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.md,
    padding: 10,
    gap: 2,
  },
  interviewerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: nihongoTheme.colors.textMuted,
  },
  interviewerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  cvCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  cvHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  cvHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  uploadBtn: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: nihongoTheme.radius.pill,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  uploadBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cvTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  resetCvText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textMuted,
  },
  parsedBadge: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderRadius: nihongoTheme.radius.md,
    padding: 10,
  },
  parsedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  topicsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicChip: {
    backgroundColor: '#FDF8F0',
    borderWidth: 1,
    borderColor: '#E5D5C3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: nihongoTheme.radius.pill,
  },
  topicText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A5B37',
  },
  cvErrorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  cvHint: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 18,
  },
  cvInput: {
    minHeight: 110,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    fontSize: 13,
    color: nihongoTheme.colors.textPrimary,
    textAlignVertical: 'top',
  },
  startBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  startBtnBusy: {
    opacity: 0.7,
  },
  memberStrip: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    ...nihongoTheme.shadow.card,
  },
  memberStripNarrow: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
  },
  memberLeft: {
    gap: 5,
  },
  memberLeftWide: {
    flex: 1,
    minWidth: 240,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  memberSubText: {
    fontSize: 12.5,
    color: nihongoTheme.colors.textSecondary,
    lineHeight: 18,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ksChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  ksChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  upgradeSmallBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  upgradeSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  scenarioCardLocked: {
    opacity: 0.85,
    backgroundColor: '#FAF7F3',
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  accessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  accessPillOpen: {
    backgroundColor: nihongoTheme.colors.successBg,
  },
  accessPillLocked: {
    backgroundColor: nihongoTheme.colors.warningBg,
  },
  accessPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  accessTextOpen: {
    color: nihongoTheme.colors.successText,
  },
  accessTextLocked: {
    color: nihongoTheme.colors.warningText,
  },
  uploadBtnLocked: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderColor: nihongoTheme.colors.borderWarm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 30, 30, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 22,
    gap: 12,
    ...nihongoTheme.shadow.dock,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  modalBody: {
    fontSize: 13.5,
    lineHeight: 20,
    color: nihongoTheme.colors.textSecondary,
  },
  modalActionsCol: {
    gap: 8,
    marginTop: 4,
  },
  shopModalBtn: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 11,
    alignItems: 'center',
  },
  shopModalBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  closeModalBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  closeModalText: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textMuted,
  },
});
