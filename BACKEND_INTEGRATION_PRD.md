# Product Requirements Document (PRD): Backend & Integration Setup
## Smax Tailieu RAG Chat - Outline Integration

**Ngày tạo:** 2026-02-10
**Phiên bản:** 1.0
**Trạng thái:** Draft

---

## 1. Tổng quan (Overview)

Tài liệu này mô tả chi tiết yêu cầu kỹ thuật và quy trình triển khai Backend để tích hợp **Outline** (Headless CMS) với hệ thống **Supabase** (Database & Vector Store), phục vụ cho Frontend **Next.js Multi-language Docs** và tính năng **AI RAG Chat**.

### Mục tiêu
1.  **Automated Sync**: Tự động đồng bộ bài viết từ Outline về Supabase khi có thay đổi (Create/Update/Delete).
2.  **RAG Ready**: Tự động xử lý dữ liệu (Chunking & Embedding) để phục vụ tìm kiếm ngữ nghĩa (Semantic Search) ngay khi bài viết được publish.
3.  **Multi-language**: Hỗ trợ cấu trúc đa ngôn ngữ (VI/EN) tương thích với routing hiện tại của Frontend.
4.  **Supabase-Native**: Sử dụng toàn bộ stack của Supabase (Postgres, pgvector, Auth) để tối ưu hiệu năng và chi phí.

---

## 2. Kiến trúc hệ thống (System Architecture)

### Luồng dữ liệu (Data Flow)

```mermaid
graph LR
    A[Content Team] -- Viết bài --> B[Outline (CMS)]
    B -- Webhook (JSON) --> C[Next.js API Route]
    C -- 1. Parse & Clean --> D{Xử lý Logic}
    D -- 2. Upsert Metadata --> E[(Supabase DB: documents)]
    D -- 3. Chunking & Embedding --> F[OpenAI API]
    F -- Vector --> G[(Supabase DB: document_sections)]
    H[Frontend User] -- Xem Docs --> E
    H -- Chat Question --> I[Next.js RAG API]
    I -- Search Vector --> G
```

### Các thành phần chính
1.  **Source**: Outline (Cloud hoặc Self-hosted).
2.  **Middleware**: Next.js API Routes (`/api/webhooks/outline`, `/api/chat`).
3.  **Backend**: Supabase (PostgreSQL + pgvector).
4.  **AI Model**: OpenAI (Text Embedding & Chat Completion).

---

## 3. Thiết kế Cơ sở dữ liệu (Database Schema)

Sử dụng Supabase PostgreSQL.

### 3.1. Bảng `documents`
Lưu trữ metadata và nội dung gốc của tài liệu.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key (tự sinh). |
| `external_id` | `text` | ID gốc từ Outline (để map khi update). Unique. |
| `title` | `text` | Tiêu đề bài viết. |
| `slug` | `text` | URL slug (ví dụ: `gioi-thieu`). |
| `lang` | `varchar(2)` | Ngôn ngữ (`vi` hoặc `en`). |
| `path` | `text` | Đường dẫn đầy đủ (ví dụ: `/vi/bat-dau/gioi-thieu`). |
| `parent_id` | `uuid` | ID của bài cha (nếu có, để xây dựng sidebar tree). |
| `content` | `text` | Nội dung Markdown gốc. |
| `meta` | `jsonb` | Metadata khác (author, tags, outline collection id). |
| `last_updated` | `timestamptz` | Thời gian cập nhật cuối cùng. |
| `created_at` | `timestamptz` | Thời gian tạo. |

### 3.2. Bảng `document_sections`
Lưu trữ các đoạn văn bản đã chia nhỏ và vector embedding.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key. |
| `document_id` | `uuid` | Foreign Key -> `documents.id` (ON DELETE CASCADE). |
| `content` | `text` | Đoạn nội dung (chunk). |
| `embedding` | `vector(1536)` | Vector embedding (OpenAI text-embedding-3-small). |
| `token_count` | `int` | Số lượng token của chunk. |

### 3.3. Hàm RPC `match_documents`
Function tìm kiếm tương đồng (Similarity Search) trong Postgres.

