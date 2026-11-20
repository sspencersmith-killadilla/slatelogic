import type { Scene, Settings, ShootDay } from "../types";

export interface DayCost {
  dayIndex: number; eighths: number; hours: number; locations: string[]; moves: number;
  locationCost: number; moveCost: number; switchPenalty: number; turnaround: number; overLimit: boolean; total: number;
}
export type DoodCode = "SW" | "W" | "WF" | "SWF" | "H" | "";
export interface ActorDood { actor: string; codes: DoodCode[]; work: number; hold: number; cost: number; warnings: string[] }
export interface Breakdown { days: DayCost[]; actors: ActorDood[]; total: number }

export const OVER_LIMIT_PENALTY = 50000;

export function dayLocations(scenes: Scene[]): string[] {
  const out: string[] = [];
  for (const s of scenes) if (out[out.length - 1] !== s.location) out.push(s.location);
  return out;
}

export function computeDood(dayCast: string[][]): Map<string, DoodCode[]> {
  const actors = new Set(dayCast.flat());
  const res = new Map<string, DoodCode[]>();
  for (const a of actors) {
    const worked = dayCast.map((c) => c.includes(a));
    const first = worked.indexOf(true), last = worked.lastIndexOf(true);
    res.set(a, worked.map((w, i) => {
      if (i < first || i > last) return "";
      if (!w) return "H";
      if (first === last) return "SWF";
      if (i === first) return "SW";
      if (i === last) return "WF";
      return "W";
    }));
  }
  return res;
}

export function evaluate(days: ShootDay[], sceneMap: Map<string, Scene>, s: Settings): Breakdown {
  let prevLastTime: string | null = null;
  const dayCast: string[][] = [];
  const dayCosts: DayCost[] = days.map((d, dayIndex) => {
    const sc = d.sceneIds.map((id) => sceneMap.get(id)).filter((x): x is Scene => !!x);
    const eighths = sc.reduce((a, b) => a + b.eighths, 0);
    const hours = sc.reduce((a, b) => a + b.hours, 0);
    const seq = dayLocations(sc);
    const unique = [...new Set(seq)];
    const moves = Math.max(0, seq.length - 1);
    const locationCost = unique.reduce((a, l) => a + (s.locationRates[l] ?? s.locationDayRate), 0);
    const moveCost = moves * s.companyMoveCost;
    const times = new Set(sc.map((x) => x.time));
    const switchPenalty = times.size > 1 ? s.dayNightSwitchPenalty : 0;
    const firstTime = sc[0]?.time ?? null;
    const turnaround = prevLastTime === "NIGHT" && firstTime === "DAY" ? s.turnaroundPenalty : 0;
    if (sc.length) prevLastTime = sc[sc.length - 1]!.time;
    const overLimit = eighths > s.maxEighthsPerDay || hours > s.maxHoursPerDay;
    dayCast.push([...new Set(sc.flatMap((x) => x.cast))]);
    const total = locationCost + moveCost + switchPenalty + turnaround + (overLimit ? OVER_LIMIT_PENALTY : 0);
    return { dayIndex, eighths, hours, locations: unique, moves, locationCost, moveCost, switchPenalty, turnaround, overLimit, total };
  });
  const dood = computeDood(dayCast);
  const actors: ActorDood[] = [...dood.entries()].map(([actor, codes]) => {
    const work = codes.filter((c) => c && c !== "H").length;
    const hold = codes.filter((c) => c === "H").length;
    const rate = s.actorRates[actor] ?? s.actorDayRate;
    const warnings: string[] = [];
    let run = 0, maxRun = 0;
    for (const c of codes) { run = c === "H" ? run + 1 : 0; maxRun = Math.max(maxRun, run); }
    if (maxRun >= 3) warnings.push(`${maxRun} hold days in a row`);
    if (maxRun * s.holdDayRate > 2 * rate) warnings.push("Hold costs more than drop/pick-up");
    if (work > 0 && hold > work) warnings.push("More hold days than work days");
    return { actor, codes, work, hold, cost: work * rate + hold * s.holdDayRate, warnings };
  });
  const total = dayCosts.reduce((a, d) => a + d.total, 0) + actors.reduce((a, b) => a + b.cost, 0);
  return { days: dayCosts, actors, total };
}
