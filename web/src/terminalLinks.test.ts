import { describe, expect, it } from "vitest";
import { collectRecentLinks, findTerminalLinks, linkAt } from "./terminalLinks";
import type { TerminalLinkRow } from "./terminalLinks";

const URL_200 =
  "https://example.com/a/very/long/path/segment-one/segment-two/segment-three/segment-four?query=abcdefghijklmnopqrstuvwxyz0123456789&other=zyxwvutsrqponmlkjihgfedcba9876543210&token=Qm9va21hcmtlZFRva2Vu";

function softWrap(text: string, cols: number): TerminalLinkRow[] {
  const rows: TerminalLinkRow[] = [];
  for (let i = 0; i < text.length; i += cols) {
    rows.push({ text: text.slice(i, i + cols).padEnd(cols), wrapped: i + cols < text.length });
  }
  return rows;
}

function hard(lines: string[]): TerminalLinkRow[] {
  return lines.map((text) => ({ text, wrapped: false }));
}

describe("findTerminalLinks", () => {
  it("joins a soft-wrapped URL across rows", () => {
    const rows = softWrap(URL_200, 40);
    const links = findTerminalLinks(rows, 40);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe(URL_200);
    expect(links[0].parts.length).toBe(rows.length);
  });

  it("joins a soft-wrapped URL that follows prose and stops at the URL end", () => {
    const text = `see ${URL_200} for details`;
    const links = findTerminalLinks(softWrap(text, 37), 37);
    expect(links.map((l) => l.url)).toEqual([URL_200]);
  });

  it("joins a hard-wrapped URL whose rows are filled to the width", () => {
    const rows = hard([
      "  https://example.com/aaaaaaaabbbbbbbbccccc",
      "  ddddddddeeeeeeeeffffffffgggggggg",
    ]);
    expect(findTerminalLinks(rows, 43)[0].url).toBe(
      "https://example.com/aaaaaaaabbbbbbbbcccccddddddddeeeeeeeeffffffffgggggggg",
    );
  });

  it("joins hard-wrapped indented continuations at punctuation boundaries", () => {
    const rows = hard(["Open https://example.com/path/", "  to/the/page?x=1 now"]);
    expect(findTerminalLinks(rows, 80)[0].url).toBe("https://example.com/path/to/the/page?x=1");
  });

  it("joins a short hard-wrapped row when the next row is a lone URL-looking token", () => {
    const first = "https://example.com/some/long/path/abcdefghij";
    const rows = hard([`  ${first}`, "  klmnop1234567890"]);
    expect(findTerminalLinks(rows, 120)[0].url).toBe(`${first}klmnop1234567890`);
  });

  it("does not glue following prose onto a URL", () => {
    const rows = hard(["see https://example.com/page", "thanks for reading"]);
    expect(findTerminalLinks(rows, 80).map((l) => l.url)).toEqual(["https://example.com/page"]);
    const rows2 = hard(["see https://example.com/some/long/page/x", "thanks"]);
    expect(findTerminalLinks(rows2, 80).map((l) => l.url)).toEqual([
      "https://example.com/some/long/page/x",
    ]);
  });

  it("does not join across a blank row", () => {
    const rows = hard(["https://example.com/path/", "", "more"]);
    expect(findTerminalLinks(rows, 80)[0].url).toBe("https://example.com/path/");
  });

  it("trims trailing punctuation and records trimmed parts", () => {
    const links = findTerminalLinks(softWrap("go to (https://example.com/x/yyyy).", 20), 20);
    expect(links[0].url).toBe("https://example.com/x/yyyy");
    const last = links[0].parts[links[0].parts.length - 1];
    expect(last.end).toBeGreaterThan(last.start);
  });

  it("finds several URLs on one row", () => {
    const links = findTerminalLinks(hard(["https://a.example/x https://b.example/y"]), 80);
    expect(links.map((l) => l.url)).toEqual(["https://a.example/x", "https://b.example/y"]);
  });
});

describe("linkAt", () => {
  it("resolves a tap on any row of a wrapped URL to the whole URL", () => {
    const rows = softWrap(URL_200, 40);
    const links = findTerminalLinks(rows, 40);
    expect(linkAt(links, 0, 5)).toBe(URL_200);
    expect(linkAt(links, 3, 2)).toBe(URL_200);
    expect(linkAt(links, rows.length - 1, 0)).toBe(URL_200);
  });

  it("returns null outside any link", () => {
    const links = findTerminalLinks(hard(["hello https://example.com/x"]), 80);
    expect(linkAt(links, 0, 2)).toBeNull();
  });
});

describe("collectRecentLinks", () => {
  it("dedupes and lists newest first", () => {
    const rows = hard([
      "https://one.example/a",
      "text",
      "https://two.example/b",
      "https://one.example/a",
    ]);
    expect(collectRecentLinks(rows, 80)).toEqual(["https://one.example/a", "https://two.example/b"]);
  });
});
