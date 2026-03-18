-- ============================================
-- MODERATOR ROLE MIGRATION — PART 1
-- Run this ALONE first, then run Part 2
-- ============================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';

-- ✅ After this succeeds, run ADD_MODERATOR_ROLE_PART2.sql
