import type { VNode, ComponentFunction, Hook } from "./types";
import { mountVNode } from "./render";
import { reconcile } from "./reconcile";

// ---- Hooks 执行上下文 ----

interface HooksContext {
  /** 当前正在渲染的函数组件 VNode */
  vnode: VNode;
  /** 上一次渲染同一组件的 VNode（用于复用 hooks 状态） */
  oldVNode: VNode | null;
  /** 当前 hook 游标，每次调用 useState 递增 */
  hookIndex: number;
}

let currentCtx: HooksContext | null = null;

/**
 * 设置当前 hooks 上下文（在渲染函数组件前调用）
 * 供 render.ts 和 reconcile.ts 使用
 */
export function setHooksContext(vnode: VNode, oldVNode: VNode | null): void {
  vnode._hooks = vnode._hooks ?? [];
  currentCtx = { vnode, oldVNode, hookIndex: 0 };
}

/**
 * 清除 hooks 上下文（函数组件渲染完成后调用）
 */
export function clearHooksContext(): void {
  currentCtx = null;
}

// ---- useState ----

/**
 * useState hook — 与 React 的 useState 用法一致
 *
 * 用法：
 *   function Counter() {
 *     const [count, setCount] = useState(0);
 *     return <button onClick={() => setCount(count + 1)}>{count}</button>;
 *   }
 *
 * 原理：
 * - 每个函数组件 VNode 上维护一个 _hooks 数组
 * - 每次渲染时 hookIndex 从 0 开始递增
 * - 首次渲染：初始化 hook，存入 _hooks[index]
 * - 再次渲染：从 oldVNode._hooks[index] 复用已有状态
 */
export function useState<T>(
  initialValue: T
): [T, (val: T | ((prev: T) => T)) => void] {
  if (!currentCtx) {
    throw new Error("useState must be called inside a function component");
  }

  const ctx = currentCtx;
  const index = ctx.hookIndex++;
  const hooks = ctx.vnode._hooks!;

  // 从旧 VNode 复用状态，或初始化
  if (ctx.oldVNode?._hooks && index < ctx.oldVNode._hooks.length) {
    hooks[index] = ctx.oldVNode._hooks[index];
  } else if (!hooks[index]) {
    hooks[index] = { state: initialValue };
  }

  const hook = hooks[index];
  const value: T = hook.state;

  // setter 捕获当前 hook 引用，确保更新正确的 slot
  const setter = (newVal: T | ((prev: T) => T)): void => {
    if (typeof newVal === "function") {
      hook.state = (newVal as (prev: T) => T)(hook.state);
    } else {
      hook.state = newVal;
    }
    scheduleUpdate();
  };

  return [value, setter];
}

// ---- 应用实例 & 调度 ----

interface AppInstance {
  rootComponent: ComponentFunction;
  container: HTMLElement;
  currentVNode: VNode | null;
  pendingUpdate: boolean;
}

let appInstance: AppInstance | null = null;

/**
 * 创建应用实例并首次渲染
 */
export function createApp(
  rootComponent: ComponentFunction,
  container: HTMLElement
): void {
  appInstance = {
    rootComponent,
    container,
    currentVNode: null,
    pendingUpdate: false,
  };

  // 首次渲染
  const vnode = rootComponent({});
  appInstance.currentVNode = vnode;

  container.innerHTML = "";
  const dom = mountVNode(vnode);
  container.appendChild(dom);
}

/**
 * 调度重渲染（通过 microtask 批量合并多次 setState）
 */
function scheduleUpdate(): void {
  if (!appInstance || appInstance.pendingUpdate) return;
  appInstance.pendingUpdate = true;

  queueMicrotask(() => {
    if (!appInstance) return;
    appInstance.pendingUpdate = false;

    const oldVNode = appInstance.currentVNode;
    const newVNode = appInstance.rootComponent({});

    reconcile(appInstance.container, oldVNode, newVNode);
    appInstance.currentVNode = newVNode;
  });
}
