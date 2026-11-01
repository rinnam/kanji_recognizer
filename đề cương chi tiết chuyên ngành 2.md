TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN
VÀ TRUYỀN THÔNG VIỆT - HÀN
KHOA KHOA HỌC MÁY TÍNH

CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

Đà Nẵng, ngày ..... tháng ..... năm 2026

---

# ĐỀ CƯƠNG ĐỒ ÁN CHUYÊN NGÀNH 2

## Thông tin người thực hiện

**Họ và tên sinh viên:** HUỲNH KIM NAM
- Chuyên ngành: Công nghệ phần mềm (song ngữ Nhật - Việt)
- Điện thoại: 0397675725
- MSSV: 23IT172
- Lớp: 23JIT
- Email: namhk.23it@vku.udn.vn

**Họ và tên sinh viên:** VÕ GIA LƯỢNG
- Chuyên ngành: Công nghệ phần mềm (song ngữ Nhật - Việt)
- Điện thoại: 0963020667
- MSSV: 23IT153
- Lớp: 23JIT
- Email: luongvg.23it@vku.udn.vn

**Giảng viên hướng dẫn:** ThS. Dương Thị Mai Nga

---

## Tên đồ án
**XÂY DỰNG ỨNG DỤNG KANJI NEST – HỌC TIẾNG NHẬT ĐA NỀN TẢNG (WEB, DI ĐỘNG, DESKTOP)**

## Mô tả

### Tổng quan đề tài
Đề tài **kế thừa và phát triển** ứng dụng học tiếng Nhật **Kanji Nest** (giai đoạn trước đã xây dựng ở dạng ứng dụng web), mở rộng thành **nền tảng học tập đa nền tảng** chạy trên **web/PWA, di động (Android, iOS) và máy tính (desktop)** từ **một mã nguồn chung** viết bằng **TypeScript/React**. Ứng dụng theo mô hình **local-first**: toàn bộ dữ liệu học tập (từ vựng, thư mục, tiến độ ôn tập) được lưu trực tiếp trên thiết bị bằng **IndexedDB** nên vẫn **dùng được khi không có mạng**, sau đó **đồng bộ hai chiều** an toàn với máy chủ **PostgreSQL** (hợp nhất theo nguyên tắc Last-Write-Wins kèm *tombstone* chống hồi sinh dữ liệu đã xoá). Trên nền tảng đó, hệ thống cung cấp: quản lý từ vựng theo cây thư mục; ôn tập **flashcard theo thuật toán lặp lại ngắt quãng SM-2 (Anki)**; nhiều dạng **quiz**; các **mini-game học từ vựng (gamification)**; và tính năng **học nhập vai qua video (immersion)** — nhúng video YouTube và hiển thị **phụ đề tiếng Nhật đồng bộ theo thời gian phát** để người học vừa nghe vừa đọc, chạm vào từ để tra nghĩa và lưu lại. Giá trị cốt lõi là kiến trúc **"một mã nguồn, nhiều nền tảng"**, giúp tối ưu chi phí phát triển – bảo trì và mang lại trải nghiệm nhất quán trên mọi thiết bị.

### Lý do chọn đề tài
- Nhu cầu học tiếng Nhật ngày càng tăng; người học cần học được trên **điện thoại, máy tính** và cả khi **không có mạng**.
- Ứng dụng web hiện có tuy đã đầy đủ tính năng học tập nhưng **chưa cài đặt được như một ứng dụng**, chưa tối ưu cho di động và chưa hoạt động ngoại tuyến ổn định.
- Kiến trúc **local-first + đồng bộ hai chiều** và mô hình **đa nền tảng dùng chung mã nguồn** là hướng kỹ thuật hiện đại, ít gặp ở các đồ án, có giá trị nghiên cứu và thực tiễn cao.
- **Trò chơi hoá** và **học qua video** giúp tăng hứng thú và duy trì động lực học tập lâu dài.

