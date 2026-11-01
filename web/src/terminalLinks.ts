import { openableHttpUrl, trimUrlPunctuation } from "./terminalSelection";

const URL_START_PATTERN = /\bhttps?:\/\/[^\s"'<>`]+/giu;
const URL_CONTINUATION_PATTERN = /^[^\s"'<>`]+/u;
// Hard-wrapped URLs (agent UIs that insert real newlines) usually fill the row
// up to the wrap width; allow a little slack for word-boundary shortfalls.
const FILLED_ROW_SLACK = 8;
const MIN_URL_LENGTH_FOR_LOOSE_JOIN = 40;
const MAX_JOINED_ROWS = 12;

export type TerminalLinkRow = {
  /** Row text, one UTF-16 unit per character; trailing blanks are allowed. */
  text: string;
  /** Terminal soft-wrap flag: this row continues on the next row. */
  wrapped: boolean;
  /**
   * One OSC 8 hyperlink runs from this row's last non-blank cell into the next
   * row's first non-blank cell (Claude Code tags every row of a wrapped URL).
   */
  linkContinues?: boolean;
};

export type TerminalLinkPart = {
  row: number;
  /** Inclusive-start, exclusive-end character offsets within the row text. */
  start: number;
  end: number;
};

export type TerminalLink = {
  url: string;
  parts: TerminalLinkPart[];
};

/**
 * Finds http(s) URLs across rows, joining soft-wrapped rows (terminal flag) and
 * heuristically joining hard-wrapped ones. `cols` is the terminal width.
 */
export function findTerminalLinks(rows: readonly TerminalLinkRow[], cols: number): TerminalLink[] {
  const links: TerminalLink[] = [];
  let skipUntilRow = -1;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    if (rowIndex <= skipUntilRow) {
      continue;
    }
    const text = rows[rowIndex].text;
    URL_START_PATTERN.lastIndex = 0;
    let match = URL_START_PATTERN.exec(text);
    while (match) {
      const link = buildLink(rows, rowIndex, match.index, match[0], cols);
      if (link) {
        links.push(link);
        const lastRow = link.parts[link.parts.length - 1].row;
        if (lastRow > rowIndex) {
          skipUntilRow = lastRow;
        }
      }
      match = URL_START_PATTERN.exec(text);
    }
  }
  return links;
}

function buildLink(
  rows: readonly TerminalLinkRow[],
  rowIndex: number,
  matchStart: number,
  matchText: string,
  cols: number,
): TerminalLink | null {
  let raw = matchText;
  const parts: TerminalLinkPart[] = [{ row: rowIndex, start: matchStart, end: matchStart + matchText.length }];
  let current = rows[rowIndex];
  let currentEnd = matchStart + matchText.length;

  for (let next = rowIndex + 1; next < rows.length && next - rowIndex < MAX_JOINED_ROWS; next += 1) {
    if (currentEnd < current.text.trimEnd().length) {
      break; // URL ended before the end of the row
    }
    const nextRow = rows[next];
    const soft = current.wrapped;
    // Soft wraps continue at column 0; hard wraps may be indented.
    const leading = soft ? 0 : nextRow.text.length - nextRow.text.trimStart().length;
    const continuation = nextRow.text.slice(leading).match(URL_CONTINUATION_PATTERN)?.[0] ?? "";
    if (!continuation) {
      break;
    }
    if (!soft && !current.linkContinues && !shouldJoinHardWrap(raw, current.text, nextRow.text, continuation, cols)) {
      break;
    }
    raw += continuation;
    parts.push({ row: next, start: leading, end: leading + continuation.length });
    current = nextRow;
    currentEnd = leading + continuation.length;
  }

  const url = trimUrlPunctuation(raw);
  if (url.length <= 8 || !openableHttpUrl(url)) {
    return null;
  }
  trimParts(parts, raw.length - url.length);
  return { url, parts };
}

function trimParts(parts: TerminalLinkPart[], trimmed: number) {
  let remaining = trimmed;
  while (remaining > 0 && parts.length > 0) {
    const last = parts[parts.length - 1];
    const length = last.end - last.start;
    if (length <= remaining) {
      remaining -= length;
      parts.pop();
    } else {
      last.end -= remaining;
      remaining = 0;
    }
  }
}

function shouldJoinHardWrap(
  url: string,
  currentText: string,
  nextText: string,
  continuation: string,
  cols: number,
) {
  // Punctuation boundary: "…/path/" + "more" or "…/path" + "/more".
  if (/[/?#&=._~%+-]$/u.test(url) || /^[/?#&=._~%+-]/u.test(continuation)) {
    return true;
  }
  // The row was filled to the wrap width: the break is the terminal's, not the author's.
  if (cols > 0 && currentText.trimEnd().length >= cols - FILLED_ROW_SLACK) {
    return true;
  }
  // Short row, but the next row is a lone URL-looking token: "word"-like lines stay separate.
  const alone = nextText.trim() === continuation;
  return (
    alone &&
    url.length >= MIN_URL_LENGTH_FOR_LOOSE_JOIN &&
    /[/?#&=%_~0-9]/u.test(continuation)
  );
}

/** Returns the URL covering the given character offset of a row, if any. */
export function linkAt(links: readonly TerminalLink[], row: number, offset: number): string | null {
  for (const link of links) {
    for (const part of link.parts) {
      if (part.row === row && offset >= part.start && offset < part.end) {
        return link.url;
      }
    }
  }
  return null;
}

/**
 * Unique URLs, newest (bottom-most) first. A URL that is only a prefix of
 * another listed URL is a truncated copy of it (e.g. an echoed command line
 * that was cut at a wrap), so it is dropped.
 */
export function collectRecentLinks(rows: readonly TerminalLinkRow[], cols: number): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  const links = findTerminalLinks(rows, cols);
  for (let index = links.length - 1; index >= 0; index -= 1) {
    const { url } = links[index];
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  return urls.filter((url) => !urls.some((other) => other !== url && other.startsWith(url)));
}
