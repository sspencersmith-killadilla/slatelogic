import { type Scene, type IntExt, type TimeOfDay, uid } from "../types";

export const LINES_PER_PAGE = 56;
const HEADING = /^\s*(\d+[A-Z]?)?\s*\.?\s*(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.?|EXT\.?)\s+(.+?)\s*(?:[-–—]+\s*(.+?))?\s*(\d+[A-Z]?)?\s*$/i;

export interface Heading { number?: string; intExt: IntExt; location: string; time: TimeOfDay }

export function parseHeading(line: string): Heading | null {
  const m = line.match(HEADING);
  if (!m) return null;
  if (line.trim() !== line.trim().toUpperCase()) return null;
  const ie = m[2]!.toUpperCase().replace(/\./g, "");
  const intExt: IntExt = ie.includes("/") || ie === "I/E" ? "INT/EXT" : ie === "EXT" ? "EXT" : "INT";
  const tod = (m[4] ?? "").toUpperCase();
  const time: TimeOfDay = /NIGHT|EVENING|DUSK|MIDNIGHT/.test(tod) ? "NIGHT" : "DAY";
  const location = m[3]!.replace(/[-–—\s.]+$/, "").trim();
  const h: Heading = { intExt, location, time };
  const n = m[1] ?? m[5];
  if (n) h.number = n;
  return h;
}

export function estimateEighths(lineCount: number): number {
  return Math.max(1, Math.round((lineCount / LINES_PER_PAGE) * 8));
}

const NOT_NAMES = /^(CUT TO|FADE|DISSOLVE|SMASH|THE END|CONTINUED|MORE|INTERCUT|BACK TO|LATER|MONTAGE|TITLE|SUPER)/;

export function isCharacterCue(name: string): boolean {
  return /^[A-Z][A-Z0-9 .'-]{0,28}$/.test(name) && name.split(" ").length <= 3 && !NOT_NAMES.test(name) && !/[.:]$/.test(name);
}

export function parseScript(text: string): Scene[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const scenes: Scene[] = [];
  let cur: { h: Heading; body: string[] } | null = null;
  const flush = () => {
    if (!cur) return;
    const body = cur.body;
    const cast = new Set<string>();
    let synopsis = "";
    for (let i = 0; i < body.length; i++) {
      const t = body[i]!.trim();
      if (!t) continue;
      let k = i + 1; while (k < body.length && !body[k]!.trim()) k++;
      const nextT = (body[k] ?? "").trim();
      const name = t.replace(/\s*\(.*?\)\s*/g, "").replace(/\s*\^$/, "").trim();
      if (isCharacterCue(name) && k === i + 1 && nextT && (nextT !== nextT.toUpperCase() || nextT.startsWith("("))) {
        cast.add(name); continue;
      }
      if (!synopsis && t !== t.toUpperCase()) synopsis = t.slice(0, 160);
    }
    const nonEmpty = body.length + 1;
    scenes.push({
      id: uid(), number: cur.h.number ?? String(scenes.length + 1), intExt: cur.h.intExt, time: cur.h.time,
      location: cur.h.location, synopsis, eighths: estimateEighths(nonEmpty), hours: 0, cast: [...cast],
    });
    const s = scenes[scenes.length - 1]!;
    s.hours = Math.round((s.eighths / 8) * 1.5 * 10) / 10 || 0.5;
    cur = null;
  };
  for (const line of lines) {
    const h = parseHeading(line);
    if (h) { flush(); cur = { h, body: [] }; } else if (cur) cur.body.push(line);
  }
  flush();
  return scenes;
}
