import { useEffect } from "react";
import type { CSSProperties } from "react";
import type { OfficeEntry, OfficeState } from "./officePrefs";

const SKIN = ["#f1c9a5", "#d9a77c", "#b9805a", "#8d5a3b"];
const HAIR = ["#2b2330", "#5a3a22", "#a8652a", "#d7b25a", "#7a3b5e", "#3b4a6b"];
const SHIRT = ["#89b4fa", "#cba6f7", "#fab387", "#a6e3a1", "#f5c2e7", "#74c7ec", "#f9e2af"];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export function coworkerLook(name: string) {
  const h = hash(name);
  return {
    skin: SKIN[h % SKIN.length],
    hair: HAIR[(h >>> 3) % HAIR.length],
    shirt: SHIRT[(h >>> 6) % SHIRT.length],
  };
}

const CONFETTI = ["#f38ba8", "#f9e2af", "#94e2d5", "#89b4fa", "#cba6f7", "#fab387"];

/** Original 18x16 pixel coworker drawn from plain SVG rectangles. */
export function Coworker({ name, state }: { name: string; state: OfficeState }) {
  const { skin, hair, shirt } = coworkerLook(name);
  const screen =
    state === "working"
      ? "#f9e2af"
      : state === "done"
        ? "#94e2d5"
        : state === "blocked"
          ? "#f38ba8"
          : "#313244";
  const asleep = state === "idle";
  const armsUp = state === "done";
  const handUp = state === "blocked";
  return (
    <svg
      className="office-sprite"
      viewBox="0 0 18 16"
      width="54"
      height="48"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {/* desk */}
      <rect x="0" y="10" width="18" height="2" fill="#7a5a3a" />
      <rect x="0" y="10" width="18" height="1" fill="#9a7a52" />
      <rect x="1" y="12" width="1" height="4" fill="#5a4129" />
      <rect x="16" y="12" width="1" height="4" fill="#5a4129" />
      {/* monitor */}
      <rect x="11" y="4" width="6" height="5" fill="#11111b" />
      <rect className="office-screen" x="12" y="5" width="4" height="3" fill={screen} />
      <rect x="14" y="9" width="1" height="1" fill="#45475a" />
      {/* person */}
      <g className="office-person">
        <rect x="3" y="1" width="6" height="2" fill={hair} />
        <rect x="3" y="3" width="6" height="3" fill={skin} />
        {asleep ? (
          <>
            <rect x="4" y="5" width="1" height="1" fill="#2b2330" />
            <rect x="7" y="5" width="1" height="1" fill="#2b2330" />
          </>
        ) : (
          <>
            <rect x="4" y="4" width="1" height="1" fill="#2b2330" />
            <rect x="7" y="4" width="1" height="1" fill="#2b2330" />
          </>
        )}
        <rect x="2" y="6" width="8" height="4" fill={shirt} />
        {handUp ? (
          <>
            <rect x="10" y="3" width="1" height="4" fill={shirt} />
            <rect className="office-wave" x="10" y="2" width="1" height="1" fill={skin} />
          </>
        ) : null}
        {armsUp ? (
          <>
            <rect x="1" y="3" width="1" height="4" fill={shirt} />
            <rect x="1" y="2" width="1" height="1" fill={skin} />
            <rect x="10" y="3" width="1" height="4" fill={shirt} />
            <rect x="10" y="2" width="1" height="1" fill={skin} />
          </>
        ) : null}
      </g>
      {state === "working" ? (
        <>
          <rect className="office-hand office-hand-a" x="8" y="9" width="2" height="1" fill={skin} />
          <rect className="office-hand office-hand-b" x="10" y="9" width="2" height="1" fill={skin} />
        </>
      ) : null}
      {asleep ? (
        <>
          <rect className="office-z office-z1" x="10" y="1" width="1" height="1" fill="#a6adc8" />
          <rect className="office-z office-z2" x="12" y="0" width="1" height="1" fill="#a6adc8" />
        </>
      ) : null}
      {state === "blocked" ? (
        <>
          <rect className="office-alert" x="13" y="0" width="1" height="2" fill="#f38ba8" />
          <rect className="office-alert" x="13" y="3" width="1" height="1" fill="#f38ba8" />
        </>
      ) : null}
      {state === "done"
        ? CONFETTI.map((color, index) => (
            <rect
              key={color}
              className="office-confetti"
              x={2 + index * 2.5}
              y="0"
              width="1"
              height="1"
              fill={color}
              style={{ animationDelay: `${index * 0.28}s` } as CSSProperties}
            />
          ))
        : null}
    </svg>
  );
}

export function OfficeStrip<Ref>({
  entries,
  onSelect,
  onClose,
}: {
  entries: OfficeEntry<Ref>[];
  onSelect: (ref: Ref) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <>
      <div className="office-scrim" onClick={onClose} aria-hidden="true" />
      <section className="office-strip" aria-label="Office: agent status">
        {entries.length === 0 ? (
          <p className="office-empty">No agents running</p>
        ) : (
          <ul className="office-floor">
            {entries.map((entry) => (
              <li key={entry.key}>
                <button
                  type="button"
                  className="office-desk"
                  data-state={entry.state}
                  title={`${entry.name}: ${entry.state}`}
                  aria-label={`${entry.name}, ${entry.state}`}
                  onClick={() => onSelect(entry.ref)}
                >
                  <Coworker name={entry.name} state={entry.state} />
                  <span className="office-name">{entry.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
