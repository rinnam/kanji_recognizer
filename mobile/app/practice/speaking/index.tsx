import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';
import { libraryEndpoint } from '../../../src/library-source';

export const INTERVIEW_CV_STORAGE_KEY = 'kanji_nest_interview_cv_v1';

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
      'Đủ 6 chặng chuẩn Nhật: 自己紹介 → 自己PR → 3 câu hỏi đào sâu từ CV/Dự án → 逆質問 (hỏi ngược công ty) → Ra về.',
    defaultCv:
      'Chuyên ngành: Công nghệ thông tin (Năm 4). Kỹ năng: TypeScript, React, Node.js, PostgreSQL. Dự án nổi bật: Xây dựng ứng dụng học tiếng Nhật Kanji Nest (Flashcard SRS, game đối kháng WebSocket). Chứng chỉ: JLPT N3. Điểm mạnh: Tự học nhanh, làm việc nhóm tốt.',
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
      'Đủ 6 chặng: 自己紹介 → 自己PR → 3 câu hỏi theo CV (kinh nghiệm phục vụ, lịch làm việc, tình huống khách) → 逆質問.',
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
      'Đủ 6 chặng: 自己紹介 → 自己PR → 3 câu hỏi về hồ sơ học tập, kế hoạch tài chính & mục tiêu tại Nhật → 逆質問.',
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
      'Luyện báo cáo tiến độ (報告), liên lạc sự cố trễ deadline (連絡) và xin ý kiến giải pháp (相談) chuẩn văn hóa công sở Nhật.',
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
      'Luyện mô tả triệu chứng (sốt, đau đầu, ho), thời điểm bắt đầu, tiền sử dị ứng thuốc và hỏi cách uống thuốc.',
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
      'Luyện giao tiếp tự nhiên khi đặt bàn, hỏi món gợi ý, báo dị ứng thực phẩm và thanh toán tại quán ăn Nhật.',
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
  const [scenarios, setScenarios] = useState<ScenarioItem[]>(FALLBACK_SCENARIOS);
  const [categoryTab, setCategoryTab] = useState<'interview' | 'roleplay'>('interview');
  const [selectedId, setSelectedId] = useState<string>('it_engineer');
  const [cvText, setCvText] = useState<string>(FALLBACK_SCENARIOS[0]!.defaultCv);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [cvFocusTopics, setCvFocusTopics] = useState<string[]>([]);
  const [parsingCv, setParsingCv] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      const resp = await fetch(`${base}/interview/parse-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: asset.name || 'cv.pdf',
          mimeType: asset.mimeType || 'application/pdf',
          base64Data,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
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
    await AsyncStorage.setItem(INTERVIEW_CV_STORAGE_KEY, cvText.trim());
    router.push({
      pathname: '/practice/speaking/room',
      params: { scenarioId: selectedId },
    });
  };

  const selectedScenario = scenarios.find((s) => s.id === selectedId) ?? scenarios[0];

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Phỏng vấn & Roleplay 3D cùng AI"
        subtitle="Phỏng vấn chuẩn Nhật (đủ gõ cửa 3 lần + CV) & Roleplay đời sống/công sở · Whisper offline"
      />

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

      <View style={styles.bannerCard}>
        <Text style={styles.bannerTitle}>
          {categoryTab === 'interview'
            ? 'Lộ trình đầy đủ buổi phỏng vấn chuẩn Nhật'
            : 'Hội thoại nhập vai thực chiến tại Nhật (3D + Whisper offline)'}
        </Text>
        <Text style={styles.bannerSteps}>
          {categoryTab === 'interview'
            ? '① Gõ cửa 3D (3 lần) & 失礼いたします → ② Đứng cạnh ghế chào 30° & Ngồi xuống → ③ 自己紹介 → ④ 自己PR → ⑤ 3 câu hỏi xoáy trực tiếp vào CV thật của bạn → ⑥ 逆質問 → ⑦ Cúi chào 45° & Ra về'
            : 'Vào thẳng bối cảnh 3D (Họp Horenso với sếp Nhật · Khám bệnh · Nhà hàng) → Nói tiếng Nhật qua Mic (Whisper offline 0 token) → AI phản hồi giọng Nhật, chấm Keigo & sửa câu nói tự nhiên.'}
        </Text>
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
              return (
                <Pressable
                  key={item.id}
                  style={[styles.scenarioCard, active && styles.scenarioCardActive]}
                  onPress={() => handleSelectScenario(item)}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelText}>{item.level}</Text>
                    </View>
                    <Text style={styles.companyLabel}>{item.companyName}</Text>
                  </View>

                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDesc}>{item.description}</Text>

                  <View style={styles.interviewerBox}>
                    <Text style={styles.interviewerLabel}>Hội đồng phỏng vấn:</Text>
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
                    style={styles.uploadBtn}
                    disabled={parsingCv}
                    onPress={() => void handleUploadRealCv()}
                  >
                    {parsingCv ? (
                      <ActivityIndicator size="small" color={nihongoTheme.colors.accentHover} />
                    ) : (
                      <Text style={styles.uploadBtnText}>+ Tải lên CV (PDF / Ảnh / TXT)</Text>
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
                Tải lên CV thật của bạn (PDF tiếng Việt/Anh/Nhật hoặc ảnh chụp 履歴書), AI sẽ tự đọc trích xuất và đặt 3 câu hỏi đào sâu đúng dự án/kinh nghiệm của bạn.
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
              placeholder="Nội dung CV của bạn (hoặc bấm Tải lên CV ở trên để AI tự đọc)..."
              placeholderTextColor={nihongoTheme.colors.textMuted}
              style={styles.cvInput}
            />

            <Pressable style={styles.startBtn} onPress={() => void handleStart()}>
              <Text style={styles.startBtnText}>
                Vào phòng phỏng vấn 3D ({selectedScenario?.companyName}) →
              </Text>
            </Pressable>
          </View>
        </View>
      )}
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
});
