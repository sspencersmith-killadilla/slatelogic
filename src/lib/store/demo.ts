import { parseScript } from "../parser/scenes";
import { SAMPLE_SCRIPT, SAMPLE_TITLE } from "../sample";
import { defaultSettings, type Project } from "../types";

export function createDemoProject(): Project {
  const scenes = parseScript(SAMPLE_SCRIPT).map((scene, i) => ({
    ...scene,
    id: `sintel-scene-${i + 1}`,
    // Reviewed cast includes Sintel's action-only appearance in scene 1.
    cast: [...new Set(["SINTEL", ...scene.cast])],
  }));
  return {
    id: "sintel-demo",
    name: SAMPLE_TITLE,
    sourceNotice: "Sintel opening excerpt by Esther Wouda, revisions by Colin Levy. © copyright Blender Foundation | durian.blender.org. CC BY 3.0. Headings normalized; cast reviewed; durations and costs illustrative. Source: https://durian.blender.org/wp-content/uploads/2009/11/1stminute_script_11-61.pdf · License: https://creativecommons.org/licenses/by/3.0/",
    createdAt: Date.UTC(2026, 10, 20),
    scenes,
    settings: defaultSettings(),
    days: scenes.map((scene, i) => ({ id: `sintel-day-${i + 1}`, sceneIds: [scene.id], locked: false })),
  };
}