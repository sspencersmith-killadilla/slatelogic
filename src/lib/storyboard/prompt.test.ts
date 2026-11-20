import { describe, expect, it } from "vitest";
import { canGenerate } from "./prompt";
describe("storyboard opt-in", () => {
  it("blocks generation when storyboarding is off", () => {
    expect(canGenerate({})).toBe(false);
    expect(canGenerate({ storyboardEnabled: false })).toBe(false);
  });
  it("allows generation when turned on", () => expect(canGenerate({ storyboardEnabled: true })).toBe(true));
});
