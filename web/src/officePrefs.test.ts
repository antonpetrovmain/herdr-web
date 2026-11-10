import { describe, expect, it } from "vitest";
import {
  OFFICE_OPEN_KEY,
  buildOfficeEntries,
  isOfficeShortcut,
  officeState,
  readOfficeOpen,
  writeOfficeOpen,
} from "./officePrefs";

function memoryStorage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: (key: string) => (key === OFFICE_OPEN_KEY ? value : null),
    setItem: (key: string, next: string) => {
      if (key === OFFICE_OPEN_KEY) {
        value = next;
      }
    },
  };
}

describe("office open preference", () => {
  it("defaults to closed", () => {
    expect(readOfficeOpen(memoryStorage())).toBe(false);
    expect(readOfficeOpen(memoryStorage("garbage"))).toBe(false);
    expect(readOfficeOpen(null)).toBe(false);
  });

  it("persists open and closed", () => {
    const storage = memoryStorage();
    writeOfficeOpen(true, storage);
    expect(readOfficeOpen(storage)).toBe(true);
    writeOfficeOpen(false, storage);
    expect(readOfficeOpen(storage)).toBe(false);
  });

  it("survives a throwing storage", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readOfficeOpen(broken)).toBe(false);
    expect(() => writeOfficeOpen(true, broken)).not.toThrow();
  });
});

describe("office state mapping", () => {
  it("keeps the herdr states and maps everything else to idle", () => {
    expect(officeState("working")).toBe("working");
    expect(officeState("blocked")).toBe("blocked");
    expect(officeState("done")).toBe("done");
    expect(officeState("idle")).toBe("idle");
    expect(officeState("unknown")).toBe("idle");
    expect(officeState(undefined)).toBe("idle");
    expect(officeState("something-new")).toBe("idle");
  });

  it("builds entries preserving order, names and refs", () => {
    const entries = buildOfficeEntries([
      { key: "a", name: "chess", status: "working", ref: 1 },
      { key: "b", name: "mentor", status: "unknown", ref: 2 },
    ]);
    expect(entries.map((entry) => [entry.name, entry.state, entry.ref])).toEqual([
      ["chess", "working", 1],
      ["mentor", "idle", 2],
    ]);
  });
});

describe("office shortcut", () => {
  const base = { code: "KeyO", altKey: true, shiftKey: true, ctrlKey: false, metaKey: false };
  it("matches Alt+Shift+O only", () => {
    expect(isOfficeShortcut(base)).toBe(true);
    expect(isOfficeShortcut({ ...base, shiftKey: false })).toBe(false);
    expect(isOfficeShortcut({ ...base, altKey: false })).toBe(false);
    expect(isOfficeShortcut({ ...base, ctrlKey: true })).toBe(false);
    expect(isOfficeShortcut({ ...base, metaKey: true })).toBe(false);
    expect(isOfficeShortcut({ ...base, code: "KeyP" })).toBe(false);
  });
});
