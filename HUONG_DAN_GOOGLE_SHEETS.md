# HƯỚNG DẪN TRIỂN KHAI GOOGLE SHEETS WEB APP (ĐỒNG BỘ ĐÁM MÂY)
*(Hệ thống quản lý & Kiểm kê Vật tư CNS/ATM - Đội Thông tin Miền Nam)*

Chào bạn! Dưới đây là hướng dẫn chi tiết từng bước để thiết lập và triển khai **Google Apps Script** làm cơ sở dữ liệu lưu trữ trực tuyến (Cloud) thông qua **Google Sheets** (miễn phí, bảo mật cao, hỗ trợ đồng bộ thời gian thực cho cả đội cùng làm việc).

---

## 📅 BƯỚC 1: TẠO FILE GOOGLE SHEET MỚI
1. Truy cập vào tài khoản Google Drive của bạn (ví dụ Gmail cá nhân hoặc tài khoản cơ quan `TAILIEUTBTT@gmail.com`).
2. Nhấn nút **Mới (New)** -> Chọn **Google Trang tính (Google Sheets)** để tạo mới một file Excel online.
3. Đổi tên file trang tính thành: **`QL_VatTu_CNS`** (hoặc bất kỳ tên nào tùy bạn).
4. Ở góc dưới cùng bên trái, hãy đổi tên Sheet mặc định từ **`Trang tính1`** (hoặc `Sheet1`) thành **`Inventory`** (bắt buộc đúng chữ cái hoa thường).

---

## 🛠️ BƯỚC 2: SAO CHÉP MÃ NGUỒN APPS SCRIPT
Tại file Google Sheet vừa tạo:
1. Trên thanh bảng chọn, hãy nhấp vào **Mở rộng (Extensions)** -> Chọn **Apps Script** (một tab lập trình mới sẽ mở ra).
2. Xóa sạch mọi mã nguồn đang có mặc định trong khung soạn thảo `Code.gs`.
3. Sao chép toàn bộ mã nguồn chuyên dụng bên dưới và dán vào:

```javascript
/**
 * GOOGLE APPS SCRIPT BACKEND ENGINE FOR CNS/ATM INVENTORY MANAGEMENT
 * Cung cấp API hai chiều (GET để đồng bộ xuống, POST để lưu trữ lên Cloud Google Sheets).
 */

const SHEET_NAME = 'Inventory';

// Khởi tạo/Lấy sheet Inventory, nếu chưa có tự động tạo và định cấu hình tiêu đề cột
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      "ID", "Tên thiết bị", "Part Number (P/N)", "Serial Number (S/N)", 
      "Mã Kho (QR)", "Vị trí / Tủ", "Số lượng", "Trạng thái kiểm kê", 
      "Ngày kiểm gần nhất", "Ghi chú kiểm kê", "Phân loại (Category)", "Lịch sử kiểm kê"
    ];
    // Ghi hàng tiêu đề
    sheet.appendRow(headers);
    // Tạo kiểu trang trí cơ bản cho bảng tính dễ đọc
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#3B82F6"); // Màu xanh dương sang trọng
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    // Tự động căn chỉnh độ rộng các cột
    for (let i = 1; i <= headers.length; i++) {
       sheet.setColumnWidth(i, 160);
    }
  }
  return sheet;
}

/**
 * 1. API GET: Trình duyệt tải dữ liệu từ Google Sheet xuống máy
 */
function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Nếu chỉ có hàng tiêu đề thì trả về mảng rỗng []
    if (values.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const items = [];
    const headers = values[0]; // Dòng thứ nhất là tiêu đề cột
    
    // Đọc từ hàng thứ 2
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      let historyArr = [];
      try {
        if (row[11]) {
          historyArr = JSON.parse(row[11]);
        }
      } catch (err) {
        historyArr = [];
      }
      
      const item = {
        id: String(row[0] || ''),
        name: String(row[1] || ''),
        pn: String(row[2] || ''),
        sn: String(row[3] || ''),
        warehouse: String(row[4] || ''),
        loc: String(row[5] || ''),
        qty: Number(row[6]) || 1,
        auditStatus: row[7] === "OK" ? "OK" : (row[7] === "MISSING" ? "MISSING" : null),
        auditDate: row[8] ? String(row[8]) : null,
        auditNote: String(row[9] || ''),
        category: String(row[10] || 'Khác'),
        history: historyArr
      };
      items.push(item);
    }
    
    // Trả về JSON cho Web Client React nhận
    return ContentService.createTextOutput(JSON.stringify(items))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 2. API POST: Nhận và lưu trữ đè toàn bộ danh mục từ Client xuống Trang tính
 */
function doPost(e) {
  try {
    const sheet = getOrCreateSheet();
    
    // Nhận chuỗi JSON từ tham số gửi lên
    const payloadStr = e.parameter.data;
    if (!payloadStr) {
      return ContentService.createTextOutput("Yêu cầu không hợp lệ. Không tìm thấy dữ liệu 'data'.")
        .setMimeType(ContentService.MimeType.TEXT);
    }
    
    const inventoryList = JSON.parse(payloadStr);
    
    // Xóa tất cả các dòng dữ liệu cũ dưới tiêu đề (giữ lại dòng số 1)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
    
    // Ghi hàng loạt danh mục vừa nhận
    if (inventoryList && Array.isArray(inventoryList) && inventoryList.length > 0) {
      const newRows = [];
      inventoryList.forEach(item => {
        const rowData = [
          item.id || '',
          item.name || '',
          item.pn || '',
          item.sn || '',
          item.warehouse || '',
          item.loc || '',
          Number(item.qty) || 1,
          item.auditStatus || '',
          item.auditDate || '',
          item.auditNote || '',
          item.category || 'Khác',
          JSON.stringify(item.history || [])
        ];
        newRows.push(rowData);
      });
      
      // Ghi hàng loạt bằng SetValues tăng hiệu năng lên gấp 20 lần ghi từng dòng
      const targetRange = sheet.getRange(2, 1, newRows.length, 12);
      targetRange.setValues(newRows);
    }
    
    // Cấp quyền phản hồi thành công
    return ContentService.createTextOutput("SUCCESS")
      .setMimeType(ContentService.MimeType.TEXT);
      
  } catch (error) {
    return ContentService.createTextOutput("ERROR: " + error.toString())
      .setMimeType(ContentService.MimeType.TEXT);
  }
}
```

