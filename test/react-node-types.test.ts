/**
 * 测试要点（ReactNode 形态）：
 * 1. 字符串 / 数字子节点 → 文本 fiber。
 * 2. null / undefined / boolean 子节点在 createElement 侧被过滤，不参与 children。
 * 3. 数组子节点（类 Fragment）→ ARRAY fiber，子项依次挂载。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { installSyncScheduler, mountRoot } from "./helpers/test-env";

describe("ReactNode shapes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders string and number children as text", async () => {
    vi.resetModules();
    const { restore } = installSyncScheduler();
    const { createElement, render } = await import("../src/mini-react");
    const root = mountRoot();
    try {
      render(createElement("p", { id: "p" }, "a", 2, createElement("span", {}, "inner")), root);
      const p = root.querySelector("#p");
      expect(p?.textContent).toBe("a2inner");
    } finally {
      restore();
    }
  });

  it("ignores null, undefined, and boolean literal children from createElement", async () => {
    vi.resetModules();
    const { restore } = installSyncScheduler();
    const { createElement, render } = await import("../src/mini-react");
    const root = mountRoot();
    try {
      render(
        createElement(
          "div",
          { id: "box" },
          "x",
          null,
          undefined,
          false,
          true,
          createElement("span", {}, "z")
        ),
        root
      );
      const box = root.querySelector("#box");
      expect(box?.childNodes.length).toBe(2);
      expect(box?.textContent).toBe("xz");
    } finally {
      restore();
    }
  });

  it("renders array child as multiple siblings (ARRAY fiber)", async () => {
    vi.resetModules();
    const { restore } = installSyncScheduler();
    const { createElement, render } = await import("../src/mini-react");
    const root = mountRoot();
    try {
      render(
        createElement("div", { id: "list" }, [
          createElement("span", { id: "i1" }, "1"),
          createElement("span", { id: "i2" }, "2")
        ]),
        root
      );
      const ids = Array.from(root.querySelectorAll("#list span")).map((el) => el.id);
      expect(ids).toEqual(["i1", "i2"]);
    } finally {
      restore();
    }
  });
});
