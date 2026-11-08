const OPTION_LINE = /^\s*(?:[❯>›▸►●○]\s*)?(\d{1,2})[.)]\s+\S/u;
const CURSOR_OPTION_LINE = /^\s*[❯>›▸►]\s*\d{1,2}[.)]\s+\S/u;
const MENU_HINT = /Enter to select|to navigate|Esc to cancel|Esc to exit|Tab\/Arrow keys|Do you want to/iu;
const MAX_GAP_ROWS = 4;

/**
 * Detects a numbered option dialog (Claude Code AskUserQuestion / permission
 * prompts) in the visible rows and returns how many options it offers, or null.
 * Plain numbered lists in normal output are ignored: a menu needs either a
 * cursor marker on an option or a menu hint line near the options.
 */
export function detectNumberedOptions(rows: readonly string[]): number | null {
  let last = -1;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (OPTION_LINE.test(rows[index])) {
      last = index;
      break;
    }
  }
  if (last < 0) {
    return null;
  }
  const numbers: number[] = [];
  let gap = 0;
  let first = last;
  let cursor = false;
  for (let index = last; index >= 0 && gap <= MAX_GAP_ROWS; index -= 1) {
    const match = rows[index].match(OPTION_LINE);
    if (match) {
      numbers.push(Number(match[1]));
      gap = 0;
      first = index;
      cursor = cursor || CURSOR_OPTION_LINE.test(rows[index]);
    } else if (rows[index].trim().length > 0) {
      gap += 1;
    }
  }
  numbers.reverse();
  if (numbers.length < 2 || numbers[0] !== 1 || numbers.some((n, i) => n !== i + 1)) {
    return null;
  }
  const tail = rows.slice(first, Math.min(rows.length, last + 6));
  if (!cursor && !tail.some((row) => MENU_HINT.test(row))) {
    return null;
  }
  return Math.min(numbers.length, 9);
}
