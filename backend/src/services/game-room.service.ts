import crypto from 'node:crypto';
import { pool } from '../config/database.js';

export interface GameSocket {
  readyState: number;
  send: (data: string) => void;
  close: () => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
}

export type GameMode = 'reading' | 'meaning' | 'mixed';

export interface GameDeckInfo {
  id: string;
  name: string;
  count: number;
  category: 'jlpt' | 'folder';
}

export interface GameCard {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  sinoVietnamese: string | null;
}

export interface GamePlayer {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  socket: GameSocket;
}

export interface ChatEntry {
  id: string;
  type: 'chat' | 'system' | 'correct' | 'timeout';
  sender?: string;
  text: string;
  ts: number;
}

export interface ActiveQuestion {
  index: number;
  card: GameCard;
  direction: 'reading' | 'meaning';
  deadlineMs: number;
}

export interface GameRoom {
  code: string;
  name: string;
  isPrivate: boolean;
  mode: GameMode;
  deckIds: string[];
  scoreLimit: number;
  answerTimeSec: number;
  delaySec: number;
  status: 'lobby' | 'playing' | 'finished';
  players: Map<string, GamePlayer>;
  cards: GameCard[];
  cardCursor: number;
  currentQuestion: ActiveQuestion | null;
  chat: ChatEntry[];
  timer: ReturnType<typeof setTimeout> | null;
  createdAt: number;
}

const rooms = new Map<string, GameRoom>();

const ROMAJI_MAP: [string, string][] = [
  ['kya', 'きゃ'], ['kyu', 'きゅ'], ['kyo', 'きょ'],
  ['sha', 'しゃ'], ['shu', 'しゅ'], ['sho', 'しょ'],
  ['cha', 'ちゃ'], ['chu', 'ちゅ'], ['cho', 'ちょ'],
  ['nya', 'にゃ'], ['nyu', 'にゅ'], ['nyo', 'にょ'],
  ['hya', 'ひゃ'], ['hyu', 'ひゅ'], ['hyo', 'ひょ'],
  ['mya', 'みゃ'], ['myu', 'みゅ'], ['myo', 'みょ'],
  ['rya', 'りゃ'], ['ryu', 'りゅ'], ['ryo', 'りょ'],
  ['gya', 'ぎゃ'], ['gyu', 'ぎゅ'], ['gyo', 'ぎょ'],
  ['ja', 'じゃ'], ['ju', 'じゅ'], ['jo', 'じょ'],
  ['bya', 'びゃ'], ['byu', 'びゅ'], ['byo', 'びょ'],
  ['pya', 'ぴゃ'], ['pyu', 'ぴゅ'], ['pyo', 'ぴょ'],
  ['shi', 'し'], ['chi', 'ち'], ['tsu', 'つ'], ['fu', 'ふ'],
  ['ka', 'か'], ['ki', 'き'], ['ku', 'く'], ['ke', 'け'], ['ko', 'こ'],
  ['sa', 'さ'], ['su', 'す'], ['se', 'せ'], ['so', 'そ'],
  ['ta', 'た'], ['te', 'て'], ['to', 'と'],
  ['na', 'な'], ['ni', 'に'], ['nu', 'ぬ'], ['ne', 'ね'], ['no', 'の'],
  ['ha', 'は'], ['hi', 'ひ'], ['he', 'へ'], ['ho', 'ほ'],
  ['ma', 'ま'], ['mi', 'み'], ['mu', 'む'], ['me', 'め'], ['mo', 'も'],
  ['ya', 'や'], ['yu', 'ゆ'], ['yo', 'よ'],
  ['ra', 'ら'], ['ri', 'り'], ['ru', 'る'], ['re', 'れ'], ['ro', 'ろ'],
  ['wa', 'わ'], ['wo', 'を'],
  ['ga', 'が'], ['gi', 'ぎ'], ['gu', 'ぐ'], ['ge', 'げ'], ['go', 'ご'],
  ['za', 'ざ'], ['ji', 'じ'], ['zu', 'ず'], ['ze', 'ぜ'], ['zo', 'ぞ'],
  ['da', 'だ'], ['de', 'で'], ['do', 'ど'],
  ['ba', 'ば'], ['bi', 'び'], ['bu', 'ぶ'], ['be', 'べ'], ['bo', 'ぼ'],
  ['pa', 'ぱ'], ['pi', 'ぴ'], ['pu', 'ぷ'], ['pe', 'ぺ'], ['po', 'ぽ'],
  ['a', 'あ'], ['i', 'い'], ['u', 'う'], ['e', 'え'], ['o', 'お'],
  ['nn', 'ん'], ['n', 'ん'],
];