```sql
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_lang text default null
)
returns table (
  id uuid,
  content text,
  similarity float,
  document_path text,
  document_title text
)
language plpgsql
as $$
begin
  return query
  select
    ds.id,
    ds.content,
    1 - (ds.embedding <=> query_embedding) as similarity,
    d.path as document_path,
    d.title as document_title
  from document_sections ds
  join documents d on ds.document_id = d.id
  where 1 - (ds.embedding <=> query_embedding) > match_threshold
  and (filter_lang is null or d.lang = filter_lang)
  order by ds.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

---

## 4. Đặc tả API & Integration Logic

### 4.1. Chiến lược Đa ngôn ngữ (Multi-language Strategy)
Để hệ thống tự động nhận diện ngôn ngữ từ Outline, quy định cấu trúc thư mục trên Outline như sau:
*   **Cách 1 (Khuyên dùng):** Sử dụng **Collections** riêng biệt.
    *   Collection "Documentation (VI)" -> Map về `lang: 'vi'`.
    *   Collection "Documentation (EN)" -> Map về `lang: 'en'`.
*   **Cách 2:** Sử dụng **Root Folders**.
    *   Tài liệu nằm trong folder gốc "Tiếng Việt" -> `lang: 'vi'`.
    *   Tài liệu nằm trong folder gốc "English" -> `lang: 'en'`.

*Trong tài liệu này, ta sẽ giả định sử dụng **Cách 1** (Collection mapping) để dễ quản lý quyền truy cập.*

### 4.2. Webhook Endpoint: `/api/webhooks/outline`
*   **Method**: `POST`
*   **Security**: Kiểm tra Header `Outline-Signature` hoặc Secret Token để xác thực request.

#### Payload Handling Logic:
1.  **Trigger**: Nhận event `documents.publish` hoặc `documents.update`.
2.  **Validation**:
    *   Kiểm tra Collection ID.
    *   Nếu Collection ID = `ENV_OUTLINE_VI_COLLECTION_ID` -> `lang = 'vi'`.
    *   Nếu Collection ID = `ENV_OUTLINE_EN_COLLECTION_ID` -> `lang = 'en'`.
3.  **Process `documents` Table**:
    *   Thực hiện `upsert` vào bảng `documents` dựa trên `external_id`.
    *   Tạo `slug` từ title hoặc dùng slug có sẵn từ Outline.
    *   Cập nhật `content`, `title`, `last_updated`.
4.  **Process `document_sections` Table (RAG)**:
    *   **Bước 1**: Xóa các section cũ của document này (`DELETE FROM document_sections WHERE document_id = ...`).
    *   **Bước 2**: Chia nhỏ nội dung (Chunking). Sử dụng strategy:
        *   Chunk size: 1000 characters.
        *   Overlap: 200 characters.
        *   Tách theo header Markdown (#, ##, ###) để giữ ngữ cảnh.
    *   **Bước 3**: Gọi OpenAI API (`text-embedding-3-small`) để tạo vector cho từng chunk.
    *   **Bước 4**: Insert các chunk + vector vào bảng `document_sections`.

### 4.3. Chat API: `/api/chat`
*   **Method**: `POST`
*   **Logic**:
    1.  Nhận `messages` và `lang` (ngôn ngữ hiện tại của user) từ Client.
    2.  Lấy message cuối cùng của user.
    3.  Tạo embedding cho message đó.
    4.  Gọi RPC `match_documents(embedding, 0.5, 5, lang)` để tìm context liên quan.
    5.  Xây dựng System Prompt:
        ```text
        Bạn là trợ lý AI hữu ích. Dựa vào các thông tin sau để trả lời câu hỏi của người dùng bằng tiếng {lang}.
        Nếu không có thông tin, hãy nói là bạn không biết.
        
        Context:
        {context_content}
        ```
    6.  Gửi request tới OpenAI (GPT-4o hoặc GPT-3.5-turbo).
    7.  Stream câu trả lời về Client.

---

## 5. Kế hoạch triển khai (Implementation Plan)

### Phase 1: Setup Supabase Database
1.  Tạo Project trên Supabase.
2.  Chạy script SQL kích hoạt extension `vector`.
3.  Chạy script SQL tạo bảng `documents`, `document_sections`.
4.  Chạy script SQL tạo hàm `match_documents`.
5.  Thiết lập RLS (Row Level Security) nếu cần public read access cho `documents`.

### Phase 2: Backend Development
1.  Cài đặt thư viện: `npm install langchain @supabase/supabase-js openai ai`.
2.  Tạo file service `lib/outline.ts` để xử lý logic parsing từ Outline.
3.  Tạo file service `lib/embeddings.ts` để xử lý chunking và embedding.
4.  Implement API Route `/api/webhooks/outline`.
5.  Test webhook bằng Postman hoặc local tunnel (ngrok) với Outline thật.

### Phase 3: Frontend Integration
1.  Cập nhật trang Docs (`app/tai-lieu/[lang]/[...slug]/page.tsx`) để fetch dữ liệu từ Supabase thay vì file mock local.
    *   Query: `supabase.from('documents').select('*').eq('slug', slug).eq('lang', lang).single()`.
2.  Cập nhật Sidebar (`components/layout/sidebar.tsx`) để fetch cây thư mục từ Supabase.
    *   Cần logic đệ quy để build tree từ danh sách phẳng (flat list) dựa trên `parent_id`.

### Phase 4: Chat/RAG Integration
1.  Update `/api/chat/route.ts` để sử dụng `match_documents` RPC.
2.  Kiểm tra độ chính xác của câu trả lời với dữ liệu thực tế.

---

## 6. Yêu cầu môi trường (Environment Variables)

File `.env.local` cần bổ sung:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # Cần quyền ghi DB cho API Route

# OpenAI
OPENAI_API_KEY=...

# Outline (Webhook Security)
OUTLINE_WEBHOOK_SECRET=ol_whs_djdUjFIrpCQQgBP2vJWXpNboabkvG5aJ

# Outline Mapping (Optional)
OUTLINE_COLLECTION_VI_ID=zuLTJLz8pw
OUTLINE_COLLECTION_EN_ID=ZdqHDdX9ap
```

---

## 7. Phụ lục: Các vấn đề cần lưu ý
*   **Rate Limit**: Cần lưu ý rate limit của OpenAI khi import số lượng lớn bài viết cùng lúc.
*   **Re-sync**: Cần có một API endpoint thủ công (`/api/admin/resync`) để admin có thể trigger sync lại toàn bộ dữ liệu từ Outline nếu có lỗi xảy ra.
*   **Image Handling**: Ảnh trong Outline được host bởi Outline (AWS S3 signed url). Khi sync về, URL này có thể hết hạn.
    *   *Giải pháp nâng cao*: API Webhook cần download ảnh từ Outline -> Upload lên Supabase Storage -> Thay thế URL trong nội dung Markdown trước khi lưu vào DB. (Có thể làm ở Phase 2.5).
