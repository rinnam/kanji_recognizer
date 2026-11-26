import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import {
  BossSwordIcon,
  CoinKsIcon,
  LightningBoltIcon,
  ResetIcon,
  StarPuzzleIcon,
  SushiPlateIcon,
  TrophyArenaIcon,
} from '../../src/components/AppIcons';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { getUserScopedKey } from '../../src/features/auth/auth-store';
import { useGameVocabulary } from '../../src/features/games/use-game-vocab';
import { GRAMMAR_POINTS } from '../../src/features/grammar/grammar-data';
import { libraryEndpoint } from '../../src/library-source';
import { useIsMobilePhone } from '../../src/utils/device';

interface PublicRoomSummary {
  code: string;
  name: string;
  mode: string;
  scoreLimit: number;
  status: string;
  playerCount: number;
  cardCount: number;
}

type GameKey = 'momo_boss' | 'sushi' | 'grammar_star' | 'grammar_blitz';

interface SoloGameCardConfig {
  key: GameKey;
  badge: string;
  title: string;
  desc: string;
  ctaLabel: string;
  route:
    | '/games/bot'
    | '/games/sushi'
    | '/practice/grammar?tab=star'
    | '/practice/grammar?tab=blitz';
  accent: string;
  softBg: string;
  borderTint: string;
  pills: string[];
  hasRecord?: boolean;
}

const SOLO_GAMES: ReadonlyArray<SoloGameCardConfig> = [
  {
    key: 'momo_boss',
    badge: 'Từ vựng SRS · Boss Raid',
    title: 'Công thành Momo',
    desc: 'Hạ 3 Wave Boss với 3 kiểu đòn phản xạ (Kanji, Nghe âm thanh & Nghĩa). Trả lời nhanh nổ đòn Chí mạng!',
    ctaLabel: 'Vào Công thành',
    route: '/games/bot',
    accent: '#DC2626',
    softBg: '#FEF2F2',
    borderTint: '#FECACA',
    pills: ['Phản xạ từng câu', '3 Wave Boss', 'Skill Q / E'],
    hasRecord: true,
  },
  {
    key: 'sushi',
    badge: 'Kanji tốc độ · 60fps',
    title: 'Quán Sushi Băng Chuyền',
    desc: 'Chọn đúng đĩa Kanji lướt mượt trên băng chuyền trước khi khách hết kiên nhẫn. Giữ chuỗi 3 kích hoạt Fever ×2.',
    ctaLabel: 'Mở Quán Sushi',
    route: '/games/sushi',
    accent: '#0D9488',
    softBg: '#F0FDFA',
    borderTint: '#99F6E4',
    pills: ['Băng chuyền 60fps', 'Đếm giờ đơn', 'Fever ×2'],
    hasRecord: true,
  },
  {
    key: 'grammar_star',
    badge: 'Ngữ pháp JLPT N5–N1',
    title: 'Xếp Câu Dấu Sao (★)',
    desc: 'Ghép 4 mảnh câu đúng chuẩn đề thi JLPT ★ với bộ đếm phản xạ 25 giây mỗi câu & lời giải chi tiết.',
    ctaLabel: 'Luyện Xếp câu ★',
    route: '/practice/grammar?tab=star',
    accent: '#D97706',
    softBg: '#FFFBEB',
    borderTint: '#FDE68A',
    pills: ['25s/câu', 'Chuẩn đề ★', 'Full N3'],
  },
  {
    key: 'grammar_blitz',
    badge: 'Phản xạ Ngữ pháp 60s',
    title: 'Bắn Trợ Từ & Chia Thể 60s',
    desc: 'Trả lời chớp nhoáng trong 8s/câu để giữ 3 tim, nhân điểm Combo ×3 khi bắn trợ từ & chia thể JLPT.',
    ctaLabel: 'Chiến Blitz 60s',
    route: '/practice/grammar?tab=blitz',
    accent: '#4F46E5',
    softBg: '#EEF2FF',
    borderTint: '#C7D2FE',
    pills: ['8s/câu', 'Combo ×3', 'Trợ từ + Chia thể'],
    hasRecord: true,
  },
];

function renderGameIcon(key: GameKey, color: string) {
  switch (key) {
    case 'momo_boss':
      return <BossSwordIcon size={24} color={color} />;
    case 'sushi':
      return <SushiPlateIcon size={24} color={color} />;
    case 'grammar_star':
      return <StarPuzzleIcon size={24} color={color} />;
    case 'grammar_blitz':
      return <LightningBoltIcon size={24} color={color} />;
  }
}

