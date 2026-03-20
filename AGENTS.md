### api-service-agent (lib + API routes):
- ĐÃ: lib/docs/service.ts, app/api/chat/route.ts, app/api/docs/search/route.ts
- Changes: Bỏ '/tai-lieu/' prefix khỏi URL construction (breadcrumbs, pager, search results, chat citations)
- LƯU Ý: KHÔNG sửa /api/chat endpoint body (RAG logic), chỉ sửa URL strings trong citations/text