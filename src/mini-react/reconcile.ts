import { addDeletion } from "./constant";
import { createFiber } from "./create";
import { clearHookContext, prepareHookContext } from "./hook";
import { Fiber, FiberState, FiberType, Key, ReactElement, ReactNode, TEXT_NODE } from "./types";

function getKey(node: ReactNode): Key | undefined {
  if (node === null || typeof node !== "object") return undefined;
  if (Array.isArray(node)) return undefined;
  const key = (node as ReactElement).props.key;
  if (key === undefined || key === "") return undefined;
  return key;
}

function isSameType(oldFiber: Fiber | undefined, newFiber: Fiber): boolean {
  if (oldFiber === undefined) return false;
  return oldFiber.type === newFiber.type;
}

export function reconcile(wipFiber: Fiber) {
  const currentFiber = wipFiber.alternate;
  // 固定根 fiber（type null、parent null）的 dom 是容器，不能进 deletionList
  if (wipFiber.type === null && wipFiber.parent !== undefined) {
    if (currentFiber?.dom) addDeletion(currentFiber.dom);
  } else if (isSameType(currentFiber, wipFiber)) {
    updateFiber(wipFiber);
  } else {
    placementFiber(wipFiber);
  }
}

function isFunctionComponent(fiberType: FiberType): boolean {
  return typeof fiberType === "function";
}

function updateFiber(wipFiber: Fiber) {
  wipFiber.effectTag = "UPDATE";
  const currentFiber = wipFiber.alternate;
  if (currentFiber === undefined) throw new Error("currentFiber is undefined");

  if (isFunctionComponent(wipFiber.type)) {
    wipFiber.state = currentFiber.state as FiberState;
    wipFiber.children = currentFiber.children;

    if (wipFiber.parent?.isRerender || wipFiber.state.isDirty) {
      wipFiber.isRerender = true;
      prepareHookContext(wipFiber.state);
      const childNode = (wipFiber.type as Function)(wipFiber.props);
      wipFiber.children = [childNode];
      clearHookContext();
    }
  }
  reconcileChildren(wipFiber, (wipFiber.children ?? []) as ReactNode[]);
}

function placementFiber(wipFiber: Fiber) {
  wipFiber.effectTag = "PLACEMENT";
  if (isFunctionComponent(wipFiber.type)) {
    wipFiber.state = { list: [], isDirty: false };
    prepareHookContext(wipFiber.state);
    const childNode: ReactNode = (wipFiber.type as Function)(wipFiber.props);
    clearHookContext();
    wipFiber.children = [childNode];
  }

  reconcileChildren(wipFiber, (wipFiber.children ?? []) as ReactNode[]);
}

function reconcileChildren(wipFiber: Fiber, children: ReactNode[]) {
  let currentFiber = wipFiber.alternate;
  const oldChildFiberList: Fiber[] = [];
  let currentChildFiber = currentFiber?.child;
  const oldChildFiberMap = new Map<string, number[]>();
  // 记录旧的子节点索引
  while (currentChildFiber) {
    oldChildFiberList.push(currentChildFiber);
    const currentIndex = oldChildFiberList.length - 1;
    const key = currentChildFiber.key;
    if (key) {
      const oldChildFiberList = oldChildFiberMap.get(key);
      if (oldChildFiberList) {
        oldChildFiberList.push(currentIndex);
      } else {
        oldChildFiberMap.set(key, [currentIndex]);
      }
    }
    currentChildFiber = currentChildFiber.sibling;
  }
  // 按key匹配索引
  const matchedKeyIndexMap = new Map<number, Fiber>();
  const matchedOldIndexSet = new Set<number>();
  children.forEach((item, index) => {
    const key = getKey(item);
    if (key === undefined || !oldChildFiberMap.has(key)) return;
    const oldIndices = oldChildFiberMap.get(key)!;
    const oldIndex = oldIndices.shift()!;
    matchedKeyIndexMap.set(index, oldChildFiberList[oldIndex]);
    if (oldIndices.length === 0) {
      oldChildFiberMap.delete(key);
    }
    matchedOldIndexSet.add(oldIndex);
  });

  let nextUnmatchedOldIndex = 0;
  let previousSiblingFiber: Fiber | undefined;
  children.forEach((reactNode, index) => {
    // 创建fiber，并更新指针
    const fiber = createFiber(reactNode);
    fiber.parent = wipFiber;
    if (previousSiblingFiber) {
      previousSiblingFiber.sibling = fiber;
    } else {
      wipFiber.child = fiber;
    }
    previousSiblingFiber = fiber;

    // 查找旧fiber
    let oldFiber = matchedKeyIndexMap.get(index);
    if (oldFiber === undefined) {
      // key未匹配上，按照索引匹配
      while (
        nextUnmatchedOldIndex < oldChildFiberList.length &&
        matchedOldIndexSet.has(nextUnmatchedOldIndex)
      ) {
        nextUnmatchedOldIndex++;
      }
      if (nextUnmatchedOldIndex < oldChildFiberList.length) {
        matchedOldIndexSet.add(nextUnmatchedOldIndex);
        oldFiber = oldChildFiberList[nextUnmatchedOldIndex];
      }
    }
    fiber.alternate = oldFiber;
  });

  // 移除多余的旧fiber
  oldChildFiberList.forEach((oldFiber, index) => {
    if (!matchedOldIndexSet.has(index)) {
      if (oldFiber.dom) addDeletion(oldFiber.dom);
    }
  });
}
