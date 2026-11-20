import { beforeEach, describe, expect, it } from "vitest";
import { createDemoProject, DEMO_ID } from "./demo";
import { useProjects } from "./projects";
import { scheduleCsv } from "../export";

describe("public domain screenplay example", () => {
  beforeEach(() => useProjects.setState({ projects: [], demoSeeded: false }));

  it("seeds the full screenplay with every scene scheduled exactly once", () => {
    const p = createDemoProject();
    expect(p.scenes).toHaveLength(63);
    expect(new Set(p.scenes.map((s) => s.location)).size).toBeGreaterThan(10);
    expect(p.scenes.some((s) => s.cast.includes("PAUL"))).toBe(false);
    expect(p.days.flatMap((d) => d.sceneIds).sort()).toEqual(p.scenes.map((s) => s.id).sort());
  });

  it("keeps starting days within the daily page limit", () => {
    const p = createDemoProject();
    const len = new Map(p.scenes.map((s) => [s.id, s.eighths]));
    for (const d of p.days) {
      const total = d.sceneIds.reduce((a, id) => a + len.get(id)!, 0);
      expect(d.sceneIds.length === 1 || total <= p.settings.maxEighthsPerDay).toBe(true);
    }
  });

  it("preserves existing productions and adds the example only once", () => {
    const id = useProjects.getState().create("Existing film");
    useProjects.getState().seedDemo();
    useProjects.getState().seedDemo();
    expect(useProjects.getState().projects.map((p) => p.id)).toEqual([id, DEMO_ID]);
  });

  it("does not recreate a deleted example automatically, but Load example restores it", () => {
    useProjects.getState().seedDemo();
    useProjects.getState().remove(DEMO_ID);
    useProjects.getState().seedDemo();
    expect(useProjects.getState().projects).toEqual([]);
    useProjects.getState().loadDemo();
    useProjects.getState().loadDemo();
    expect(useProjects.getState().projects.map((p) => p.id)).toEqual([DEMO_ID]);
  });

  it("keeps the source notice in exports", () => {
    expect(scheduleCsv(createDemoProject())).toContain("Wikimedia Commons");
  });
});
