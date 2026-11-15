# Hạ Long SmartGuide

Web app thuyết minh du lịch tự động, đa ngôn ngữ cho Vịnh Hạ Long: du khách quét mã QR tại điểm hoặc bật GPS,
nghe thuyết minh bằng 5 ngôn ngữ (Việt, Anh, Hàn, Nhật, Trung) và mua vé điện tử ngay trên điện thoại.
Trang quản trị cho các ban quản lý (multi-tenant) cập nhật nội dung và theo dõi doanh thu, lượt nghe, khách trực tiếp.

**Dùng thử:** https://halong-smartguide.onrender.com · Quản trị: https://halong-smartguide.onrender.com/admin

> Bản miễn phí của Render "ngủ" khi không có ai truy cập; lần mở đầu tiên có thể mất khoảng 1 phút.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Giao diện | React 18, TypeScript, Vite, Leaflet, Recharts |
| Server | Node.js 22, Express 5 (controller → service → repository) |
| Cơ sở dữ liệu | MySQL / MariaDB (máy cá nhân: XAMPP; trên mạng: TiDB Cloud) – 12 bảng |
| CI/CD | GitHub Actions kiểm tra và build → tự triển khai lên Render |

## Chạy trên máy

1. Cài Node.js ≥ 22.5 và XAMPP, bật MySQL trong XAMPP Control Panel.
2. `npm install`
3. Sao chép `.env.example` thành `.env` (mặc định dùng MySQL của XAMPP, user `root`, không mật khẩu).
4. `npm run dev` rồi mở http://localhost:5173 (du khách) và http://localhost:5173/admin (quản trị).

Lần chạy đầu, server tự tạo database `halong` và dữ liệu mẫu. Dữ liệu SQL có sẵn trong thư mục `database/`.

## CI/CD

Mỗi lần có code mới trên nhánh `main`, GitHub Actions (`.github/workflows/ci.yml`):

1. **CI** – cài thư viện, kiểm tra kiểu TypeScript, kiểm tra cú pháp server, build giao diện,
   khởi động server với MariaDB thật và gọi thử API.
2. **CD** – nếu CI đạt, gọi Deploy Hook của Render để đưa bản mới lên link công khai.

Hướng dẫn triển khai chi tiết: [docs/DEPLOY.md](docs/DEPLOY.md).

## Tài liệu

- PRD: `docs/PRD-HaLong-SmartGuide.docx`
- Mã nguồn sơ đồ Use case, Activity, ERD, DFD (PlantUML): `docs/diagrams/`

## Nhóm thực hiện

| Thành viên | Phụ trách |
| --- | --- |
| Mai-Tan-Thien-Nhan | Khung dự án, server, xác thực, multi-tenant, CI/CD, tài liệu |
| locphat13579-jpg (Huỳnh Tấn Lộc) | Nội dung địa điểm, thuyết minh, bản đồ GPS, mã QR, chatbot |
| Huynh-Quoc-Danh | Bán vé, thanh toán, thống kê, báo cáo, giao diện quản trị dùng chung |