export function romajiToHiragana(input: string): string {
  let s = input.trim().toLowerCase();
  if (!/^[a-z\s-]+$/.test(s)) return s;
  s = s.replace(/([bcdfghjklmpqrstvwxyz])\1/g, 'っ$1');
  let out = '';
  let i = 0;
  while (i < s.length) {
    let matched = false;
    for (const [rom, kana] of ROMAJI_MAP) {
      if (s.startsWith(rom, i)) {
        out += kana;
        i += rom.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += s[i] ?? '';
      i += 1;
    }
  }
  return out;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function checkAnswer(card: GameCard, direction: 'reading' | 'meaning', rawGuess: string): boolean {
  const guess = normalizeText(rawGuess);
  if (!guess) return false;
  if (direction === 'reading') {
    const kanaGuess = romajiToHiragana(guess);
    const targetReading = normalizeText(card.reading);
    const targetWord = normalizeText(card.word);
    return guess === targetReading || kanaGuess === targetReading || guess === targetWord;
  }
  const meanings = card.meaning
    .split(/[,;/]/)
    .map((m) => normalizeText(m))
    .filter(Boolean);
  return meanings.some((m) => m === guess || (guess.length >= 2 && m.includes(guess)));
}

export async function listAvailableDecks(): Promise<GameDeckInfo[]> {
  const decks: GameDeckInfo[] = [];
  const allRes = await pool.query('SELECT count(*)::int AS cnt FROM vocabularies WHERE deleted_at IS NULL');
  const allCount = (allRes.rows[0]?.cnt as number) ?? 0;
  decks.push({ id: 'all', name: 'Toàn bộ kho từ', count: allCount, category: 'jlpt' });

  const jlptRes = await pool.query(
    `SELECT jlpt_level AS level, count(*)::int AS cnt
     FROM vocabularies WHERE deleted_at IS NULL AND jlpt_level IS NOT NULL
     GROUP BY jlpt_level ORDER BY jlpt_level DESC`,
  );
  for (const row of jlptRes.rows) {
    decks.push({
      id: `jlpt:${row.level}`,
      name: `JLPT ${row.level}`,
      count: row.cnt as number,
      category: 'jlpt',
    });
  }

  const folderRes = await pool.query(
    `SELECT f.id, f.name, count(vf.vocabulary_id)::int AS cnt
     FROM folders f
     LEFT JOIN vocabulary_folders vf ON vf.folder_id = f.id
     LEFT JOIN vocabularies v ON v.id = vf.vocabulary_id AND v.deleted_at IS NULL
     WHERE f.deleted_at IS NULL
     GROUP BY f.id, f.name
     HAVING count(v.id) > 0
     ORDER BY f.name ASC`,
  );
  for (const row of folderRes.rows) {
    decks.push({
      id: `folder:${row.id}`,
      name: `Thư mục: ${row.name}`,
      count: row.cnt as number,
      category: 'folder',
    });
  }
  return decks;
}

async function loadCardsForDecks(deckIds: string[]): Promise<GameCard[]> {
  if (deckIds.length === 0 || deckIds.includes('all')) {
    const res = await pool.query(
      `SELECT id, word, COALESCE(reading, word) AS reading, meaning, sino_vietnamese AS "sinoVietnamese"
       FROM vocabularies WHERE deleted_at IS NULL ORDER BY random() LIMIT 200`,
    );
    return res.rows as GameCard[];
  }

  const jlptLevels = deckIds.filter((d) => d.startsWith('jlpt:')).map((d) => d.slice(5));
  const folderIds = deckIds.filter((d) => d.startsWith('folder:')).map((d) => d.slice(7));

  const res = await pool.query(
    `SELECT DISTINCT v.id, v.word, COALESCE(v.reading, v.word) AS reading, v.meaning, v.sino_vietnamese AS "sinoVietnamese"
     FROM vocabularies v
     LEFT JOIN vocabulary_folders vf ON vf.vocabulary_id = v.id
     WHERE v.deleted_at IS NULL
       AND (
         (cardinality($1::text[]) > 0 AND v.jlpt_level::text = ANY($1::text[]))
         OR (cardinality($2::text[]) > 0 AND vf.folder_id = ANY($2::text[]))
       )
     LIMIT 300`,
    [jlptLevels, folderIds],
  );
  const cards = res.rows as GameCard[];
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = cards[i]!;
    cards[i] = cards[j]!;
    cards[j] = tmp;
  }
  return cards;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)] ?? 'A';
  }
  return code;
}

