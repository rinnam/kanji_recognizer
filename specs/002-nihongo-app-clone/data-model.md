# Data Model — NihonGO Clone (`002-nihongo-app-clone`)

> Tuân thủ nguyên tắc bất biến trong `AGENTS.md`: mọi bảng đồng bộ đều có `updated_at` (Last-Write-Wins) và `deleted_at` (tombstone), đồng thời giữ tương thích với `LocalFolder` / `LocalVocabulary` ở tầng client.

---

## 1. Client LocalStorage Schemas (Tương thích trực tiếp)

### `profile` (Single-User, không cần Auth/Token)
```json
{
  "display_name": "Võ Gia Lượng",
  "jlpt_level": "N3",
  "primary_goal": "JLPT_EXAM",
  "daily_goal_minutes": 60,
  "onboarding_completed_at": "2026-11-24T05:00:00Z"
}
```

### `study`
```json
{
  "progress": {
    "completed": false,
    "date": "YYYY-MM-DD",
    "goal_seconds": 3600,
    "seconds": 237,
    "intervals": [[1795494854500, 1795494871887]],
    "server_time_ms": 1795496043092,
    "timezone": "Asia/Ho_Chi_Minh"
  },
  "pending": [],
  "offset": 148
}
```

---

## 2. Domain Entities

### 2.1. Người dùng & Lộ trình học
- **`user_learning_profiles`**:
  - `user_id` (PK, FK → `users.id`)
  - `jlpt_level`: `'BEGINNER' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'`
  - `primary_goal`: `'DAILY_CONVERSATION' | 'JLPT_EXAM' | 'TRAVEL' | 'WORK' | 'CULTURE'`
  - `daily_goal_minutes`: `5 | 10 | 15 | 30 | 60`
  - `onboarding_completed_at`: `timestamptz | null`
  - `updated_at`, `deleted_at`

- **`daily_study_logs`**:
  - `id` (UUID PK), `user_id`, `study_date` (`DATE`), `goal_seconds`, `active_seconds`, `intervals_json` (`JSONB`), `timezone`, `completed` (`BOOLEAN`), `updated_at`, `deleted_at`.
  - Unique `(user_id, study_date)` để phục vụ Heatmap 52 tuần và tính `current_streak`, `total_days`, `longest_streak`.

### 2.2. Từ điển & Hán tự
- **`vocab_entries`**:
  - `id`, `kanji`, `kana_readings` (`TEXT[]`), `han_viet`, `jlpt_level`, `senses` (`JSONB`: `[{ pos, definition_vi, reading }]`), `examples` (`JSONB`: `[{ jp, kana, vi }]`), `related_vocab_ids` (`UUID[]`).
- **`kanji_entries`**:
  - `character` (PK), `han_viet`, `kunyomi` (`TEXT[]`), `onyomi` (`TEXT[]`), `stroke_count`, `radical`, `radical_number`, `frequency_rank`, `stroke_order_svg` (`TEXT`), `compound_vocab_ids` (`UUID[]`).
- **`lookup_history`**:
  - `id`, `user_id`, `query`, `kind` (`'words' | 'kanji' | 'videos'`), `created_at`.

### 2.3. Bài học & Flashcard SRS
- **`lessons`**:
  - `id` (slug/UUID), `title`, `jlpt_level` (`N5–N1`), `pos_category`, `source_series` (vd: `Mimi kara oboeru N3 Goi`), `order_index`, `vocab_count`.
- **`lesson_items`**:
  - `lesson_id`, `vocab_id`, `order_index`.
- **`flashcard_decks`** (map 1-1 với `LocalFolder`):
  - `id`, `user_id` (`null` nếu là bộ có sẵn), `kind` (`'lesson' | 'custom'`), `title`, `jlpt_level`, `is_favorite`, `updated_at`, `deleted_at`.
- **`flashcard_cards`** (map 1-1 với `LocalVocabulary`):
  - `id`, `deck_id`, `vocab_id` (optional), `front_kanji`, `back_kana`, `back_meaning_vi`, `han_viet`, `is_favorite`, `srs_due_at`, `srs_interval_days`, `srs_ease_factor`, `srs_repetitions`, `srs_state` (`'new' | 'learning' | 'review' | 'relearning'`), `updated_at`, `deleted_at`.
- **`flashcard_reviews`**:
  - `id`, `user_id`, `card_id`, `rating` (`1: Chưa nhớ`, `2: Mơ hồ`, `3: Nhớ`, `4: Rất nhớ`), `reviewed_at`, `next_due_at`.

### 2.4. Bốn Kỹ năng Chuyên sâu
- **Nghe (`listening_videos`, `listening_segments`)**:
  - `id`, `owner_user_id` (`null` = hệ thống), `youtube_id`, `title`, `channel_name`, `duration_seconds`, `jlpt_level`, `segments` (`[{ index, start_ms, end_ms, jp_tokens, vi_translation }]`).
- **Nói (`speaking_scenarios`, `speaking_sessions`)**:
  - `scenario`: `id`, `title`, `topic`, `jlpt_level`, `duration_minutes`, `ai_role`, `ai_voice` (`'Aoi'`), `objectives`.
  - `session`: `id`, `user_id`, `scenario_id`, `mode` (`'guided' | 'free'`), `save_audio`, `transcript_json`, `audio_url`, `created_at`.
- **Đọc (`reading_passages`, `reading_attempts`)**:
  - `passage`: `id`, `title`, `jlpt_level`, `passage_type` (`Đoản văn`..`Theo chủ đề`), `source_url`, `tokenized_body_json`, `analysis_json` (`main_idea`, `flow`, `key_vocab`, `key_grammar`, `sentence_structures`), `questions_json`.
  - `attempt`: `id`, `user_id`, `passage_id`, `answers_json`, `score`, `submitted_at`.
- **Viết (`writing_prompts`, `writing_submissions`)**:
  - `prompt`: `id`, `title`, `jlpt_level`, `category`, `outline_hints`, `target_grammar`, `is_free_writing`.
  - `submission`: `id`, `user_id`, `prompt_id`, `status` (`'draft' | 'submitted'`), `content`, `writing_direction` (`'horizontal' | 'vertical'`), `elapsed_seconds`, `rubric_scores_json` (`task_response`, `coherence`, `grammar`, `vocabulary`), `ai_feedback_json`, `version`, `updated_at`, `deleted_at`.

### 2.5. Kho Game Từ vựng
- **`game_rooms`**:
  - `room_code` (6 ký tự, PK), `host_user_id`, `game_mode` (`'momo_siege' | 'grab_mic' | 'vocab_duel'`), `jlpt_level`, `word_source`, `seconds_per_question` (`8 | 9 | 10`), `status`, `players_json`, `created_at`.
- **`game_bot_records`**:
  - `user_id`, `difficulty` (`'easy' | 'medium' | 'hard'`), `high_score`, `wrong_vocab_ids` (`UUID[]`), `updated_at`.
