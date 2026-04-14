/**
 * 测试要点（commit）：
 * 1. 每次完整 workLoop 结束应调用一次 commitRoot（含首次渲染）。
 * 2. 单次更新在一次 microtask 内不应重复 commit。
 * 3. 同一点击处理函数内多次 setState 合并为一次 rerender，对应一次额外 commit。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { installSyncScheduler, mountRoot } from "./helpers/test-env";

describe("commitRoot", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("commits once per completed work loop; one extra commit after state update", async () => {
    vi.resetModules();
    const { restore } = installSyncScheduler();
    const commitMod = await import("../src/mini-react/commitRoot");
    const { createElement, render, useState } = await import("../src/mini-react");
    const commitSpy = vi.spyOn(commitMod, "commitRoot");

    const root = mountRoot();
    try {
      function C() {
        const [n, setN] = useState(0);
        return createElement(
          "button",
          { type: "button", id: "b", onClick: () => setN((x) => x + 1) },
          String(n)
        );
      }
      render(createElement(C, {}), root);
      expect(commitSpy).toHaveBeenCalledTimes(1);

      (root.querySelector("#b") as HTMLButtonElement).click();
      await Promise.resolve();
      expect(commitSpy).toHaveBeenCalledTimes(2);
    } finally {
      restore();
    }
  });

  it("batches two setState calls in one event into one rerender", async () => {
    vi.resetModules();
    const { restore } = installSyncScheduler();
    const commitMod = await import("../src/mini-react/commitRoot");
    const { createElement, render, useState } = await import("../src/mini-react");
    const commitSpy = vi.spyOn(commitMod, "commitRoot");

    const root = mountRoot();
    try {
      function C() {
        const [n, setN] = useState(0);
        return createElement(
          "button",
          {
            type: "button",
            id: "b",
            onClick: () => {
              setN((x) => x + 1);
              setN((x) => x + 1);
            }
          },
          String(n)
        );
      }
      render(createElement(C, {}), root);
      commitSpy.mockClear();

      (root.querySelector("#b") as HTMLButtonElement).click();
      await Promise.resolve();
      expect(commitSpy).toHaveBeenCalledTimes(1);
      expect((root.querySelector("#b") as HTMLButtonElement).textContent).toBe("2");
    } finally {
      restore();
    }
  });
});
