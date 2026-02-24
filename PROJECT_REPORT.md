# Báo cáo Project: Smax Tailieu RAG Chat

**Ngày tạo:** 23/02/2026  
**Tác giả:** AI Assistant  
**Phiên bản:** 1.0

---

## 1. Tổng quan Project

### 1.1. Mô tả
**Smax-tailieu-rag-chat** là một nền tảng tài liệu (Documentation Platform) đa ngôn ngữ (Tiếng Việt/Tiếng Anh) với tính năng AI Chat sử dụng RAG (Retrieval-Augmented Generation). Project được thiết kế để tích hợp Outline CMS với Supabase, cho phép:

- **Quản lý tài liệu**: Đồng bộ tự động từ Outline CMS
- **Tìm kiếm ngữ nghĩa**: Sử dụng Vector Search với pgvector
- **AI Chat**: Trả lời câu hỏi dựa trên nội dung tài liệu (RAG)

### 1.2. Tech Stack

| Thành phần | Công nghệ | Phiên bản |
|------------|-----------|-----------|
| Framework | Next.js (App Router) | 16.0.10 |
| Styling | Tailwind CSS | 4.1.9 |
| UI Components | shadcn/ui + Radix UI | - |
| Database | Supabase (PostgreSQL) | - |
| Vector Search | pgvector extension | - |
| AI/ML | OpenRouter API (Chat) + Google Gemini (Embedding) | - |
| Chat Model | DeepSeek R1 (via OpenRouter) | deepseek-r1-0528:free |
| Embedding Model | Google Gemini embedding-001 | models/gemini-embedding-001 |
| CMS Source | Outline (Headless CMS) | - |
| Icons | Lucide React | 0.454.0 |
| Fonts | Geist Sans & Mono | - |

---

## 2. Kiến trúc Hệ thống

### 2.1. Sơ đồ luồng dữ liệu

```
┌─────────────────┐     Webhook      ┌──────────────────┐
│  Outline CMS    │ ──────────────── │  Next.js API     │
│  (Content)      │  documents.      │  /api/webhooks/  │
│                 │  publish/update  │  outline         │
└─────────────────┘                  └────────┬─────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     │                        │                        │
                     ▼                        ▼                        ▼
            ┌────────────────┐      ┌─────────────────┐      ┌────────────────┐
            │  Parse &       │      │  Text Chunking  │      │  Generate      │
            │  Validate      │      │  (1000 chars,   │      │  Embeddings    │
            │  Language      │      │   200 overlap)  │      │  (OpenRouter)  │
            └───────┬────────┘      └────────┬────────┘      └───────┬────────┘
                    │                        │                       │
                    └────────────────────────┼───────────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │    Supabase     │
                                    │  ┌───────────┐  │
                                    │  │ documents │  │
                                    │  └───────────┘  │
                                    │  ┌───────────┐  │
                                    │  │ document_ │  │
                                    │  │ sections  │  │
                                    │  │ + vector  │  │
                                    │  └───────────┘  │
                                    └────────┬────────┘
                                             │
                     ┌───────────────────────┼───────────────────────┐
                     │                       │                       │
                     ▼                       ▼                       ▼
            ┌────────────────┐      ┌─────────────────┐      ┌────────────────┐
            │  Frontend      │      │  Vector Search  │      │  AI Chat       │
            │  Docs Pages    │      │  (match_docs)   │      │  (RAG)         │
            │  /tai-lieu/    │      │                 │      │                │
            └────────────────┘      └─────────────────┘      └────────────────┘
```

### 2.2. Các thành phần chính

#### 2.2.1. Frontend (Next.js App Router)
- **Route**: `/tai-lieu/[lang]/[...slug]` - Trang tài liệu đa ngôn ngữ
- **Components**: 
  - `components/docs/` - Components hiển thị tài liệu
  - `components/layout/` - Sidebar, Topbar, Footer
  - `components/assistant/` - AI Assistant UI
  - `components/search/` - Command Palette

#### 2.2.2. Backend API Routes
- `/api/webhooks/outline` - Nhận webhook từ Outline CMS
- `/api/docs` - API danh sách tài liệu

#### 2.2.3. Database (Supabase)
- **documents**: Metadata tài liệu (title, slug, lang, content, path...)
- **document_sections**: Chunks + embeddings (vector 1536 chiều)

#### 2.2.4. AI Integration
- **Embedding**: `Google Gemini embedding-001` (768 dimensions) - cho vector search
- **Chat**: `deepseek/deepseek-r1-0528:free` via OpenRouter (RAG responses)

