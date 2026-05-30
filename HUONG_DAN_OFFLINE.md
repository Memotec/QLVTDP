# HƯỚNG DẪN CHẠY PHẦN MỀM OFFLINE CHO ĐỘI THÔNG TIN
*(Hệ thống quản lý & Kiểm kê Vật tư CNS/ATM - Offline Pro)*

Chào bạn! Hệ thống hiện đã được cấu hình và đóng gói hoàn thiện để sẵn sàng hoạt động **hoàn toàn Offline** trong mạng nội bộ cơ quan, không cần kết nối Internet.

---

## 🚀 1. LỰA CHỌN PHƯƠNG THỨC CHẠY OFFLINE (QUA `CHAY_OFFLINE.bat`)

Tại thư mục gốc ổ đĩa cài đặt (Ví dụ: `D:\QLVTDP` hoặc thư mục dự án), bạn chỉ cần **kích đúp chuột (Double-click)** vào tệp:
👉 **`CHAY_OFFLINE.bat`**

Hệ thống sẽ cung cấp cho bạn 2 lựa chọn cực kỳ thông minh:

### 👉 LỰA CHỌN 1: Chạy Bản Đóng Gói Sẵn (Khuyên Dùng - Siêu Tốc)
* **Ưu điểm**: Chạy **tức thì chỉ sau 0.5 giây**, không cần internet tải thư viện, không sợ báo lỗi đầy ổ cứng `C:`, không lo xung đột thư viện `node_modules`.
* **Cơ chế**: Hệ thống sử dụng một máy chủ web siêu nhỏ bằng **Node.js** (`server_offline.js`) có sẵn trên máy để phát trực tiếp các tệp tin đã được biên dịch (Folder `dist/`).
* **Sử dụng**: Nhập phím `1` rồi nhấn `Enter`.

### 👉 LỰA CHỌN 2: Cài Đặt và Chạy Chế Độ Phát Triển (Dev Mode)
* **Cơ chế**: Tự động dọn dẹp môi trường cũ, tải/nạp các thư viện thông qua thư mục đệm tùy chỉnh (tránh lỗi tràn ổ cứng) và chạy máy chủ phục vụ phát triển.
* **Sử dụng**: Chỉ dùng khi bạn muốn chỉnh sửa, lập trình thêm mã nguồn. Nhập phím `2` rồi nhấn `Enter`.

---

## 📶 2. PHÁT MẠNG LAN CHO CÁC THIẾT BỊ KHÁC TRONG ĐỘI
Sau khi khởi chạy bằng cách kích đúp tệp `.bat`, màn hình nền đen sẽ thông báo địa chỉ truy cập cụ thể. Ví dụ:

1. **Truy cập tại chỗ (trên máy chủ của bạn)**:
   * Đường dẫn: **`http://localhost:3000`**

2. **Truy cập từ xa (Trưởng đội, Nhân viên kiểm kho cầm điện thoại, máy quét)**:
   * Hãy mở trình duyệt trên điện thoại (Chrome, Safari, iOS, Android) kết nối chung mạng Wifi/LAN cơ quan.
   * Truy cập theo **địa chỉ IP** hiển thị trên màn hình đen (Ví dụ: `http://192.168.1.15:3000`).
   * Bạn có thể cầm điện thoại di chuyển quanh kho để quét mã vạch/QR và cập nhật số lượng trực tiếp cực kỳ thuận tiện!

---

## 💾 3. QUẢN LÝ VÀ CHUYỂN ĐỔI DỮ LIỆU HOÀN TOÀN OFFLINE
Toàn bộ dữ liệu vật tư, trạng thái kiểm kê và biểu đồ phân tích trực quan được lưu trữ trực tiếp và an toàn trong trình duyệt của bạn.

* Để xuất cơ sở dữ liệu chuyển đổi sang máy khác:
  1. Nhấn nút **Cài đặt (biểu tượng bánh răng)** ở góc trên bên phải giao diện ứng dụng.
  2. Chọn **"Xuất XML/JSON Backup"** để tải file cơ sở dữ liệu về máy (hoặc đưa vào USB).
  3. Sang máy offline khác, nhấn **"Nhập XML/JSON Backup"** và chọn tệp đã lưu để khôi phục chính xác 100% dữ liệu danh mục cùng lịch sử kiểm kho!
