import { commitRoot } from "./commitRoot";
import { reconcile } from "./reconcile";
import { Fiber } from "./types";

let wipFiber: Fiber | undefined = undefined;

const { port1, port2 } = new MessageChannel();

const SLICE_TIME = 5; //5ms
let startTime: number | null = null;
function shouldYield() {
  const currentTime = performance.now();
  if (startTime === null) {
    startTime = currentTime;
  }
  if (currentTime - startTime > SLICE_TIME) {
    startTime = currentTime;
    port2.postMessage(null);
    return true;
  }
  return false;
}
port1.onmessage = () => {
  workLoop();
};

export function setWipFiber(fiber: Fiber) {
  wipFiber = fiber;
}

export function workLoop() {
  while (wipFiber) {
    wipFiber = performUnitOfWork(wipFiber);
    if (shouldYield()) {
      return;
    }
  }
  commitRoot();
}

/** 深度优先、先序：先 reconcile 当前 fiber，再依次走 child → 回溯 sibling。 */
function performUnitOfWork(fiber: Fiber): Fiber | undefined {
  reconcile(fiber);
  if (fiber.child) return fiber.child;
  let nextFiber: Fiber | undefined = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling;
    nextFiber = nextFiber.parent;
  }
  return undefined;
}
