import type { KanjiDetail } from './types';
import kanjiDictDataRaw from '../data/kanji-dict-vn.json';

interface RawDictEntry {
  h: string;
  m: string;
  s?: number;
  r?: string;
}

const KANJI_VN_DICT = kanjiDictDataRaw as Record<string, RawDictEntry>;

/**
 * Ngân hàng dữ liệu Hán tự chuẩn (Jouyou & JLPT phổ biến).
 * Tối ưu hóa dung lượng, tra cứu O(1).
 */
export const KANJI_DATABASE: Record<string, KanjiDetail> = {
  // Chữ trong ví dụ phản hồi của người dùng: 清 (thanh)
  清: {
    character: '清',
    sinoVietnamese: 'THANH',
    meaning: 'Trong sạch, thanh khiết, thanh cao, thanh thoát',
    onyomi: ['セイ', 'ショウ'],
    kunyomi: ['きよ.い', 'きよ.まる', 'きよ.める'],
    strokeCount: 11,
    jlptLevel: 'N3',
    radical: '氵 (Thủy)',
  },
  潔: {
    character: '潔',
    sinoVietnamese: 'KHIẾT',
    meaning: 'Trong sạch, thanh khiết, tinh khiết',
    onyomi: ['ケツ'],
    kunyomi: ['いさぎよ.い'],
    strokeCount: 15,
    jlptLevel: 'N1',
    radical: '氵 (Thủy)',
  },
  // Chữ trong ví dụ của người dùng: 豊 (phong)
  豊: {
    character: '豊',
    sinoVietnamese: 'PHONG',
    meaning: 'Giàu có, phong phú, tươi tốt, bội thu',
    onyomi: ['ホウ', 'ブ'],
    kunyomi: ['ゆた.か', 'とよ'],
    strokeCount: 13,
    jlptLevel: 'N1',
    radical: '豆 (Đậu)',
  },
  富: {
    character: '富',
    sinoVietnamese: 'PHÚ',
    meaning: 'Giàu có, của cải dồi dào',
    onyomi: ['フ', 'フウ'],
    kunyomi: ['と.む', 'とみ'],
    strokeCount: 12,
    jlptLevel: 'N2',
    radical: '宀 (Miên)',
  },
  重: {
    character: '重',
    sinoVietnamese: 'TRỌNG, TRÙNG',
    meaning: 'Nặng, quan trọng; chồng chất',
    onyomi: ['ジュウ', 'チョウ'],
    kunyomi: ['おも.い', 'かさ.なる', 'え'],
    strokeCount: 9,
    jlptLevel: 'N3',
    radical: '里 (Lý)',
  },
  要: {
    character: '要',
    sinoVietnamese: 'YẾU, YÊU',
    meaning: 'Cần thiết, cốt lõi, quan trọng',
    onyomi: ['ヨウ'],
    kunyomi: ['い.る', 'かなめ'],
    strokeCount: 9,
    jlptLevel: 'N3',
    radical: '覀 (Á)',
  },
  学: {
    character: '学',
    sinoVietnamese: 'HỌC',
    meaning: 'Học tập, trường học, tri thức',
    onyomi: ['ガク'],
    kunyomi: ['まな.ぶ'],
    strokeCount: 8,
    jlptLevel: 'N5',
    radical: '子 (Tử)',
  },
  校: {
    character: '校',
    sinoVietnamese: 'HIỆU',
    meaning: 'Trường học; so sánh, kiểm tra',
    onyomi: ['コウ'],
    kunyomi: [],
    strokeCount: 10,
    jlptLevel: 'N5',
    radical: '木 (Mộc)',
  },
  日: {
    character: '日',
    sinoVietnamese: 'NHẬT',
    meaning: 'Mặt trời, ngày, nước Nhật',
    onyomi: ['ニチ', 'ジツ'],
    kunyomi: ['ひ', '-び', '-か'],
    strokeCount: 4,
    jlptLevel: 'N5',
    radical: '日 (Nhật)',
  },
  本: {
    character: '本',
    sinoVietnamese: 'BẢN, BỔN',
    meaning: 'Gốc rễ, sách, cội nguồn',
    onyomi: ['ホン'],
    kunyomi: ['もと'],
    strokeCount: 5,
    jlptLevel: 'N5',
    radical: '木 (Mộc)',
  },
  食: {
    character: '食',
    sinoVietnamese: 'THỰC',
    meaning: 'Ăn, thức ăn, món ăn',
    onyomi: ['ショク', 'ジキ'],
    kunyomi: ['た.べる', 'く.らう'],
    strokeCount: 9,
    jlptLevel: 'N5',
    radical: '食 (Thực)',
  },
  飲: {
    character: '飲',
    sinoVietnamese: 'ẨM',
    meaning: 'Uống',
    onyomi: ['イン'],
    kunyomi: ['の.む'],
    strokeCount: 12,
    jlptLevel: 'N5',
    radical: '食 (Thực)',
  },
  行: {
    character: '行',
    sinoVietnamese: 'HÀNH, HÀNG',
    meaning: 'Đi, tiến hành; dòng, hàng',
    onyomi: ['コウ', 'ギョウ', 'アン'],
    kunyomi: ['い.く', 'ゆ.く', 'おこな.う'],
    strokeCount: 6,
    jlptLevel: 'N5',
    radical: '行 (Hành)',
  },
  来: {
    character: '来',
    sinoVietnamese: 'LAI',
    meaning: 'Đến, tới, tương lai',
    onyomi: ['ライ', 'タイ'],
    kunyomi: ['く.る', 'きた.る'],
    strokeCount: 7,
    jlptLevel: 'N5',
    radical: '木 (Mộc)',
  },
  見: {
    character: '見',
    sinoVietnamese: 'KIẾN',
    meaning: 'Nhìn, thấy, quan điểm',
    onyomi: ['ケン'],
    kunyomi: ['み.る', 'み.える', 'み.せる'],
    strokeCount: 7,
    jlptLevel: 'N5',
    radical: '見 (Kiến)',
  },
  聞: {
    character: '聞',
    sinoVietnamese: 'VĂN, VẤN',
    meaning: 'Nghe, hỏi; danh tiếng',
    onyomi: ['ブン', 'モン'],
    kunyomi: ['き.く', 'き.こえる'],
    strokeCount: 14,
    jlptLevel: 'N5',
    radical: '耳 (Nhĩ)',
  },
  読: {
    character: '読',
    sinoVietnamese: 'ĐỘC',
    meaning: 'Đọc, tụng',
    onyomi: ['ドク', 'トク'],
    kunyomi: ['よ.む'],
    strokeCount: 14,
    jlptLevel: 'N5',
    radical: '言 (Ngôn)',
  },
  書: {
    character: '書',
    sinoVietnamese: 'THƯ',
    meaning: 'Viết, sách vở, thư từ',
    onyomi: ['ショ'],
    kunyomi: ['か.く'],
    strokeCount: 10,
    jlptLevel: 'N5',
    radical: '曰 (Viết)',
  },
  話: {
    character: '話',
    sinoVietnamese: 'THOẠI',
    meaning: 'Nói chuyện, câu chuyện',
    onyomi: ['ワ'],
    kunyomi: ['はな.す', 'はなし'],
    strokeCount: 13,
    jlptLevel: 'N5',
    radical: '言 (Ngôn)',
  },
  買: {
    character: '買',
    sinoVietnamese: 'MÃI',
    meaning: 'Mua',
    onyomi: ['バイ'],
    kunyomi: ['か.う'],
    strokeCount: 12,
    jlptLevel: 'N5',
    radical: '貝 (Bối)',
  },
  新: {
    character: '新',
    sinoVietnamese: 'TÂN',
    meaning: 'Mới mẻ, tươi mới',
    onyomi: ['シン'],
    kunyomi: ['あたら.しい', 'あら.た'],
    strokeCount: 13,
    jlptLevel: 'N4',
    radical: '斤 (Cân)',
  },
  古: {
    character: '古',
    sinoVietnamese: 'CỔ',
    meaning: 'Cũ, xưa, cổ đại',
    onyomi: ['コ'],
    kunyomi: ['ふる.い'],
    strokeCount: 5,
    jlptLevel: 'N5',
    radical: '口 (Khẩu)',
  },
  高: {
    character: '高',
    sinoVietnamese: 'CAO',
    meaning: 'Cao, đắt',
    onyomi: ['コウ'],
    kunyomi: ['たか.い', 'たか.まる'],
    strokeCount: 10,
    jlptLevel: 'N5',
    radical: '高 (Cao)',
  },
  安: {
    character: '安',
    sinoVietnamese: 'AN',
    meaning: 'Rẻ; an toàn, yên bình',
    onyomi: ['アン'],
    kunyomi: ['やす.い'],
    strokeCount: 6,
    jlptLevel: 'N5',
    radical: '宀 (Miên)',
  },
  大: {
    character: '大',
    sinoVietnamese: 'ĐẠI',
    meaning: 'Lớn, to lớn',
    onyomi: ['ダイ', 'タイ'],
    kunyomi: ['おお.きい'],
    strokeCount: 3,
    jlptLevel: 'N5',
    radical: '大 (Đại)',
  },
  小: {
    character: '小',
    sinoVietnamese: 'TIỂU',
    meaning: 'Nhỏ, bé',
    onyomi: ['ショウ'],
    kunyomi: ['ちい.さい', 'こ-'],
    strokeCount: 3,
    jlptLevel: 'N5',
    radical: '小 (Tiểu)',
  },
  長: {
    character: '長',
    sinoVietnamese: 'TRƯỜNG, TRƯỞNG',
    meaning: 'Dài; đứng đầu, trưởng thành',
    onyomi: ['チョウ'],
    kunyomi: ['なが.い', 'おさ'],
    strokeCount: 8,
    jlptLevel: 'N5',
    radical: '長 (Trường)',
  },
  短: {
    character: '短',
    sinoVietnamese: 'ĐOẢN',
    meaning: 'Ngắn, khuyết điểm',
    onyomi: ['タン'],
    kunyomi: ['みじか.い'],
    strokeCount: 12,
    jlptLevel: 'N4',
    radical: '矢 (Thỉ)',
  },
  多: {
    character: '多',
    sinoVietnamese: 'ĐA',
    meaning: 'Nhiều',
    onyomi: ['タ'],
    kunyomi: ['おお.い'],
    strokeCount: 6,
    jlptLevel: 'N4',
    radical: '夕 (Tịch)',
  },
  少: {
    character: '少',
    sinoVietnamese: 'THIỂU, THIẾU',
    meaning: 'Ít; trẻ tuổi',
    onyomi: ['ショウ'],
    kunyomi: ['すく.ない', 'すこ.し'],
    strokeCount: 4,
    jlptLevel: 'N4',
    radical: '小 (Tiểu)',
  },
  雨: {
    character: '雨',
    sinoVietnamese: 'VŨ',
    meaning: 'Mưa',
    onyomi: ['ウ'],
    kunyomi: ['あめ', 'あま-'],
    strokeCount: 8,
    jlptLevel: 'N5',
    radical: '雨 (Vũ)',
  },
  橋: {
    character: '橋',
    sinoVietnamese: 'KIỀU',
    meaning: 'Cây cầu',
    onyomi: ['キョウ'],
    kunyomi: ['はし'],
    strokeCount: 16,
    jlptLevel: 'N3',
    radical: '木 (Mộc)',
  },
  箸: {
    character: '箸',
    sinoVietnamese: 'TRỨ',
    meaning: 'Đôi đũa',
    onyomi: ['チョ'],
    kunyomi: ['はし'],
    strokeCount: 15,
    jlptLevel: 'N1',
    radical: '竹 (Trúc)',
  },
  愛: {
    character: '愛',
    sinoVietnamese: 'ÁI',
    meaning: 'Yêu thương, tình ái',
    onyomi: ['アイ'],
    kunyomi: ['いと.しい', 'まな'],
    strokeCount: 13,
    jlptLevel: 'N3',
    radical: '心 (Tâm)',
  },
  情: {
    character: '情',
    sinoVietnamese: 'TÌNH',
    meaning: 'Tình cảm, tâm tình, thực trạng',
    onyomi: ['ジョウ', 'セイ'],
    kunyomi: ['なさ.け'],
    strokeCount: 11,
    jlptLevel: 'N3',
    radical: '忄 (Tâm)',
  },
  感: {
    character: '感',
    sinoVietnamese: 'CẢM',
    meaning: 'Cảm giác, cảm xúc, cảm kích',
    onyomi: ['カン'],
    kunyomi: [],
    strokeCount: 13,
    jlptLevel: 'N3',
    radical: '心 (Tâm)',
  },
  考: {
    character: '考',
    sinoVietnamese: 'KHẢO',
    meaning: 'Suy nghĩ, khảo sát',
    onyomi: ['コウ'],
    kunyomi: ['かんが.える'],
    strokeCount: 6,
    jlptLevel: 'N4',
    radical: '老 (Lão)',
  },
  思: {
    character: '思',
    sinoVietnamese: 'TƯ',
    meaning: 'Nghĩ ngợi, tưởng nhớ',
    onyomi: ['シ'],
    kunyomi: ['おも.う'],
    strokeCount: 9,
    jlptLevel: 'N4',
    radical: '心 (Tâm)',
  },
  知: {
    character: '知',
    sinoVietnamese: 'TRI, TRÍ',
    meaning: 'Biết, tri thức, hiểu biết',
    onyomi: ['チ'],
    kunyomi: ['し.る'],
    strokeCount: 8,
    jlptLevel: 'N5',
    radical: '矢 (Thỉ)',
  },
  道: {
    character: '道',
    sinoVietnamese: 'ĐẠO',
    meaning: 'Con đường, đạo lý, phương pháp',
    onyomi: ['ドウ', 'トウ'],
    kunyomi: ['みち'],
    strokeCount: 12,
    jlptLevel: 'N5',
    radical: '辶 (Sước)',
  },
  理: {
    character: '理',
    sinoVietnamese: 'LÝ',
    meaning: 'Lý lẽ, chân lý, quản lý',
    onyomi: ['リ'],
    kunyomi: ['ことわり'],
    strokeCount: 11,
    jlptLevel: 'N4',
    radical: '玉 (Ngọc)',
  },
  気: {
    character: '気',
    sinoVietnamese: 'KHÍ',
    meaning: 'Khí chất, tinh thần, không khí',
    onyomi: ['キ', 'ケ'],
    kunyomi: ['いき'],
    strokeCount: 6,
    jlptLevel: 'N5',
    radical: '气 (Khí)',
  },
  生: {
    character: '生',
    sinoVietnamese: 'SINH',
    meaning: 'Sinh sống, sinh đẻ, tươi sống, học sinh',
    onyomi: ['セイ', 'ショウ'],
    kunyomi: ['い.きる', 'う.まれる', 'なま'],
    strokeCount: 5,
    jlptLevel: 'N5',
    radical: '生 (Sinh)',
  },
  先: {
    character: '先',
    sinoVietnamese: 'TIÊN',
    meaning: 'Trước, đi trước, đầu tiên',
    onyomi: ['セン'],
    kunyomi: ['さき', 'ま.ず'],
    strokeCount: 6,
    jlptLevel: 'N5',
    radical: '儿 (Nhi)',
  },
  友: {
    character: '友',
    sinoVietnamese: 'HỮU',
    meaning: 'Bạn bè, thân thiết',
    onyomi: ['ユウ'],
    kunyomi: ['とも'],
    strokeCount: 4,
    jlptLevel: 'N5',
    radical: '又 (Hựu)',
  },
  時: {
    character: '時',
    sinoVietnamese: 'THỜI, THÌ',
    meaning: 'Thời gian, giờ giấc',
    onyomi: ['ジ'],
    kunyomi: ['とき'],
    strokeCount: 10,
    jlptLevel: 'N5',
    radical: '日 (Nhật)',
  },
  間: {
    character: '間',
    sinoVietnamese: 'GIAN',
    meaning: 'Khoảng cách, giữa, gian phòng',
    onyomi: ['カン', 'ケン'],
    kunyomi: ['あいだ', 'ま'],
    strokeCount: 12,
    jlptLevel: 'N5',
    radical: '門 (Môn)',
  },
  年: {
    character: '年',
    sinoVietnamese: 'NIÊN',
    meaning: 'Năm, tuổi',
    onyomi: ['ネン'],
    kunyomi: ['とし'],
    strokeCount: 6,
    jlptLevel: 'N5',
    radical: '干 (Can)',
  },
  今: {
    character: '今',
    sinoVietnamese: 'KIM',
    meaning: 'Bây giờ, hiện tại',
    onyomi: ['コン', 'キン'],
    kunyomi: ['いま'],
    strokeCount: 4,
    jlptLevel: 'N5',
    radical: '人 (Nhân)',
  },
  人: {
    character: '人',
    sinoVietnamese: 'NHÂN',
    meaning: 'Người, con người',
    onyomi: ['ジン', 'ニン'],
    kunyomi: ['ひと'],
    strokeCount: 2,
    jlptLevel: 'N5',
    radical: '人 (Nhân)',
  },
  国: {
    character: '国',
    sinoVietnamese: 'QUỐC',
    meaning: 'Đất nước, quốc gia',
    onyomi: ['コク'],
    kunyomi: ['くに'],
    strokeCount: 8,
    jlptLevel: 'N5',
    radical: '囗 (Vi)',
  },
  語: {
    character: '語',
    sinoVietnamese: 'NGỮ',
    meaning: 'Ngôn ngữ, lời nói, kể chuyện',
    onyomi: ['ゴ'],
    kunyomi: ['かた.る', 'かた.らう'],
    strokeCount: 14,
    jlptLevel: 'N5',
    radical: '言 (Ngôn)',
  },
  漢: {
    character: '漢',
    sinoVietnamese: 'HÁN',
    meaning: 'Nhà Hán, chữ Hán, người đàn ông',
    onyomi: ['カン'],
    kunyomi: [],
    strokeCount: 13,
    jlptLevel: 'N4',
    radical: '氵 (Thủy)',
  },
  字: {
    character: '字',
    sinoVietnamese: 'TỰ',
    meaning: 'Chữ viết, văn tự',
    onyomi: ['ジ'],
    kunyomi: ['あざ', 'あざな'],
    strokeCount: 6,
    jlptLevel: 'N4',
    radical: '子 (Tử)',
  },
};

