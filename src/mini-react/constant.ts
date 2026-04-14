import { Fiber } from "./types";

export let rootFiber: Fiber | undefined = undefined;

export let deletionList: Node[] = [];

export function addDeletion(dom: Node) {
  deletionList.push(dom);
}

export function clearDeletion() {
  deletionList = [];
}

export function setRootFiber(wipRootFiber: Fiber) {
  rootFiber = wipRootFiber;
  rootFiber.alternate = undefined;
}
