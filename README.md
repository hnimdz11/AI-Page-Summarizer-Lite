# AI Page Summarizer (Lite Userscript)

Bản rút gọn (Lite) của công cụ tóm tắt trang web bằng AI Gemini, được thiết kế dưới dạng **UserScript** siêu nhẹ cho Tampermonkey. Sử dụng 100% Vanilla JavaScript, không phụ thuộc framework, giúp tóm tắt nội dung sạch và nhanh chóng ngay tại trang web đang đọc.

## ✨ Tính năng nổi bật

- **Giao diện Edge-Design**: Nút bấm trôi nổi (FAB) gắn ở viền phải màn hình, hỗ trợ kéo thả (Draggable) dọc theo mép trang.
- **Shadow DOM UI**: Đảm bảo giao diện tóm tắt không bị ảnh hưởng bởi CSS/Style của trang web gốc.
- **Hỗ trợ Model mới nhất**: Tùy chọn các dòng Gemini 3.0 Flash, 2.5 Flash.
- **CORS Bypass**: Sử dụng `GM_xmlhttpRequest` để gọi API xuyên miền mà không bị trình duyệt chặn.
- **Settings thông minh**: Lưu trữ API Key và cấu hình an toàn qua `GM_setValue`.

## 🚀 Hướng dấn cài đặt

1. Cài đặt tiện ích [Tampermonkey](https://www.tampermonkey.net/) trên trình duyệt của bạn (Chrome, Edge, Firefox...).
2. Copy toàn bộ nội dung file `AI_Summarizer_Lite.user.js`.
3. Mở bảng điều khiển Tampermonkey -> **Add a new script**.
4. Dán code vào và nhấn **Ctrl+S** để lưu.

## 🛠️ Cách sử dụng

1. Truy cập bất kỳ trang web nào (Báo chí, Blog, Wiki...).
2. Nhấn vào biểu tượng Bút ở viền phải màn hình.
3. Ở lần đầu sử dụng, nhấn vào biểu tượng **⚙️ (Cài đặt)** để điền **Gemini API Key**.
4. Nhấn **⚡ Tóm tắt trang này** và chờ kết quả hiện ra ngay lập tức.

## 📝 Giấy phép

Mã nguồn mở hoàn toàn, không mã hóa, dễ dàng chỉnh sửa.