export async function createGameRoom(input: {
  name?: string;
  isPrivate?: boolean;
  mode?: GameMode;
  deckIds?: string[];
  scoreLimit?: number;
  answerTimeSec?: number;
  delaySec?: number;
}) {
  const code = generateRoomCode();
  const deckIds = input.deckIds && input.deckIds.length > 0 ? input.deckIds : ['all'];
  const cards = await loadCardsForDecks(deckIds);
  const room: GameRoom = {
    code,
    name: input.name?.trim() || `Phòng Kotoba ${code}`,
    isPrivate: Boolean(input.isPrivate),
    mode: input.mode ?? 'reading',
    deckIds,
    scoreLimit: Math.max(3, Math.min(100, input.scoreLimit ?? 15)),
    answerTimeSec: Math.max(5, Math.min(60, input.answerTimeSec ?? 15)),
    delaySec: Math.max(1, Math.min(10, input.delaySec ?? 3)),
    status: 'lobby',
    players: new Map(),
    cards,
    cardCursor: 0,
    currentQuestion: null,
    chat: [],
    timer: null,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return serializeRoomSummary(room);
}

export function listPublicRooms() {
  return [...rooms.values()]
    .filter((r) => !r.isPrivate)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(serializeRoomSummary);
}

function serializeRoomSummary(room: GameRoom) {
  return {
    code: room.code,
    name: room.name,
    isPrivate: room.isPrivate,
    mode: room.mode,
    scoreLimit: room.scoreLimit,
    answerTimeSec: room.answerTimeSec,
    delaySec: room.delaySec,
    status: room.status,
    playerCount: room.players.size,
    cardCount: room.cards.length,
  };
}

function broadcast(room: GameRoom, payload: unknown) {
  const raw = JSON.stringify(payload);
  for (const player of room.players.values()) {
    if (player.socket.readyState === 1) {
      player.socket.send(raw);
    }
  }
}

function pushChat(room: GameRoom, entry: Omit<ChatEntry, 'id' | 'ts'>) {
  const full: ChatEntry = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    ...entry,
  };
  room.chat = [...room.chat.slice(-49), full];
  broadcast(room, { type: 'chat', entry: full });
}

function broadcastState(room: GameRoom) {
  const players = [...room.players.values()]
    .map((p) => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost }))
    .sort((a, b) => b.score - a.score);
  broadcast(room, {
    type: 'room_state',
    room: serializeRoomSummary(room),
    players,
    question: room.currentQuestion
      ? {
          index: room.currentQuestion.index,
          prompt:
            room.currentQuestion.direction === 'reading'
              ? room.currentQuestion.card.word
              : room.currentQuestion.card.meaning,
          direction: room.currentQuestion.direction,
          sinoVietnamese: room.currentQuestion.card.sinoVietnamese,
          deadlineMs: room.currentQuestion.deadlineMs,
        }
      : null,
    chat: room.chat,
  });
}

function nextQuestion(room: GameRoom) {
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
  if (room.cardCursor >= room.cards.length) {
    room.status = 'finished';
    room.currentQuestion = null;
    pushChat(room, { type: 'system', text: 'Đã hết bộ từ! Trận đấu kết thúc.' });
    broadcastState(room);
    return;
  }
  const card = room.cards[room.cardCursor]!;
  room.cardCursor += 1;
  const direction: 'reading' | 'meaning' =
    room.mode === 'mixed' ? (room.cardCursor % 2 === 1 ? 'reading' : 'meaning') : room.mode;
  room.currentQuestion = {
    index: room.cardCursor,
    card,
    direction,
    deadlineMs: Date.now() + room.answerTimeSec * 1000,
  };
  broadcastState(room);

  room.timer = setTimeout(() => {
    if (!room.currentQuestion) return;
    const missed = room.currentQuestion.card;
    room.currentQuestion = null;
    pushChat(room, {
      type: 'timeout',
      text: `Hết giờ! Đáp án: ${missed.word} (${missed.reading}) — ${missed.meaning}`,
    });
    broadcastState(room);
    room.timer = setTimeout(() => {
      if (room.status === 'playing') nextQuestion(room);
    }, room.delaySec * 1000);
  }, room.answerTimeSec * 1000);
}

