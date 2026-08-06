-- ─────────────────────────────────────────────────────────────────────────────
-- Confirmed via information_schema (2026-08-06) that profiles, hearing_test_
-- results, quiz_sessions, noise_measurements and user_theme_unlocks all
-- already had a user_id/id foreign key to profiles/auth.users with
-- ON DELETE CASCADE from the original schema. Only quiz_question_progress
-- was missing one entirely — this is the one gap that needed fixing so that
-- deleting a user (F3, account deletion) actually cascades to ALL of their
-- data, not just most of it.
--
-- If this fails with a foreign key violation, it means quiz_question_progress
-- has rows whose user_id doesn't match any profiles.id (orphaned data) that
-- need cleaning up first:
--   select qp.user_id from quiz_question_progress qp
--   left join profiles p on p.id = qp.user_id
--   where p.id is null;
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.quiz_question_progress
  add constraint quiz_question_progress_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- Full cascade chain after this: auth.users → profiles →
--   {hearing_test_results, quiz_sessions, quiz_question_progress,
--    noise_measurements, user_theme_unlocks}
