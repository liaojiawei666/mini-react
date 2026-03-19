import { TEXT_ELEMENT, type VNode } from "./types";

/**
 * 根据 VNode 创建真实 DOM 节点（不递归创建子节点）
 */
export function createDom(vnode: VNode): HTMLElement | Text {
  if (vnode.type === TEXT_ELEMENT) {
    return document.createTextNode(vnode.props.nodeValue);
  }

  const dom = document.createElement(vnode.type as string);
  updateProps(dom as HTMLElement, {}, vnode.props);
  return dom;
}

/**
 * 增量更新 DOM 属性（包括事件）
 */
export function updateProps(
  dom: HTMLElement,
  oldProps: Record<string, any>,
  newProps: Record<string, any>
): void {
  // 移除旧属性（在 newProps 中不存在的）
  for (const key of Object.keys(oldProps)) {
    if (key === "children" || key === "key") continue;
    if (!(key in newProps)) {
      removeProp(dom, key, oldProps[key]);
    }
  }

  // 设置新属性 / 更新变化的属性
  for (const key of Object.keys(newProps)) {
    if (key === "children" || key === "key") continue;
    if (oldProps[key] === newProps[key]) continue;

    // 事件：先移除旧的再绑新的
    if (isEvent(key)) {
      if (oldProps[key]) {
        dom.removeEventListener(eventName(key), oldProps[key]);
      }
      dom.addEventListener(eventName(key), newProps[key]);
    } else if (key === "style") {
      setStyle(dom, oldProps.style, newProps.style);
    } else if (key === "className") {
      dom.className = newProps[key] ?? "";
    } else if (key === "value" && dom instanceof HTMLInputElement) {
      dom.value = newProps[key] ?? "";
    } else {
      dom.setAttribute(key, newProps[key]);
    }
  }
}

function removeProp(dom: HTMLElement, key: string, value: any): void {
  if (isEvent(key)) {
    dom.removeEventListener(eventName(key), value);
  } else if (key === "style") {
    dom.removeAttribute("style");
  } else if (key === "className") {
    dom.className = "";
  } else {
    dom.removeAttribute(key);
  }
}

function setStyle(
  dom: HTMLElement,
  oldStyle: Record<string, string> | undefined,
  newStyle: Record<string, string> | undefined
): void {
  // 移除旧 style 中不存在于新 style 的属性
  if (oldStyle) {
    for (const prop of Object.keys(oldStyle)) {
      if (!newStyle || !(prop in newStyle)) {
        (dom.style as any)[prop] = "";
      }
    }
  }
  // 设置新 style
  if (newStyle) {
    for (const prop of Object.keys(newStyle)) {
      (dom.style as any)[prop] = newStyle[prop];
    }
  }
}

/** 判断 prop 名是否为事件（on 开头） */
function isEvent(key: string): boolean {
  return key.startsWith("on") && key.length > 2;
}

/** onClick → click */
function eventName(key: string): string {
  return key.slice(2).toLowerCase();
}
