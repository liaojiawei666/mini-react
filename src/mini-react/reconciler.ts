/** @format */

import { prepareHookContext, clearHookContext } from "./hooks";
import { updateProps } from "./updateProps";
import type { Element, Instance, Props } from "./types";

// ============================================================================
// Reconcile - Core Entry (parent → old → new)
// ============================================================================

export function reconcile(
  container: Node,
  oldInstance: Instance | null,
  element: Element | null,
  beforeNode: Node | null,
  parentRendered: boolean = false
): Instance | null {
  // console.log("reconcile", container, oldInstance, element, beforeNode, parentRendered);
  // element is null: unmount old if exists
  if (!element) {
    if (oldInstance) {
      unmount(oldInstance);
    }
    return null;
  }

  // Mount: no old instance
  if (!oldInstance) {
    return mount(container, element, beforeNode);
  }

  // Update: same type
  if (isSameType(oldInstance.element, element)) {
    return update(oldInstance, element, beforeNode, parentRendered);
  }

  // Replace: different type
  unmount(oldInstance);
  return mount(container, element, beforeNode);
}

function isSameType(oldElement: Element, newElement: Element): boolean {
  return oldElement.type === newElement.type;
}

// ============================================================================
// Mount - First time rendering
// ============================================================================

function mount(container: Node, element: Element, beforeNode: Node | null = null): Instance {
  if (typeof element.type === "function") {
    return mountComponent(container, element, beforeNode);
  }
  return mountHost(container, element, beforeNode);
}

function mountComponent(
  container: Node,
  element: Element,
  beforeNode: Node | null = null
): Instance {
  const instance: Instance = {
    element,
    dom: null,
    hooks: [],
    childInstances: []
  };
  prepareHookContext(instance);
  const childElement = (element.type as (props: Props) => Element)(element.props);
  clearHookContext();

  instance.childInstances[0] = mount(container, childElement, beforeNode);

  return instance;
}

function mountHost(container: Node, element: Element, beforeNode: Node | null = null): Instance {
  const dom =
    element.type === "TEXT_NODE"
      ? document.createTextNode(element.props.nodeValue)
      : document.createElement(element.type as string);

  if (dom instanceof HTMLElement) {
    updateProps(dom, element.props, null);
  }

  if (beforeNode && beforeNode) {
    container.insertBefore(dom, beforeNode);
  } else {
    container.appendChild(dom);
  }

  // 保留 null 占位，与 children 数组索引对齐，以便 reconcile 时正确匹配
  const childInstances: (Instance | null)[] = (element.props.children ?? []).map((child) =>
    child ? mount(dom, child) : null
  );

  return {
    element,
    dom,
    hooks: [],
    childInstances
  };
}

// ============================================================================
// Update - Re-rendering with existing instance
// ============================================================================

function update(
  oldInstance: Instance,
  element: Element,
  beforeNode: Node | null,
  parentRendered: boolean
): Instance {
  if (typeof element.type === "function") {
    return updateComponent(oldInstance, element, beforeNode, parentRendered);
  }
  return updateHost(oldInstance, element, parentRendered);
}

function updateComponent(
  oldInstance: Instance,
  element: Element,
  beforeNode: Node | null,
  parentRendered: boolean
): Instance {
  const instance = oldInstance;
  let childElement: Element | null = null;
  // currentRendered 表示“从子组件视角看，这一层是否在本轮被执行过”
  // 情况：
  // 1. 父组件已经执行过 → parentRendered 为 true
  // 2. 当前组件因为 isDirty 重新执行过 → 我们在下面的分支里设为 true
  let currentRendered = parentRendered;

  if (!parentRendered && !instance.isDirty) {
    childElement = instance.childInstances[0]?.element ?? null;
  } else {
    prepareHookContext(instance);
    childElement = (element.type as (props: Props) => Element)(element.props);
    clearHookContext();
    currentRendered = true;
  }

  const oldChildInstance = instance.childInstances[0];
  const parentDom = getParentDom(oldChildInstance)!;
  const childInstance = reconcile(
    parentDom,
    oldChildInstance,
    childElement,
    beforeNode,
    currentRendered
  );
  instance.element = element;
  instance.dom = null;
  instance.childInstances = [childInstance];
  instance.isDirty = false;

  return instance;
}

