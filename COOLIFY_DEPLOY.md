
# Hướng dẫn Deploy lên Coolify (VPS)

Do không thể thao tác trực tiếp trên giao diện web của Coolify qua terminal, bạn vui lòng thực hiện các bước sau để deploy project:

## 1. Truy cập Coolify
- **URL:** `http://42.96.13.252:8000` (hoặc port 3000 nếu cấu hình khác, nhưng thường là 8000)
- **Login:** Sử dụng tài khoản admin của bạn (nếu chưa có thì tạo mới).

## 2. Tạo Project mới
1. Vào dashboard, chọn **Projects** -> **+ New Project**.
2. Đặt tên: `Smax Docs` -> **Continue**.
3. Chọn môi trường **Production**.

## 3. Thêm Resource (Application)
1. Trong project vừa tạo, nhấn **+ New Resource**.
2. Chọn **Git Repository** (Private hoặc Public tùy repo của bạn).
3. **Repository URL:** Nhập link repo GitHub của bạn (ví dụ: `https://github.com/username/smax-tailieu-rag-chat`).
4. **Branch:** `main` (hoặc branch bạn đang dùng).
5. **Build Pack:** Chọn **Docker Compose** hoặc **Dockerfile**. 
   - *Khuyến nghị:* Chọn **Dockerfile** vì mình vừa tạo file tối ưu cho Next.js.

## 4. Cấu hình Biến môi trường (Environment Variables)
Vào tab **Environment Variables** và thêm tất cả các biến từ file `.env.local` của bạn vào đây:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OUTLINE_URL=...
OUTLINE_API_KEY=...
NEXT_PUBLIC_OUTLINE_URL=...
# Các biến khác...
```

**Lưu ý quan trọng:**
- Đảm bảo `NEXT_PUBLIC_OUTLINE_URL` trỏ về đúng domain của Outline (ví dụ: `https://docs.cdp.vn`).
- `OUTLINE_URL` cũng vậy.

## 5. Cấu hình Domain
1. Vào tab **General** (hoặc **Settings**).
2. **Domains:** Nhập domain bạn muốn dùng (ví dụ: `http://42.96.13.252:3000` hoặc domain thật `https://docs.smax.ai`).
3. Nếu dùng domain thật, nhớ trỏ DNS A record về IP `42.96.13.252`.

## 6. Deploy
1. Nhấn nút **Deploy** ở góc trên bên phải.
2. Theo dõi log build. Nếu thành công, trạng thái sẽ chuyển sang **Running**.

## 7. Kiểm tra
- Truy cập vào domain/IP đã cấu hình.
- Kiểm tra xem ảnh có hiển thị đúng không.
- Kiểm tra tính năng Chat AI.

---
**Tại sao dùng Dockerfile?**
File `Dockerfile` mình vừa tạo sử dụng tính năng **Standalone Output** của Next.js, giúp giảm kích thước image và chạy ổn định hơn trên môi trường container như Coolify. Nó cũng tự động copy các file static cần thiết.
