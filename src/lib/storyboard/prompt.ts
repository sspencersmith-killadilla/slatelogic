import type { Project, Scene } from "../types";

export type BoardStyle = "pencil" | "ink" | "comic";
export const STYLES: Record<BoardStyle, string> = {
  pencil: "Rough graphite pencil storyboard sketch, grayscale, loose hatching, white paper",
  ink: "Ink and grey wash storyboard panel, bold brush lines, monochrome",
  comic: "Color comic-book storyboard panel, clean inks, flat muted colors",
};
export const STYLE_LABELS: Record<BoardStyle, string> = { pencil: "Pencil sketch", ink: "Ink & wash", comic: "Color comic" };
export const SHOTS = ["WIDE", "MEDIUM", "CLOSE-UP"] as const;

/** Storyboarding only ever runs when the production has opted in. */
export const canGenerate = (p: Pick<Project, "storyboardEnabled">) => p.storyboardEnabled === true;

export function framePrompt(s: Scene, shot: string, style: BoardStyle, note = "") {
  return [
    `${STYLES[style]}. Film storyboard frame, 3:2 landscape, no text, no captions, no panel borders.`,
    `Shot: ${shot}.`,
    `Scene ${s.number}: ${s.intExt}. ${s.location} — ${s.time === "NIGHT" ? "night, low light" : "daytime"}.`,
    s.synopsis && `Action: ${s.synopsis}`,
    s.cast.length ? `Characters: ${s.cast.join(", ")} (original designs, not real people).` : "",
    note && `Director's note: ${note}`,
  ].filter(Boolean).join(" ").slice(0, 3900);
}
