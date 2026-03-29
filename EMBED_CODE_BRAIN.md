# EMBED_CODE_BRAIN.md
## Mã Nhúng — Embeddable AI RAG Chat Widget

---

## 🔴 SECTION A — Context & Motivation
*(Agent: context-agent fill this)*

**Why this feature exists:**
The SmaxAI platform supports an embeddable AI RAG chat widget (`@smaxai/chat-widget` in `sdk/`). External websites (e.g., customer landing pages, partner portals) need a way to generate and configure the `<script>` embed code for this widget without touching code. An admin page (`/admin/embed-code`) serves this need.

**What problem it solves:**
- Partners/admins want to embed the chat widget on arbitrary websites pointing to the SmaxAI RAG knowledge base.
- They need to configure `apiBaseUrl` and `lang` per-site without a developer.
- The admin page generates the exact snippet, pre-filled with their desired values, and provides one-click copy.

**Target users:**
- SmaxAI internal admins managing partner integrations.
- Partner technical leads who need to embed the widget on their own domains.

**Success criteria:**
- Admin can configure `apiBaseUrl` and `lang` and see a live/refreshed embed snippet.
- One-click copy produces a working `<script>` snippet.
- Snippet matches exactly what the SDK (`sdk/src/widget.ts`) expects: loads `smaxai-chat.min.js` from `apiBaseUrl/sdk/` and calls `SmaxAIChat.init({...})`.
- CORS is correctly pre-configured in `lib/cors.ts` for allowed origins.

---

## 🔴 SECTION B — API Contract
*(Agent: api-agent fill this — READ ONLY, already known from exploration)*

### POST /api/chat
RAG chat endpoint with streaming text response. Implements query analysis, multi-query search, intent classification, and hybrid RAG.

**Request headers (widget sets automatically):**
```
Content-Type: application/json
```

**Request body:**
interface ChatRequest {
  query: string          // required — the user's question
  model?: string         // optional — allow overriding the AI model (e.g. 'model-router', 'gpt-4o-mini')
  lang?: 'vi' | 'en'     // optional, default: 'vi'
  history?: Array<{      // optional — conversation history
    role: 'user' | 'assistant'
    content: string
  }>
}
```

**Model Selection Logic (Smart Routing):**
The API automatically selects the best model if none is provided:
1. **Browser/Widget Requests**: If the request comes from a recognized origin (e.g., `smax.ai`, `cdp.vn`), it defaults to the system's standard chat model (configured via `CHAT_MODEL` env, typically `gpt-5-chat`).
2. **Direct API Requests**: If the request is a direct API call (e.g., via `x-api-key` in Postman/Curl), it defaults to `model-router` for advanced dynamic routing.
3. **Explicit Override**: Providing the `model` field in the request body overrides both defaults.

**Success response — HTTP 200, streaming `text/plain; charset=utf-8`:**
- SSE-like plain text stream; each chunk is a raw LLM text token.
- Protocol: raw text bytes (no `data:` prefix from the API; the widget handles both plain chunks and SSE `data:` lines — see `widget.ts` lines 625–649).
- Terminates with `controller.close()` when stream ends.
- CORS headers attached.

**Error responses — HTTP 4xx/5xx, `Content-Type: application/json`:**
```json
// 400 — missing query
{ "error": "Query is required" }

// 500 — OpenAI / upstream error
{
  "error": "OpenAI API Error",
  "message": "<upstream error message>"
}

