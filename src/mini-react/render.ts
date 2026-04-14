import { clearDeletion, rootFiber, setRootFiber } from "./constant";
import { createFiber } from "./create";
import { setRerender } from "./hook";
import { setWipFiber, workLoop } from "./schedule";
import { ReactElement, ReactNode } from "./types";

export function render(element: ReactElement, container: HTMLElement) {
  const rootFiber = createRootFiber(container, element);
  setRootFiber(rootFiber);
  const wipRootFiber = createRootFiber(container, element);
  setWipFiber(wipRootFiber);
  wipRootFiber.alternate = rootFiber;
  rootFiber.alternate = wipRootFiber;
  workLoop();
}

export function rerender() {
  if (rootFiber === undefined) throw new Error("rootFiber is null");
  const wipRootFiber = createRootFiber(
    rootFiber.dom as HTMLElement,
    rootFiber.children![0] as ReactElement
  );
  clearDeletion();
  wipRootFiber.alternate = rootFiber;
  setWipFiber(wipRootFiber);
  rootFiber.alternate = wipRootFiber;
  workLoop();
}
setRerender(rerender);

function createRootFiber(container: HTMLElement, childElement: ReactNode) {
  const rootFiber = createFiber(null);
  rootFiber.dom = container;
  rootFiber.children = [childElement];
  return rootFiber;
}
