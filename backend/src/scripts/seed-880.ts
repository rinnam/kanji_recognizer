import fs from 'fs';
import { pool } from '../config/database.js';
import { newVocabId } from '../utils/id.js';

const DEV_USER_ID = process.env.LOCAL_OWNER_ID ?? '00000000-0000-4000-8000-000000000000';

const FOLDER_MAP: Record<string, string> = {
  '01': 'folder_murugtq5_8i2xbzwz',
  '02': 'folder_murut85i_f8wybgck',
  '03': 'folder_muruujb5_x8pp6a5k',
  '04': 'folder_muruulec_hpxt7ogr',
  '05': 'folder_muruuncg_2char2hq',
  '06': 'folder_muruuq0i_ukhsegyf',
  '07': 'folder_muruut87_7t9szepm',
  '08': 'folder_mvx8zj85_8704vqc8',
  '09': 'folder_muruuxlb_3eeui8qd',
  '10': 'folder_muruuztp_eiv92pf9',
  '11': 'folder_muruv1id_6fdnc9vc',
};

const BASE_PATH = 'D:/Ki_1_nam_4/Nihon/List_kanji/Vocab_01-11_880_Format_FileMau_DaSua/Vocab_01-11_880_Format_FileMau';

interface ParsedWord {
  word: string;
  reading: string | null;
  sinoVietnamese: string | null;
  meaning: string;
  example: string | null;
  exampleMeaning: string | null;
  jlpt: string | null;
  note: string | null;
}

function parseMarkdownFile(filePath: string): ParsedWord[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|') && !l.includes('---') && !l.includes('Cách đọc'));

  const result: ParsedWord[] = [];
  for (const line of lines) {
    const parts = line.split('|').map((s) => s.trim());
    // parts[0] is empty, parts[1] is word
    const word = parts[1] ?? '';
    const reading = parts[2] ? parts[2] : null;
    const sinoVietnamese = parts[3] ? parts[3] : null;
    const meaning = parts[4] ?? '';
    const example = parts[5] ? parts[5] : null;
    const exampleMeaning = parts[6] ? parts[6] : null;
    let jlpt = parts[7] ? parts[7].toUpperCase() : null;
    if (jlpt && !['N1', 'N2', 'N3', 'N4', 'N5'].includes(jlpt)) {
      jlpt = null;
    }
    const note = parts[8] ? parts[8] : null;

    if (word && meaning) {
      result.push({
        word,
        reading,
        sinoVietnamese,
        meaning,
        example,
        exampleMeaning,
        jlpt,
        note,
      });
    }
  }
  return result;
}

async function main() {
  console.log('--- 1. BẮT ĐẦU XÓA TOÀN BỘ TỪ VỰNG CŨ TRONG DATABASE ---');
  await pool.query('DELETE FROM vocabulary_folders');
  const delRes = await pool.query('DELETE FROM vocabularies');
  console.log(`Đã xóa ${delRes.rowCount} từ vựng và toàn bộ liên kết vocabulary_folders.`);

  console.log('--- 2. NẠP 880 TỪ VỰNG MỚI TỪ FILE MẪU VÀO THƯ MỤC 01-11 ---');
  const files = fs.readdirSync(BASE_PATH);
  let totalInserted = 0;

  const now = new Date();
  const baseTime = now.getTime();

  for (let i = 1; i <= 11; i++) {
    const num = String(i).padStart(2, '0');
    const folderId = FOLDER_MAP[num];
    if (!folderId) {
      console.error(`Không tìm thấy folderId cho ${num}!`);
      continue;
    }

    const matchedFile = files.find((f) => f.startsWith(`Vocab_${num}_`));
    if (!matchedFile) {
      console.error(`Không tìm thấy file cho Vocab_${num}!`);
      continue;
    }

    const filePath = `${BASE_PATH}/${matchedFile}`;
    const words = parseMarkdownFile(filePath);
    console.log(`Đọc ${num} (${matchedFile}): ${words.length} từ`);

    for (const [j, w] of words.entries()) {
      const vocabId = newVocabId();
      // Tăng timestamp từng mili-giây để giữ đúng thứ tự từ 1 đến 80
      const createdAt = new Date(baseTime + (i * 1000) + j);
      const updatedAt = createdAt;

      await pool.query(
        `INSERT INTO vocabularies (
          id, owner_id, word, meaning, reading, sino_vietnamese,
          example, example_meaning, note, tags, jlpt_level,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13
        )`,
        [
          vocabId,
          DEV_USER_ID,
          w.word,
          w.meaning,
          w.reading,
          w.sinoVietnamese,
          w.example,
          w.exampleMeaning,
          w.note,
          [],
          w.jlpt,
          createdAt,
          updatedAt,
        ],
      );

      await pool.query(
        `INSERT INTO vocabulary_folders (vocabulary_id, folder_id) VALUES ($1, $2)`,
        [vocabId, folderId],
      );

      totalInserted++;
    }
    console.log(`-> Đã thêm thành công ${words.length} từ vào thư mục ${num} (${folderId})`);
  }

  console.log(`--- HOÀN TẤT: ĐÃ THÊM TỔNG CỘNG ${totalInserted} TỪ VỰNG MỚI VÀO DATABASE! ---`);
  await pool.end();
}

main().catch((err) => {
  console.error('Lỗi khi nạp dữ liệu:', err);
  process.exit(1);
});