// 500 — internal server error
{
  "error": "Internal server error",
  "message": "<error message>"
}
```

**Special behavior:**
- `intent === 'greeting'` → returns plain greeting text immediately (no RAG search).
- No search results → falls back to `match_threshold: 0.01, match_count: 20`.
- Conversation history filtered to last 4 messages to stay within token limits.

---

### GET /api/chat/session?user_id={string}
Retrieve persisted chat session for a given browser fingerprint user ID.

**Query params:** `user_id` (required)

**Success — HTTP 200:**
```json
{
  "success": true,
  "session": {
    "user_id": "string",
    "messages": [{ "id": "string", "role": "user|assistant", "content": "string", "isStreaming": false }],
    "metadata": {}
  }
}
```
If no session exists:
```json
{
  "success": true,
  "session": null,
  "message": "No session found for this user"
}
```

**Error — HTTP 400:** `{ "error": "user_id is required" }`
**Error — HTTP 500:** `{ "error": "<supabase error message>" }`

---

### POST /api/chat/session
Upsert (create or update) a chat session.

**Request headers:** `Content-Type: application/json`

**Request body:**
```typescript
{
  user_id: string                        // required
  messages: Array<{                      // required, non-empty array
    id?: string
    role: 'user' | 'assistant'
    content: string
    isStreaming?: boolean
  }>
  metadata?: Record<string, unknown>     // optional, defaults to {}
}
```

**Success — HTTP 200:**
```json
{
  "success": true,
  "session_id": "<uuid from upsert>"
}
```

**Error — HTTP 400:** `{ "error": "user_id is required" }` or `{ "error": "messages must be an array" }`
**Error — HTTP 500:** `{ "error": "<supabase error message>" }`

---

### DELETE /api/chat/session?user_id={string}
Delete a chat session (used by `widget.clearChat()`).

**Query params:** `user_id` (required)

**Success — HTTP 200:**
```json
{
  "success": true,
  "message": "Chat session cleared"
}
```

**Error — HTTP 400:** `{ "error": "user_id is required" }`
**Error — HTTP 500:** `{ "error": "<supabase error message>" }`

---

### Widget Streaming Protocol (client-side)
`widget.ts` (lines 617–650) handles two formats in the response body:
1. **SSE `data:` lines:** `data: {"choices":[{"delta":{"content":"..."}}]}`
2. **Raw text chunks:** plain text tokens appended directly.
The stream also checks for `[DONE]` sentinel to break early.

---

### SDK Config Interface
```typescript
// sdk/src/widget.ts — WidgetConfig
interface WidgetConfig {
  apiBaseUrl?: string              // default: 'https://docs.cdp.vn'
  lang?: 'vi' | 'en'              // default: 'vi'
  onOpen?: () => void             // default: no-op
  onClose?: () => void            // default: no-op
}

// sdk/fingerprint.ts — user_id derivation
// SHA-256 hash of canvas fingerprint + navigator properties → stable per-browser user_id
// Stored in localStorage; cleared by clearUserId()
```

---

### CORS Configuration
**File:** `lib/cors.ts`

**Allowed origins:**
```typescript
const ALLOWED_ORIGINS = [
  'https://smax.ai',
  'https://www.smax.ai',
  'https://smax.ai',   // duplicate (intentional)
  'https://biz.smax.ai',
  'https://docs.cdp.vn',
  'http://localhost:3000',
  'http://localhost:3001',
]
// + wildcard: any origin ending with '.smax.ai'
```

**CORS headers set on all responses:**
```
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
Access-Control-Allow-Origin: <matching origin>
Access-Control-Allow-Credentials: true   (only if origin matched)
```

**Preflight:** Both `POST /api/chat` and all `/api/chat/session` routes export `OPTIONS` handlers that call `handleCorsPreflightRequest(origin)`.

---

## 🔴 SECTION C — SDK Widget Architecture
*(Agent: sdk-agent fill this — READ ONLY, already known from exploration)*

### Source files
| File | Purpose |
|------|---------|
| `sdk/src/index.ts` | Entry point — exports `SmaxAIChat` singleton API; assigns `window.SmaxAIChat` |
| `sdk/src/widget.ts` | `SmaxAIChatWidget` class — all DOM rendering, event binding, API calls, streaming |
| `sdk/fingerprint.ts` | Browser fingerprint → stable SHA-256 `user_id` (localStorage-backed) |
| `sdk/README.md` | Public SDK docs with usage examples |

---

### SDK Entry (`sdk/src/index.ts`)

```typescript
import { SmaxAIChatWidget, WidgetConfig } from './widget'

let widgetInstance: SmaxAIChatWidget | null = null

const SmaxAIChat = {
  init: (config: WidgetConfig = {}) => {
    if (widgetInstance) widgetInstance.destroy()
    widgetInstance = new SmaxAIChatWidget(config)
    return widgetInstance
  },
  get widget() { return widgetInstance }
}

// Assigned immediately so synchronous script-tag loads work
if (typeof window !== 'undefined') {
  (window as any).SmaxAIChat = SmaxAIChat
}

