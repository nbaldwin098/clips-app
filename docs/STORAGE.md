# Storage — what ships vs what does not

Honest map for the `clips` bucket and upload path. Do **not** rename the bucket or the `/clips` route.

## What works today

| Path | Behavior |
|------|----------|
| **Upload (iOS / desktop)** | Original file goes to Supabase Storage. No forced WebM. `ffmpeg.wasm` is behind `VITE_CLIENT_TRANSCODE` and defaults **off**. |
| **Public-link import** | Metadata + reference URL only. The remote file is **not** re-uploaded. Sign-in required. |
| **Play** | Public `getPublicUrl()` on bucket `clips`. Private *catalog* rows are owner-only (`0027`); objects with a public URL still load if you have the link. |
| **Delete** | `deleteCatalogItem({ intentional: true })` removes the catalog row and calls `deleteHostedMedia` for public / signed / authenticated Storage URLs. |
| **Limits (client)** | Clip 60s · video 24h · file abuse ceiling 2 GiB · images 12 MiB · MIME allowlist in `src/lib/mediaUpload.js`. |

## Migrations the owner must run

Run in the Supabase SQL editor **or** Admin → Setup (same SQL as `SETUP_SCRIPTS`):

1. **`0027_videos_visibility_rls_storage.sql`** — private `videos` rows are owner-only SELECT; re-asserts `clips` Storage policies (insert/update/delete only into `…/<uid>/…`).
2. **`0028_clips_bucket_limits.sql`** — `file_size_limit` 2 GiB + MIME allowlist on bucket `clips`.

`0003` still creates the public bucket. `0027`/`0028` tighten it. Until they run, production may still have the older “everyone can SELECT videos” policy.

## What we do not have

- **No server transcode farm.** There is no queue, worker, or rendition pipeline. Long-form stays the uploaded file. Do not flip `VITE_CLIENT_TRANSCODE` on phones.
- **No signed-URL-only private media.** Catalog `visibility=private` hides the row from other users; the Storage object is still world-readable if someone has the URL. Fixing that needs signed URLs + a playback proxy, not a UI toggle.
- **No double-store of the same blob.** Import does not fetch-and-reupload. Upload writes once. Delete is best-effort `storage.remove` (RLS: only the owner folder).

Related: `docs/INFRA.md` §5 (client wasm), `docs/DEPLOY_CHECKLIST.md`.
