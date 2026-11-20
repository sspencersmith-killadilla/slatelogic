import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Project, type Scene, type Settings, type ShootDay, defaultSettings, uid } from "../types";
import { createDemoProject } from "./demo";

interface State {
  projects: Project[];
  demoSeeded: boolean;
  seedDemo: () => void;
  create: (name: string) => string;
  remove: (id: string) => void;
  importProject: (p: Project) => string;
  update: (id: string, fn: (p: Project) => Partial<Project>) => void;
  setScenes: (id: string, scenes: Scene[]) => void;
  setSettings: (id: string, s: Partial<Settings>) => void;
  setDays: (id: string, d: ShootDay[]) => void;
}
export const useProjects = create<State>()(persist((set) => ({
  projects: [],
  demoSeeded: false,
  seedDemo: () => set((st) => st.demoSeeded ? st : ({
    demoSeeded: true,
    projects: st.projects.some((p) => p.id === "sintel-demo") ? st.projects : [...st.projects, createDemoProject()],
  })),
  create: (name) => {
    const id = uid();
    set((st) => ({ projects: [{ id, name, createdAt: Date.now(), scenes: [], settings: defaultSettings(), days: [] }, ...st.projects] }));
    return id;
  },
  remove: (id) => set((st) => ({ projects: st.projects.filter((p) => p.id !== id) })),
  importProject: (p) => {
    const id = uid();
    set((st) => ({ projects: [{ ...p, id, settings: { ...defaultSettings(), ...p.settings } }, ...st.projects] }));
    return id;
  },
  update: (id, fn) => set((st) => ({ projects: st.projects.map((p) => (p.id === id ? { ...p, ...fn(p) } : p)) })),
  setScenes: (id, scenes) => set((st) => ({ projects: st.projects.map((p) => (p.id === id ? { ...p, scenes } : p)) })),
  setSettings: (id, s) => set((st) => ({ projects: st.projects.map((p) => (p.id === id ? { ...p, settings: { ...p.settings, ...s } } : p)) })),
  setDays: (id, days) => set((st) => ({ projects: st.projects.map((p) => (p.id === id ? { ...p, days } : p)) })),
}), { name: "stripcost-projects", skipHydration: true }));
