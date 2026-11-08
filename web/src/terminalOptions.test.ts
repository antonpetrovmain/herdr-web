import { describe, expect, it } from "vitest";
import { detectNumberedOptions } from "./terminalOptions";

describe("detectNumberedOptions", () => {
  it("finds an AskUserQuestion dialog with descriptions between options", () => {
    const rows = [
      "Which fruit do you like?",
      "",
      "❯ 1. Apple",
      "     Apple",
      "  2. Pear",
      "     Pear",
      "  3. Plum",
      "     Plum",
      "  4. Type something.",
      "────────────",
      "  5. Chat about this",
      "",
      "Enter to select · ↑/↓ to navigate · Esc to cancel",
    ];
    expect(detectNumberedOptions(rows)).toBe(5);
  });

  it("finds a permission prompt", () => {
    expect(
      detectNumberedOptions([" Do you want to proceed?", " ❯ 1. Yes", "   2. Yes, and don't ask again", "   3. No"]),
    ).toBe(3);
  });

  it("ignores ordinary numbered lists in output", () => {
    expect(detectNumberedOptions(["Steps:", "1. install", "2. build", "3. run", "$ "])).toBeNull();
  });

  it("ignores single items and non-sequential numbers", () => {
    expect(detectNumberedOptions(["❯ 1. only"])).toBeNull();
    expect(detectNumberedOptions(["❯ 2. a", "  3. b"])).toBeNull();
  });
});
