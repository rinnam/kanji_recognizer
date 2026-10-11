# shared/ — Dùng chung thuần kỹ thuật (FSD)

Tầng **shared** là nền thấp nhất, tái dùng mọi nơi, **không chứa logic nghiệp vụ**:

```
shared/
  ui/      # UI kit dùng chung (Button, Modal, Skeleton, EmptyState...)
  lib/     # hooks & util thuần (debounce, formatDate, dnd helpers...)
  api/     # http client, cấu hình gọi server, sync client dùng chung
  config/  # hằng số/cấu hình kỹ thuật
```

Phụ thuộc: `shared/` **không import** tầng trên (entities/features/pages). Mọi thứ ở đây phải độc lập domain.

Các thư mục scaffold cũ (`components/`, `hooks/`, `utils/`) đã được gỡ bỏ; mọi thứ dùng chung nằm ở đây. Chi tiết: `docs/architecture/frontend.md`.
