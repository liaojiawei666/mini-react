import type { VNode } from "./mini-react";

declare global {
  namespace JSX {
    type Element = VNode;
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
