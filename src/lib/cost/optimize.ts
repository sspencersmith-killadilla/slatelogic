import type { Scene, Settings, ShootDay } from "../types";
import { evaluate } from "./model";

const nid = () => Math.random().toString(36).slice(2, 10);

export function greedy(scenes: Scene[], s: Settings): ShootDay[] {
  const sorted = [...scenes].sort((a, b) =>
    a.location.localeCompare(b.location) || a.time.localeCompare(b.time) || b.cast.length - a.cast.length);
  const days: ShootDay[] = [];
  let cur: Scene[] = [];
  for (const sc of sorted) {
    const e = cur.reduce((a, b) => a + b.eighths, 0) + sc.eighths;
    const h = cur.reduce((a, b) => a + b.hours, 0) + sc.hours;
    if (cur.length && (e > s.maxEighthsPerDay || h > s.maxHoursPerDay)) {
      days.push({ id: nid(), sceneIds: cur.map((x) => x.id), locked: false }); cur = [];
    }
    cur.push(sc);
  }
  if (cur.length) days.push({ id: nid(), sceneIds: cur.map((x) => x.id), locked: false });
  return days;
}

export function optimize(scenes: Scene[], s: Settings, existing: ShootDay[] | null, iterations: number): ShootDay[] {
  const map = new Map(scenes.map((x) => [x.id, x]));
  const locked = (existing ?? []).filter((d) => d.locked);
  const lockedIds = new Set(locked.flatMap((d) => d.sceneIds));
  const free = scenes.filter((x) => !lockedIds.has(x.id));
  let days: ShootDay[] = [...locked.map((d) => ({ ...d, sceneIds: [...d.sceneIds] })), ...greedy(free, s)];
  days.push({ id: nid(), sceneIds: [], locked: false });
  const cost = (d: ShootDay[]) => evaluate(d.filter((x) => x.sceneIds.length), map, s).total;
  let curCost = cost(days), best = days.map((d) => ({ ...d, sceneIds: [...d.sceneIds] })), bestCost = curCost;
  let T = Math.max(1000, curCost * 0.05);
  const unlockedIdx = () => days.map((d, i) => (d.locked ? -1 : i)).filter((i) => i >= 0);
  for (let it = 0; it < iterations; it++) {
    const idx = unlockedIdx();
    if (!idx.length) break;
    const next = days.map((d) => ({ ...d, sceneIds: [...d.sceneIds] }));
    const r = Math.random();
    const a = idx[Math.floor(Math.random() * idx.length)]!, b = idx[Math.floor(Math.random() * idx.length)]!;
    if (r < 0.45) {
      const from = next[a]!; if (!from.sceneIds.length) continue;
      const [m] = from.sceneIds.splice(Math.floor(Math.random() * from.sceneIds.length), 1);
      next[b]!.sceneIds.splice(Math.floor(Math.random() * (next[b]!.sceneIds.length + 1)), 0, m!);
    } else if (r < 0.8) {
      const A = next[a]!, B = next[b]!; if (!A.sceneIds.length || !B.sceneIds.length) continue;
      const i = Math.floor(Math.random() * A.sceneIds.length), j = Math.floor(Math.random() * B.sceneIds.length);
      [A.sceneIds[i], B.sceneIds[j]] = [B.sceneIds[j]!, A.sceneIds[i]!];
    } else {
      [next[a], next[b]] = [next[b]!, next[a]!];
    }
    const c = cost(next);
    if (c < curCost || Math.random() < Math.exp((curCost - c) / T)) {
      days = next; curCost = c;
      if (c < bestCost) { bestCost = c; best = next.map((d) => ({ ...d, sceneIds: [...d.sceneIds] })); }
    }
    T *= 0.9995;
  }
  return best.filter((d) => d.sceneIds.length || d.locked);
}
