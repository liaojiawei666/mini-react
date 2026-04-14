/**
 * 测试要点（useState）：
 * 1. 初值与重渲染后 DOM 一致。
 * 2. 函数式更新生效。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { installSyncScheduler, mountRoot } from "./helpers/test-env";

describe("useState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("updates DOM after click", async () => {
    vi.resetModules();
    const { restore } = installSyncScheduler();
    const { createElement, render, useState } = await import("../src/mini-react");
    const root = mountRoot();
    try {
      function Counter() {
        const [n, setN] = useState(0);
        return createElement(
          "button",
          { type: "button", id: "btn", onClick: () => setN((x) => x + 1) },
          String(n)
        );
      }
      render(createElement(Counter, {}), root);
      const btn = root.querySelector("#btn") as HTMLButtonElement;
      expect(btn.textContent).toBe("0");
      btn.click();
      await Promise.resolve();
      expect(btn.textContent).toBe("1");
    } finally {
      restore();
    }
  });

  it("supports functional updater", async () => {
    vi.resetModules();
    const { restore } = installSyncScheduler();
    const { createElement, render, useState } = await import("../src/mini-react");
    const root = mountRoot();
    try {
      function C() {
        const [n, setN] = useState(5);
        return createElement(
          "span",
          { id: "v" },
          createElement(
            "button",
            { type: "button", id: "b", onClick: () => setN((x) => x * 2) },
            "go"
          ),
          String(n)
        );
      }
      render(createElement(C, {}), root);
      (root.querySelector("#b") as HTMLButtonElement).click();
      await Promise.resolve();
      expect(root.querySelector("#v")?.textContent).toContain("10");
    } finally {
      restore();
    }
  });
});
