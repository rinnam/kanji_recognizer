import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { libraryEndpoint } from '../../src/library-source';
import { readAuthSession } from '../../src/features/auth/auth-store';

interface PlayerRow {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
}

interface ActiveQuestionDto {
  index: number;
  prompt: string;
  direction: 'reading' | 'meaning';
  sinoVietnamese: string | null;
  deadlineMs: number;
}

interface ChatEntry {
  id: string;
  type: 'chat' | 'system' | 'correct' | 'timeout';
  sender?: string;
  text: string;
}

interface RoomStateDto {
  code: string;
  name: string;
  mode: string;
  scoreLimit: number;
  status: 'lobby' | 'playing' | 'finished';
  playerCount: number;
  cardCount: number;
}

export default function KotobaLiveRoomScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [room, setRoom] = useState<RoomStateDto | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [question, setQuestion] = useState<ActiveQuestionDto | null>(null);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [remainingSec, setRemainingSec] = useState(0);
  const [wsError, setWsError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let active = true;
    void readAuthSession().then((session) => {
      if (!active || !roomCode) return;
      const name = session?.user.displayName || 'Người chơi';
      const httpBase = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');
      const wsBase = httpBase.replace(/^http/, 'ws');
      const socket = new WebSocket(`${wsBase}/games/ws/${encodeURIComponent(roomCode)}?name=${encodeURIComponent(name)}`);
      wsRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            type?: string;
            room?: RoomStateDto;
            players?: PlayerRow[];
            question?: ActiveQuestionDto | null;
            chat?: ChatEntry[];
            entry?: ChatEntry;
            message?: string;
          };
          if (msg.type === 'error') {
            setWsError(msg.message || 'Không vào được phòng.');
            return;
          }
          if (msg.type === 'room_state') {
            if (msg.room) setRoom(msg.room);
            if (msg.players) setPlayers(msg.players);
            setQuestion(msg.question ?? null);
            if (msg.chat) setChat(msg.chat);
          }
          if (msg.type === 'chat' && msg.entry) {
            setChat((prev) => [...prev.slice(-49), msg.entry!]);
          }
        } catch {
          // ignore
        }
      };

      socket.onerror = () => setWsError('Mất kết nối WebSocket tới phòng chơi.');
    });

    return () => {
      active = false;
      wsRef.current?.close();
    };
  }, [roomCode]);

  useEffect(() => {
    if (!question) {
      setRemainingSec(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((question.deadlineMs - Date.now()) / 1000));
      setRemainingSec(left);
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [question]);

  const sendMsg = (payload: unknown) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    sendMsg({ type: 'answer', text: input.trim() });
    setInput('');
  };

  return (
    <AppShell>
      <TopHeader
        mode="subpage"
        title={room?.name || `Phòng ${roomCode ?? ''}`}
        subtitle={`Mã phòng: ${roomCode ?? ''} · Điểm thắng: ${room?.scoreLimit ?? 15}đ · ${players.length} người chơi`}
      />

      {wsError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{wsError}</Text>
        </View>
      ) : null}

      <View style={[styles.layout, isWide && styles.layoutWide]}>
        {/* Left: Live Leaderboard */}
        <View style={[styles.card, isWide && styles.sideCol]}>
          <Text style={styles.cardTitle}>Bảng xếp hạng</Text>
          {players.map((p, idx) => (
            <View key={p.id} style={styles.playerRow}>
              <Text style={styles.playerName}>
                #{idx + 1} {p.name} {p.isHost ? '👑' : ''}
              </Text>
              <Text style={styles.playerScore}>{p.score}đ</Text>
            </View>
          ))}
        </View>

        {/* Center: Question & Fast Answer */}
        <View style={[styles.card, isWide && styles.mainCol]}>
          {room?.status === 'lobby' ? (
            <View style={styles.centerBox}>
              <Text style={styles.bigTitle}>Sẵn sàng thi đấu!</Text>
              <Text style={styles.subText}>
                Chia sẻ mã phòng <Text style={styles.codeHighlight}>{roomCode}</Text> cho bạn bè cùng vào.
              </Text>
              <Pressable style={styles.primaryBtn} onPress={() => sendMsg({ type: 'start' })}>
                <Text style={styles.primaryBtnText}>Bắt đầu trận đấu →</Text>
              </Pressable>
            </View>
          ) : room?.status === 'finished' ? (
            <View style={styles.centerBox}>
              <Text style={styles.bigTitle}>🏆 Trận đấu kết thúc!</Text>
              <Text style={styles.subText}>Người dẫn đầu: {players[0]?.name ?? '—'} ({players[0]?.score ?? 0}đ)</Text>
              <Pressable style={styles.primaryBtn} onPress={() => sendMsg({ type: 'start' })}>
                <Text style={styles.primaryBtnText}>Chơi lại ván mới</Text>
              </Pressable>
            </View>
          ) : question ? (
            <View style={styles.centerBox}>
              <View style={styles.qHeader}>
                <Text style={styles.qBadge}>
                  Câu #{question.index} · {question.direction === 'reading' ? 'Gõ cách đọc (Kana / Romaji)' : 'Gõ nghĩa tiếng Việt'}
                </Text>
                <Text style={styles.timerBadge}>{remainingSec}s</Text>
              </View>
              <Text style={styles.promptText}>{question.prompt}</Text>
              {question.sinoVietnamese ? <Text style={styles.hintText}>Hán Việt: {question.sinoVietnamese}</Text> : null}
              <Pressable style={styles.skipBtn} onPress={() => sendMsg({ type: 'skip' })}>
                <Text style={styles.skipText}>Bỏ qua câu này</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.centerBox}>
              <Text style={styles.subText}>Đang chuẩn bị câu tiếp theo…</Text>
            </View>
          )}

          {/* Answer / Chat Input */}
          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSubmit}
              placeholder="Gõ đáp án (Romaji / Kana / Nghĩa) hoặc chat..."
              placeholderTextColor={nihongoTheme.colors.textMuted}
              style={styles.input}
            />
            <Pressable style={styles.sendBtn} onPress={handleSubmit}>
              <Text style={styles.sendText}>Gửi</Text>
            </Pressable>
          </View>
        </View>

        {/* Right: Live Chat & Answer Feed */}
        <View style={[styles.card, isWide && styles.sideCol]}>
          <Text style={styles.cardTitle}>Diễn biến & Chat</Text>
          <ScrollView style={styles.chatScroll} showsVerticalScrollIndicator>
            {chat.map((c) => (
              <View
                key={c.id}
                style={[
                  styles.chatItem,
                  c.type === 'correct' && styles.chatCorrect,
                  c.type === 'timeout' && styles.chatTimeout,
                ]}
              >
                <Text style={styles.chatText}>
                  {c.type === 'chat' && c.sender ? `${c.sender}: ` : ''}
                  {c.text}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: nihongoTheme.radius.md,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  layout: {
    gap: 16,
  },
  layoutWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 500,
  },
  sideCol: {
    flex: 0.85,
  },
  mainCol: {
    flex: 1.65,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 16,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: nihongoTheme.colors.borderLight,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700',
    color: nihongoTheme.colors.textPrimary,
  },
  playerScore: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  centerBox: {
    flex: 1,
    minHeight: 380,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#FDF8F0',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#C87D55',
    padding: 24,
  },
  qHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  timerBadge: {
    backgroundColor: nihongoTheme.colors.accentSoft,
    color: nihongoTheme.colors.accentHover,
    fontWeight: '800',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: nihongoTheme.radius.pill,
  },
  bigTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
  },
  promptText: {
    fontSize: 56,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textMuted,
  },
  subText: {
    fontSize: 14,
    color: nihongoTheme.colors.textSecondary,
    textAlign: 'center',
  },
  codeHighlight: {
    fontWeight: '800',
    color: nihongoTheme.colors.accentHover,
  },
  primaryBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textMuted,
  },
  inputRow: {
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
    paddingVertical: 11,
    color: nihongoTheme.colors.textPrimary,
  },
  sendBtn: {
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chatScroll: {
    flex: 1,
    maxHeight: 440,
  },
  chatItem: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
  },
  chatCorrect: {
    backgroundColor: nihongoTheme.colors.successBg,
  },
  chatTimeout: {
    backgroundColor: nihongoTheme.colors.warningBg,
  },
  chatText: {
    fontSize: 12,
    color: nihongoTheme.colors.textPrimary,
    fontWeight: '600',
  },
});