---

## 3. Cấu trúc Thư mục

```
Smax-tailieu-rag-chat/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── docs/                 # Docs API
│   │   │   ├── route.ts          # GET docs list
│   │   │   └── [...slug]/        # Dynamic doc pages
│   │   └── webhooks/
│   │       └── outline/
│   │           └── route.ts      # Outline webhook handler
│   ├── tai-lieu/                 # Documentation pages (VI/EN)
│   │   ├── [lang]/
│   │   │   ├── page.tsx          # Language home
│   │   │   └── [...slug]/        # Doc pages
│   │   ├── layout.tsx
│   │   └── loading.tsx
│   └── test-supabase/            # Connection test page
│
├── components/
│   ├── assistant/                # AI Assistant UI
│   ├── docs/                     # Doc-specific components
│   ├── layout/                   # Shell, sidebar, topbar
│   ├── search/                   # Command palette
│   └── ui/                       # shadcn/ui components
│
├── lib/
│   ├── docs/                     # Docs data & navigation
│   │   ├── nav.ts
│   │   ├── pages-en.ts           # English content (mock)
│   │   ├── pages-vi.ts           # Vietnamese content (mock)
│   │   ├── service.ts            # Data fetching service
│   │   └── utils.ts
│   ├── context/                  # React contexts
│   ├── i18n/                     # Internationalization
│   ├── docs.config.ts            # Site configuration
│   ├── embeddings.ts             # OpenRouter integration
│   ├── outline.ts                # Outline webhook parsing
│   ├── supabase-admin.ts         # Supabase admin client
│   └── syntax-highlight.tsx
│
├── utils/
│   └── supabase/                 # Supabase clients
│       ├── client.ts             # Browser client
│       ├── server.ts             # Server client
│       └── middleware-utils.ts
│
├── supabase/
│   └── migrations/
│       └── 20260213_init_schema.sql  # Database schema
│
├── docs/                         # AI Search implementation docs
├── template-docs/                # Template documentation
├── .env.local                    # Environment variables
├── package.json
└── README.md
```

---

## 4. Chi tiết Database Schema

### 4.1. Bảng `documents`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary Key (auto-generated) |
| `external_id` | `text` | ID từ Outline (unique) |
| `title` | `text` | Tiêu đề bài viết |
| `slug` | `text` | URL slug |
| `lang` | `varchar(2)` | Ngôn ngữ (`vi` hoặc `en`) |
| `path` | `text` | Đường dẫn đầy đủ |
| `parent_id` | `uuid` | ID của tài liệu cha |
| `content` | `text` | Nội dung Markdown gốc |
| `meta` | `jsonb` | Metadata khác (author, tags...) |
| `last_updated` | `timestamptz` | Thời gian cập nhật cuối |
| `created_at` | `timestamptz` | Thời gian tạo |

### 4.2. Bảng `document_sections`

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary Key |
| `document_id` | `uuid` | FK → documents.id (CASCADE DELETE) |
| `content` | `text` | Đoạn nội dung (chunk) |
| `embedding` | `vector(768)` | Vector embedding (Gemini embedding-001 dimension) |
| `token_count` | `int` | Số lượng token ước tính |

### 4.3. Hàm RPC `match_documents`

```sql
create or replace function match_documents (
  query_embedding vector(768),
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
```

### 4.4. Index & RLS

- **HNSW Index** cho vector similarity search
- **Row Level Security** enabled cho cả 2 bảng
- **Public read access** cho anonymous users

---

## 5. Trạng thái hiện tại (Phase 1)

### 5.1. Đã hoàn thành ✅

| Task | Status | File |
|------|--------|------|
| Database Schema | ✅ | `supabase/migrations/20260213_init_schema.sql` |
| Supabase Clients | ✅ | `utils/supabase/`, `lib/supabase-admin.ts` |
| Outline Webhook Handler | ✅ | `app/api/webhooks/outline/route.ts` |
| Outline Parsing Logic | ✅ | `lib/outline.ts` |
| Embedding & Chunking | ✅ | `lib/embeddings.ts` |
| OpenRouter Integration | ✅ | `lib/embeddings.ts` |
| Test Page | ✅ | `app/test-supabase/page.tsx` |
| Frontend Structure | ✅ | `app/tai-lieu/`, `components/` |

### 5.2. Cấu hình Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://docs-be.cdp.vn/mcp
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAi...