// Auto-init via <script data-auto-init>
if (document.currentScript?.hasAttribute('data-auto-init')) {
  document.addEventListener('DOMContentLoaded', () => SmaxAIChat.init())
}
```

---

### SDK Script URL (build output)
```
{apiBaseUrl}/sdk-dist/smaxai-chat.min.js
```
- File nằm tại `public/sdk-dist/smaxai-chat.min.js` → Next.js serve tự động qua `/sdk-dist/`
- Build từ `sdk/` directory qua `esbuild` (IIFE bundle — no dependencies at runtime)
- Các output files:
  - `sdk/dist/smaxai-chat.min.js` — source build (local dev)
  - `public/sdk-dist/smaxai-chat.min.js` — production build (served by Next.js)
  - `sdk-dist/smaxai-chat.min.js` — Netlify deployment

---

### Embed Snippet
The admin page generates exactly this snippet:

```html
<!-- SmaxAI Chat Widget -->
<script src="{apiBaseUrl}/sdk-dist/smaxai-chat.min.js"></script>
<script>
  SmaxAIChat.init({
    apiBaseUrl: '{apiBaseUrl}',
    lang: '{lang}'
  });
</script>
```

For auto-init mode:
```html
<script src="{apiBaseUrl}/sdk/smaxai-chat.min.js" data-auto-init></script>
```

---

### WidgetConfig Interface
```typescript
// sdk/src/widget.ts
export interface WidgetConfig {
  apiBaseUrl?: string          // default: 'https://docs.cdp.vn'
  lang?: 'vi' | 'en'          // default: 'vi'
  onOpen?: () => void         // called when panel opens
  onClose?: () => void        // called when panel closes
}

// Defaults applied in constructor:
const DEFAULT_CONFIG: Required<WidgetConfig> = {
  apiBaseUrl: 'https://docs.cdp.vn',
  lang: 'vi',
  onOpen: () => {},
  onClose: () => {}
}
```

---

### Widget Instance API
```javascript
SmaxAIChat.init(cfg)          // init or re-init singleton; returns widget instance
SmaxAIChat.widget              // getter — current SmaxAIChatWidget instance (or null)

widget.open()                  // open panel, focus input, render messages
widget.close()                 // close panel
widget.toggle()               // open/close based on current state
widget.clearChat()            // clear in-memory messages, reset fingerprint, DELETE /api/chat/session
widget.destroy()             // remove DOM (`#smaxai-chat-widget`) + injected `<style id="smaxai-styles">`
```

---

### DOM Structure (injected into `document.body`)
```
#smaxai-chat-widget
  .smaxai-widget
    button.smaxai-trigger          ← floating FAB, bottom-right, gradient purple
    div.smaxai-panel              ← 400×600px panel, slides up on .open
      div.smaxai-header           ← title + [Clear] + [×] buttons
      div.smaxai-messages         ← scrollable message list
        div.smaxai-empty          ← empty state (shown when no messages)
        div.smaxai-message.user   ← right-aligned, purple bubble
        div.smaxai-message.assistant ← left-aligned, gray bubble + spinner
      div.smaxai-input-area      ← input + send button
