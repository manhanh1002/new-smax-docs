# So sánh Giải pháp Quản trị Tài liệu (CMS) cho Team: Custom Admin vs. Headless Docs Platform (Outline)

Tài liệu này phân tích và so sánh chi tiết hai hướng tiếp cận để xây dựng hệ thống quản trị tài liệu (CMS) có giao diện (GUI) cho đội ngũ nội dung/kỹ thuật, phục vụ cho ứng dụng Chat RAG hiện tại.

## 1. Tổng quan hai giải pháp

### Giải pháp A: Xây dựng Admin Portal riêng (Custom Admin)
- **Mô tả**: Tự xây dựng một trang Admin dashboard tích hợp trong ứng dụng Next.js hiện tại (hoặc tách riêng).
- **Tính năng**: Sử dụng Supabase Auth để đăng nhập, tích hợp bộ soạn thảo văn bản (như Tiptap, MDXEditor) để viết bài, upload ảnh, và lưu trực tiếp vào Supabase Database.
- **Mục tiêu**: Tạo trải nghiệm giống GitBook nhưng "nhà làm", kiểm soát 100% dữ liệu và giao diện.

### Giải pháp B: Sử dụng nền tảng Docs chuyên dụng (Outline/GitBook) & Sync về Supabase
- **Mô tả**: Sử dụng [Outline](https://www.getoutline.com) (hoặc tương tự) làm nơi cho team viết, chỉnh sửa và tổ chức tài liệu. Outline đóng vai trò là "Headless CMS".
- **Cơ chế**: Team làm việc trên giao diện của Outline. Hệ thống sẽ sử dụng API hoặc Webhook của Outline để đồng bộ nội dung về Supabase (để phục vụ RAG/Hiển thị trên trang Docs public).
- **Mục tiêu**: Tận dụng UX/UI soạn thảo tuyệt vời có sẵn, giảm tải việc dev tính năng editor.

---

## 2. So sánh chi tiết

| Tiêu chí | Giải pháp A: Custom Admin Portal | Giải pháp B: Outline Integration (Khuyên dùng) |
| :--- | :--- | :--- |
| **Trải nghiệm viết (Authoring Exp)** | **Trung bình/Khá**. Phụ thuộc vào thư viện Editor (Tiptap/Editor.js). Cần tự code các tính năng: kéo thả ảnh, bảng, callout, slash commands (`/`). | **Xuất sắc**. Outline có editor block-based cực mượt (giống Notion), hỗ trợ real-time collaboration (nhiều người sửa cùng lúc), comments, version history. |
| **Thời gian phát triển (Dev Time)** | **Cao (2-4 tuần)**. Phải xây dựng UI quản lý bài viết, cây thư mục (nested folders), xử lý upload ảnh, phân quyền, và quan trọng nhất là làm Editor ngon. | **Thấp (3-5 ngày)**. Chỉ cần viết script/API để sync dữ liệu từ Outline về Supabase. UI viết bài đã có sẵn. |
| **Bảo trì (Maintenance)** | **Cao**. Phải fix bug editor, update thư viện, xử lý các vấn đề về format HTML/Markdown, tương thích mobile. | **Thấp**. Outline lo phần editor và quản lý user. Chỉ cần bảo trì luồng Sync dữ liệu. |
| **Quản lý Team & Quyền (ACL)** | **Phức tạp**. Phải tự code logic phân quyền (ai được sửa bài nào, ai là admin/editor) bằng Supabase RLS. | **Có sẵn**. Outline hỗ trợ SSO, nhóm (Groups), phân quyền read/write chi tiết theo Collection. |
| **Chi phí vận hành** | **Thấp**. Chỉ tốn tiền host (Vercel/Supabase). | **Trung bình**. Outline bản Cloud tính phí theo user ($10/user/tháng). Tuy nhiên có thể **Self-host** Outline (Open Source) miễn phí trên server riêng. |
| **Tính năng RAG/AI** | Dữ liệu nằm sẵn trong Supabase, tiện cho việc embedding ngay khi lưu. | Cần thêm bước đồng bộ (Sync) để đưa dữ liệu vào Supabase vector store. |

---

## 3. Giải pháp thực thi chi tiết

### Giải pháp A: Xây dựng Custom Admin (Next.js + Supabase)

Nếu chọn hướng này, bạn cần thực hiện các module sau:

1.  **Authentication**:
    *   Tạo route `/admin/login` dùng Supabase Auth.
    *   Tạo bảng `profiles` có cột `role` (admin, editor) để chặn user thường truy cập.

2.  **Editor UI**:
    *   Cài đặt thư viện **Tiptap** (Headless) hoặc **Novel** (Notion-style editor built on Tiptap).
    *   Xây dựng giao diện 2 cột: Sidebar (cây thư mục tài liệu) và Main (vùng soạn thảo).
    *   Xử lý upload ảnh: Khi user paste/drop ảnh vào editor -> Upload lên Supabase Storage -> Chèn URL vào bài.

3.  **Quản lý dữ liệu**:
    *   Lưu nội dung dưới dạng Markdown hoặc JSON vào bảng `documents`.
    *   Tự xây dựng tính năng "Publish": Có nút Save Draft và Publish.

### Giải pháp B: Tích hợp Outline (Outline -> Supabase Sync) **(Đề xuất)**

Đây là giải pháp tối ưu nguồn lực, giúp team có công cụ viết bài xịn ngay lập tức.

#### Kiến trúc hệ thống:
1.  **Nơi viết bài**: Team truy cập vào `docs.team-cua-ban.com` (Outline).
2.  **Đồng bộ**: Sử dụng **Webhooks** của Outline hoặc chạy **Cron Job** định kỳ.
3.  **Lưu trữ & RAG**: Dữ liệu được đẩy vào Supabase để hiển thị lên web public và training cho AI.

#### Các bước triển khai:

**Bước 1: Thiết lập Outline**
*   Đăng ký Outline Cloud hoặc cài bản Self-hosted (Docker) lên một server nhỏ.
*   Tạo API Key trong phần Settings của Outline.

**Bước 2: Xây dựng Sync API (Next.js API Route)**
Tạo một API endpoint `/api/webhooks/outline` trong Next.js app để nhận tín hiệu từ Outline.

*   Khi có sự kiện `documents.publish` hoặc `documents.update`:
    1.  Nhận payload từ Outline (chứa ID bài viết, nội dung markdown).
    2.  Xử lý/Làm sạch nội dung (nếu cần).
    3.  **Update Database**: Lưu nội dung vào bảng `documents` trong Supabase.
    4.  **Update Vector**: Chia nhỏ nội dung (Chunking) -> Tạo Embedding -> Lưu vào `document_sections` (như đã mô tả trong báo cáo Supabase).

**Bước 3: Xử lý hiển thị (Frontend)**
*   Trang Docs public (`/docs/[slug]`) sẽ query trực tiếp từ Supabase (đã được sync từ Outline).
*   Không cần xây dựng trang Admin hay Editor nào cả.

#### Code mẫu xử lý Webhook (Pseudo-code):

```typescript
// app/api/webhooks/outline/route.ts
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const body = await req.json();
  const { event, payload } = body;

  // Chỉ xử lý khi bài viết được update hoặc publish
  if (event === 'documents.update' || event === 'documents.publish') {
    const { id, title, text, slug } = payload; // 'text' là markdown từ Outline

    // 1. Lưu metadata và nội dung vào Supabase
    const { error } = await supabase
      .from('documents')
      .upsert({
        external_id: id, // ID từ Outline
        title,
        slug,
        content: text,
        source: 'outline',
        last_updated: new Date()
      });

    // 2. Trigger việc tạo lại Vector Embeddings (có thể gọi function khác hoặc làm trực tiếp)
    await generateEmbeddingsForDocument(id, text);
  }

  return Response.json({ success: true });
}
```

## 4. Kết luận

*   **Chọn Giải pháp A (Custom Admin)** KHI VÀ CHỈ KHI:
    *   Bạn cần tích hợp cực sâu logic nghiệp vụ vào từng bài viết (ví dụ: bài viết gắn liền với dữ liệu sản phẩm, form động phức tạp).
    *   Bạn không muốn phụ thuộc vào bất kỳ bên thứ 3 nào.
    *   Bạn có dư nhân sự dev frontend để maintain cái editor.

*   **Chọn Giải pháp B (Outline Integration)** (KHUYÊN DÙNG):
    *   Bạn cần một trải nghiệm viết bài chuyên nghiệp cho team ngay lập tức.
    *   Bạn muốn tập trung dev vào tính năng chính (AI Chat, RAG) thay vì loay hoay sửa lỗi CSS của cái editor.
    *   Outline hỗ trợ Markdown rất tốt, tương thích hoàn hảo với các LLM hiện tại.
