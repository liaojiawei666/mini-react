export { createElement, createFiber } from "./create";
export { useState } from "./hook";
export { render, rerender } from "./render";
export type { ReactElement, ReactNode, Props } from "./types";

/** JSX 命名空间使用的虚拟节点类型 */
export type VNode = import("./types").ReactElement;
