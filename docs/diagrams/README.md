# Mã nguồn sơ đồ – Hạ Long SmartGuide

Các sơ đồ trong PRD được viết bằng **PlantUML** (file `.puml`): viết sơ đồ bằng chữ, công cụ tự vẽ ra hình.

| File | Sơ đồ |
| --- | --- |
| `01-usecase-tong-quat.puml` | Use case tổng quát |
| `02-usecase-nghe-thuyet-minh.puml` | Use case phân rã – nghe thuyết minh |
| `03-usecase-mua-ve.puml` | Use case phân rã – mua vé và thanh toán |
| `04-usecase-quan-tri.puml` | Use case phân rã – quản trị |
| `05-activity-nghe-va-mua-ve.puml` | Activity – nghe thuyết minh và mua vé |
| `06-activity-dang-nhap.puml` | Activity – đăng nhập quản trị |
| `07-activity-nhap-ma.puml` | Activity – nhập mã kích hoạt |
| `08-activity-quan-ly-dia-diem.puml` | Activity – quản lý địa điểm |
| `09-activity-hoan-tien-huy-don.puml` | Activity – hoàn tiền, huỷ đơn |
| `10-erd.puml` | ERD – 11 bảng CSDL `halong` |
| `11-dfd-muc-0.puml` | DFD mức 0 (ngữ cảnh) |
| `12-dfd-muc-1.puml` | DFD mức 1 |
| `13-dfd-muc-2-tien-trinh-1.puml` | DFD mức 2 – tiến trình 1.0 |
| `14-dfd-muc-2-tien-trinh-2.puml` | DFD mức 2 – tiến trình 2.0 |
| `15-dfd-muc-2-tien-trinh-3.puml` | DFD mức 2 – tiến trình 3.0 |
| `18-dfd-muc-2-tien-trinh-4.puml` | DFD mức 2 – tiến trình 4.0 (có quét QR) |
| `16-dfd-muc-2-tien-trinh-5.puml` | DFD mức 2 – tiến trình 5.0 |
| `17-dfd-muc-2-tien-trinh-6.puml` | DFD mức 2 – tiến trình 6.0 |

## Cách 1: Vẽ online (không cần cài gì)

1. Mở https://www.plantuml.com/plantuml/uml/
2. Xoá đoạn mẫu trong ô soạn thảo, dán toàn bộ nội dung một file `.puml` vào (từ `@startuml` đến `@enduml`).
3. Bấm **Submit** → sơ đồ hiện ra bên dưới. Bấm **PNG** hoặc **SVG** để tải ảnh.

## Cách 2: Vẽ ngay trong VS Code

1. Cài extension **PlantUML** (tác giả *jebbs*). Máy đã có Java nên dùng được luôn.
2. Mở một file `.puml`, bấm **Alt + D** → cửa sổ xem trước hiện sơ đồ.
3. Xuất ảnh: chuột phải trong file → **Export Current Diagram** → chọn PNG.

## Quy ước ký hiệu trong DFD

- Hình chữ nhật vuông: tác nhân bên ngoài (Du khách, Quản trị viên, Thiết bị GPS, Dịch vụ VietQR).
- Hình chữ nhật bo góc, có số (1.0, 2.1…): tiến trình.
- Hình trụ (D1…D12): kho dữ liệu, tương ứng bảng MySQL.
- Mũi tên có nhãn: luồng dữ liệu; mũi tên hai đầu: vừa đọc vừa ghi.

PlantUML tự sắp xếp vị trí các hình, nên bố cục có thể khác ảnh trong PRD, nhưng các thành phần và luồng là như nhau.
