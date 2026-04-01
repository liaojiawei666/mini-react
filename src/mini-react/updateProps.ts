/** @format */

import type { Props } from "./types";

// ============================================================================
// DOM Props Update - Simplified property handling
// ============================================================================

const eventListeners = new WeakMap<Node, Record<string, EventListener>>();

export function updateProps(dom: Node, nextProps: Props, prevProps: Props | null): void {
  if (!(dom instanceof HTMLElement)) return;

  const prev = prevProps ?? ({} as Props);
  const next = nextProps;

  // Remove old props
  for (const key in prev) {
    if (key === "children" || key === "nodeValue") continue;
    if (!(key in next)) {
      if (key.startsWith("on")) {
        removeEvent(dom, key);
      } else {
        dom.removeAttribute(key === "className" ? "class" : key);
      }
    }
  }

  // Set new props
  for (const key in next) {
    if (key === "children" || key === "nodeValue") continue;
    if (prev[key] === next[key]) continue;

    if (key.startsWith("on")) {
      setEvent(dom, key, next[key]);
    } else if (key === "className") {
      dom.setAttribute("class", next[key]);
    } else if (key === "style") {
      setStyle(dom, next[key]);
    } else {
      dom.setAttribute(key, next[key]);
    }
  }
}

function setEvent(dom: Node, key: string, handler: EventListener): void {
  const eventName = key.slice(2).toLowerCase();
  removeEvent(dom, key);

  const store = eventListeners.get(dom) ?? {};
  store[key] = handler;
  eventListeners.set(dom, store);

  dom.addEventListener(eventName, handler);
}

function removeEvent(dom: Node, key: string): void {
  const store = eventListeners.get(dom);
  if (!store || !store[key]) return;

  const eventName = key.slice(2).toLowerCase();
  dom.removeEventListener(eventName, store[key]);
  delete store[key];
}

function setStyle(dom: HTMLElement, style: Record<string, string> | string): void {
  if (typeof style === "string") {
    dom.style.cssText = style;
  } else {
    Object.assign(dom.style, style);
  }
}