4. Nhấn nút **Lưu dự án (Save project)** - icon hình chiếc Đĩa mềm 💾 phía trên thanh công cụ.

---

## 🚀 BƯỚC 3: PHÁT HÀNH DƯỚI DẠNG WEB APP (DEPLOY)
Để ứng dụng React có thể kết nối với mã script này qua môi trường online:
1. Ở góc trên cùng bên phải cửa diện soạn thảo Apps Script, nhấn nút xanh **Triển khai (Deploy)** -> Chọn **Triển khai mới (New deployment)**.
2. Nhấp vào biểu tượng bánh răng ⚙️ ở cột bên trái và chọn **Ứng dụng web (Web app)**.
3. Cấu hình bảng thông số bắt buộc như sau:
   * **Cấu hình mô tả (Description)**: *Phiên bản đồng bộ 1.0.0*
   * **Thực thi dưới danh nghĩa (Execute as)**: Chọn **Tôi (Me / [Email của bạn])** *(Quan trọng để Script có quyền ghi vào file Trang tính của chính bạn)*.
   * **Ai có quyền truy cập (Who has access)**: Chọn **Bất kỳ ai (Anyone)** *(Bắt buộc để web client gọi CORS đẩy dữ liệu không cần đăng nhập tài khoản Google của bạn)*.
4. Nhấn nút **Triển khai (Deploy)** ở góc dưới cùng.
5. Google sẽ hiện hộp thoại yêu cầu xác thực bảo mật -> Nhấp chọn **Ủy quyền truy cập (Authorize access)**.
6. Chọn tài khoản Google của bạn -> Click tiếp chữ màu xám nhạt **Advanced** (Nâng cao) -> Chọn **Go to ... (unsafe)** -> Nhấn nút **Allow (Cho phép)** ở bước cuối cùng.
7. Đợi vài giây, Google sẽ hiển thị **URL Ứng dụng web ("Web app URL")**. Nhấp chọn **Sao chép (Copy)** URL này.
   * *Đường dẫn sẽ có dạng: `https://script.google.com/macros/s/AKfycby..._...exec`*

---

## ⚙️ BƯỚC 4: NHẬP ĐƯỜNG DẪN KẾT NỐI VÀO PHẦN MỀM
1. Mở phần mềm Quản lý Kho Vật tư CNS lên (chạy bằng LAN `CHAY_OFFLINE.bat` hoặc chạy trên trình duyệt).
2. Nhấp vào nút **Cài đặt hệ thống ⚙️** ở góc trên bên phải màn hình.
3. Cuộn xuống phần **"Cấu Hình Cloud Sync (Google Sheets URL)"**.
4. Dán đường dẫn URL Web App vừa sao chép ở Bước 3 vào khung văn bản.
5. Nhấn thử nút **ĐỒNG BỘ CLOUD** 🔄 ngay góc giao diện:
   * Phần mềm sẽ ngay lập tức đẩy toàn bộ dữ liệu hiện tại lên File Google Sheet của bạn.
   * Hãy mở file Google Sheet lên và bạn sẽ nhìn thấy dữ liệu được tải lên đồng loạt cực kỳ rực rỡ và chuyên nghiệp!

*(Chú ý: Bật công tắc "Tự động đồng bộ" để bất kỳ khi nào thủ kho hoặc kỹ sư quét kiểm kê thiết bị thành công, dữ liệu trên Google Sheets online sẽ tự động cập nhật ngay tức khắc!)*
