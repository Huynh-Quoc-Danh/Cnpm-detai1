# Cơ sở dữ liệu `halong`

CSDL gồm 11 bảng, chia thành 3 file theo nhóm chức năng.

| File | Nhóm chức năng | Bảng |
| --- | --- | --- |
| `01-tai-khoan-cau-hinh.sql` | Tài khoản quản trị, cài đặt | `admins`, `admin_sessions`, `settings` |
| `02-noi-dung-dia-diem.sql` | Địa điểm, thuyết minh, khách truy cập | `sites`, `exhibits`, `listens`, `visitors` |
| `03-ban-ve.sql` | Bán vé, đơn hàng, mã kích hoạt | `packages`, `orders`, `tickets`, `claim_codes` |

## Cách nhập (XAMPP)

1. Mở XAMPP Control Panel, bấm **Start** ở MySQL.
2. Vào http://localhost/phpmyadmin, chọn tab **Import**.
3. Chọn lần lượt từng file `01`, `02`, `03` rồi bấm **Import**. Mỗi file tự tạo CSDL `halong` nếu chưa có; thứ tự nhập không quan trọng.

Hoặc bằng dòng lệnh:

```
C:\xampp\mysql\bin\mysql -u root < database/01-tai-khoan-cau-hinh.sql
C:\xampp\mysql\bin\mysql -u root < database/02-noi-dung-dia-diem.sql
C:\xampp\mysql\bin\mysql -u root < database/03-ban-ve.sql
```

Nếu không nhập gì, server vẫn tự tạo bảng và dữ liệu mẫu khi chạy `npm run dev` lần đầu.
