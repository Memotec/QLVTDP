# HƯỚNG DẪN CHẠY OFFLINE & PHÁT MẠNG LAN CHO THIẾT BỊ KHÁC
*(Dành riêng cho Đội Thông Tin - Kho Vật Tư CNS/ATM)*

Hệ thống quản lý vật tư này được thiết kế và tối ưu để **hoạt động hoàn toàn độc lập (Offline)** trong mạng LAN nội bộ của Đội Thông Tin mà không cần kết nối Internet. Dưới đây là cách khắc phục lỗi thiếu ổ đĩa (ổ C bị đầy) và cấu hình chi tiết.

---

## 1. NGUYÊN NHÂN LỖI TRƯỚC ĐÓ CỦA BẠN
1. **Lỗi `ENOSPC: no space left on device`**: Phân vùng ổ đĩa `C:\` của bạn đã bị đầy hoàn toàn. Khi chạy `npm install`, Node.js cố gắng ghi bộ nhớ tạm (Cache) vào đường dẫn mặc định trên ổ `C:\Users\...\AppData\Local\npm-cache` dẫn đến tiến trình cài đặt bị dừng đột ngột và làm thiếu file thư viện cốt lõi (`lightningcss.win32-x64-msvc.node`).
2. **Lỗi `Cannot find module ...`**: Do việc cài đặt ở ổ C bị hỏng nên khi bạn sao chép thư mục sang ổ `D:\` và chạy, Vite không tìm thấy nhân thư viện chạy trên Windows.

---

## 2. CÁCH KHẮC PHỤC TRIỆT ĐỂ & CHẠY TRÊN Ổ D

Để cài đặt chuẩn xác nhất trên ổ `D:\`, loại bỏ tác động từ bộ nhớ đầy ở ổ `C`, hãy thực hiện các bước sau:

### Bước 1: Xóa cài đặt lỗi cũ
Mở thư mục `D:\cns_atm-inventory`, thực hiện xóa các thư mục và tệp sau đây để tránh xung đột cấu hình cũ:
* Hủy bỏ/Xóa hoàn toàn thư mục `node_modules` (nếu có).
* Hủy bỏ/Xóa tệp `package-lock.json` (nếu có).

### Bước 2: Chạy tệp tự động cài đặt trên ổ D
Tại thư mục gốc `D:\cns_atm-inventory`, chúng tôi đã tạo sẵn cho bạn tệp tự động hóa có tên là:
👉 **`CHAY_OFFLINE.bat`**

Hãy kích chuột kép (Double-click) vào tệp **`CHAY_OFFLINE.bat`** này. Tệp sẽ tự động thực hiện:
1. Thiết lập thư mục lưu trữ cache chuyên dụng ngay tại ổ `D:\` để không bị báo lỗi đầy ổ đĩa `C`.
2. Khôi phục hoàn tất các thư viện cần thiết tương thích với hệ điều hành Windows.
3. Kích hoạt Server chạy mạng LAN nội bộ.

---

## 3. PHÁT MẠNG LAN OFFLINE CHO CÁC MÁY KHÁC TRONG ĐỘI

Sau khi khởi chạy ứng dụng thành công bằng tệp `.bat` hoặc qua lệnh `npm run dev -- --host`, bạn có thể cho phép các máy tính khác, máy scan hoặc điện thoại trong cùng mạng wifi/LAN vào kiểm kê như sau:

### Bước 1: Tìm địa chỉ IP của máy chủ của bạn
1. Bấm tổ hợp phím `Windows + R`, gõ `cmd` rồi nhấn Enter.
2. Gõ lệnh `ipconfig` và nhấn Enter.
3. Tìm dòng **`IPv4 Address`** (thường có dạng `192.168.1.XX` hoặc `10.0.0.XX`). Đây chính là IP cục bộ của máy bạn.

### Bước 2: Truy cập từ thiết bị khác trong Đội
Từ điện thoại thông minh, máy tính bảng hoặc máy tính khác cùng kết nối chung Wifi/LAN cơ quan:
1. Mở trình duyệt web (Chrome, Safari, Edge).
2. Truy cập vào địa chỉ IP kèm cổng kết nối `3000`.
   * Ví dụ: **`http://192.168.1.15:3000`** *(thay `192.168.1.15` bằng IP chính xác bạn tìm thấy ở Bước 1)*.
3. Bạn đã có thể tiến hành rọi quét QR, kiểm đếm vật tư từ xa trực tiếp trên điện thoại!

---

## 4. QUẢN LÝ DỮ LIỆU OFFLINE HOÀN TOÀN
Hệ thống lưu trữ dữ liệu an toàn trên trình duyệt thông qua bộ nhớ cục bộ ổn định tốt.
* Để chuyển dữ liệu sang máy tính khác mà không cần internet/mạng LAN: 
  * Vào biểu tượng **Cài đặt (răng cưa)** phía trên bên phải.
  * Nhấn vào nút **"Xuất XML/JSON Backup"** để tải file cơ sở dữ liệu vật tư về máy (hoặc lưu vào USB).
  * Sang máy tính offline khác, nhấn **"Nhập XML/JSON Backup"** chọn file đã lưu để khôi phục tức thời 100% dữ liệu danh mục, số lượng và nhật ký kiểm kê!
