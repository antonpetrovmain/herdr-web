import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

const RELOAD_GUARD_KEY = "herdr.recovery.lastReloadAt";
const RELOAD_GUARD_MS = 30_000;
const VERSION_CHECK_MIN_HIDDEN_MS = 20_000;

export function isChunkLoadError(message: string) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError/iu.test(
    message,
  );
}

/** The hashed entry script path (assets/index-XXXX.js) named by an index.html. */
export function entryScriptFromHtml(html: string) {
  return html.match(/assets\/index-[\w-]+\.js/u)?.[0] ?? null;
}

/** Reloads at most once per guard window so a persistent failure cannot loop. */
export function reloadOnce(now = Date.now()) {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? "0");
    if (now - last < RELOAD_GUARD_MS) {
      return false;
    }
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  } catch {
    // storage unavailable: still allow one reload attempt
  }
  window.location.reload();
  return true;
}

function runningEntryScript() {
  const script = [...document.scripts].find((node) => /assets\/index-[\w-]+\.js/u.test(node.src));
  return script ? entryScriptFromHtml(script.src) : null;
}

async function liveEntryScript() {
  const response = await fetch(`/?_v=${Date.now()}`, { cache: "no-store" });
  return response.ok ? entryScriptFromHtml(await response.text()) : null;
}

/**
 * Phones keep a cached index.html and background tabs for days. Reload cleanly
 * when a lazy chunk 404s (stale assets), when a module fails to load, and when a
 * foregrounded tab is running an older bundle than the server now serves.
 */
export function installAppRecovery() {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadOnce();
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as { message?: string } | string | undefined;
    const message = typeof reason === "string" ? reason : (reason?.message ?? "");
    if (isChunkLoadError(message)) {
      reloadOnce();
    } else {
      console.warn("unhandled rejection", reason);
    }
    event.preventDefault();
  });
  window.addEventListener("error", (event) => {
    if (isChunkLoadError(event.message ?? "")) {
      reloadOnce();
    }
  });

  let hiddenAt: number | null = null;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    const wasHiddenFor = hiddenAt === null ? 0 : Date.now() - hiddenAt;
    hiddenAt = null;
    const running = runningEntryScript();
    if (!running || wasHiddenFor < VERSION_CHECK_MIN_HIDDEN_MS) {
      return;
    }
    void liveEntryScript()
      .then((live) => {
        if (live && live !== running) {
          reloadOnce();
        }
      })
      .catch(() => undefined);
  });
}

type BoundaryState = { error: Error | null };

/** Keeps a render error from leaving a blank page: offers Reload, reloads itself for stale chunks. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("app render error", error, info.componentStack);
    if (isChunkLoadError(error.message)) {
      reloadOnce();
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <div role="alert" style={{ padding: 24, color: "#cdd6f4", font: "14px system-ui, sans-serif" }}>
        <p>herdr-web hit an error and stopped.</p>
        <p style={{ opacity: 0.7, wordBreak: "break-word" }}>{this.state.error.message}</p>
        <button
          type="button"
          style={{ padding: "10px 16px", font: "inherit" }}
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}
