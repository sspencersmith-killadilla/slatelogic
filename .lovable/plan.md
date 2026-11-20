# AI Storyboarding (optional)

## What the user gets
- A new **Storyboard** tab on each production, next to Script / Costs / Schedule.
- Off by default. A simple switch "Use AI storyboarding" turns it on per production; nothing is sent to AI unless it's on.
- For each scene: a card with scene number, slug line and synopsis, plus a **Generate frames** button that makes 1–3 sketch-style frames (pick count). Optional style choice: Pencil sketch (default), Ink & wash, Color comic.
- Each frame can be regenerated, deleted, or given a short shot note (e.g. "WIDE – Sintel enters the market"). The AI also suggests a shot type and short caption per frame.
- "Generate all missing" button with progress, stoppable at any time.
- Storyboard thumbnails appear (small) on the scene's strip in the schedule, and a "Print storyboard" page joins the existing printable views.
- Clear message if AI credits run out, with generation paused.

## How it works
- A server function sends the scene details (slug, synopsis, cast, time of day, style) to Lovable AI: a text call writes a shot list, then the image model draws each frame. The AI key stays on the server; no account or login needed, so the app stays zero-setup.
- Images are saved in the browser's larger local file storage (IndexedDB), not the main saved-productions storage, so big pictures don't hit the size limit. Productions keep only frame references and notes.
- JSON export gets an option "Include storyboard images" (larger file); otherwise frames are left out.

## Technical details
- `src/lib/ai/` server-only modules: AI SDK Responses helper (`openai/gpt-6-astra`, strict JSON schema for shot list, streamed) and image generation via `openai/gpt-image-2.5-sunburst`; `src/lib/storyboard.functions.ts` createServerFn with input validation and 402/429/403 error mapping.
- Types: `Scene.frames?: { id, shot, caption, note, imageKey, createdAt }[]`, `Project.storyboardEnabled?: boolean`.
- `src/lib/storyboard/imageStore.ts` (idb-keyval), loaded client-side only.
- Route `src/routes/project/$id.storyboard.tsx` and `$id.storyboard-print.tsx`, with head metadata.
- Provision `LOVABLE_API_KEY`; add a unit test for the "disabled means no request" rule; record the IndexedDB decision in AGENTS.md.
- Usage is charged to workspace AI credits per frame.
