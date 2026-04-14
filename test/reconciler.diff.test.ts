/**
 * 测试要点（reconcile / diff）：
 * 1. 同 key 重排、头部插入新节点时，已存在兄弟顺序正确。
 * 2. 条件渲染卸载时，DOM 被移除且不影响其余兄弟。
 * 3. 同位置类型替换（旧 host 被删除、新 host 插入）。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { installSyncScheduler, mountRoot } from "./helpers/test-env";

describe("reconciler / diff", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("preserves order with keyed head insert and middle insert", async () => {
    vi.resetModules();
    const { restore } = installSyncScheduler();
    const { createElement, render, useState } = await import("../src/mini-react");
    const root = mountRoot();
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

      const order = () => Array.from(root.querySelectorAll("#wrap span")).map((el) => el.id);
      const next = root.querySelector("#next") as HTMLButtonElement;

      expect(order()).toEqual(["b", "d"]);
      next.click();
      await Promise.resolve();
      expect(order()).toEqual(["a", "b", "d"]);
      next.click();
      await Promise.resolve();
      expect(order()).toEqual(["a", "b", "c", "d"]);
    } finally {
      restore();
    }
  });

  it("removes conditional subtree when toggled off", async () => {
    vi.resetModules();
    const { restore } = installSyncScheduler();
    const { createElement, render, useState } = await import("../src/mini-react");
    const root = mountRoot();
    try {
      function Toggle() {
        const [on, setOn] = useState(true);
        return createElement(
          "div",
          { id: "host" },
          createElement(
            "button",
            { id: "t", type: "button", onClick: () => setOn((o) => !o) },
            "t"
          ),
          on ? createElement("span", { id: "gone" }, "x") : null,
          createElement("span", { id: "stay" }, "y")
        );
      }
      render(createElement(Toggle, {}), root);
      expect(root.querySelector("#gone")).toBeTruthy();
      (root.querySelector("#t") as HTMLButtonElement).click();
      await Promise.resolve();
      expect(root.querySelector("#gone")).toBeNull();
      expect(root.querySelector("#stay")?.textContent).toContain("y");
    } finally {
      restore();
    }
  });

  it("replaces host type at the same slot", async () => {
    vi.resetModules();
    const { restore } = installSyncScheduler();
    const { createElement, render, useState } = await import("../src/mini-react");
    const root = mountRoot();
    try {
      function Swap() {
        const [useDiv, setUseDiv] = useState(true);
        const node = useDiv
          ? createElement("div", { id: "slot", "data-kind": "div" }, "d")
          : createElement("span", { id: "slot", "data-kind": "span" }, "s");
        return createElement(
          "div",
          {},
          createElement(
            "button",
            { type: "button", id: "sw", onClick: () => setUseDiv((v) => !v) },
            "go"
          ),
          node
        );
      }
      render(createElement(Swap, {}), root);
      let slot = root.querySelector("#slot");
      expect(slot?.nodeName.toLowerCase()).toBe("div");
      (root.querySelector("#sw") as HTMLButtonElement).click();
      await Promise.resolve();
      slot = root.querySelector("#slot");
      expect(slot?.nodeName.toLowerCase()).toBe("span");
      expect(slot?.getAttribute("data-kind")).toBe("span");
    } finally {
      restore();
    }
  });
});
