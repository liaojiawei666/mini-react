/**
 * 测试要点（子树更新与父组件）：
 * 1. 仅子组件 state 变化时，父函数组件不应再次执行（依赖 reconcile 对 isDirty / children 缓存策略）。
 * 2. 子组件仍能收到更新并更新 DOM。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { installSyncScheduler, mountRoot } from "./helpers/test-env";

describe("parent / child isolation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not re-run parent when only child state changes", async () => {
    vi.resetModules();
    const { restore } = installSyncScheduler();
    const { createElement, render, useState } = await import("../src/mini-react");
    const root = mountRoot();

    let parentRuns = 0;

    try {
      function Child() {
        const [n, setN] = useState(0);
        return createElement(
          "button",
          { type: "button", id: "child", onClick: () => setN((x) => x + 1) },
          "child:",
          String(n)
        );
      }

      function Parent() {
        parentRuns += 1;
        return createElement("div", { id: "p" }, createElement(Child, {}));
      }

      render(createElement(Parent, {}), root);
      expect(parentRuns).toBe(1);

      (root.querySelector("#child") as HTMLButtonElement).click();
      await Promise.resolve();
      expect(parentRuns).toBe(1);
      expect((root.querySelector("#child") as HTMLButtonElement).textContent).toContain("child:1");
    } finally {
      restore();
    }
  });
});
