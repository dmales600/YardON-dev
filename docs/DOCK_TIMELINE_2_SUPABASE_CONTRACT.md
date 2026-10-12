# Dock Timeline 2.0 — GitHub ↔ Supabase integration contract

Checked 2026-10-12 against Supabase project `YardON-dev` (ref `ldzwgdwzolbvjxyznlry`).

## Database compatibility

This PR only changes rendering/layout. No SQL migration or Edge Function deployment is required **for Dock Timeline 2.0 alone**. Existing `public.yardivo_announcements` columns:
- `announcement_id` (text), `appointment_date` (date), `appointment_time` (time)
- `warehouse`, `status`, `payload` (jsonb), `revision`, `deleted`, `updated_at`.

Existing frontend canonical announcements use `date`, `time`, `dock`, `supplier`, `pallets`, `status`. Preserve the established synchronization/mapping layer; the timeline must **not** introduce direct DB writes or a second source of truth.

Live read-only checks at review time: 136 active announcements; all 136 have date, time and a `payload.dock` field. All public tables have RLS enabled. 78 supplier deliveries are confirmed with no physical dock assigned — do not invent physical reservations for them.

## Release coupling

- Dock Timeline 2.0 (PR #12): frontend-only; Supabase remains unchanged.
- SMART review (PR #11): **separate release dependency**. Production `yardivo-ai-operations` v13 did not contain `preview_request` / `record_request_review` at inspection. Do not ship PR #11 frontend without compatible authenticated Edge Functions, deployment checks and role-based E2E QA.
- Maintain existing lateness categories and labels from `operationalPlanClass`, `operationalPlanStatus`, `yardivoMapDelayLabel` across sync.
- Verify drag/drop, multiple bookings in one slot, drag previews, reduced motion, scrolling, zoom and SMART highlighted cells on real browser before merging PR #12.

## Non-destructive Supabase regression query

```sql
SELECT count(*) AS total,
       count(*) FILTER (WHERE appointment_date IS NOT NULL) AS dated,
       count(*) FILTER (WHERE appointment_time IS NOT NULL) AS timed,
       count(*) FILTER (WHERE payload ? 'dock') AS dock_key_present
FROM public.yardivo_announcements
WHERE deleted = false;
```

All production database changes require a matching migration committed to GitHub, RLS/security review, non-destructive verification and coordinated function/frontend release. No schema changes were made for this PR.
