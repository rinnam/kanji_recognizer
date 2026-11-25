import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../../src/components/AppShell';
import { TopHeader } from '../../src/components/TopHeader';
import { nihongoTheme } from '../../src/theme/nihongo-theme';
import { libraryEndpoint } from '../../src/library-source';

interface DeckInfo {
  id: string;
  name: string;
  count: number;
  category: 'jlpt' | 'folder';
}

export default function CreateKotobaRoomScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [mode, setMode] = useState<'reading' | 'meaning' | 'mixed'>('reading');
  const [scoreLimit, setScoreLimit] = useState(15);
  const [answerTimeSec, setAnswerTimeSec] = useState(15);
  const [delaySec, setDelaySec] = useState(3);
  const [decks, setDecks] = useState<DeckInfo[]>([]);
  const [selectedDecks, setSelectedDecks] = useState<string[]>(['all']);
  const [busy, setBusy] = useState(false);

  const apiBase = (libraryEndpoint || 'http://localhost:3000/api').replace(/\/+$/, '');

  useEffect(() => {
    void fetch(`${apiBase}/games/decks`)
      .then((r) => r.json())
      .then((d: { decks?: DeckInfo[] }) => setDecks(d.decks ?? []))
      .catch(() => undefined);
  }, [apiBase]);

  const toggleDeck = (id: string) => {
    setSelectedDecks((prev) => {
      if (id === 'all') return ['all'];
      const withoutAll = prev.filter((x) => x !== 'all');
      if (withoutAll.includes(id)) {
        const next = withoutAll.filter((x) => x !== id);
        return next.length > 0 ? next : ['all'];
      }
      return [...withoutAll, id];
    });
  };

  const handleCreate = async () => {
    setBusy(true);
    try {
      const resp = await fetch(`${apiBase}/games/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          isPrivate,
          mode,
          deckIds: selectedDecks,
          scoreLimit,
          answerTimeSec,
          delaySec,
        }),
      });
      const data = (await resp.json()) as { room?: { code: string } };
      if (data.room?.code) {
        router.replace(`/games/${data.room.code}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <TopHeader mode="subpage" title="Tạo phòng Kotoba" subtitle="Cấu hình bộ từ & luật thi đấu" />

      <View style={styles.card}>
        <Text style={styles.label}>Tên phòng</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ví dụ: Đấu tốc độ N3..."
          placeholderTextColor={nihongoTheme.colors.textMuted}
          style={styles.input}
        />

        <View style={styles.rowBetween}>
          <Text style={styles.label}>Phòng riêng tư (chỉ vào bằng mã)</Text>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: '#E5DDD4', true: nihongoTheme.colors.accent }}
          />
        </View>

        <Text style={styles.label}>Chế độ câu hỏi</Text>
        <View style={styles.chipsRow}>
          {(
            [
              ['reading', 'Đọc (Kanji → Kana/Romaji)'],
              ['meaning', 'Nghĩa (Nhật → Việt)'],
              ['mixed', 'Trộn cả 2'],
            ] as const
          ).map(([k, lbl]) => (
            <Pressable key={k} style={[styles.chip, mode === k && styles.chipActive]} onPress={() => setMode(k)}>
              <Text style={[styles.chipText, mode === k && styles.chipTextActive]}>{lbl}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Điểm thắng (Score limit)</Text>
        <View style={styles.chipsRow}>
          {[10, 15, 20, 30, 50].map((v) => (
            <Pressable
              key={v}
              style={[styles.chip, scoreLimit === v && styles.chipActive]}
              onPress={() => setScoreLimit(v)}
            >
              <Text style={[styles.chipText, scoreLimit === v && styles.chipTextActive]}>{v} điểm</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Thời gian mỗi câu</Text>
        <View style={styles.chipsRow}>
          {[10, 15, 20, 30].map((v) => (
            <Pressable
              key={v}
              style={[styles.chip, answerTimeSec === v && styles.chipActive]}
              onPress={() => setAnswerTimeSec(v)}
            >
              <Text style={[styles.chipText, answerTimeSec === v && styles.chipTextActive]}>{v} giây</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Nghỉ giữa 2 câu</Text>
        <View style={styles.chipsRow}>
          {[2, 3, 5].map((v) => (
            <Pressable
              key={v}
              style={[styles.chip, delaySec === v && styles.chipActive]}
              onPress={() => setDelaySec(v)}
            >
              <Text style={[styles.chipText, delaySec === v && styles.chipTextActive]}>{v} giây</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Chọn bộ từ ({selectedDecks.length} bộ đang chọn)</Text>
        <View style={styles.chipsRow}>
          {decks.map((d) => {
            const active = selectedDecks.includes(d.id);
            return (
              <Pressable key={d.id} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleDeck(d.id)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {d.name} ({d.count})
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.primaryBtn} onPress={() => void handleCreate()} disabled={busy}>
          <Text style={styles.primaryBtnText}>{busy ? 'Đang tạo phòng…' : 'Tạo phòng & Vào sảnh →'}</Text>
        </Pressable>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: nihongoTheme.colors.surface,
    borderRadius: nihongoTheme.radius.card,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    padding: 20,
    gap: 12,
    ...nihongoTheme.shadow.card,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: nihongoTheme.colors.textPrimary,
    marginTop: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    backgroundColor: nihongoTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: nihongoTheme.colors.borderWarm,
    borderRadius: nihongoTheme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: nihongoTheme.colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: nihongoTheme.radius.pill,
    backgroundColor: nihongoTheme.colors.chipNeutralBg,
  },
  chipActive: {
    backgroundColor: nihongoTheme.colors.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: nihongoTheme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: nihongoTheme.colors.accent,
    borderRadius: nihongoTheme.radius.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
