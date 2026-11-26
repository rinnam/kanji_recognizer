import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
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

const FEATURED_SOLO_GAMES = [
  {
    key: 'momo_boss',
    badge: 'Từ vựng SRS · RPG',
    title: '⚔️ Công thành Momo (Solo Boss)',
    desc: 'Hạ 3 Wave Boss bằng 3 kiểu phản xạ: Kanji → Nghĩa, Nghe âm thanh → Từ Nhật, Nghĩa → Kana.',
    route: '/games/bot' as const,
  },
  {
    key: 'sushi',
    badge: 'Kanji tốc độ · Giải trí',
    title: '🍣 Quán Sushi Băng Chuyền',
    desc: 'Phục vụ đúng đĩa Sushi Kanji trên băng chuyền trước khi khách trượt mất đơn · Fever ×2 điểm.',
    route: '/games/sushi' as const,
  },
  {
    key: 'grammar_star',
    badge: 'Ngữ pháp JLPT N5–N1',
    title: '⭐ Xếp Câu Dấu Sao (★) & Blitz 60s',
    desc: 'Luyện đúng dạng đề dấu sao ★ JLPT, bắn trợ từ (は/が/で/に) và chia thể động từ 60 giây.',
    route: '/practice/grammar?tab=star' as const,
  },
] as const;

export default function GamesHubScreen() {
  const router = useRouter();
  const isPhone = useIsMobilePhone();
  const [roomCode, setRoomCode] = useState('');
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);

  const apiBase = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');

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
  }, [loadRooms]);

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title="Trung tâm Game Học tập"
        subtitle="Chơi luyện Từ vựng SRS, Kanji, Ngữ pháp JLPT & Đấu trường Kotoba"
        rightSlot={
          <Pressable style={styles.softPill} onPress={() => void loadRooms()}>
            <Text style={styles.softPillText}>↻ Làm mới</Text>
          </Pressable>
        }
      />

      {/* Solo Vocab & Grammar Games */}
      <Text style={styles.sectionTitle}>Chế độ Luyện Solo (Từ vựng &amp; Ngữ pháp · Thưởng Xu KS)</Text>
      <View style={styles.soloGrid}>
        {FEATURED_SOLO_GAMES.map((g) => (
          <Pressable
            key={g.key}
            style={[styles.soloCard, isPhone && styles.soloCardPhone]}
            onPress={() => router.push(g.route)}
          >
            <View style={styles.soloBadge}>
              <Text style={styles.soloBadgeText}>{g.badge}</Text>
            </View>
            <Text style={styles.soloTitle}>{g.title}</Text>
            <Text style={styles.soloDesc}>{g.desc}</Text>
            <Text style={styles.soloPlayText}>Vào chơi ngay →</Text>
          </Pressable>
        ))}
      </View>

      {/* Kotoba PvP Arena */}
      <Text style={styles.sectionTitle}>Đấu trường Kotoba (PvP Đối kháng Real-time)</Text>
      <View style={[styles.actionsRow, isPhone && styles.actionsRowPhone]}>
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/games/create')}>
          <Text style={styles.primaryBtnText}>+ Tạo phòng đối kháng Kotoba</Text>
        </Pressable>
        <Pressable style={styles.outlineBtn} onPress={() => router.push('/practice/grammar?tab=blitz')}>
          <Text style={styles.outlineBtnText}>⚡ Bắn Trợ từ &amp; Chia thể 60s</Text>
        </Pressable>
      </View>

      <View style={styles.joinCard}>
        <TextInput
          value={roomCode}
          onChangeText={(t) => setRoomCode(t.toUpperCase())}
          placeholder="Nhập mã phòng 6 ký tự..."
          placeholderTextColor={nihongoTheme.colors.textMuted}
          autoCapitalize="characters"
          style={styles.input}
        />
        <Pressable
          style={styles.joinBtn}
          onPress={() => {
            if (roomCode.trim()) router.push(`/games/${roomCode.trim().toUpperCase()}`);
          }}
        >
          <Text style={styles.joinBtnText}>Vào phòng</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Phòng Kotoba công khai đang mở ({rooms.length})</Text>
      {rooms.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Chưa có phòng công khai nào</Text>
          <Text style={styles.emptyDesc}>
            Bấm "+ Tạo phòng đối kháng Kotoba" để tạo phòng đấu tốc độ cùng bạn bè hoặc chơi ngay 3 chế độ Solo ở trên!
          </Text>
        </View>
      ) : (
        rooms.map((r) => (
          <Pressable key={r.code} style={styles.roomCard} onPress={() => router.push(`/games/${r.code}`)}>
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
        ))
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  softPill: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  softPillText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
    fontSize: 12,
  },
  soloGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  soloCard: {
    flex: 1,
    minWidth: 230,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 8,
    ...nihongoTheme.shadow.card,
  },
  soloCardPhone: {
    minWidth: '100%',
  },
  soloBadge: {
    alignSelf: 'flex-start',
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  soloBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  soloTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  soloDesc: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: nihongoTheme.colors.textSecondary,
  },
  soloPlayText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: nihongoTheme.colors.accent,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionsRowPhone: {
    flexDirection: 'column',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  outlineBtn: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surface,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 13,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: nihongoTheme.colors.textPrimary,
    fontWeight: '700',
  },
  joinCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 12,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: nihongoTheme.colors.textPrimary,
    fontWeight: '700',
  },
  joinBtn: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  joinBtnText: {
    color: nihongoTheme.colors.accentHover,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 13,
    color: nihongoTheme.colors.textSecondary,
    textAlign: 'center',
  },
  roomCard: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...nihongoTheme.shadow.card,
  },
  roomLeft: {
    gap: 3,
    flex: 1,
  },
  roomName: {
    fontSize: 16,
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