```

All styles injected dynamically via a single `<style id="smaxai-styles">` tag (deduplicated by ID check). Dark mode via `@media (prefers-color-scheme: dark)`.

---

### Data Flow (send message)
1. `sendMessage()` → `POST /api/chat` with `{ query, lang, history: this.messages.slice(-8,-2) }`
2. `response.body.getReader()` streams tokens.
3. Both SSE `data:` lines and raw text chunks are handled.
4. Tokens appended to `assistantMessage.content` live → `renderMessages()` called per chunk.
5. On stream end / `[DONE]` → `saveHistory()` → `POST /api/chat/session`.
6. History loaded on init via `GET /api/chat/session?user_id=...` before first render.

---

### Fingerprint & Session (`sdk/fingerprint.ts`)
- Computes SHA-256 of canvas fingerprint + `navigator.userAgent` + `screen.width×height`.
- Result stored in `localStorage` as `smaxai_user_id`.
- `getUserId()` returns cached value or computes + stores.
- `clearUserId()` removes from localStorage; called by `widget.clearChat()` to reset identity.

---

### Known limitations of current SDK
- **No Markdown rendering** — all content passed through `escapeHtml()`; no bold/code/lists rendered.
- **No thinking toggle** — `[THINKING]...[/THINKING]` block is stripped silently by LLM; no user-visible toggle.
- **History sent limit: 6 messages** — `this.messages.slice(-8, -2)` = last 6 messages sent as `history`.
- **No user_id override** — fingerprint only; cannot pass external user IDs.
- **No per-site RAG filter** — `match_documents` RPC searches the entire KB; no domain/site partitioning.
- **Widget ID collision** — container ID is hardcoded as `smaxai-chat-widget`; multiple instances on same page would collide.

---

## 🔴 SECTION D — Embed Code Page Design
*(Agent: design-agent fill this)*

### Route
`/admin/embed-code` → `app/(docs)/admin/embed-code/page.tsx`

### Page Layout

Follows the same 2-column grid card pattern as `insights/page.tsx`. Wrapped in the existing admin sidebar layout (`admin/layout.tsx`). Sidebar link added for the new route.

```
<AdminSidebar>                             ← existing layout.tsx shell
  <main class="max-w-7xl mx-auto">
    <div class="space-y-8">

      {/* Page header */}
      <div>
        <h1 class="text-3xl font-bold">Mã Nhúng</h1>
        <p class="text-muted-foreground mt-2">
          Tạo mã nhúng widget AI Chat cho website của bạn
        </p>
      </div>

      {/* 2-column grid: Form (left) | Preview (right) */}
      <div class="grid gap-6 lg:grid-cols-2">

        {/* LEFT — Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Cấu hình</CardTitle>
            <CardDescription>
              Thiết lập các thông số cho widget trước khi tạo mã nhúng.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* apiBaseUrl */}
            <div class="space-y-2">
              <Label htmlFor="apiBaseUrl">API Base URL</Label>
              <Input
                id="apiBaseUrl"
                type="url"
                placeholder="https://docs.cdp.vn"
                defaultValue="https://docs.cdp.vn"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
              />
              <p class="text-xs text-muted-foreground">
                Địa chỉ gốc của API. Widget sẽ gọi đến endpoint này.
              </p>
            </div>

            {/* lang */}
            <div class="space-y-2">
              <Label htmlFor="lang">Ngôn ngữ</Label>
              <Select value={lang} onValueChange={(v) => setLang(v as 'vi' | 'en')}>
                <SelectTrigger id="lang">
                  <SelectValue placeholder="Chọn ngôn ngữ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
              <p class="text-xs text-muted-foreground">
                Ngôn ngữ mặc định của widget. Ảnh hưởng đến prompt và phản hồi.
              </p>
            </div>

          </CardContent>
        </Card>

        {/* RIGHT — Live Preview + Copy */}
        <Card>
          <CardHeader>
            <CardTitle>Xem trước</CardTitle>
            <CardDescription>
              Mã nhúng cập nhật theo thời gian thực khi bạn thay đổi cấu hình.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Code block — styled <pre>, no shiki */}
            <div class="relative rounded-lg border border-border bg-muted/40 overflow-hidden">
              <pre class="p-4 text-sm overflow-x-auto max-h-[320px] overflow-y-auto font-mono">
                <code dangerouslySetInnerHTML={{ __html: highlightedCode || escapeHtml(embedCode) }} />
              </pre>
            </div>

            {/* Copy button */}
            <Button
              variant={copied === 'copied' ? 'secondary' : 'default'}
              className="w-full gap-2"
              onClick={handleCopy}
            >
              {copied === 'copied' ? (
                <>
                  <Check className="h-4 w-4" />
                  Đã sao chép!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Sao chép mã nhúng
                </>
              )}
            </Button>

            <p class="text-xs text-muted-foreground text-center">
              Dán mã này vào thẻ <code class="bg-muted px-1 py-0.5 rounded text-foreground">&lt;head&gt;</code> hoặc cuối thẻ <code class="bg-muted px-1 py-0.5 rounded text-foreground">&lt;/body&gt;</code> của website bạn.
            </p>

          </CardContent>
        </Card>

      </div>

      {/* Deployment instructions card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Hướng dẫn triển khai
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <ol class="list-decimal list-inside space-y-1">
            <li>Copy mã nhúng bên trên bằng nút <strong class="text-foreground">Sao chép mã nhúng</strong></li>
            <li>Dán vào thẻ <code class="bg-muted px-1 py-0.5 rounded text-foreground">&lt;head&gt;</code> hoặc trước <code class="bg-muted px-1 py-0.5 rounded text-foreground">&lt;/body&gt;</code> trên trang web của bạn</li>
            <li>Đảm bảo domain của bạn được cấu hình trong danh sách CORS allowed origins (kiểm tra <code class="bg-muted px-1 py-0.5 rounded text-foreground">lib/cors.ts</code>)</li>
            <li>Tải lại trang — widget sẽ xuất hiện ở góc dưới bên phải màn hình</li>
          </ol>
        </CardContent>
      </Card>

    </div>
  </main>
</AdminSidebar>
```

---

### Form Fields

| Field ID | UI Component | Default | Validation | Description |
|----------|-------------|---------|------------|-------------|
| `apiBaseUrl` | `Input` type=url | `https://docs.cdp.vn` | Must be a valid URL | Root API URL; widget loads `smaxai-chat.min.js` from `{apiBaseUrl}/sdk/` and sends requests here |
| `lang` | `Select` | `vi` | One of `vi` \| `en` | Default language sent as `lang` in POST /api/chat body |

**No server action needed** — all state is local to the `'use client'` component. Config is consumed purely client-side to derive the embed snippet string.

---

### Embed Code Snippet Format (generated)

```typescript
function buildSnippet(sdkScriptSrc: string, apiBaseUrl: string, lang: 'vi' | 'en'): string {
  return `<script src="${sdkScriptSrc}"></script>
<script>
  SmaxAIChat.init({
    apiBaseUrl: '${apiBaseUrl}',
    lang: '${lang}'
  });
</script>`
}
```

Example output with defaults (sdkScriptSrc = `{apiBaseUrl}/sdk-dist/smaxai-chat.min.js`, apiBaseUrl = `https://docs.cdp.vn`, lang = `vi`):
```html
<script src="https://docs.cdp.vn/sdk-dist/smaxai-chat.min.js"></script>
<script>
  SmaxAIChat.init({
    apiBaseUrl: 'https://docs.cdp.vn',
    lang: 'vi'
  });
</script>
```

---

### Real-Time Preview Behavior

- The embed code preview re-renders **on every keystroke / change** — no debounce needed (pure string derivation).
- Both form fields update the preview independently; no interdependencies.
- Initial preview pre-filled from `defaultValue` on component mount.

```typescript
const embedCode = useMemo(() => buildSnippet(apiBaseUrl, lang), [apiBaseUrl, lang])
```

---

### Copy Button UX

State machine:
1. **Idle** → icon: `Copy`, label: "Sao chép mã nhúng"
2. **On click** → `navigator.clipboard.writeText(embedCode)`
3. **On success** → icon: `Check`, label: "Đã sao chép!", `toast.success(...)`
4. **After 2000 ms** → auto-reset to Idle

```typescript
const [copied, setCopied] = useState<'idle' | 'copied'>('idle')

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(embedCode)
    setCopied('copied')
    toast.success('Đã sao chép mã nhúng!')
    setTimeout(() => setCopied('idle'), 2000)
  } catch {
    toast.error('Không thể sao chép. Vui lòng thử lại.')
  }
}
```

No `Loader2` spinner needed — the copy operation is near-instant. If the clipboard API fails (insecure context, browser permissions denied), catch the error and call `toast.error`.

---

### Syntax Highlighting Approach

**Decision: Simple styled `<pre>` + `escapeHtml()` utility** — NOT shiki.

Rationale: The embed snippet is a fixed-format HTML/JS string with only 2 variable slots. Using shiki adds bundle overhead and SSR/hydration complexity for negligible benefit in this context.

The `<pre>` block is styled with:
- `bg-muted/40` background
- `rounded-lg border border-border`
- `overflow-x-auto max-h-[320px] overflow-y-auto` for scroll on mobile
- `font-mono` on `<code>`
- HTML entities escaped via a simple inline helper:

```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```

> **Note:** shiki 3.21.0 is available in the project. If future requirements demand per-token coloring (e.g., for a "raw code" view toggle), `codeToHtml()` from `shiki` can be used via dynamic import. For the initial implementation, plain styled `<pre>` is sufficient and avoids any SSR/hydration complexity.

---

### All UI States

| State | Trigger | Visual |
|-------|---------|--------|
| **Default** | Page load | Form pre-filled with defaults; preview shows default snippet; copy button shows `Copy` icon |
| **Editing** | User types | Preview re-renders instantly via `useMemo`; no other UI change |
| **Copied** | `navigator.clipboard.writeText` succeeds | Button: `Check` icon + "Đã sao chép!"; `toast.success` appears; auto-resets after 2 s |
| **Copy failed** | Clipboard API throws | Button stays idle; `toast.error('Không thể sao chép. Vui lòng thử lại.')` |
| **Mobile** | Viewport < `lg` | 2-column grid collapses to single column stack |

---

### Component Structure

```
app/(docs)/admin/embed-code/
└── page.tsx        ← 'use client', all state + JSX inline (P0)

Optional P1 extractions (defer):
app/(docs)/admin/embed-code/_components/
├── EmbedForm.tsx         ← extracts form fields
└── EmbedPreview.tsx      ← extracts <pre> + copy button
```

All components at P0 use **existing** shadcn/ui primitives from `@/components/ui/`:
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `Button`
- `Input`
- `Label`
- `Select`, `SelectTrigger`, `SelectContent`, `SelectValue`, `SelectItem`

No new UI components need to be created for P0.

---

## 🔴 SECTION E — Implementation File Map
*(Agent: files-agent fill this)*

| # | File | Action | Priority | Notes |
|---|------|--------|----------|-------|
| 1 | `app/(docs)/admin/embed-code/page.tsx` | **CREATE** | **P0** | Main and only file needed. `'use client'`, contains all state and JSX. |
| 2 | `app/(docs)/admin/layout.tsx` | **MODIFY** | **P0** | Add `<Link href="/admin/embed-code">` with `Code2` icon to sidebar `<nav>`. Follows existing nav pattern (pathname check, `cn()` class, `h-4 w-4` icon). |
| 3 | `app/(docs)/admin/embed-code/_components/EmbedForm.tsx` | CREATE (optional) | P1 | Extract form fields. Not needed for P0. |
| 4 | `app/(docs)/admin/embed-code/_components/EmbedPreview.tsx` | CREATE (optional) | P1 | Extract `<pre>` + copy button. Not needed for P0. |

### Dependencies

```
layout.tsx (sidebar nav)              → requires: embed-code/page.tsx to exist (no hard dep, just nav link)
embed-code/page.tsx                   → requires: no new files
  Uses: @/components/ui/card, button, input, label, select
  Uses: lucide-react (Code2, Copy, Check, Info)
  Uses: sonner toast
  Uses: react (useState, useMemo)
```

### No other files need modification.

- No new server actions — this page has no data fetching.
- No new API routes — the SDK endpoints already exist.
- No Supabase access — purely local client state.
- No chart components — recharts not used.
- No shiki usage for initial implementation.

### Suggested Implementation Order

1. **Modify `layout.tsx`** — add sidebar nav link first so the page is discoverable during development.
2. **Create `embed-code/page.tsx`** — implement full UI with form, preview, copy button, toast.
3. **Test** — verify sidebar link works, form updates preview, copy button copies correct snippet.

---

## 🔴 SECTION F — Tech Stack Notes
*(Agent: tech-agent fill this)*

### shiki 3.21.0 — NOT USED for initial implementation

shiki 3.21.0 is installed (`"shiki": "3.21.0"` in `package.json`) but **should not be used for the initial implementation**. Rationale:
- The embed snippet is a static 2–3 line HTML/JS string. The performance and aesthetic gain from per-token highlighting is negligible.
- shiki's `codeToHtml()` requires async initialization of a language registry — adds SSR/hydration complexity for no meaningful user benefit.
- A simple `escapeHtml()` + styled `<pre>` achieves clean, readable output with zero extra overhead.

Future P1 enhancement: add a "syntax highlighted" toggle using `codeToHtml('html', { lang: 'html' })` from shiki if product requirements call for it.

### sonner `^1.7.4` — YES, use for toast

Already in project (`"sonner": "^1.7.4"`). Usage:
```typescript
import { toast } from 'sonner'
// toast.success('Đã sao chép mã nhúng!')
// toast.error('Không thể sao chép. Vui lòng thử lại.')
```
Pattern matches `login/page.tsx` and `admin.ts` error handling already in the codebase.

### lucide-react `^0.454.0` — icons needed

Already in project (`"lucide-react": "^0.454.0"`). Icons needed:

| Icon | Usage |
|------|-------|
| `Code2` | Sidebar nav link for the Embed Code page (matches `TrendingUp` for Insights, `BarChart3` for Analytics, etc.) |
| `Copy` | Copy button — idle state |
| `Check` | Copy button — copied/success state |
| `Info` | Deployment instructions card title |

All four are standard lucide icons — no custom SVG needed.

### Existing UI components used

All from `@/components/ui/` — already in the project:

| Component | Import path |
|-----------|-------------|
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` | `@/components/ui/card` |
| `Button` | `@/components/ui/button` |
| `Input` | `@/components/ui/input` |
| `Label` | `@/components/ui/label` |
| `Select`, `SelectTrigger`, `SelectContent`, `SelectValue`, `SelectItem` | `@/components/ui/select` |

Check if `Select` components exist — if `Select` is not in `@/components/ui/select`, fall back to a simple `<select className="...">` HTML element styled with `w-full border rounded-md px-3 py-2 text-sm`.

### Other packages

- `recharts` — **N/A** for this feature (no charts)
- `react-hook-form` / `zod` — **N/A** (form is simple enough with plain `useState` + no server validation needed)
- `shiki` — available but deferred per above

### Tailwind CSS 4

The project uses Tailwind CSS 4 (`"tailwindcss": "^4.1.9"`). All styling uses standard utility classes. No CSS custom properties or `tailwind.config.js` changes needed for this page.

### No new dependencies needed.

---

## 🔴 SECTION G — Verification & Testing
*(Agent: qa-agent fill this after all others done)*

### Test Cases

| # | Scenario | Pre-condition | Steps | Expected Result |
|---|----------|--------------|-------|-----------------|
| TC-01 | **Page load — default state** | User visits `/admin/embed-code` | Load page | Form pre-filled with `apiBaseUrl = https://docs.cdp.vn`, `lang = vi` (default Select option visible); preview shows default snippet with both defaults; copy button shows `Copy` icon + "Sao chép mã nhúng" |
| TC-02 | **Page load — sidebar nav** | User is logged in as admin | Click "Mã Nhúng" in sidebar | Navigates to `/admin/embed-code`; URL updates; page renders correctly |
| TC-03 | **Form interaction — apiBaseUrl field** | Page loaded | Type `https://partner.example.com` in apiBaseUrl field | Preview updates instantly (no debounce) to show snippet with new URL; `<script src="…">` line reflects new value |
| TC-04 | **Form interaction — lang Select** | Page loaded | Open Select, pick `English (en)` | Preview updates; `lang: 'vi'` in snippet changes to `lang: 'en'` |
| TC-05 | **Form interaction — both fields changed** | Page loaded | Change apiBaseUrl to `https://biz.smax.ai` AND lang to `en` | Preview shows both changes simultaneously in same snippet |
| TC-06 | **Copy button — success** | Page loaded with defaults | Click "Sao chép mã nhúng" | Button transitions to `Check` icon + "Đã sao chép!"; sonner toast appears with message "Đã sao chép mã nhúng!"; after 2000 ms button resets to idle |
| TC-07 | **Copy button — clipboard denied (HTTP/insecure context)** | Page served over HTTP (e.g., `http://localhost:3000`) OR browser clipboard permissions denied | Click copy button | Button stays idle (no visual change); sonner `toast.error('Không thể sao chép. Vui lòng thử lại.')` appears; no crash |
| TC-08 | **URL field — invalid URL** | Page loaded | Type `not-a-url` in apiBaseUrl | Input shows browser-native validation error OR type="url" prevents submission; no JS crash |
| TC-09 | **Mobile viewport — responsive collapse** | Viewport width < `lg` (768 px) | Resize browser or open DevTools mobile mode | 2-column grid collapses to single column; form card stacks above preview card; both readable without horizontal scroll |
| TC-10 | **Mobile — copy works** | Viewport < `lg` | Change lang to `en`, tap copy | Same success behavior as TC-06 (button state change + toast) |
| TC-11 | **Snippet format — matches SDK expectation** | Any config | Set apiBaseUrl=`https://docs.cdp.vn`, lang=`vi`, copy | Snippet format exactly: `<script src="https://docs.cdp.vn/sdk/smaxai-chat.min.js"></script>\n<script>\n  SmaxAIChat.init({\n    apiBaseUrl: 'https://docs.cdp.vn',\n    lang: 'vi'\n  });\n</script>` — matches `widget.ts` WidgetConfig expectations |
| TC-12 | **Snippet — auto-init attribute variant** | — | — | *(Manual test)* When `data-auto-init` is added to script tag in generated snippet, widget auto-initializes without explicit `SmaxAIChat.init()` call |

### Edge Cases

| # | Edge Case | Risk | Expected Behavior |
|---|-----------|------|-------------------|
| EC-01 | **`navigator.clipboard` not available** (older browsers, HTTP context, browser flags) | Copy silently fails | `try/catch` in `handleCopy` catches `DOMException`; `toast.error` shown; no JS error thrown to user |
| EC-02 | **`navigator.clipboard` permission denied** | Copy rejected by browser | Same as EC-01 — caught and shown as toast error |
| EC-03 | **SDK URL 404** (`https://{apiBaseUrl}/sdk-dist/smaxai-chat.min.js` does not exist) | Widget script fails to load silently | Widget never mounts; no chat UI appears on host page; admin page itself is unaffected. **Mitigation:** partner must ensure the SDK bundle is deployed at `{apiBaseUrl}/sdk-dist/smaxai-chat.min.js` (Next.js serves files from `public/` at root path). Production build: run `cp sdk/dist/smaxai-chat.min.js public/sdk-dist/` or use Netlify output at `sdk-dist/`. |
| EC-04 | **CORS origin not allowed** — widget on a domain not in `lib/cors.ts` | Browser blocks API response; chat fails | Widget shows error in chat panel (SDK catches fetch error in `loadHistory`); the embed-code admin page is unaffected. **Mitigation:** partner domain must be added to `ALLOWED_ORIGINS` in `lib/cors.ts` |
| EC-05 | **CORS preflight failure** — `OPTIONS` not handled | Browser sends preflight; API returns 405 | Handled: all chat API routes export `OPTIONS` that calls `handleCorsPreflightRequest(origin)` |
| EC-06 | **Empty apiBaseUrl** | User clears the URL field | Input shows empty; preview shows `src=""`; widget would fail on host page; no crash on admin page |
| EC-07 | **Widget `destroy()` called multiple times** | — | SDK `destroy()` removes `#smaxai-chat-widget` element and `style#smaxai-styles`; subsequent calls are no-ops (null checks in place) |
| EC-08 | **Multiple `SmaxAIChat.init()` calls** | Admin copies snippet, host page already has auto-init script | SDK re-initializes: `if (widgetInstance) widgetInstance.destroy()` before creating new instance — prevents double injection |
| EC-09 | **Concurrent copy attempts** | User double-clicks rapidly | `handleCopy` is synchronous up to the `await`; second click during clipboard operation sets `copied` state again — harmless |
| EC-10 | **`widget.clearChat()` vs `widget.destroy()`** | User uses SDK API | `clearChat()` resets fingerprint + clears session via DELETE API; `destroy()` removes DOM; admin page copy functionality is unaffected by either |

### Browser Compatibility

The widget (SDK) and the admin page have slightly different requirements:

#### Admin Page (`/admin/embed-code`)
| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 80+ | Uses standard Clipboard API, React 18, Next.js App Router |
| Firefox | 75+ | Same |
| Safari | 14+ | Same |
| Edge | 80+ | Same |

#### SDK Widget (host page embedding)
Per `sdk/README.md` Browser Support section:

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 60+ | Clipboard API available, Fetch streaming available |
| Firefox | 55+ | Same |
| Safari | 12+ | Same |
| Edge | 79+ | Same |

> **Note:** The README says Chrome 60+, Firefox 55+, Safari 12+, Edge 79+. These are slightly older than what Section B/C implies. For the QA scope of the embed-code admin page, test against **Chrome 80+, Firefox 75+, Safari 14+, Edge 80+** to cover all modern admin users. Partner sites embedding the widget should be aware that the widget itself supports down to Chrome 60 / Firefox 55 / Safari 12 / Edge 79.

#### Cross-Origin Isolation
- Widget on partner site → API calls to SmaxAI backend must pass CORS checks
- `https://docs.cdp.vn` origin is always allowed
- Partner domains must be added to `ALLOWED_ORIGINS` in `lib/cors.ts`
- HTTP origins (e.g., partner staging on `http://`) are **not** allowed in production CORS list (credentials + wildcard incompatible); recommend HTTPS for all production partners

### QA Sign-off Checklist

**Before marking implementation done, verify all of the following:**

- [ ] TC-01: Default state — apiBaseUrl pre-filled, lang defaults to `vi`
- [ ] TC-03: apiBaseUrl change updates preview instantly
- [ ] TC-04: lang Select change updates preview
- [ ] TC-06: Copy success shows `toast.success` + button state change
- [ ] TC-07: Copy failure (insecure/HTTP context) shows `toast.error`
- [ ] TC-09: Layout collapses to single column on mobile viewport
- [ ] TC-11: Generated snippet format matches SDK `widget.ts` expectations exactly
- [ ] CORS: New partner domain added to `lib/cors.ts` `ALLOWED_ORIGINS` before deployment
- [ ] SDK: `smaxai-chat.min.js` is deployed and accessible at `{apiBaseUrl}/sdk/` before partner goes live
- [ ] No TypeScript/ESLint errors on the new `embed-code/page.tsx`
- [ ] No new bundle size regression (page uses existing shadcn primitives, no new deps)

---

## ✅ COMPLETED CHECKLIST
*(QA agent fills this after cross-check)*

- [x] Section A complete
- [x] Section B complete
- [x] Section C complete
- [x] Section D complete
- [x] Section E complete
- [x] Section F complete
- [ ] Section G complete
- [ ] All agents done
- [ ] Ready to implement
