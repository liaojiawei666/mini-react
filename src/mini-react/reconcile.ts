import { TEXT_ELEMENT, type VNode } from "./types";
import { createDom, updateProps } from "./dom";
import { mountVNode } from "./render";
import { setHooksContext, clearHooksContext } from "./component";

/**
 * 调和算法：对比新旧 VNode 树，直接增量更新真实 DOM
 *
 * @param parentDom  父真实 DOM 节点
 * @param oldVNode   旧虚拟 DOM（可能为 null，表示新增）
 * @param newVNode   新虚拟 DOM（可能为 null，表示删除）
 * @returns 更新后的真实 DOM 节点
 */
export function reconcile(
  parentDom: HTMLElement,
  oldVNode: VNode | null,
  newVNode: VNode | null
): HTMLElement | Text | null {
  // 1. 新增：旧节点不存在
  if (oldVNode == null && newVNode != null) {
    const dom = mountVNode(newVNode);
    parentDom.appendChild(dom);
    return dom;
  }

  // 2. 删除：新节点不存在
  if (oldVNode != null && newVNode == null) {
    if (oldVNode._dom) {
      parentDom.removeChild(getDom(oldVNode)!);
    }
    return null;
  }

  // 两者都为 null
  if (oldVNode == null || newVNode == null) {
    return null;
  }

  // 3. 类型不同 → 替换
  if (oldVNode.type !== newVNode.type) {
    const newDom = mountVNode(newVNode);
    const oldDom = getDom(oldVNode)!;
    parentDom.replaceChild(newDom, oldDom);
    return newDom;
  }

  // 4. 文本节点：更新 nodeValue
  if (newVNode.type === TEXT_ELEMENT) {
    const dom = getDom(oldVNode) as Text;
    newVNode._dom = dom;
    if (oldVNode.props.nodeValue !== newVNode.props.nodeValue) {
      dom.nodeValue = newVNode.props.nodeValue;
    }
    return dom;
  }

  // 5. 函数组件
  if (typeof newVNode.type === "function") {
    const oldRendered = oldVNode._rendered ?? null;
    setHooksContext(newVNode, oldVNode);
    const newRendered = newVNode.type({
      ...newVNode.props,
      children: newVNode.children,
    });
    clearHooksContext();
    newVNode._rendered = newRendered;

    const dom = reconcile(parentDom, oldRendered, newRendered);
    newVNode._dom = dom;
    return dom;
  }

  // 6. 同类型原生元素：增量更新 props + 递归 reconcile children
  const dom = getDom(oldVNode) as HTMLElement;
  newVNode._dom = dom;

  updateProps(dom, oldVNode.props, newVNode.props);
  reconcileChildren(dom, oldVNode.children, newVNode.children);

  return dom;
}

/**
 * 逐索引对比子节点列表，递归 reconcile
 */
function reconcileChildren(
  parentDom: HTMLElement,
  oldChildren: VNode[],
  newChildren: VNode[]
): void {
  const maxLen = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < maxLen; i++) {
    const oldChild = oldChildren[i] ?? null;
    const newChild = newChildren[i] ?? null;

    reconcile(parentDom, oldChild, newChild);
  }
}

/**
 * 获取 VNode 对应的真实 DOM 节点
 * 函数组件需要向下穿透到实际 DOM
 */
function getDom(vnode: VNode): HTMLElement | Text | null {
  if (vnode._dom) return vnode._dom as HTMLElement | Text;
  if (vnode._rendered) return getDom(vnode._rendered);
  return null;
}
