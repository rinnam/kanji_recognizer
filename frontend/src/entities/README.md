# entities/ — Model nghiệp vụ thuần (FSD)

Tầng **entities** chứa các thực thể nghiệp vụ độc lập, mỗi entity là một thư mục con:

```
entities/
  vocabulary/   # model LocalVocabulary, api, ui thẻ từ
  folder/       # model LocalFolder, api, ui node cây
  card/         # trạng thái/logic SRS của 1 thẻ (SM-2)
  kanji/        # (GĐ3) mục từ điển Kanji
```

Quy ước mỗi entity: `model/` (types, logic thuần), `api/` (gọi server), `ui/` (component gắn entity), và `index.ts` làm **public API**.

Phụ thuộc: entities chỉ dùng `shared/`. **Không** import `features/` hay `pages/`. Chi tiết: `docs/architecture/frontend.md`.
