### components-agent (URL references trong components):

**Files đã sửa:**
1. app/page.tsx
2. components/layout/sidebar.tsx
3. components/layout/mobile-nav.tsx
4. components/layout/topbar.tsx
5. components/layout/language-selector.tsx
6. components/search/command-palette.tsx
7. components/docs/breadcrumbs.tsx

**Changes chi tiết:**

1. **app/page.tsx**
   - `href="/tai-lieu/vi/quickstart"` → `href="/vi/quickstart"`
   - `href="/tai-lieu/vi/cli"` → `href="/vi/cli"`
   - `href="/tai-lieu/vi/web-editor"` → `href="/vi/web-editor"`
   - `href="/tai-lieu/vi/components"` → `href="/vi/components"`

2. **components/layout/sidebar.tsx** (SidebarItem function)
   - includes check: `'/tai-lieu/'` → `'/vi' || '/en'`
   - replace: `/\/tai-lieu\/(vi|en)/` → `/${lang}` (bỏ /tai-lieu/ prefix, chỉ giữ lang)
   - Active child check: `.replace("/tai-lieu",...)` → `.replace(/\/(vi|en)/,...)`
   - GIẢI THÍCH: Navigation data từ DB có href dạng `/vi/quickstart` sau middleware redirect. Logic cũ tìm `/tai-lieu/` prefix để add lang → bị thừa. Logic mới tìm `/vi` hoặc `/en` trong URL để swap language.

3. **components/layout/mobile-nav.tsx** (MobileSidebarItem function)
   - Tương tự sidebar.tsx - 3 occurrences: includes check, href replace, active child check
   - Đều bỏ `/tai-lieu/` prefix

4. **components/layout/topbar.tsx** (2 vị trí: desktop nav + mobile dropdown)
   - Desktop: `href.includes("/tai-lieu")` → `href.includes("/vi") || href.includes("/en")`
   - Desktop: `item.href.replace("/tai-lieu/vi",...)` → `item.href.replace(/\/(vi|en)/,...)`
   - Mobile dropdown: tương tự
   - Comment: `/tai-lieu/[lang]/...` → `/[lang]/...`

5. **components/layout/language-selector.tsx**
   - `pathname.includes("/tai-lieu/")` → `pathname.match(/\/(vi|en)/)`
   - `pathname.replace(/\/tai-lieu\/[a-z]{2}/, ...)` → `pathname.replace(/\/(vi|en)/, ...)`
   - GIẢI THÍCH: Khi đổi ngôn ngữ từ `/vi/quickstart` → `/en/quickstart`, chỉ cần replace `/(vi|en)` segment

6. **components/search/command-palette.tsx** (Quick Links section)
   - `/tai-lieu/${language}/quickstart` → `/${language}/quickstart`
   - `/tai-lieu/${language}/cli` → `/${language}/cli`

7. **components/docs/breadcrumbs.tsx**
   - `href="/tai-lieu/vi"` → `href="/vi"` (home link)

**Cross-check notes:**
- `components/layout/docs-shell.tsx` line 40: `'/tai-lieu/admin'` — **GIỮ NGUYÊN** vì đây là route path của Next.js App Router group (`app/tai-lieu/admin/`), không phải navigation link
- Backend/hook/service files (`lib/`, `hooks/`, `app/api/`) — **KHÔNG đổi** theo task spec, chỉ UI components
- RAG Chat (`app/api/chat/route.ts`) — **KHÔNG đổi** theo task spec
