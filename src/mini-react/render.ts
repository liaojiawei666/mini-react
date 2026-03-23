import { TEXT_ELEMENT, type VNode } from "./types";
import { createDom, updateProps } from "./dom";
import { setHooksContext, clearHooksContext } from "./component";

/**
 * 将 VNode 树递归挂载为真实 DOM
 * 返回创建的根 DOM 节点
 */
export function mountVNode(vnode: VNode): HTMLElement | Text {
  // 函数组件
  if (typeof vnode.type === "function") {
    setHooksContext(vnode, null);
    const childVNode = vnode.type({ ...vnode.props, children: vnode.children });
    console.log("childVNodeType", childVNode.type);
    clearHooksContext();
    vnode._rendered = childVNode;
    const dom = mountVNode(childVNode);
    vnode._dom = dom;
    console.log(vnode._dom === vnode._rendered._dom);
    return dom;
  }

  // 文本节点
  if (vnode.type === TEXT_ELEMENT) {
    const textNode = document.createTextNode(vnode.props.nodeValue);
    vnode._dom = textNode;
    return textNode;
  }

  // 原生 HTML 元素
  const dom = document.createElement(vnode.type);
  updateProps(dom, {}, vnode.props);

  // 递归挂载子节点
  for (const child of vnode.children) {
    const childDom = mountVNode(child);
    dom.appendChild(childDom);
  }

  vnode._dom = dom;
  return dom;
}