### Mục tiêu dự kiến
- Chuyển ứng dụng web Kanji Nest sang đa nền tảng: **PWA** (cài đặt + hoạt động ngoại tuyến), **di động** (Capacitor), **desktop** (Electron/Tauri).
- Củng cố kiến trúc **local-first** (IndexedDB) và cơ chế **đồng bộ hai chiều** (merge LWW + tombstone) với cơ sở dữ liệu PostgreSQL.
- Hoàn thiện cơ chế ôn tập **SRS theo thuật toán SM-2** và mở rộng các dạng quiz.
- Bổ sung các **mini-game** học từ vựng (Ghép cặp, Thử thách tốc độ, Phi Tiêu Hán–Việt, Nối từ Shiritori, Thử thách sinh tồn…).
- Xây dựng tính năng **học qua video YouTube kèm phụ đề tiếng Nhật đồng bộ** (immersion), chạm vào từ để tra nghĩa và lưu vào kho từ vựng.
- Bảo đảm **một mã nguồn TypeScript** dùng chung cho các nền tảng.

### Kết quả đề tài
- Xây dựng thành công ứng dụng Kanji Nest chạy ổn định trên **web/PWA** và **ít nhất một nền tảng native** (di động hoặc desktop), kết nối máy chủ thành công.
- Ứng dụng **hoạt động ngoại tuyến** (local-first) và **đồng bộ dữ liệu an toàn** khi có mạng (không mất, không nhân đôi dữ liệu).
- Cung cấp chức năng flashcard + **SRS**, quiz và một số **mini-game** học từ vựng.
- Hoàn thiện tính năng **xem video kèm phụ đề tiếng Nhật đồng bộ**.
- Hoàn thiện bộ **tài liệu phân tích – thiết kế** (Use Case, Class, Sequence, Activity Diagram, thiết kế CSDL), tài liệu **kiến trúc đa nền tảng** và hướng dẫn sử dụng.

### Nội dung thực hiện
1. Nghiên cứu tổng quan các công nghệ đa nền tảng (**PWA + Workbox, Capacitor, Electron/Tauri**), kiến trúc **monorepo (npm workspaces)** và mô hình **local-first** cùng cơ chế **đồng bộ dữ liệu hai chiều** (Last-Write-Wins + tombstone).
2. Phân tích và thiết kế hệ thống: xây dựng **Use Case, Class, Sequence, Activity Diagram** và thiết kế cơ sở dữ liệu (PostgreSQL); **tái cấu trúc dự án theo monorepo** (npm workspaces: `apps/*` cho web/mobile/desktop/backend, `packages/*` cho phần lõi dùng chung).
3. Chuẩn bị **backend Fastify** cho đa nền tảng: bật **CORS** (`@fastify/cors`), cấu hình **`VITE_API_BASE_URL`** (URL tuyệt đối thay cho proxy dev); củng cố và kiểm thử API **đồng bộ hai chiều** (hợp nhất LWW + tombstone).
4. Chuyển ứng dụng thành **PWA** bằng **`vite-plugin-pwa`** (manifest + service worker/Workbox, cache tài nguyên để chạy ngoại tuyến).
5. **Đóng gói desktop** (Electron hoặc Tauri) và **di động Android/iOS** (Capacitor) từ **cùng một bản build web**; chỉnh routing/base cho vỏ native.
6. Tách **tầng lưu trữ** sau giao diện trừu tượng **`KanjiStore`** (adapter web **IndexedDB** / native **SQLite**) để dữ liệu bền vững hơn trên di động.
7. Phát triển các **mini-game** học từ vựng (Ghép cặp, Thử thách tốc độ, Phi Tiêu Hán–Việt, Nối từ Shiritori, Thử thách sinh tồn) và tính năng **học qua video YouTube kèm phụ đề đồng bộ** (YouTube IFrame Player API).
8. **Kiểm thử** hệ thống bằng **Vitest** (unit test cho logic SRS, đồng bộ, luật chơi mini-game, parser phụ đề), tối ưu hiệu năng (**code-splitting**, lazy-load), đánh giá kết quả và hoàn thiện báo cáo đồ án.

---

## Kế hoạch thực hiện

> *Ghi chú: mốc thời gian cụ thể cần cập nhật theo lịch chính thức của khoa.*

