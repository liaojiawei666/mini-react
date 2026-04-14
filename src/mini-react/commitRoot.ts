import { clearDeletion, deletionList, rootFiber, setRootFiber } from "./constant";
import { updateProps } from "./updateProps";
import { Fiber, TEXT_NODE } from "./types";

function isHostFiber(fiber: Fiber): boolean {
  return typeof fiber.type === "string" && fiber.type !== TEXT_NODE;
}

/** leaf 向上折到 ancestor 下的直接子结点（insertBefore 的 ref 须是 host 的直接子）。 */
function directChildOf(ancestor: HTMLElement, leaf: Node): ChildNode | null {
  let n: Node | null = leaf;
  while (n && n.parentNode !== ancestor) {
    n = n.parentNode;
  }
  return n as ChildNode | null;
}

/** 在 parentHost 下，把 dom 插到 prevSiblingDom 的后面。 */
function insertAfterPrev(
  parentHost: HTMLElement,
  dom: Node,
  prevSiblingDom: ChildNode | null
): ChildNode {
  const insertBeforeNode = prevSiblingDom ? prevSiblingDom.nextSibling : parentHost.firstChild;
  parentHost.insertBefore(dom, insertBeforeNode);
  const directChild = directChildOf(parentHost, dom);
  if (directChild === null) {
    throw new Error("insertAfterPrev: inserted dom is not a direct child of parentHost");
  }
  return directChild;
}

function getFiberDirectChild(parentHost: HTMLElement, fiber: Fiber): ChildNode | null {
  const dom = fiber.dom ?? fiber.alternate?.dom;
  if (!dom) return null;
  return directChildOf(parentHost, dom);
}

function commitFiberDom(
  parentHost: HTMLElement,
  fiber: Fiber,
  prevSiblingDom: ChildNode | null
): ChildNode | null {
  const tag = fiber.effectTag;
  if (tag === "PLACEMENT") {
    if (fiber.type === TEXT_NODE) {
      const createdDom = document.createTextNode(String(fiber.props?.nodeValue ?? ""));
      fiber.dom = createdDom;
      return insertAfterPrev(parentHost, createdDom, prevSiblingDom);
    }
    if (isHostFiber(fiber)) {
      const createdDom = document.createElement(fiber.type as string);
      fiber.dom = createdDom;
      updateProps(createdDom, fiber.props ?? {}, {});
      return insertAfterPrev(parentHost, createdDom, prevSiblingDom);
    }
    return null;
  }

  if (tag === "UPDATE") {
    if (fiber.type === TEXT_NODE) {
      const alt = fiber.alternate;
      if (alt?.dom) {
        fiber.dom = alt.dom;
        const prev = String(alt.props?.nodeValue ?? "");
        const next = String(fiber.props?.nodeValue ?? "");
        if (prev !== next) (fiber.dom as Text).nodeValue = next;
      }
      return getFiberDirectChild(parentHost, fiber);
    }
    if (isHostFiber(fiber)) {
      const alt = fiber.alternate;
      if (alt?.dom) {
        fiber.dom = alt.dom;
        updateProps(fiber.dom as Element, fiber.props ?? {}, alt.props ?? {});
      }
      return getFiberDirectChild(parentHost, fiber);
    }
  }

  return null;
}

function commitDeletionEffects() {
  for (const node of deletionList) {
    node.parentNode?.removeChild(node);
  }
  clearDeletion();
}

/** 提交一棵子树，返回 parentHost 下当前已提交序列的尾 direct child。 */
function commitSubtree(
  parentHost: HTMLElement,
  fiber: Fiber | null,
  prevSiblingDom: ChildNode | null
): ChildNode | null {
  if (fiber === null) return prevSiblingDom;

  const currentFiberDom = commitFiberDom(parentHost, fiber, prevSiblingDom);
  const hostDom = fiber.dom;

  if (hostDom instanceof HTMLElement) {
    let tailDom: ChildNode | null = null;
    for (let child = fiber.child; child; child = child.sibling) {
      tailDom = commitSubtree(hostDom, child, tailDom);
    }
    return currentFiberDom ?? prevSiblingDom;
  }

  let tailDom = currentFiberDom ?? prevSiblingDom;
  for (let child = fiber.child; child; child = child.sibling) {
    tailDom = commitSubtree(parentHost, child, tailDom);
  }
  return tailDom;
}

export function commitRoot() {
  if (rootFiber === undefined || rootFiber.alternate === undefined) {
    return;
  }
  const wipRootFiber = rootFiber.alternate;
  const parentHost = wipRootFiber.dom;
  if (!(parentHost instanceof HTMLElement)) {
    throw new Error("commitRoot: root fiber dom is not an HTMLElement container");
  }
  commitDeletionEffects();
  commitSubtree(parentHost, wipRootFiber, null);
  setRootFiber(wipRootFiber);
}
