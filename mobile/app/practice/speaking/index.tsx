import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../../src/components/AppShell';
import { TopHeader } from '../../../src/components/TopHeader';
import { nihongoTheme } from '../../../src/theme/nihongo-theme';
import { libraryEndpoint } from '../../../src/library-source';

interface ScenarioItem {
  id: string;
  title: string;
  companyName: string;
  interviewerName: string;
  interviewerRole: string;
  level: string;
  description: string;
}

const FALLBACK_SCENARIOS: ScenarioItem[] = [
  {
    id: 'baito',
    title: 'Phỏng vấn làm thêm (アルバイト)',
    companyName: 'Sakura Coffee Tokyo',
    interviewerName: 'Tanaka Kenji (田中 健二)',
    interviewerRole: 'Quản lý cửa hàng (店長)',
    level: 'N4 – N3',
    description: 'Luyện tác phong chào hỏi, giới thiệu bản thân, lịch làm việc và xử lý tình huống với khách hàng.',
  },
  {
    id: 'it_engineer',
    title: 'Phỏng vấn Kỹ sư IT (ITエンジニア)',
    companyName: 'Mirai Tech Japan Inc.',
    interviewerName: 'Sato Yuki (佐藤 由紀)',
    interviewerRole: 'Trưởng phòng Kỹ thuật (開発部長)',
    level: 'N3 – N2',
    description: 'Phỏng vấn công ty công nghệ Nhật: kinh nghiệm dự án, lý do chọn Nhật Bản và cách làm việc nhóm.',
  },
  {
    id: 'study_abroad',
    title: 'Phỏng vấn Du học / Trường Nhật ngữ',
    companyName: 'Học viện Nhật ngữ Kibou',
    interviewerName: 'Yamada Haruo (山田 春夫)',
    interviewerRole: 'Cán bộ tuyển sinh (入試担当)',
    level: 'N4 – N3',
    description: 'Luyện trả lời mục tiêu du học, kế hoạch học tập và lý do yêu thích tiếng Nhật.',
  },
];

export default function SpeakingLobbyScreen() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioItem[]>(FALLBACK_SCENARIOS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
    void fetch(`${base}/interview/scenarios`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { scenarios?: ScenarioItem[] } | null) => {
        if (data?.scenarios && data.scenarios.length > 0) {
          setScenarios(data.scenarios);
        }
      })
      .catch(() => {
        // use fallback scenarios
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Phỏng vấn 3D cùng AI"
        subtitle="Mô phỏng quy trình phỏng vấn 5 chặng chuẩn Nhật · Nói qua Mic · AI chấm điểm & sửa Keigo"
      />

      <View style={styles.bannerCard}>
        <Text style={styles.bannerTitle}>Quy trình phỏng vấn chuẩn Nhật (5 chặng)</Text>
        <Text style={styles.bannerSteps}>
          1. Gõ cửa &amp; Chào hỏi → 2. Tự giới thiệu → 3. Lý do ứng tuyển → 4. Câu hỏi tình huống → 5. Đặt câu hỏi &amp; Ra về
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={nihongoTheme.colors.accent} />
        </View>
      ) : (
        <View style={styles.grid}>
          {scenarios.map((item) => (
            <View key={item.id} style={styles.scenarioCard}>
              <View style={styles.cardTop}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>{item.level}</Text>
                </View>
                <Text style={styles.companyLabel}>{item.companyName}</Text>
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>

              <View style={styles.interviewerBox}>
                <Text style={styles.interviewerLabel}>Nhà tuyển dụng:</Text>
                <Text style={styles.interviewerValue}>
                  {item.interviewerName} · {item.interviewerRole}
                </Text>
              </View>

              <Pressable
                style={styles.startBtn}
                onPress={() =>
                  router.push({
                    pathname: '/practice/speaking/room',
                    params: { scenarioId: item.id },
                  })
                }
              >
                <Text style={styles.startBtnText}>Vào phòng phỏng vấn 3D →</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
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
  grid: {
    gap: 14,
  },
  scenarioCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    gap: 10,
    ...nihongoTheme.shadow.card,
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
    fontSize: 17,
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
  startBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
