import { describe, expect, it } from "vitest";
import { entryScriptFromHtml, isChunkLoadError } from "./appRecovery";

describe("app recovery helpers", () => {
  it("recognises stale-chunk errors from Chrome, Safari and Vite", () => {
    expect(isChunkLoadError("Failed to fetch dynamically imported module: https://x/assets/ghostty-web-CB46nHYJ.js")).toBe(true);
    expect(isChunkLoadError("Importing a module script failed.")).toBe(true);
    expect(isChunkLoadError("Cannot read properties of undefined")).toBe(false);
  });

  it("extracts the hashed entry script from index.html", () => {
    expect(entryScriptFromHtml('<script type="module" src="/assets/index-4bVB9Imk.js"></script>')).toBe(
      "assets/index-4bVB9Imk.js",
    );
    expect(entryScriptFromHtml("<html></html>")).toBeNull();
  });
});
