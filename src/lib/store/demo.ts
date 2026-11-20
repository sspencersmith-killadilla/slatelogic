import { parseScript } from "../parser/scenes";
import { SAMPLE_SCRIPT, SAMPLE_SOURCE, SAMPLE_TITLE } from "../sample";
import { defaultSettings, type Project, type ShootDay } from "../types";

export const DEMO_ID = "last-screenwriter-demo";

// Reviewed cast aliases: the script uses both PAUL and PAUL DAVIDSON.
const ALIASES: Record<string, string> = { PAUL: "PAUL DAVIDSON" };

export function createDemoProject(): Project {
  const settings = defaultSettings();
  const scenes = parseScript(SAMPLE_SCRIPT).map((scene, i) => ({
    ...scene,
    id: `tls-scene-${i + 1}`,
    cast: [...new Set(scene.cast.map((c) => ALIASES[c] ?? c))],
  }));
  // Starting point: script order, packed up to the daily page limit — the optimizer improves on this.
  const days: ShootDay[] = [];
  let load = Infinity;
  for (const s of scenes) {
    if (load + s.eighths > settings.maxEighthsPerDay) {
      days.push({ id: `tls-day-${days.length + 1}`, sceneIds: [], locked: false });
      load = 0;
    }
    days[days.length - 1]!.sceneIds.push(s.id);
    load += s.eighths;
  }
  return {
    id: DEMO_ID,
    name: SAMPLE_TITLE,
    sourceNotice: `"The Last Screenwriter" screenplay (written by ChatGPT 4.0, prompted by Peter Luisi; Spotlight Media Productions, 2023). Public domain per Wikimedia Commons. Headings normalized; cast reviewed; durations and costs illustrative. Source: ${SAMPLE_SOURCE}`,
    createdAt: Date.UTC(2026, 10, 20),
    scenes,
    settings,
    days,
  };
}
