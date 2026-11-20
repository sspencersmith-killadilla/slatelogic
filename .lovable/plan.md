# CallSheet / StripCost

An app for indie film productions: upload a script, review the scenes it finds, and get a shooting schedule built to keep costs low. You can then adjust and export it.

## Pages
- **/** Landing page and project list. Each project has a script, scenes, cost settings and a schedule.
- **/project/$id/script** Upload a PDF or DOC/DOCX script, then review the scenes in an editable table.
- **/project/$id/costs** Sliders and inputs for the cost weights.
- **/project/$id/schedule** Stripboard, cost summary and the Day-Out-of-Days (DOOD) grid.
- **/project/$id/print** Schedule laid out for printing.

## 1. Upload and scene review
- The script is read in your browser. PDFs use pdfjs-dist and DOCX files use mammoth. Old .doc files show a message asking you to save as DOCX or PDF.
- Scenes are found by their headings (`INT./EXT. LOCATION - DAY/NIGHT`). For each scene the app picks up:
  - Scene number, or numbers them in order if the script has none
  - INT/EXT, DAY/NIGHT and location
  - Synopsis: the first action line
  - Cast: character names written in capitals above their dialogue
  - Length in eighths of a page, based on line count (about 56 lines per page)
- Editable table: change location, cast (as tags), INT/EXT, time of day, eighths and estimated hours. You can also add, delete, merge or split scenes, and search or filter.
- A list of locations and cast is built from the scenes. Each person or place can have their own day rate.

## 2. Cost engine
- Settings:
  - Location day rate, with a custom rate per location
  - Company move cost (changing location within a day)
  - Actor day rate and hold-day rate, with a custom rate per actor
  - Penalty for going from a NIGHT shoot to a DAY call (turnaround)
  - Maximum pages and hours per shooting day
  - Optional penalty for switching between DAY and NIGHT within one day
- Total cost is the sum of:
  - Location-days
  - Company moves
  - Actor work days, plus hold days between an actor's first and last day
  - Turnaround penalties
  - A large penalty for any day over its limits
- Optimizer, run in a background thread so the page stays responsive:
  1. A first draft groups scenes by location, then by time of day, then by cast overlap, and fills each day up to the limits.
  2. Simulated annealing then improves it by swapping and moving scenes between days.
- You choose how many iterations to run. A "Re-optimize" button keeps any days you've locked.

## 3. Stripboard
- One column or block per shoot day. Each scene is a colored strip: yellow for EXT DAY, white for INT DAY, blue for INT NIGHT, green for EXT NIGHT.
- Each strip shows the scene number, location, eighths and cast ID numbers.
- Each day's header shows its pages and hours, estimated cost, the number of company moves, and a warning if a limit is exceeded.
- You can drag strips with @dnd-kit, either within a day or between days. You can also move them with up/down buttons or a "move to day" menu.
- Each change recalculates the cost right away and briefly shows how much it went up or down from before.
- You can add or remove days and lock a day.
- DOOD grid: actors in rows, days in columns, marked SW / W / H / WF / SWF. Warnings appear for long holds, a hold that costs more than releasing and rehiring the actor, and actors spread over many days.

## 4. Export
- CSV: scene list and schedule
- CSV: DOOD
- JSON: the whole project (it can be imported again)
- Printable stripboard and day-by-day schedule, using print styles and the browser's own print dialog

## Storage
Projects are saved in your browser (localStorage), so there are no accounts and nothing to set up. The JSON export/import doubles as backup and a way to share. Cloud accounts can be added later.

## Design
"Production office" look:
- Warm paper background with dark ink text
- Typewriter-style monospace font (Courier Prime) for script and strip text
- Condensed sans-serif (Barlow Condensed) for headings
- Industry-standard strip colors, set up as reusable color settings, plus a dark mode

## Technical details
- Logic lives in its own modules:
  - `src/lib/parser/` for text extraction and the scene parser
  - `src/lib/cost/` with the cost model as pure functions, plus a Web Worker for the optimizer
  - `src/lib/store/` with a Zustand store saved to localStorage
- PDF and DOCX libraries are loaded only in the browser (dynamic import), so they don't break server rendering.
- Vitest tests for:
  - Parsing scene headings
  - The eighths estimate
  - Each cost rule: move cost, hold days, turnaround penalty and over-limit penalty
  - The DOOD codes
