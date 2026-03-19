// JSX 类型声明，让 TypeScript 识别 JSX 语法

import type { VNode } from "./types";

declare global {
  namespace JSX {
    type Element = VNode;

    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
