// Kiểu dữ liệu hiện dùng cho UI demo; chưa phải API contract đã được phê duyệt.
// TODO(BE): đối chiếu schema đã duyệt khi tích hợp POST /api/kanji/recognize.
export interface KanjiPrediction {
  kanji: string;
  id: number;
  json_id: number;
  train_index: number;
  confidence: number; // [0, 1]
  hiragana: string;
  reading_on: string[];
  reading_kun: string[];
  meaning_vi: string;
  meaning_hv: string;
  meaning_en: string;
  example: string;
  description: string;
  tags: string[];
  jlpt: string;
  strokes: number;
  radical_number: number;
  frequency: number;
}

export interface RecognizeResponse {
  success: boolean;
  predictions: KanjiPrediction[];
  message: string;
}

export type RecognizeStatus = "idle" | "loading" | "success" | "error";

export type InputTab = "draw" | "upload";
