export type IntExt = "INT" | "EXT" | "INT/EXT";
export type TimeOfDay = "DAY" | "NIGHT";
export interface Scene {
  id: string;
  number: string;
  intExt: IntExt;
  time: TimeOfDay;
  location: string;
  synopsis: string;
  eighths: number;
  hours: number;
  cast: string[];
  frames?: Frame[];
}
export interface Frame {
  id: string;
  shot: string;
  note: string;
  imageKey: string;
  createdAt: number;
}
export interface Settings {
  locationDayRate: number;
  companyMoveCost: number;
  actorDayRate: number;
  holdDayRate: number;
  turnaroundPenalty: number;
  dayNightSwitchPenalty: number;
  maxEighthsPerDay: number;
  maxHoursPerDay: number;
  locationRates: Record<string, number>;
  actorRates: Record<string, number>;
}
export interface ShootDay {
  id: string;
  sceneIds: string[];
  locked: boolean;
}
export interface Project {
  id: string;
  name: string;
  createdAt: number;
  scenes: Scene[];
  settings: Settings;
  days: ShootDay[];
  sourceNotice?: string | null;
  storyboardEnabled?: boolean;
  storyboardStyle?: "pencil" | "ink" | "comic";
}
export const defaultSettings = (): Settings => ({
  locationDayRate: 1500,
  companyMoveCost: 2500,
  actorDayRate: 400,
  holdDayRate: 250,
  turnaroundPenalty: 3000,
  dayNightSwitchPenalty: 1000,
  maxEighthsPerDay: 40,
  maxHoursPerDay: 12,
  locationRates: {},
  actorRates: {},
});
export const uid = () => Math.random().toString(36).slice(2, 10);
export const fmtEighths = (e: number) => {
  const p = Math.floor(e / 8), r = e % 8;
  return p && r ? `${p} ${r}/8` : p ? `${p}` : `${r}/8`;
};
export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
