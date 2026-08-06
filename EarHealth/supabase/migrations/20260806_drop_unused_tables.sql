-- ─────────────────────────────────────────────────────────────────────────────
-- Remove tables confirmed dead by a full audit (see DATABASE_USAGE_REPORT.md):
-- zero references in client code (features/, app/, src/) AND zero references
-- in any Database Function or Trigger (checked in Supabase Dashboard →
-- Database → Functions / Triggers on 2026-08-06). noise_measurements is kept
-- deliberately (planned sound-meter history feature).
--
-- APPLIED: 2026-08-06 (via Supabase SQL Editor).
-- ─────────────────────────────────────────────────────────────────────────────

drop table if exists user_badges;
drop table if exists badges;
drop table if exists user_points_log;
drop table if exists quiz_session_answers;