# Google Gemini API for Embeddings
GEMINI_API_KEY=AIzaSyAN56hJSwOY22eSV_UGNSj8w52gs73JmYQ
GEMINI_PROJECT_ID=755775831483
EMBEDDING_MODEL=models/gemini-embedding-001

# OpenRouter API for Chat (DeepSeek R1)
OPENROUTER_API_KEY=sk-or-v1-...
CHAT_MODEL=deepseek/deepseek-r1-0528:free

# Outline Webhook
OUTLINE_WEBHOOK_SECRET=ol_whs_...
OUTLINE_COLLECTION_VI_ID=zuLTJLz8pw
OUTLINE_COLLECTION_EN_ID=ZdqHDdX9ap
```

---

## 6. Các Phase tiếp theo

### Phase 2: Testing & Validation (Cần làm)
- [done] Test webhook với Outline thực tế
- [ ] Verify embedding generation qua Gemini
- [ ] Test vector search với `match_documents`

### Phase 3: Frontend Integration (Chưa bắt đầu)
- [ ] Cập nhật `lib/docs/service.ts` để fetch từ Supabase
- [ ] Update Sidebar để build tree từ database
- [ ] Implement dynamic routing từ slug

### Phase 4: Chat/RAG API (Chưa bắt đầu)
- [ ] Tạo `/api/chat` endpoint
- [ ] Implement RAG flow:
  1. Embedding câu hỏi
  2. Vector search trong document_sections
  3. Build context từ top-k results
  4. Gửi đến DeepSeek R1
  5. Stream response về client

### Phase 5: Production Ready
- [ ] Setup proper error handling
- [ ] Add logging & monitoring
- [ ] Implement re-sync endpoint
- [ ] Handle image URLs from Outline

---

## 7. Hướng dẫn chạy Project

### 7.1. Prerequisites
- Node.js 18+
- npm hoặc pnpm
- Supabase account
- OpenRouter API key

### 7.2. Installation

```bash
# Clone repository
cd /path/to/Smax-tailieu-rag-chat

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local với values thực

# Run development server
npm run dev
```

### 7.3. Database Setup

1. Tạo Supabase project
2. Enable `vector` extension
3. Run migration script:
```sql
-- Copy nội dung từ supabase/migrations/20260213_init_schema.sql
-- và chạy trong Supabase SQL Editor
```

### 7.4. Test Endpoints

```bash
# Test Supabase connection
open http://localhost:3000/test-supabase

# Test docs API
curl http://localhost:3000/api/docs

# Test webhook (cần ngrok cho local)
curl -X POST http://localhost:3000/api/webhooks/outline \
  -H "Content-Type: application/json" \
  -H "Outline-Signature: your-signature" \
  -d '{"event":"documents.publish","payload":{...}}'
```

---

## 8. Lưu ý quan trọng

### 8.1. Google Gemini API (Embeddings)
- **Embedding Model**: `models/gemini-embedding-001` - tạo vector 768 dimensions
- **Project ID**: `755775831483`
- **Dimension**: 768 (nhỏ hơn OpenAI's 1536, tiết kiệm storage)
- **Rate Limits**: Kiểm tra quota của Google Cloud project

### 8.2. OpenRouter API (Chat)
- **Chat Model**: `deepseek/deepseek-r1-0528:free` là model miễn phí, có thể có rate limits
- **API Key**: Được lưu trong `.env.local`, **KHÔNG** commit lên git
- **Usage**: Dùng cho RAG responses (không dùng cho embedding)

### 8.3. Outline Integration
- Webhook được trigger khi `documents.publish` hoặc `documents.update`
- Language được xác định từ Collection ID mapping
- Signature verification để bảo mật

### 8.4. Vector Search
- Embedding dimension: **768** (Gemini embedding-001)
- Similarity metric: Cosine similarity (`<=>` operator)
- HNSW index cho performance tốt
- Cần chạy migration `20260223_gemini_embedding.sql` để update dimension

---

## 9. Tài liệu tham khảo

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Outline API Documentation](https://www.getoutline.com/developers)

---

## 10. Kết luận

Project **Smax-tailieu-rag-chat** đang ở **Phase 1: Setup Supabase Database** với các thành phần cơ bản đã được implement:

1. ✅ Database schema với pgvector
2. ✅ OpenRouter integration cho AI/ML
3. ✅ Outline webhook handler
4. ✅ Embedding & chunking logic
5. ✅ Frontend structure

**Next Steps**: Testing và validate các components đã implement, sau đó tiến hành Phase 3 (Frontend Integration) và Phase 4 (Chat/RAG API).