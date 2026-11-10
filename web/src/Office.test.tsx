/**
 * @vitest-environment jsdom
 */
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OfficeStrip } from "./Office";
import { buildOfficeEntries } from "./officePrefs";

const roots: Root[] = [];

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) {
      root.unmount();
    }
  });
  document.body.innerHTML = "";
});

const entries = buildOfficeEntries([
  { key: "a", name: "chess", status: "working", ref: "pane-a" },
  { key: "b", name: "mentor", status: "done", ref: "pane-b" },
  { key: "c", name: "ops", status: "blocked", ref: "pane-c" },
  { key: "d", name: "idler", status: "unknown", ref: "pane-d" },
]);

async function render(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => root.render(node));
  return container;
}

function Harness({ initialOpen, onSelect }: { initialOpen: boolean; onSelect: (r: string) => void }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div>
      <button className="toggle" onClick={() => setOpen((v) => !v)}>
        toggle
      </button>
      {open ? (
        <OfficeStrip entries={entries} onSelect={onSelect} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

describe("OfficeStrip", () => {
  it("renders no strip DOM while closed", async () => {
    const container = await render(<Harness initialOpen={false} onSelect={vi.fn()} />);
    expect(container.querySelector(".office-strip")).toBeNull();
    expect(container.querySelector(".office-scrim")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("opens on toggle and closes on Escape and on scrim tap", async () => {
    const container = await render(<Harness initialOpen={false} onSelect={vi.fn()} />);
    const toggle = container.querySelector<HTMLButtonElement>(".toggle")!;
    await act(async () => toggle.click());
    expect(container.querySelector(".office-strip")).not.toBeNull();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(container.querySelector(".office-strip")).toBeNull();

    await act(async () => toggle.click());
    await act(async () => container.querySelector<HTMLElement>(".office-scrim")!.click());
    expect(container.querySelector(".office-strip")).toBeNull();
  });

  it("shows one labelled coworker per agent with its state", async () => {
    const container = await render(<Harness initialOpen onSelect={vi.fn()} />);
    const desks = Array.from(container.querySelectorAll<HTMLButtonElement>(".office-desk"));
    expect(desks.map((d) => d.dataset.state)).toEqual(["working", "done", "blocked", "idle"]);
    expect(desks.map((d) => d.querySelector(".office-name")?.textContent)).toEqual([
      "chess",
      "mentor",
      "ops",
      "idler",
    ]);
    expect(desks[2].getAttribute("aria-label")).toBe("ops, blocked");
  });

  it("clicking a coworker runs the focus action with that agent's ref", async () => {
    const onSelect = vi.fn();
    const container = await render(<Harness initialOpen onSelect={onSelect} />);
    const desks = container.querySelectorAll<HTMLButtonElement>(".office-desk");
    await act(async () => desks[1].click());
    expect(onSelect).toHaveBeenCalledWith("pane-b");
  });

  it("handles a large fleet", async () => {
    const many = buildOfficeEntries(
      Array.from({ length: 45 }, (_, i) => ({
        key: `k${i}`,
        name: `agent-${i}`,
        status: i % 2 ? "working" : "idle",
        ref: i,
      })),
    );
    const container = await render(
      <OfficeStrip entries={many} onSelect={vi.fn()} onClose={vi.fn()} />,
    );
    expect(container.querySelectorAll(".office-desk").length).toBe(45);
  });
});