export function attachSocketToRoom(roomCode: string, socket: GameSocket, playerName: string, userId?: string) {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) {
    socket.send(JSON.stringify({ type: 'error', message: 'Không tìm thấy phòng chơi này.' }));
    socket.close();
    return;
  }

  const playerId = userId?.trim() || crypto.randomUUID();
  const existing = room.players.get(playerId);
  let player: GamePlayer;

  if (existing) {
    const oldSocket = existing.socket;
    existing.socket = socket;
    existing.name = playerName.trim() || existing.name;
    player = existing;
    if (oldSocket && oldSocket !== socket && oldSocket.readyState === 1) {
      oldSocket.close();
    }
    broadcastState(room);
  } else {
    const isHost = room.players.size === 0;
    player = {
      id: playerId,
      name: playerName.trim() || `Người chơi ${room.players.size + 1}`,
      score: 0,
      isHost,
      socket,
    };
    room.players.set(playerId, player);
    pushChat(room, { type: 'system', text: `${player.name} đã vào phòng.` });
    broadcastState(room);
  }

  socket.on('message', (rawBuf: unknown) => {
    try {
      const msg = JSON.parse(String(rawBuf)) as { type?: string; text?: string };
      if (msg.type === 'start') {
        if (room.cards.length === 0) {
          pushChat(room, { type: 'system', text: 'Bộ từ đang trống, không thể bắt đầu.' });
          return;
        }
        for (const p of room.players.values()) p.score = 0;
        room.cardCursor = 0;
        room.status = 'playing';
        pushChat(room, { type: 'system', text: 'Trận đấu bắt đầu!' });
        nextQuestion(room);
        return;
      }

      if (msg.type === 'skip' && room.status === 'playing' && room.currentQuestion) {
        const skipped = room.currentQuestion.card;
        room.currentQuestion = null;
        if (room.timer) clearTimeout(room.timer);
        pushChat(room, {
          type: 'timeout',
          text: `${player.name} bỏ qua. Đáp án: ${skipped.word} (${skipped.reading}) — ${skipped.meaning}`,
        });
        broadcastState(room);
        room.timer = setTimeout(() => {
          if (room.status === 'playing') nextQuestion(room);
        }, room.delaySec * 1000);
        return;
      }

      if (msg.type === 'answer' && typeof msg.text === 'string') {
        const text = msg.text.trim();
        if (!text) return;
        if (room.status === 'playing' && room.currentQuestion) {
          const ok = checkAnswer(room.currentQuestion.card, room.currentQuestion.direction, text);
          if (ok) {
            const solved = room.currentQuestion.card;
            room.currentQuestion = null;
            if (room.timer) clearTimeout(room.timer);
            player.score += 1;
            pushChat(room, {
              type: 'correct',
              sender: player.name,
              text: `${player.name} đúng! (+1) · ${solved.word} (${solved.reading}) — ${solved.meaning}`,
            });
            if (player.score >= room.scoreLimit) {
              room.status = 'finished';
              pushChat(room, { type: 'system', text: `🏆 ${player.name} chiến thắng với ${player.score} điểm!` });
              broadcastState(room);
              return;
            }
            broadcastState(room);
            room.timer = setTimeout(() => {
              if (room.status === 'playing') nextQuestion(room);
            }, room.delaySec * 1000);
            return;
          }
        }
        pushChat(room, { type: 'chat', sender: player.name, text });
      }
    } catch {
      // ignore malformed messages
    }
  });

  socket.on('close', () => {
    const current = room.players.get(playerId);
    if (!current || current.socket !== socket) return;
    room.players.delete(playerId);
    if (room.players.size === 0) {
      if (room.timer) clearTimeout(room.timer);
      rooms.delete(room.code);
      return;
    }
    if (player.isHost) {
      const nextHost = room.players.values().next().value;
      if (nextHost) nextHost.isHost = true;
    }
    pushChat(room, { type: 'system', text: `${player.name} đã rời phòng.` });
    broadcastState(room);
  });
}
