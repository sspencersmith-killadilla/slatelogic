import type { Project } from "./types";
import { evaluate } from "./cost/model";

const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(esc).join(",")).join("\n");

export function scheduleCsv(p: Project) {
  const map = new Map(p.scenes.map((s) => [s.id, s]));
  const b = evaluate(p.days, map, p.settings);
  const rows: unknown[][] = [["Day", "Order", "Scene", "INT/EXT", "Time", "Location", "Eighths", "Hours", "Cast", "Synopsis", "Day cost"]];
  p.days.forEach((d, i) => d.sceneIds.forEach((id, j) => {
    const s = map.get(id); if (!s) return;
    rows.push([i + 1, j + 1, s.number, s.intExt, s.time, s.location, s.eighths, s.hours, s.cast.join("; "), s.synopsis, j === 0 ? Math.round(b.days[i]!.total) : ""]);
  }));
  const scheduled = new Set(p.days.flatMap((d) => d.sceneIds));
  p.scenes.filter((s) => !scheduled.has(s.id)).forEach((s) =>
    rows.push(["Unscheduled", "", s.number, s.intExt, s.time, s.location, s.eighths, s.hours, s.cast.join("; "), s.synopsis, ""]));
  return toCsv(rows);
}
export function doodCsv(p: Project) {
  const b = evaluate(p.days, new Map(p.scenes.map((s) => [s.id, s])), p.settings);
  return toCsv([["Actor", ...p.days.map((_, i) => `Day ${i + 1}`), "Work", "Hold", "Cost"],
    ...b.actors.map((a) => [a.actor, ...a.codes, a.work, a.hold, Math.round(a.cost)])]);
}
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
