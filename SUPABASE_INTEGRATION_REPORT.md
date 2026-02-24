# Báo cáo: Tích hợp Supabase cho Chat & RAG Docs

## 1. Tổng quan & Khả năng tích hợp
Dựa trên yêu cầu và cấu trúc dự án hiện tại (Next.js App Router), việc tích hợp **Supabase** làm backend toàn diện (All-in-one Backend as a Service) cho các tính năng Chat, RAG (Retrieval-Augmented Generation) và quản lý tài liệu là giải pháp **rất khả thi và hiệu quả cao**.

Supabase cung cấp đầy đủ các mảnh ghép cần thiết mà không cần kết hợp nhiều dịch vụ rời rạc (như Upstash cho vector hay AWS S3 cho file):
- **Postgres Database**: Lưu trữ dữ liệu có cấu trúc (lịch sử chat, user).
- **pgvector**: Extension vector database tích hợp sẵn trong Postgres để thực hiện Semantic Search (cốt lõi của RAG).
- **Supabase Storage**: Lưu trữ file tài liệu gốc (nếu cần).
- **Authentication**: Quản lý người dùng và bảo mật dữ liệu (Row Level Security).
- **Edge Functions**: (Tùy chọn) Chạy logic server-side nếu không muốn dùng Next.js API Routes.

## 2. Kiến trúc đề xuất (Supabase-Native Architecture)

Thay vì sử dụng kiến trúc lai (Supabase + Upstash như trong tài liệu mẫu `docs/ai-search`), chúng ta nên sử dụng **Supabase 100%** để đơn giản hóa stack và giảm độ trễ mạng.

### Sơ đồ luồng dữ liệu (Data Flow)

1. **Load dữ liệu (Ingestion)**:
   `Admin Upload/Sync` -> `Next.js API` -> `Split/Chunk Text` -> `Embedding (OpenAI/Cohere)` -> `Supabase (pgvector)`

2. **Chat & RAG**:
   `User Question` -> `Next.js API` -> `Embedding Question` -> `Supabase RPC (Vector Similarity Search)` -> `Lấy Context` -> `Gửi LLM (OpenAI/Anthropic)` -> `Trả lời User`

## 3. Chi tiết triển khai kỹ thuật

### A. Cơ sở dữ liệu (Database Schema)

Cần thiết lập các bảng sau trong Supabase Postgres:

1. **`documents`**: Quản lý metadata của tài liệu.
   - `id`: UUID
   - `path`: Đường dẫn/URL tài liệu
   - `checksum`: Để kiểm tra thay đổi nội dung
   - `last_updated`: Timestamp

2. **`document_sections`**: Lưu trữ các đoạn text đã chia nhỏ và vector của chúng.
   - `id`: UUID
   - `document_id`: FK -> documents.id
   - `content`: Text content (đoạn nội dung)
   - `embedding`: `vector(1536)` (nếu dùng OpenAI text-embedding-3-small)
   - `metadata`: JSONB (số trang, tiêu đề section...)

3. **`chats`**: Quản lý phiên chat.
   - `id`: UUID
   - `user_id`: UUID (auth.users)
   - `title`: Tên đoạn chat

4. **`messages`**: Lưu trữ lịch sử tin nhắn.
   - `id`: UUID
   - `chat_id`: FK -> chats.id
   - `role`: 'user' | 'assistant'
   - `content`: Nội dung tin nhắn

### B. Load dữ liệu & RAG (Functionalities)

#### 1. Tính năng Load Dữ liệu Docs
- **Input**: Markdown files, PDF, hoặc Crawl từ URL.
- **Xử lý**:
  - Sử dụng thư viện như `langchain` hoặc `pdf-parse` để đọc nội dung.
  - Chia nhỏ văn bản (Chunking) thành các đoạn khoảng 500-1000 tokens (có overlap).
  - Gọi API Embedding (ví dụ: OpenAI `text-embedding-3-small`) để tạo vector cho từng chunk.
  - Lưu vào bảng `document_sections` trong Supabase.

#### 2. Tính năng Chat & RAG
- Sử dụng **Vercel AI SDK** (`ai` package) kết hợp với Supabase.
- **Quy trình**:
  1. Nhận câu hỏi từ người dùng.
  2. Tạo embedding cho câu hỏi.
  3. Gọi hàm RPC `match_documents` trên Supabase để tìm các đoạn văn bản có vector tương đồng nhất (Cosine Similarity).
  4. Ghép các đoạn văn bản tìm được làm "Context" vào prompt hệ thống.
  5. Gửi toàn bộ prompt + lịch sử chat tới LLM.
  6. Stream câu trả lời về client.

### C. Hàm RPC tìm kiếm (Postgres Function)

Cần tạo một function trong Postgres để thực hiện tìm kiếm vector nhanh:

```sql
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_sections.id,
    document_sections.content,
    1 - (document_sections.embedding <=> query_embedding) as similarity
  from document_sections
  where 1 - (document_sections.embedding <=> query_embedding) > match_threshold
  order by document_sections.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

## 4. Đánh giá ưu/nhược điểm

### Ưu điểm
- **Đồng bộ**: Dữ liệu chat, user và vector nằm chung một nơi, dễ dàng join bảng và quản lý.
- **Bảo mật**: Tận dụng Row Level Security (RLS) của Postgres để đảm bảo user chỉ xem được chat/doc của mình (nếu cần).
- **Chi phí**: Không tốn thêm chi phí cho dịch vụ Vector DB riêng lẻ. Supabase Free tier đủ cho các dự án nhỏ/vừa.
- **Hiệu năng**: `pgvector` hiện tại đã rất mạnh mẽ và hỗ trợ index HNSW cho tốc độ tìm kiếm cực nhanh.

### Nhược điểm
- **Scaling**: Nếu dữ liệu lên tới hàng triệu vectors, cần cấu hình Postgres cẩn thận (RAM, Indexing). Tuy nhiên với ứng dụng docs thông thường thì đây không phải vấn đề.

## 5. Kết luận & Các bước tiếp theo

Việc tích hợp Supabase là **hoàn toàn phù hợp**. Để bắt đầu, chúng ta cần thực hiện các bước:

1. **Cài đặt dependencies**: `npm install @supabase/supabase-js @supabase/ssr ai openai`
2. **Thiết lập Supabase Project**: Tạo project, enable `vector` extension.
3. **Chạy Migration**: Tạo bảng và hàm RPC (như mô tả ở mục 3).
4. **Viết API Route**:
   - `/api/ingest`: Để nạp dữ liệu.
   - `/api/chat`: Để xử lý chat và RAG.