export default function GamesHubScreen() {
  const router = useRouter();
  const isPhone = useIsMobilePhone();
  const { words } = useGameVocabulary();

  const [roomCode, setRoomCode] = useState('');
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [bestScores, setBestScores] = useState<Record<GameKey, number>>({
    momo_boss: 0,
    sushi: 0,
    grammar_star: 0,
    grammar_blitz: 0,
  });

  const n3Count = useMemo(
    () => GRAMMAR_POINTS.filter((g) => g.level === 'N3').length,
    [],
  );

  const apiBase = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');

  const loadBestScores = useCallback(async () => {
    try {
      const [bossKey, sushiKey, blitzKey] = await Promise.all([
        getUserScopedKey('kanji_smart_momo_boss_best_v1'),
        getUserScopedKey('kanji_smart_sushi_best_v1'),
        getUserScopedKey('kanji_smart_grammar_blitz_best_v1'),
      ]);
      const [bossRaw, sushiRaw, blitzRaw] = await Promise.all([
        AsyncStorage.getItem(bossKey),
        AsyncStorage.getItem(sushiKey),
        AsyncStorage.getItem(blitzKey),
      ]);
      setBestScores({
        momo_boss: Number(bossRaw) || 0,
        sushi: Number(sushiRaw) || 0,
        grammar_star: 0,
        grammar_blitz: Number(blitzRaw) || 0,
      });
    } catch {
      // ignore storage errors
    }
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const resp = await fetch(`${apiBase}/games/rooms`);
      if (!resp.ok) return;
      const data = (await resp.json()) as { rooms?: PublicRoomSummary[] };
      setRooms(data.rooms ?? []);
    } catch {
      // ignore offline
    }
  }, [apiBase]);

  useEffect(() => {
    void loadRooms();
    void loadBestScores();
  }, [loadRooms, loadBestScores]);

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Trung tâm Game Học tập"
        subtitle="Rèn phản xạ Từ vựng SRS, Kanji, Ngữ pháp JLPT & Đấu trường Kotoba"
        rightSlot={
          <Pressable
            style={({ pressed }) => [styles.softPill, pressed && styles.pressedSoft]}
            onPress={() => {
              void loadRooms();
              void loadBestScores();
            }}
          >
            <ResetIcon size={13} color={nihongoTheme.colors.accentHover} />
            <Text style={styles.softPillText}>Làm mới</Text>
          </Pressable>
        }
      />

      {/* Hero Summary Strip */}
      <View style={styles.heroStrip}>
        <View style={[styles.heroStatsRow, isPhone && styles.heroStatsPhone]}>
          <View style={styles.heroStatBlock}>
            <Text style={styles.heroStatValue}>{words.length} từ</Text>
            <Text style={styles.heroStatLabel}>Kho từ SRS sẵn sàng</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStatBlock}>
            <Text style={styles.heroStatValue}>
              {GRAMMAR_POINTS.length} mẫu ({n3Count} N3)
            </Text>
            <Text style={styles.heroStatLabel}>Thư viện Ngữ pháp JLPT</Text>
          </View>
        </View>
        <View style={styles.ksRewardPill}>
          <CoinKsIcon size={15} color={nihongoTheme.colors.accentHover} />
          <Text style={styles.ksRewardText}>+5 Xu KS × hệ số gói / game (tối đa 3 game/ngày)</Text>
        </View>
      </View>

      {/* 2x2 Themed Solo & Grammar Game Grid */}
      <Text style={styles.sectionTitle}>Chế độ Luyện Solo &amp; Phản xạ</Text>
      <View style={styles.soloGrid}>
        {SOLO_GAMES.map((g) => {
          const record = bestScores[g.key] ?? 0;
          return (
            <Pressable
              key={g.key}
              style={({ pressed }) => [
                styles.gameCard,
                { borderColor: g.borderTint },
                isPhone ? styles.gameCardPhone : styles.gameCardDesktop,
                pressed && styles.gameCardPressed,
              ]}
              onPress={() => router.push(g.route)}
            >
              <View style={[styles.cardTopAccent, { backgroundColor: g.accent }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.iconBadge, { backgroundColor: g.softBg, borderColor: g.borderTint }]}>
                    {renderGameIcon(g.key, g.accent)}
                  </View>
                  <View style={styles.headerMetaCol}>
                    <View style={styles.headerPillsRow}>
                      <View style={[styles.typeBadge, { backgroundColor: g.softBg }]}>
                        <Text style={[styles.typeBadgeText, { color: g.accent }]}>{g.badge}</Text>
                      </View>
                      {g.hasRecord ? (
                        <View style={styles.recordBadge}>
                          <Text style={styles.recordBadgeText}>Kỷ lục: {record}đ</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.gameTitle}>{g.title}</Text>
                  </View>
                </View>

                <Text style={styles.gameDesc}>{g.desc}</Text>

                <View style={styles.mechanicsRow}>
                  {g.pills.map((pill) => (
                    <View key={pill} style={styles.mechanicChip}>
                      <Text style={styles.mechanicChipText}>{pill}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.ctaBar, { backgroundColor: g.accent }]}>
                  <Text style={styles.ctaBarText}>{g.ctaLabel} →</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Elevated Kotoba PvP Arena Section */}
      <View style={styles.arenaCard}>
        <View style={[styles.arenaHeader, isPhone && styles.arenaHeaderPhone]}>
          <View style={styles.arenaTitleWrap}>
            <View style={styles.arenaIconBadge}>
              <TrophyArenaIcon size={24} color={nihongoTheme.colors.accentHover} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.arenaTitle}>Đấu trường Kotoba (PvP Real-time)</Text>
              <Text style={styles.arenaSubtitle}>
                Tạo phòng hoặc nhập mã 6 ký tự để đấu tốc độ từ vựng trực tiếp với bạn bè
              </Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, isPhone && styles.primaryBtnPhone, pressed && styles.pressedSoft]}
            onPress={() => router.push('/games/create')}
          >
            <Text style={styles.primaryBtnText}>+ Tạo phòng đối kháng Kotoba</Text>
          </Pressable>
        </View>

        <View style={styles.joinRow}>
          <TextInput
            value={roomCode}
            onChangeText={(t) => setRoomCode(t.toUpperCase())}
            placeholder="Nhập mã phòng 6 ký tự..."
            placeholderTextColor={nihongoTheme.colors.textMuted}
            autoCapitalize="characters"
            maxLength={8}
            style={styles.input}
          />
          <Pressable
            style={({ pressed }) => [styles.joinBtn, pressed && styles.pressedSoft]}
            onPress={() => {
              if (roomCode.trim()) router.push(`/games/${roomCode.trim().toUpperCase()}`);
            }}
          >
            <Text style={styles.joinBtnText}>Vào phòng</Text>
          </Pressable>
        </View>

        <Text style={styles.roomsHeading}>Phòng Kotoba công khai đang mở ({rooms.length})</Text>
        {rooms.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Chưa có phòng công khai nào</Text>
            <Text style={styles.emptyDesc}>
              Bấm &ldquo;+ Tạo phòng đối kháng Kotoba&rdquo; để mời bạn bè, hoặc luyện 4 chế độ phản xạ Solo ở trên!
            </Text>
          </View>
        ) : (
          <View style={styles.roomsList}>
            {rooms.map((r) => (
              <Pressable
                key={r.code}
                style={({ pressed }) => [styles.roomItem, pressed && styles.pressedSoft]}
                onPress={() => router.push(`/games/${r.code}`)}
              >
                <View style={styles.roomLeft}>
                  <Text style={styles.roomName}>{r.name}</Text>
                  <Text style={styles.roomMeta}>
                    Mã: {r.code} · {r.mode.toUpperCase()} · {r.scoreLimit}đ thắng · {r.cardCount} từ
                  </Text>
                </View>
                <View style={styles.roomBadge}>
                  <Text style={styles.roomBadgeText}>{r.playerCount} người</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  softPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    borderWidth: 1,
    borderColor: '#FAD7B5',
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  softPillText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '800',
    fontSize: 12,
  },
  pressedSoft: {
    opacity: 0.86,
  },
  heroStrip: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    marginBottom: 18,
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...nihongoTheme.shadow.card,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    flexWrap: 'wrap',
  },
  heroStatsPhone: {
    gap: 12,
  },
  heroStatBlock: {
    gap: 2,
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  heroStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: nihongoTheme.colors.textSecondary,
  },
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: nihongoTheme.colors.borderWarm,
  },
  ksRewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  ksRewardText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    marginBottom: 12,
  },
  soloGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 22,
  },
  gameCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...nihongoTheme.shadow.card,
  },
  gameCardDesktop: {
    width: '48.8%',
    flexGrow: 1,
    minWidth: 300,
  },
  gameCardPhone: {
    width: '100%',
  },
  gameCardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.94,
  },
  cardTopAccent: {
    height: 5,
    width: '100%',
  },
  cardBody: {
    padding: 16,
    gap: 12,
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMetaCol: {
    flex: 1,
    gap: 5,
  },
  headerPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  typeBadge: {
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  recordBadge: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  recordBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  gameTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  gameDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: nihongoTheme.colors.textSecondary,
    flex: 1,
  },
  mechanicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mechanicChip: {
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mechanicChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  ctaBar: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  ctaBarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  arenaCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1.5,
    borderColor: '#FAD7B5',
    padding: 18,
    gap: 14,
    ...nihongoTheme.shadow.card,
  },
  arenaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  arenaHeaderPhone: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  arenaTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 240,
  },
  arenaIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: '#FAD7B5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arenaTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  arenaSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    color: nihongoTheme.colors.textSecondary,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  primaryBtnPhone: {
    width: '100%',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  joinRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: nihongoTheme.colors.textPrimary,
    fontWeight: '700',
  },
  joinBtn: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: '#FAD7B5',
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  joinBtnText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '800',
    fontSize: 13.5,
  },
  roomsHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    marginTop: 2,
  },
  emptyBox: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 12.5,
    color: nihongoTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  roomsList: {
    gap: 8,
  },
  roomItem: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  roomLeft: {
    gap: 3,
    flex: 1,
  },
  roomName: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  roomMeta: {
    fontSize: 12,
    color: nihongoTheme.colors.textSecondary,
  },
  roomBadge: {
    backgroundColor: nihongoTheme.colors.successBg,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roomBadgeText: {
    color: nihongoTheme.colors.successText,
    fontWeight: '700',
    fontSize: 12,
  },
});
