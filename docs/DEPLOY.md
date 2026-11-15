# Triển khai Hạ Long SmartGuide lên Internet (CI/CD miễn phí)

Sau khi làm xong, app có một link công khai dạng `https://halong-smartguide.onrender.com`:
ai bấm cũng mở được (4G, Wi-Fi khác), không cần chung mạng, không cần ngrok.

| Thành phần | Nền tảng | Gói |
| --- | --- | --- |
| Server (giao diện + API) | Render – Web Service | Free |
| Cơ sở dữ liệu | TiDB Cloud Starter (tương thích MySQL) | Free |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`) | Free |

**Luồng CI/CD:** push lên `main` → GitHub Actions chạy CI (TypeScript, build, chạy thử API với MariaDB).
CI đạt → job `deploy` gọi Deploy Hook của Render → Render build và đưa bản mới lên link. CI lỗi thì không triển khai.

---

## Bước 1 – Tạo database trên TiDB Cloud (khoảng 5 phút)

1. Vào https://tidbcloud.com, đăng ký (có thể dùng tài khoản GitHub/Google).
2. Bấm **Create Cluster** → chọn **Starter** (miễn phí) → khu vực gần Việt Nam (ví dụ Singapore) → đặt tên `halong` → **Create**.
3. Khi cluster chạy, bấm **Connect**:
   - **Connect With:** chọn *General* (hoặc *Node.js*).
   - Bấm **Generate Password** và **lưu lại mật khẩu** (chỉ hiện một lần).
   - Ghi lại **Host** (dạng `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`), **Port** (`4000`), **User** (dạng `xxxxxxxx.root`).

Không cần tạo bảng: lần đầu server chạy sẽ tự tạo đủ 12 bảng và dữ liệu mẫu (7 địa điểm, gói vé, mã kích hoạt, tài khoản `admin` / `admin123`).

## Bước 2 – Tạo Web Service trên Render (khoảng 5 phút)

1. Vào https://render.com, đăng ký.
2. Bấm **New +** → **Web Service** → chọn **Public Git Repository** và dán:
   `https://github.com/Huynh-Quoc-Danh/Cnpm-detai1`
3. Điền:

| Mục | Giá trị |
| --- | --- |
| Name | `halong-smartguide` (sẽ thành link `https://halong-smartguide.onrender.com`) |
| Region | Singapore |
| Branch | `main` |
| Runtime | Node |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| Instance Type | **Free** |

4. Mục **Environment Variables**, thêm:

| Key | Value |
| --- | --- |
| `DB_HOST` | Host của TiDB (bước 1) |
| `DB_PORT` | `4000` |
| `DB_USER` | User của TiDB (dạng `xxxxxxxx.root`) |
| `DB_PASSWORD` | Mật khẩu TiDB |
| `DB_NAME` | `halong` |
| `DB_SSL` | `true` |

5. Bấm **Create Web Service**. Chờ build xong (vài phút), mở link Render cấp để kiểm tra:
   - App du khách: `https://<tên>.onrender.com`
   - Trang quản trị: `https://<tên>.onrender.com/admin` – đăng nhập `admin` / `admin123` rồi **đổi mật khẩu ngay**.
6. Trong **Settings** của service: đặt **Auto-Deploy = No** (để chỉ GitHub Actions quyết định khi nào triển khai), rồi kéo xuống **Deploy Hook** và **sao chép URL**.

## Bước 3 – Nối GitHub Actions với Render (chủ repo làm, 1 phút)

Chỉ chủ repo (**Huynh-Quoc-Danh**) hoặc người có quyền admin mới thêm được secret:

1. Mở repo trên GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. **Name:** `RENDER_DEPLOY_HOOK_URL` – **Secret:** dán URL Deploy Hook ở bước 2.6 → **Add secret**.

Từ giờ, mỗi lần có code mới vào `main` và CI xanh, tab **Actions** sẽ có thêm job **“Triển khai lên Render (CD)”**, và link tự cập nhật bản mới.

---

## Lưu ý

- **Gói Free của Render “ngủ” sau 15 phút không có ai truy cập**; lần mở đầu tiên sau đó mất khoảng 1 phút. Trước khi bảo vệ / demo nên mở link trước vài phút.
- **Ổ đĩa của Render Free là tạm thời:** ảnh / mp3 tải lên trong trang quản trị sẽ mất khi server khởi động lại. Ảnh có sẵn trong `public/` và dữ liệu trong TiDB thì không mất.
- **Mã QR:** in từ trang quản trị (Mã QR) sau khi đã mở bằng link Render, để QR trỏ đúng địa chỉ công khai.
- **Muốn dùng đúng dữ liệu đang có trên máy:** nhập các file trong thư mục `database/` vào TiDB (TiDB Cloud → *Import*, hoặc dùng MySQL client với SSL) trước khi mở app lần đầu.
