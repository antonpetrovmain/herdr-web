import type { AgentStatus } from "./types";

export const OFFICE_OPEN_KEY = "herdrWeb.officeOpen.v1";
export const DEFAULT_OFFICE_OPEN = false;

/** The four poses a coworker can show. herdr's "unknown" maps to idle. */
export type OfficeState = "working" | "idle" | "blocked" | "done";

export function officeState(status: AgentStatus | string | undefined): OfficeState {
  return status === "working" || status === "blocked" || status === "done" ? status : "idle";
}

export type OfficeEntry<Ref> = {
  key: string;
  name: string;
  state: OfficeState;
  ref: Ref;
};

export function buildOfficeEntries<Ref>(
  items: ReadonlyArray<{
    key: string;
    name: string;
    status: AgentStatus | string | undefined;
    ref: Ref;
  }>,
): OfficeEntry<Ref>[] {
  return items.map((item) => ({
    key: item.key,
    name: item.name,
    state: officeState(item.status),
    ref: item.ref,
  }));
}

export function parseOfficeOpen(value: unknown) {
  return value === "1";
}

export function readOfficeOpen(
  storage: Pick<Storage, "getItem"> | null = browserLocalStorage(),
): boolean {
  if (!storage) {
    return DEFAULT_OFFICE_OPEN;
  }
  try {
    return parseOfficeOpen(storage.getItem(OFFICE_OPEN_KEY));
  } catch {
    return DEFAULT_OFFICE_OPEN;
  }
}

export function writeOfficeOpen(
  open: boolean,
  storage: Pick<Storage, "setItem"> | null = browserLocalStorage(),
) {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(OFFICE_OPEN_KEY, open ? "1" : "0");
  } catch {
    // Local storage can be unavailable in private or locked-down browser contexts.
  }
}

/** Alt+Shift+O, matched on the physical key so macOS Option remapping does not matter. */
export function isOfficeShortcut(event: {
  code: string;
  altKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}) {
  return (
    event.code === "KeyO" && event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey
  );
}

function browserLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