/**
 * Tra cứu thông tin chữ Hán đơn lẻ.
 * 1. Ưu tiên ngân hàng Jouyou/JLPT giàu chi tiết (Onyomi, Kunyomi, JLPT level, số nét).
 * 2. Tra cứu toàn diện trong từ điển Hán Nôm / KANJIDIC tiếng Việt 10,383 chữ (miễn phí, offline O(1)).
 *    Tự động khớp âm Hán Việt chuẩn xác từ contextSino nếu có nhiều âm đọc (vd: 'sảnh thanh' -> 'THANH').
 *    Lấy nghĩa Hán Việt ĐƠN LẺ của chính chữ đó (tuyệt đối không dùng nghĩa của cả cụm từ ghép).
 * 3. Fallback tối thiểu an toàn nếu chữ cổ hiếm không có trong từ điển.
 */
export function lookupKanji(
  char: string,
  contextSino?: string | null,
  contextMeaning?: string | null,
): KanjiDetail | null {
  if (!char) return null;

  // 1. Kiểm tra ngân hàng dữ liệu giàu chi tiết
  const rich = KANJI_DATABASE[char];
  if (rich) {
    return rich;
  }

  // 2. Tra cứu ngân hàng từ điển Hán Nôm / KANJIDIC toàn diện 10,383 mục
  const entry = KANJI_VN_DICT[char];
  if (entry) {
    const rawReadings = entry.h
      ? entry.h.split(',').map((s) => s.trim().toUpperCase())
      : [];

    let chosenSino = rawReadings[0] || contextSino?.trim().toUpperCase() || 'HÁN TỰ';
    if (contextSino && contextSino.trim()) {
      const normalizedContext = contextSino.trim().toUpperCase();
      const matched = rawReadings.find((r) => r === normalizedContext);
      if (matched) {
        chosenSino = matched;
      }
    }

    // Nghĩa chữ Hán đơn lẻ thuần túy: lấy trực tiếp từ từ điển Hán tự
    const pureMeaning = entry.m && entry.m.trim()
      ? entry.m.trim()
      : 'Hán tự';

    return {
      character: char,
      sinoVietnamese: chosenSino,
      meaning: pureMeaning,
      onyomi: [],
      kunyomi: [],
      strokeCount: entry.s,
      radical: entry.r,
    };
  }

  // 3. Fallback tối thiểu (chỉ lấy âm Hán Việt, ưu tiên contextMeaning nếu có hoặc 'Hán tự')
  if (contextSino && contextSino.trim()) {
    return {
      character: char,
      sinoVietnamese: contextSino.trim().toUpperCase(),
      meaning: contextMeaning?.trim() || 'Hán tự',
      onyomi: [],
      kunyomi: [],
    };
  }

  return null;
}
