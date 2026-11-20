# Replace the example excerpt with a full, freely licensed screenplay

## Why not a "public domain" feature script
Most scripts posted online as "public domain" (archive.org, school sites) are actually still copyrighted studio scripts. A genuinely public domain feature screenplay with clean text is very hard to confirm. The safest full-length option is the complete **Sintel** screenplay (Blender Foundation), released under CC BY 3.0 — free to use and share with credit, which we already show.

## What changes
- The example production uses the **entire Sintel screenplay** instead of the two-scene opening — roughly 20–30 scenes, multiple locations (snowy mountains, city, forest, cave, shaman's hut) and recurring cast (Sintel, Scales, Shaman, guards), so the optimizer, company moves and cast Day-Out-of-Days warnings actually have something to show.
- Scenes start unscheduled-but-sensible (each on its own day), so pressing "Optimize" shows a clear saving.
- Attribution stays the same (Esther Wouda / Colin Levy, Blender Foundation, CC BY 3.0) on the landing page, project header, CSV and JSON exports, and the third-party notices file.
- People who already have the old two-scene example keep it; new visitors (or anyone who deletes it and clicks a new "Load example" button) get the full version.

## Technical details
- Download the official Sintel script PDF from durian.blender.org, extract text, normalize headings, and store it in `src/lib/sample.ts` as `SAMPLE_SCRIPT`.
- Run it through the existing `parseScript`; spot-check locations/cast and hand-fix any parse oddities in the seed data.
- Add a "Load example" button on the landing page that calls `createDemoProject()` (doesn't touch the `demoSeeded` marker logic).
- Update `demo.test.ts` expectations (scene count, multiple locations, cast) and re-run tests; verify optimization saving in the browser.
