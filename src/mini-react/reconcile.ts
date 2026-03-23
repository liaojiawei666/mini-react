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
    const oldDom = getDom(oldVNode);
    if (oldDom) {
      parentDom.removeChild(oldDom);
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
 * 基于 key 的 diff 算法对比子节点列表
 * 策略：
 * 1. 优先按 key 匹配相同节点进行复用
 * 2. 无法匹配 key 时按索引对比
 * 3. 处理新增、删除、移动三种操作
 */
function reconcileChildren(
  parentDom: HTMLElement,
  oldChildren: VNode[],
  newChildren: VNode[]
): void {
  // 构建旧子节点的 key 到索引的映射
  const oldKeyToIndex = new Map<string | number, number>();
  oldChildren.forEach((child, index) => {
    if (child.key != null) {
      oldKeyToIndex.set(child.key, index);
    }
  });

  let oldIndex = 0;
  let lastPlacedIndex = 0;

  for (let newIndex = 0; newIndex < newChildren.length; newIndex++) {
    const newChild = newChildren[newIndex];
    const newKey = newChild.key;

    // 1. 尝试通过 key 找到匹配的旧节点
    let oldChild: VNode | null = null;
    let matchedOldIndex = -1;

    if (newKey != null) {
      // 有 key：从 map 中查找
      matchedOldIndex = oldKeyToIndex.get(newKey) ?? -1;
      if (matchedOldIndex !== -1) {
        oldChild = oldChildren[matchedOldIndex];
      }
    } else {
      // 无 key：按索引对比
      while (oldIndex < oldChildren.length) {
        const candidate = oldChildren[oldIndex];
        // 跳过已经有 key 且被匹配过的节点
        if (candidate.key != null && oldKeyToIndex.has(candidate.key)) {
          oldIndex++;
          continue;
        }
        oldChild = candidate;
        matchedOldIndex = oldIndex;
        oldIndex++;
        break;
      }
    }

    // 2. 判断是否找到匹配
    const sameType = oldChild != null && oldChild.type === newChild.type;

    if (oldChild != null && sameType) {
      // 找到同类型节点：复用并移动（如果需要）
      const dom = reconcile(parentDom, oldChild, newChild);

      // 移动节点到正确位置
      if (dom && matchedOldIndex < lastPlacedIndex) {
        // 需要移动：插入到当前新节点应该在的位置
        const nextSibling = parentDom.childNodes[newIndex] ?? null;
        if (nextSibling && dom !== nextSibling) {
          parentDom.insertBefore(dom, nextSibling as Node);
        }
      } else if (dom) {
        lastPlacedIndex = matchedOldIndex;
      }

      // 标记已使用（从 map 中删除）
      if (newKey != null) {
        oldKeyToIndex.delete(newKey);
      }
    } else {
      // 未找到匹配：新增节点
      const dom = mountVNode(newChild);
      const nextSibling = parentDom.childNodes[newIndex] ?? null;
      if (nextSibling) {
        parentDom.insertBefore(dom, nextSibling as Node);
      } else {
        parentDom.appendChild(dom);
      }

      // 如果找到了不同类型节点，需要删除它
      if (oldChild != null) {
        const oldDom = getDom(oldChild);
        if (oldDom) {
          parentDom.removeChild(oldDom);
        }
        if (newKey != null) {
          oldKeyToIndex.delete(newKey);
        }
      }
    }
  }

  // 3. 删除未被复用的旧节点
  for (const [key, index] of oldKeyToIndex) {
    const oldChild = oldChildren[index];
    const oldDom = getDom(oldChild);
    if (oldDom) {
      parentDom.removeChild(oldDom);
    }
  }

  // 处理无 key 且未被遍历到的剩余旧节点
  while (oldIndex < oldChildren.length) {
    const oldChild = oldChildren[oldIndex];
    if (oldChild.key == null) {
      const oldDom = getDom(oldChild);
      if (oldDom) {
        parentDom.removeChild(oldDom);
      }
    }
    oldIndex++;
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
