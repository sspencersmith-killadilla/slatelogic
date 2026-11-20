import { beforeEach, describe, expect, it } from "vitest";
import { createDemoProject } from "./demo";
import { useProjects } from "./projects";
import { evaluate } from "../cost/model";
import { scheduleCsv } from "../export";

describe("public screenplay example", () => {
  beforeEach(() => useProjects.setState({ projects: [], demoSeeded: false }));

  it("seeds the two published Sintel opening scenes and schedules each once", () => {
    const p = createDemoProject();
    expect(p.scenes).toHaveLength(2);
    expect(p.scenes.map((s) => s.location)).toEqual(["BARREN / SNOWY LANDSCAPE", "DARK SHAMAN’S HUT"]);
    expect(p.scenes.map((s) => s.cast)).toEqual([["SINTEL", "SHAMAN"], ["SINTEL", "SHAMAN"]]);
    expect(p.days.flatMap((d) => d.sceneIds)).toEqual(p.scenes.map((s) => s.id));
    expect(evaluate(p.days, new Map(p.scenes.map((s) => [s.id, s])), p.settings).total).toBe(4600);
  });

  it("preserves existing productions and adds the example only once", () => {
    const id = useProjects.getState().create("Existing film");
    useProjects.getState().seedDemo();
    useProjects.getState().seedDemo();
    expect(useProjects.getState().projects.map((p) => p.id)).toEqual([id, "sintel-demo"]);
  });

  it("does not recreate a deleted example", () => {
    useProjects.getState().seedDemo();
    useProjects.getState().remove("sintel-demo");
    useProjects.getState().seedDemo();
    expect(useProjects.getState().projects).toEqual([]);
    expect(useProjects.getState().demoSeeded).toBe(true);
  });

  it("preserves screenplay attribution in JSON and schedule CSV exports", () => {
    const p = createDemoProject();
    const restored = JSON.parse(JSON.stringify(p)) as { sourceNotice: string };
    expect(restored.sourceNotice).toContain("© copyright Blender Foundation | durian.blender.org");
    expect(scheduleCsv(p)).toContain("https://creativecommons.org/licenses/by/3.0/");
  });
});