import type { Scene, Settings, ShootDay } from "../types";
export function runOptimizer(scenes: Scene[], settings: Settings, days: ShootDay[] | null, iterations: number): Promise<ShootDay[]> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL("./optimizer.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e) => { resolve(e.data); w.terminate(); };
    w.onerror = (e) => { reject(e); w.terminate(); };
    w.postMessage({ scenes, settings, days, iterations });
  });
}