function updateHost(oldInstance: Instance, element: Element, parentRendered: boolean): Instance {
  const instance = oldInstance;
  const dom = instance.dom!;

  // Handle text node updates
  if (element.type === "TEXT_NODE") {
    const newText = element.props.nodeValue;
    const oldText = instance.element.props.nodeValue;
    if (newText !== oldText) {
      (dom as Text).nodeValue = newText;
    }
    instance.element = element;
    instance.childInstances = [];
    return instance;
  }

  updateProps(dom, element.props, instance.element.props);

  const childInstances = reconcileChildren(
    dom,
    instance.childInstances,
    element.props.children ?? [],
    parentRendered
  );

  instance.element = element;
  instance.childInstances = childInstances;

  return instance;
}

function getDom(instance: Instance | null): Node | null {
  let currentInstance = instance;
  while (currentInstance && !currentInstance.dom) {
    currentInstance = currentInstance.childInstances[0];
  }
  return currentInstance?.dom ?? null;
}

function getParentDom(instance: Instance | null): Node | null {
  const dom = getDom(instance);
  return dom?.parentNode ?? null;
}

// ============================================================================
// Reconcile Children - Diff logic
// ============================================================================

function reconcileChildren(
  container: Node,
  oldInstances: (Instance | null)[],
  elements: (Element | null)[],
  parentRendered: boolean
): (Instance | null)[] {
  const orderMap = new Map<number, number>();
  const oldInstanceMap = new Map<string, number[]>();
  const matchedOldIndices = new Set<number>();
  oldInstances.forEach((instance, index) => {
    const key = instance?.element.props?.key;
    if (key !== undefined) {
      const indices = oldInstanceMap.get(key) ?? [];
      indices.push(index);
      oldInstanceMap.set(key, indices);
    }
  });
  elements.forEach((element, index) => {
    const key = element?.props?.key;
    if (key !== undefined && oldInstanceMap.has(key)) {
      const oldIndices = oldInstanceMap.get(key)!;
      const oldIndex = oldIndices.shift()!;
      matchedOldIndices.add(oldIndex);
      orderMap.set(index, oldIndex);
      if (oldIndices.length === 0) {
        oldInstanceMap.delete(key);
      }
    }
  });
  let oldIndex = 0;
  const instances: (Instance | null)[] = [];
  let beforeNode: Node | null = container.firstChild;
  elements.forEach((element, index) => {
    let instance: Instance | null = null;
    if (orderMap.has(index)) {
      oldIndex = orderMap.get(index)!;
      instance = reconcile(container, oldInstances[oldIndex], element, beforeNode, parentRendered);
    } else {
      while (oldIndex < oldInstances.length && matchedOldIndices.has(oldIndex)) {
        oldIndex++;
      }
      if (oldIndex < oldInstances.length) {
        instance = reconcile(
          container,
          oldInstances[oldIndex],
          element,
          beforeNode,
          parentRendered
        );
        oldIndex++;
      } else {
        instance = reconcile(container, null, element, beforeNode, parentRendered);
      }
    }
    instances.push(instance);
    const currentDom = getDom(instance);
    // 注意，这里要插入到beforeNode之前
    beforeNode = currentDom ? currentDom.nextSibling : beforeNode;
  });
  for (let i = elements.length; i < oldInstances.length; i++) {
    unmount(oldInstances[i]!);
  }
  return instances;
}

// ============================================================================
// Unmount - Remove from DOM
// ============================================================================

function unmount(instance: Instance | null): void {
  if (!instance) return;
  if (instance.dom) {
    instance.dom.parentNode?.removeChild(instance.dom);
  }
  instance.childInstances.forEach((child) => {
    if (child) unmount(child);
  });
}
