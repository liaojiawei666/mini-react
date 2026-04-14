import { beforeEach, describe, expect, it, vi } from "vitest";

function mountRoot(): HTMLElement {
  document.body.innerHTML = "";
  const root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);
  return root;
}

function installSyncIdle(): { flush: () => void; restore: () => void } {
  const queue: Array<() => void> = [];
  const ric = (cb: IdleRequestCallback, _opts?: IdleRequestOptions) => {
    queue.push(() =>
      cb({ didTimeout: false, timeRemaining: () => 999 } as unknown as IdleDeadline)
    );
    return 1;
  };
  const orig = globalThis.requestIdleCallback;
  globalThis.requestIdleCallback = ric as typeof requestIdleCallback;
  return {
    flush: () => {
      let guard = 0;
      while (queue.length && guard++ < 500) {
        queue.shift()!();
      }
      if (queue.length) throw new Error("requestIdleCallback queue did not drain");
    },
    restore: () => {
      globalThis.requestIdleCallback = orig;
    }
  };
}

describe("mini-react runtime", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders static function component tree", async () => {
    vi.resetModules();
    const { createElement, render } = await import("./mini-react");
    const root = mountRoot();
    const { flush, restore } = installSyncIdle();
    try {
      function App() {
        return createElement("div", { id: "wrap" }, createElement("span", { id: "msg" }, "Hello"));
      }
      render(createElement(App, {}), root);
      flush();
      expect(root.textContent).toContain("Hello");
      expect(root.querySelector("#msg")).toBeTruthy();
    } finally {
      restore();
    }
  });

  it("useState updates after click", async () => {
    vi.resetModules();
    const { createElement, render, useState } = await import("./mini-react");
    const root = mountRoot();
    const { flush, restore } = installSyncIdle();
    try {
      function Counter() {
        const [n, setN] = useState(0);
        return createElement(
          "button",
          { id: "btn", type: "button", onClick: () => setN((x) => x + 1) },
          String(n)
        );
      }
      render(createElement(Counter, {}), root);
      flush();
      const btn = root.querySelector("#btn") as HTMLButtonElement;
      expect(btn.textContent).toBe("0");
      btn.click();
      await Promise.resolve();
      flush();
      expect(btn.textContent).toBe("1");
    } finally {
      restore();
    }
  });

  it("keeps sibling order when inserting before and between existing nodes", async () => {
    vi.resetModules();
    const { createElement, render, useState } = await import("./mini-react");
    const root = mountRoot();
    const { flush, restore } = installSyncIdle();
    try {
      function OrderedList() {
        const [step, setStep] = useState(0);
        return createElement(
          "div",
          { id: "wrap" },
          createElement(
            "button",
            { id: "next", type: "button", onClick: () => setStep((v) => v + 1) },
            "next"
          ),
          step >= 1 ? createElement("span", { id: "a", key: "a" }, "A") : null,
          createElement("span", { id: "b", key: "b" }, "B"),
          step >= 2 ? createElement("span", { id: "c", key: "c" }, "C") : null,
          createElement("span", { id: "d", key: "d" }, "D")
        );
      }

      render(createElement(OrderedList, {}), root);
      flush();

      const getSpanOrder = () =>
        Array.from(root.querySelectorAll("#wrap span")).map((item) => item.id);
      const next = root.querySelector("#next") as HTMLButtonElement;

      expect(getSpanOrder()).toEqual(["b", "d"]);
      next.click();
      await Promise.resolve();
      flush();
      expect(getSpanOrder()).toEqual(["a", "b", "d"]);
      next.click();
      await Promise.resolve();
      flush();
      expect(getSpanOrder()).toEqual(["a", "b", "c", "d"]);
    } finally {
      restore();
    }
  });
});
