import { describe, expect, it } from "vitest";
import { evaluate, computeDood, OVER_LIMIT_PENALTY } from "./model";
import { defaultSettings, type Scene } from "../types";
import { parseHeading, estimateEighths, parseScript } from "../parser/scenes";

const sc = (id: string, location: string, time: "DAY" | "NIGHT", cast: string[], eighths = 8): Scene =>
  ({ id, number: id, intExt: "INT", time, location, synopsis: "", eighths, hours: 1, cast });
const s = { ...defaultSettings(), locationDayRate: 100, companyMoveCost: 1000, actorDayRate: 10, holdDayRate: 5, turnaroundPenalty: 777, dayNightSwitchPenalty: 0 };

describe("cost model", () => {
  it("charges one company move when location changes within a day", () => {
    const m = new Map([sc("1", "A", "DAY", []), sc("2", "B", "DAY", [])].map((x) => [x.id, x]));
    expect(evaluate([{ id: "d", sceneIds: ["1", "2"], locked: false }], m, s).days[0]!.moveCost).toBe(1000);
  });
  it("charges hold days between an actor's first and last day", () => {
    const m = new Map([sc("1", "A", "DAY", ["JO"]), sc("2", "A", "DAY", []), sc("3", "A", "DAY", ["JO"])].map((x) => [x.id, x]));
    const b = evaluate(["1", "2", "3"].map((id) => ({ id, sceneIds: [id], locked: false })), m, s);
    expect(b.actors[0]!.hold).toBe(1);
    expect(b.actors[0]!.cost).toBe(2 * 10 + 5);
  });
  it("applies turnaround penalty for NIGHT followed by DAY", () => {
    const m = new Map([sc("1", "A", "NIGHT", []), sc("2", "A", "DAY", [])].map((x) => [x.id, x]));
    const b = evaluate([{ id: "a", sceneIds: ["1"], locked: false }, { id: "b", sceneIds: ["2"], locked: false }], m, s);
    expect(b.days[1]!.turnaround).toBe(777);
  });
  it("penalizes a day over the page limit", () => {
    const m = new Map([sc("1", "A", "DAY", [], 41)].map((x) => [x.id, x]));
    const b = evaluate([{ id: "a", sceneIds: ["1"], locked: false }], m, { ...s, maxEighthsPerDay: 40 });
    expect(b.days[0]!.overLimit).toBe(true);
    expect(b.days[0]!.total).toBe(100 + OVER_LIMIT_PENALTY);
  });
  it("produces DOOD codes", () => {
    expect(computeDood([["A"], [], ["A"], ["B"]]).get("A")).toEqual(["SW", "H", "WF", ""]);
    expect(computeDood([["A"], [], ["A"], ["B"]]).get("B")).toEqual(["", "", "", "SWF"]);
  });
});

describe("parser", () => {
  it("parses scene headings", () => {
    expect(parseHeading("12 EXT. DINER PARKING LOT - NIGHT 12")).toEqual({ number: "12", intExt: "EXT", location: "DINER PARKING LOT", time: "NIGHT" });
    expect(parseHeading("INT./EXT. CAR - DAY")).toMatchObject({ intExt: "INT/EXT", location: "CAR", time: "DAY" });
    expect(parseHeading("She walks into the int. of the room")).toBeNull();
  });
  it("estimates eighths from line count", () => {
    expect(estimateEighths(56)).toBe(8);
    expect(estimateEighths(7)).toBe(1);
  });
  it("finds cast from character cues", () => {
    const out = parseScript("INT. KITCHEN - DAY\n\nMaya stirs a pot.\n\nMAYA\nWhere were you?\n\nLEO (O.S.)\nOut.\n");
    expect(out[0]!.cast.sort()).toEqual(["LEO", "MAYA"]);
    expect(out[0]!.synopsis).toBe("Maya stirs a pot.");
  });
});
