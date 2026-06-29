-- ============================================================================
--  0005 — 사업장 브랜딩 (산출물 PDF 용)
--   - representative_name: 대표자 성명 (PDF 서명란/머리글)
--   - logo_url: 사업장 로고 이미지 URL (PDF 머리글에 표시, 선택)
-- ============================================================================
alter table public.workspaces add column if not exists representative_name text;
alter table public.workspaces add column if not exists logo_url text;
