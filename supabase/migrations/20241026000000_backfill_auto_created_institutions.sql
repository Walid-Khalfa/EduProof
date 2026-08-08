-- Backfill: revoke institutions that were auto-created by certificate indexing
-- Migration: 20241026000000_backfill_auto_created_institutions.sql
--
-- Context: before the fix in server/routes/certificates.ts, institutions created
-- on the fly by POST /api/certificates/index inherited the DB default
-- status 'approved' (20240103000000). This meant any user could mint
-- certificates under an auto-created institution that the verify API then
-- reported as "verified" — a trust-chain hole.
--
-- Identification: the index route never sets did_uri, while the admin form
-- (Admin.tsx → POST /api/admin/institutions) explicitly sends it. Auto-created
-- rows are therefore: status = 'approved' AND did_uri IS NULL.
--
-- Caveat: an admin-created institution with an empty DID URI also matches and
-- will be revoked — that is the safe default. Re-approve it from the Admin
-- panel (one click).

UPDATE public.institutions
SET status = 'revoked'
WHERE status = 'approved'
  AND did_uri IS NULL;

NOTIFY pgrst, 'reload schema';
