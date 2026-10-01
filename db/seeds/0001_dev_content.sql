-- Kanji Recognizer — development content seed (F0.3)
-- TARGET/PROPOSED dev fixture only. Not approved reference content; provenance is a
-- placeholder ('dev-fixture' / 'CC0-1.0'). Do not treat as licensed catalogue data.
--
-- Purpose: give a fresh local database browsable, savable content so the Library shows
--          kanji/vocabulary immediately after setup.
-- Apply:   npm run db:seed:dev            (runs db/seeds/*.sql, when the runner exists)
--     or:  psql -d kanji_recognizer -f db/seeds/0001_dev_content.sql
--
-- Idempotent: every statement uses ON CONFLICT DO NOTHING with deterministic keys, so
-- running this file any number of times inserts each row at most once (no duplicates).
-- Runs as ONE transaction because content_item.current_revision_no <-> content_revision
-- is a DEFERRABLE INITIALLY DEFERRED circular FK that is only validated at COMMIT.
-- jlpt_level stores the JLPT N-number (5 = N5 ... 1 = N1).

SET client_encoding = 'UTF8';

BEGIN;
SET CONSTRAINTS ALL DEFERRED;

-- 1) Local owner + library (the API also auto-provisions these for LOCAL_OWNER_ID on the
--    first GET /v1/library; seeding them here is harmless and keeps the DB self-sufficient).
INSERT INTO owner_scope (id, kind, created_at, updated_at) VALUES
  ('00000000-0000-4000-8000-000000000000', 'local', '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00')
ON CONFLICT DO NOTHING;

INSERT INTO library (id, owner_id, created_at, updated_at) VALUES
  ('0d0d0d0d-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000000', '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00')
ON CONFLICT DO NOTHING;

-- 2) Content profiles (composite target of content_item (content_profile_key, kind) FK).
INSERT INTO content_profile (profile_key, item_kind, validation_rules, description) VALUES
  ('kanji.basic',      'kanji',      '{}', 'Basic kanji metadata profile (dev fixture)'),
  ('vocabulary.basic', 'vocabulary', '{}', 'Basic vocabulary metadata profile (dev fixture)')
ON CONFLICT DO NOTHING;

-- 3) Content items (status 'active' so they surface in the Library). kanji ids 0a..NN, vocab 0b..NN.
INSERT INTO content_item
  (id, kind, content_profile_key, canonical_key, status, source_ref, license_ref, current_revision_no, jlpt_level, stroke_count, created_at, updated_at) VALUES
  ('0a0a0a0a-0000-4000-8000-000000000001','kanji','kanji.basic','日','active','dev-fixture','CC0-1.0',1,5,4,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000002','kanji','kanji.basic','本','active','dev-fixture','CC0-1.0',1,5,5,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000003','kanji','kanji.basic','人','active','dev-fixture','CC0-1.0',1,5,2,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000004','kanji','kanji.basic','月','active','dev-fixture','CC0-1.0',1,5,4,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000005','kanji','kanji.basic','水','active','dev-fixture','CC0-1.0',1,5,4,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000006','kanji','kanji.basic','火','active','dev-fixture','CC0-1.0',1,5,4,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000007','kanji','kanji.basic','木','active','dev-fixture','CC0-1.0',1,5,4,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000008','kanji','kanji.basic','金','active','dev-fixture','CC0-1.0',1,5,8,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000009','kanji','kanji.basic','土','active','dev-fixture','CC0-1.0',1,5,3,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000010','kanji','kanji.basic','山','active','dev-fixture','CC0-1.0',1,5,3,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000011','kanji','kanji.basic','川','active','dev-fixture','CC0-1.0',1,5,3,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000012','kanji','kanji.basic','大','active','dev-fixture','CC0-1.0',1,5,3,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000013','kanji','kanji.basic','小','active','dev-fixture','CC0-1.0',1,5,3,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000014','kanji','kanji.basic','中','active','dev-fixture','CC0-1.0',1,5,4,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000015','kanji','kanji.basic','学','active','dev-fixture','CC0-1.0',1,5,8,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000016','kanji','kanji.basic','校','active','dev-fixture','CC0-1.0',1,5,10,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000017','kanji','kanji.basic','語','active','dev-fixture','CC0-1.0',1,5,14,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000018','kanji','kanji.basic','国','active','dev-fixture','CC0-1.0',1,5,8,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000019','kanji','kanji.basic','時','active','dev-fixture','CC0-1.0',1,5,10,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000020','kanji','kanji.basic','間','active','dev-fixture','CC0-1.0',1,5,12,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0b0b0b0b-0000-4000-8000-000000000001','vocabulary','vocabulary.basic','日本','active','dev-fixture','CC0-1.0',1,5,NULL,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0b0b0b0b-0000-4000-8000-000000000002','vocabulary','vocabulary.basic','日本語','active','dev-fixture','CC0-1.0',1,5,NULL,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0b0b0b0b-0000-4000-8000-000000000003','vocabulary','vocabulary.basic','学生','active','dev-fixture','CC0-1.0',1,5,NULL,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0b0b0b0b-0000-4000-8000-000000000004','vocabulary','vocabulary.basic','学校','active','dev-fixture','CC0-1.0',1,5,NULL,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0b0b0b0b-0000-4000-8000-000000000005','vocabulary','vocabulary.basic','大学','active','dev-fixture','CC0-1.0',1,5,NULL,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00'),
  ('0b0b0b0b-0000-4000-8000-000000000006','vocabulary','vocabulary.basic','中国','active','dev-fixture','CC0-1.0',1,5,NULL,'2026-01-01 00:00:00+00','2026-01-01 00:00:00+00')
ON CONFLICT DO NOTHING;

-- 4) Canonical revision 1 for every item (deferred FK target of content_item.current_revision_no).
INSERT INTO content_revision (item_id, revision_no, schema_version, payload_json, source_ref, license_ref, created_at) VALUES
  ('0a0a0a0a-0000-4000-8000-000000000001',1,1,'{"canonical_key":"日","kind":"kanji","jlpt_level":5,"stroke_count":4,"readings":{"on":["ニチ","ジツ"],"kun":["ひ","か"]},"meanings":{"en":["day","sun"],"vi_sino":"Nhật"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000002',1,1,'{"canonical_key":"本","kind":"kanji","jlpt_level":5,"stroke_count":5,"readings":{"on":["ホン"],"kun":["もと"]},"meanings":{"en":["book","origin","main"],"vi_sino":"Bản"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000003',1,1,'{"canonical_key":"人","kind":"kanji","jlpt_level":5,"stroke_count":2,"readings":{"on":["ジン","ニン"],"kun":["ひと"]},"meanings":{"en":["person"],"vi_sino":"Nhân"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000004',1,1,'{"canonical_key":"月","kind":"kanji","jlpt_level":5,"stroke_count":4,"readings":{"on":["ゲツ","ガツ"],"kun":["つき"]},"meanings":{"en":["moon","month"],"vi_sino":"Nguyệt"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000005',1,1,'{"canonical_key":"水","kind":"kanji","jlpt_level":5,"stroke_count":4,"readings":{"on":["スイ"],"kun":["みず"]},"meanings":{"en":["water"],"vi_sino":"Thủy"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000006',1,1,'{"canonical_key":"火","kind":"kanji","jlpt_level":5,"stroke_count":4,"readings":{"on":["カ"],"kun":["ひ"]},"meanings":{"en":["fire"],"vi_sino":"Hỏa"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000007',1,1,'{"canonical_key":"木","kind":"kanji","jlpt_level":5,"stroke_count":4,"readings":{"on":["ボク","モク"],"kun":["き"]},"meanings":{"en":["tree","wood"],"vi_sino":"Mộc"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000008',1,1,'{"canonical_key":"金","kind":"kanji","jlpt_level":5,"stroke_count":8,"readings":{"on":["キン","コン"],"kun":["かね"]},"meanings":{"en":["gold","money","metal"],"vi_sino":"Kim"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000009',1,1,'{"canonical_key":"土","kind":"kanji","jlpt_level":5,"stroke_count":3,"readings":{"on":["ド","ト"],"kun":["つち"]},"meanings":{"en":["earth","soil","ground"],"vi_sino":"Thổ"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000010',1,1,'{"canonical_key":"山","kind":"kanji","jlpt_level":5,"stroke_count":3,"readings":{"on":["サン"],"kun":["やま"]},"meanings":{"en":["mountain"],"vi_sino":"Sơn"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000011',1,1,'{"canonical_key":"川","kind":"kanji","jlpt_level":5,"stroke_count":3,"readings":{"on":["セン"],"kun":["かわ"]},"meanings":{"en":["river"],"vi_sino":"Xuyên"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000012',1,1,'{"canonical_key":"大","kind":"kanji","jlpt_level":5,"stroke_count":3,"readings":{"on":["ダイ","タイ"],"kun":["おお"]},"meanings":{"en":["big","large"],"vi_sino":"Đại"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000013',1,1,'{"canonical_key":"小","kind":"kanji","jlpt_level":5,"stroke_count":3,"readings":{"on":["ショウ"],"kun":["ちい","こ"]},"meanings":{"en":["small","little"],"vi_sino":"Tiểu"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000014',1,1,'{"canonical_key":"中","kind":"kanji","jlpt_level":5,"stroke_count":4,"readings":{"on":["チュウ"],"kun":["なか"]},"meanings":{"en":["middle","inside","center"],"vi_sino":"Trung"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000015',1,1,'{"canonical_key":"学","kind":"kanji","jlpt_level":5,"stroke_count":8,"readings":{"on":["ガク"],"kun":["まな"]},"meanings":{"en":["study","learning","science"],"vi_sino":"Học"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000016',1,1,'{"canonical_key":"校","kind":"kanji","jlpt_level":5,"stroke_count":10,"readings":{"on":["コウ"],"kun":[]},"meanings":{"en":["school","proof","exam"],"vi_sino":"Hiệu"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000017',1,1,'{"canonical_key":"語","kind":"kanji","jlpt_level":5,"stroke_count":14,"readings":{"on":["ゴ"],"kun":["かた"]},"meanings":{"en":["language","word","speech"],"vi_sino":"Ngữ"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000018',1,1,'{"canonical_key":"国","kind":"kanji","jlpt_level":5,"stroke_count":8,"readings":{"on":["コク"],"kun":["くに"]},"meanings":{"en":["country","nation"],"vi_sino":"Quốc"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000019',1,1,'{"canonical_key":"時","kind":"kanji","jlpt_level":5,"stroke_count":10,"readings":{"on":["ジ"],"kun":["とき"]},"meanings":{"en":["time","hour"],"vi_sino":"Thời"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0a0a0a0a-0000-4000-8000-000000000020',1,1,'{"canonical_key":"間","kind":"kanji","jlpt_level":5,"stroke_count":12,"readings":{"on":["カン","ケン"],"kun":["あいだ","ま"]},"meanings":{"en":["interval","space","between"],"vi_sino":"Gian"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0b0b0b0b-0000-4000-8000-000000000001',1,1,'{"canonical_key":"日本","kind":"vocabulary","jlpt_level":5,"reading":"にほん","meanings":{"en":["Japan"],"vi":"Nhật Bản"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0b0b0b0b-0000-4000-8000-000000000002',1,1,'{"canonical_key":"日本語","kind":"vocabulary","jlpt_level":5,"reading":"にほんご","meanings":{"en":["Japanese (language)"],"vi":"tiếng Nhật"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0b0b0b0b-0000-4000-8000-000000000003',1,1,'{"canonical_key":"学生","kind":"vocabulary","jlpt_level":5,"reading":"がくせい","meanings":{"en":["student"],"vi":"học sinh"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0b0b0b0b-0000-4000-8000-000000000004',1,1,'{"canonical_key":"学校","kind":"vocabulary","jlpt_level":5,"reading":"がっこう","meanings":{"en":["school"],"vi":"trường học"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0b0b0b0b-0000-4000-8000-000000000005',1,1,'{"canonical_key":"大学","kind":"vocabulary","jlpt_level":5,"reading":"だいがく","meanings":{"en":["university","college"],"vi":"đại học"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00'),
  ('0b0b0b0b-0000-4000-8000-000000000006',1,1,'{"canonical_key":"中国","kind":"vocabulary","jlpt_level":5,"reading":"ちゅうごく","meanings":{"en":["China"],"vi":"Trung Quốc"}}','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00')
ON CONFLICT DO NOTHING;

-- 5) Readings. on-yomi -> katakana; kun-yomi -> hiragana; vocabulary word reading -> hiragana/other.
INSERT INTO content_reading (id, item_id, reading, script, reading_kind, position) VALUES
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000001','ニチ','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000001','ジツ','katakana','on',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000001','ひ','hiragana','kun',2),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000001','か','hiragana','kun',3),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000002','ホン','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000002','もと','hiragana','kun',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000003','ジン','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000003','ニン','katakana','on',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000003','ひと','hiragana','kun',2),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000004','ゲツ','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000004','ガツ','katakana','on',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000004','つき','hiragana','kun',2),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000005','スイ','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000005','みず','hiragana','kun',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000006','カ','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000006','ひ','hiragana','kun',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000007','ボク','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000007','モク','katakana','on',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000007','き','hiragana','kun',2),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000008','キン','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000008','コン','katakana','on',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000008','かね','hiragana','kun',2),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000009','ド','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000009','ト','katakana','on',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000009','つち','hiragana','kun',2),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000010','サン','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000010','やま','hiragana','kun',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000011','セン','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000011','かわ','hiragana','kun',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000012','ダイ','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000012','タイ','katakana','on',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000012','おお','hiragana','kun',2),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000013','ショウ','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000013','ちい','hiragana','kun',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000013','こ','hiragana','kun',2),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000014','チュウ','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000014','なか','hiragana','kun',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000015','ガク','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000015','まな','hiragana','kun',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000016','コウ','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000017','ゴ','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000017','かた','hiragana','kun',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000018','コク','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000018','くに','hiragana','kun',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000019','ジ','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000019','とき','hiragana','kun',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000020','カン','katakana','on',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000020','ケン','katakana','on',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000020','あいだ','hiragana','kun',2),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000020','ま','hiragana','kun',3),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000001','にほん','hiragana','other',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000002','にほんご','hiragana','other',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000003','がくせい','hiragana','other',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000004','がっこう','hiragana','other',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000005','だいがく','hiragana','other',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000006','ちゅうごく','hiragana','other',0)
ON CONFLICT DO NOTHING;

-- 6) Meanings. Kanji: English definition + Vietnamese Sino-reading (sino_vietnamese requires locale 'vi').
--    Vocabulary: English + Vietnamese definitions.
INSERT INTO content_meaning (id, item_id, locale, meaning_kind, meaning, position) VALUES
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000001','en','definition','day; sun',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000001','vi','sino_vietnamese','Nhật',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000002','en','definition','book; origin; main',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000002','vi','sino_vietnamese','Bản',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000003','en','definition','person',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000003','vi','sino_vietnamese','Nhân',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000004','en','definition','moon; month',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000004','vi','sino_vietnamese','Nguyệt',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000005','en','definition','water',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000005','vi','sino_vietnamese','Thủy',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000006','en','definition','fire',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000006','vi','sino_vietnamese','Hỏa',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000007','en','definition','tree; wood',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000007','vi','sino_vietnamese','Mộc',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000008','en','definition','gold; money; metal',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000008','vi','sino_vietnamese','Kim',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000009','en','definition','earth; soil; ground',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000009','vi','sino_vietnamese','Thổ',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000010','en','definition','mountain',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000010','vi','sino_vietnamese','Sơn',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000011','en','definition','river',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000011','vi','sino_vietnamese','Xuyên',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000012','en','definition','big; large',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000012','vi','sino_vietnamese','Đại',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000013','en','definition','small; little',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000013','vi','sino_vietnamese','Tiểu',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000014','en','definition','middle; inside; center',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000014','vi','sino_vietnamese','Trung',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000015','en','definition','study; learning; science',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000015','vi','sino_vietnamese','Học',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000016','en','definition','school; proof; exam',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000016','vi','sino_vietnamese','Hiệu',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000017','en','definition','language; word; speech',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000017','vi','sino_vietnamese','Ngữ',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000018','en','definition','country; nation',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000018','vi','sino_vietnamese','Quốc',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000019','en','definition','time; hour',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000019','vi','sino_vietnamese','Thời',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000020','en','definition','interval; space; between',0),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000020','vi','sino_vietnamese','Gian',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000001','en','definition','Japan',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000001','vi','definition','Nhật Bản',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000002','en','definition','Japanese (language)',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000002','vi','definition','tiếng Nhật',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000003','en','definition','student',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000003','vi','definition','học sinh',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000004','en','definition','school',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000004','vi','definition','trường học',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000005','en','definition','university; college',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000005','vi','definition','đại học',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000006','en','definition','China',0),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000006','vi','definition','Trung Quốc',0)
ON CONFLICT DO NOTHING;

-- 7) Example sentences (one per selected item; UNIQUE (item_id, position)).
INSERT INTO content_example (id, item_id, japanese_text, translation, translation_locale, source_ref, license_ref, position) VALUES
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000005','毎日水を飲みます。','I drink water every day.','en','dev-fixture','CC0-1.0',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000010','富士山は高い山です。','Mt. Fuji is a tall mountain.','en','dev-fixture','CC0-1.0',1),
  (gen_random_uuid(),'0a0a0a0a-0000-4000-8000-000000000012','大きい犬がいます。','There is a big dog.','en','dev-fixture','CC0-1.0',1),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000001','私は日本に住んでいます。','I live in Japan.','en','dev-fixture','CC0-1.0',1),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000002','日本語を勉強しています。','I am studying Japanese.','en','dev-fixture','CC0-1.0',1),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000003','彼は大学の学生です。','He is a university student.','en','dev-fixture','CC0-1.0',1),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000004','毎朝学校へ行きます。','I go to school every morning.','en','dev-fixture','CC0-1.0',1),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000005','来年大学に入ります。','I will enter university next year.','en','dev-fixture','CC0-1.0',1),
  (gen_random_uuid(),'0b0b0b0b-0000-4000-8000-000000000006','中国は大きい国です。','China is a big country.','en','dev-fixture','CC0-1.0',1)
ON CONFLICT DO NOTHING;

-- 8) A published starter course grouping the kanji into two lessons.
INSERT INTO learning_course
  (id, course_key, title, jlpt_level, content_profile_key, validation_policy, status, source_ref, license_ref, created_at, updated_at, published_at) VALUES
  ('0c0c0c0c-0000-4000-8000-000000000001','jlpt-n5-starter','JLPT N5 Starter',5,'kanji.basic','{}','published','dev-fixture','CC0-1.0','2026-01-01 00:00:00+00','2026-01-01 00:00:00+00','2026-01-01 00:00:00+00')
ON CONFLICT DO NOTHING;

INSERT INTO course_lesson (id, course_id, lesson_no, title) VALUES
  ('0c0c0c0c-0000-4000-8000-000000000101','0c0c0c0c-0000-4000-8000-000000000001',1,'Nature and Elements'),
  ('0c0c0c0c-0000-4000-8000-000000000102','0c0c0c0c-0000-4000-8000-000000000001',2,'People and Study')
ON CONFLICT DO NOTHING;

INSERT INTO course_lesson_item (lesson_id, course_id, content_item_id, item_position) VALUES
  ('0c0c0c0c-0000-4000-8000-000000000101','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000001',1),
  ('0c0c0c0c-0000-4000-8000-000000000101','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000004',2),
  ('0c0c0c0c-0000-4000-8000-000000000101','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000005',3),
  ('0c0c0c0c-0000-4000-8000-000000000101','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000006',4),
  ('0c0c0c0c-0000-4000-8000-000000000101','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000007',5),
  ('0c0c0c0c-0000-4000-8000-000000000101','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000008',6),
  ('0c0c0c0c-0000-4000-8000-000000000101','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000009',7),
  ('0c0c0c0c-0000-4000-8000-000000000101','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000010',8),
  ('0c0c0c0c-0000-4000-8000-000000000101','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000011',9),
  ('0c0c0c0c-0000-4000-8000-000000000102','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000003',1),
  ('0c0c0c0c-0000-4000-8000-000000000102','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000012',2),
  ('0c0c0c0c-0000-4000-8000-000000000102','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000013',3),
  ('0c0c0c0c-0000-4000-8000-000000000102','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000014',4),
  ('0c0c0c0c-0000-4000-8000-000000000102','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000015',5),
  ('0c0c0c0c-0000-4000-8000-000000000102','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000016',6),
  ('0c0c0c0c-0000-4000-8000-000000000102','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000017',7),
  ('0c0c0c0c-0000-4000-8000-000000000102','0c0c0c0c-0000-4000-8000-000000000001','0a0a0a0a-0000-4000-8000-000000000018',8)
ON CONFLICT DO NOTHING;

COMMIT;

-- Quick verification (optional):
--   SELECT kind, count(*) FROM content_item GROUP BY kind;      -- kanji 20, vocabulary 6
--   SELECT count(*) FROM content_reading;                       -- 56
--   SELECT count(*) FROM content_meaning;                       -- 52
--   SELECT count(*) FROM content_example;                       -- 9
