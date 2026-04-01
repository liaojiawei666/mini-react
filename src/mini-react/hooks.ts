/** @format */

import type { Instance } from "./types";

let currentInstance: Instance | null = null;
let hookIndex = 0;
let scheduleUpdate: () => void = () => {};

export function setScheduleUpdate(fn: () => void): void {
  scheduleUpdate = fn;
}

/**
 * 准备 hooks 上下文
 * @param instance - 传入当前组件对应的 instance（mount / update 共用）
 */
export function prepareHookContext(instance: Instance): void {
  currentInstance = instance;
  hookIndex = 0;
}

export function clearHookContext(): void {
  currentInstance = null;
  hookIndex = 0;
}

export function useState<T>(initial: T): [T, (v: T | ((p: T) => T)) => void] {
  if (!currentInstance) {
    throw new Error("useState must be called inside a component");
  }

  const ctx = currentInstance;
  const i = hookIndex++;

  if (ctx.hooks[i] === undefined) {
    ctx.hooks[i] = initial;
  }

  const setState = (next: T | ((p: T) => T)) => {
    const prev = ctx.hooks[i] as T;
    const nextValue = typeof next === "function" ? (next as (p: T) => T)(prev) : next;

    if (!Object.is(prev, nextValue)) {
      ctx.hooks[i] = nextValue;
      ctx.isDirty = true;
      scheduleUpdate();
    }
  };

  return [ctx.hooks[i] as T, setState];
}
