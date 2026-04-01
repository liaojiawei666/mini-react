/** @format */

import { reconcile } from "./reconciler";
import { setScheduleUpdate } from "./hooks";
import type { Element, Instance } from "./types";

let rootInstance: Instance | null = null;
let rootContainer: Node | null = null;
let rootElement: Element | null = null;

// ============================================================================
// Batched Update Scheduling
// ============================================================================

let isPending = false;

function scheduleUpdate(): void {
  if (isPending) return;
  isPending = true;
  queueMicrotask(() => {
    isPending = false;
    rerender();
  });
}

function rerender(): void {
  if (rootElement && rootContainer) {
    rootInstance = reconcile(rootContainer, rootInstance, rootElement, rootContainer.firstChild);
  }
}

setScheduleUpdate(scheduleUpdate);

// ============================================================================
// Public API
// ============================================================================

export function render(element: Element, container: Node): void {
  rootElement = element;
  rootContainer = container;
  rootInstance = reconcile(container, rootInstance, element, container.firstChild);
}
