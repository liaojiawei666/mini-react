/** @format */

import type { Element, ElementType } from "./types";

function createTextElement(value: string | number): Element {
  return {
    type: "TEXT_NODE",
    props: {
      nodeValue: String(value),
      children: []
    }
  };
}

export function createElement(
  type: ElementType,
  props: Record<string, any> | null,
  ...children: any[]
): Element {
  return {
    type,
    props: {
      ...(props ?? {}),
      children: children.flat().map((child) => {
        if (child === false || child === null || child === undefined) return null;
        return typeof child === "string" || typeof child === "number"
          ? createTextElement(child)
          : child;
      })
    }
  };
}