| Thời gian | Nội dung thực hiện | Người thực hiện |
|---|---|---|
| **Tuần 1**<br>(…/… – …/…) | - Xác nhận đề tài với GVHD<br>- Hoàn thiện đề cương chi tiết<br>- Nghiên cứu tổng quan: PWA/Workbox, Capacitor, Electron/Tauri, mô hình local-first & đồng bộ dữ liệu hai chiều<br>- Thiết lập nhánh Git `feature/cross-platform`; tái cấu trúc dự án theo monorepo (npm workspaces: `apps/*`, `packages/*`) | GVHD: ThS. Dương Thị Mai Nga<br>SV: Huỳnh Kim Nam, Võ Gia Lượng |
| **Tuần 2**<br>(…/… – …/…) | - Phân tích yêu cầu hệ thống; xác định Actor & Use Case<br>- Thiết kế sơ đồ: Use Case, Class, Sequence, Activity Diagram<br>- Rà soát & cập nhật thiết kế CSDL PostgreSQL<br>- Vẽ sơ đồ kiến trúc đa nền tảng (web-core + các vỏ PWA/Capacitor/Electron) | SV: Huỳnh Kim Nam, Võ Gia Lượng |
| **Tuần 3**<br>(…/… – …/…) | - Thêm CORS (`@fastify/cors`) và cấu hình `VITE_API_BASE_URL` cho backend Fastify<br>- Củng cố API đồng bộ hai chiều (hợp nhất LWW + tombstone)<br>- Viết unit test đồng bộ bằng Vitest | SV: Huỳnh Kim Nam, Võ Gia Lượng |
| **Tuần 4**<br>(…/… – …/…) | - Chuyển ứng dụng thành PWA bằng `vite-plugin-pwa` (manifest, service worker/Workbox)<br>- Cấu hình cache ngoại tuyến (offline)<br>- Kiểm thử cài đặt trên trình duyệt máy tính và điện thoại | SV: Huỳnh Kim Nam, Võ Gia Lượng |
| **Tuần 5**<br>(…/… – …/…) | - Đóng gói ứng dụng desktop (Electron hoặc Tauri), nạp bản build web<br>- Chỉnh routing/base cho vỏ native<br>- Kiểm thử bản desktop trên Windows | SV: Huỳnh Kim Nam, Võ Gia Lượng |
| **Tuần 6**<br>(…/… – …/…) | - Đóng gói ứng dụng di động bằng Capacitor (sinh dự án Android/iOS)<br>- Cấu hình `server`/scheme; kiểm thử trên thiết bị thật<br>- (Tuỳ chọn) Tách tầng lưu trữ sau interface `KanjiStore` (web IndexedDB / native SQLite) | SV: Huỳnh Kim Nam, Võ Gia Lượng |
| **Tuần 7**<br>(…/… – …/…) | - Phát triển mini-game: Ghép cặp, Thử thách tốc độ, Phi Tiêu Hán–Việt, Nối từ Shiritori, Thử thách sinh tồn<br>- Tích hợp điểm/combo và SRS; lưu phiên chơi vào `quiz_sessions`/`quiz_attempts` | SV: Huỳnh Kim Nam, Võ Gia Lượng |
| **Tuần 8**<br>(…/… – …/…) | - Nhúng video YouTube bằng IFrame Player API; đồng bộ phụ đề tiếng Nhật theo thời gian phát<br>- Chạm từ → tra nghĩa & lưu vào `vocabularies`<br>- Kiểm thử toàn hệ thống, tối ưu hiệu năng (code-splitting) | SV: Huỳnh Kim Nam, Võ Gia Lượng |
| **Tuần 9**<br>(…/… – …/…) | - Hoàn thiện tài liệu phân tích & thiết kế<br>- Viết báo cáo đồ án hoàn chỉnh<br>- Chuẩn bị slide thuyết trình và demo trên nhiều nền tảng (web/PWA, desktop, di động) | SV: Huỳnh Kim Nam, Võ Gia Lượng |

---

|  Ngày ..... tháng ..... năm 2026  |  Ngày ..... tháng ..... năm 2026  |
|:---:|:---:|
| **Giảng viên hướng dẫn**<br>(ký và ghi rõ họ tên) | **Sinh viên thực hiện**<br>(ký và ghi rõ họ tên) |
|  | Huỳnh Kim Nam |
|  | Võ Gia Lượng |
