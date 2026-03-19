import { TEXT_ELEMENT, type VNode, type Props, type ComponentFunction } from "./types";

/**
 * 创建虚拟 DOM 节点（JSX 工厂函数）
 *
 * JSX: <div id="x">hello</div>
 *  =>  createElement("div", { id: "x" }, "hello")
 */
export function createElement(
  type: string | ComponentFunction,
  props: Props | null,
  ...rawChildren: any[]
): VNode {
  const resolvedProps: Props = props ?? {};
  const key = resolvedProps.key ?? null;

  // 从 props 中移除 key，不传给组件
  if (resolvedProps.key !== undefined) {
    delete resolvedProps.key;
  }

  const children = normalizeChildren(rawChildren);

  return { type, props: resolvedProps, children, key };
}

/**
 * 规范化 children：
 * - 扁平化嵌套数组（支持 {arr.map(...)}）
 * - 字符串/数字 → 文本 VNode
 * - 过滤 null / undefined / boolean（支持条件渲染 {flag && <X />}）
 */
function normalizeChildren(raw: any[]): VNode[] {
  const result: VNode[] = [];

  for (const child of raw.flat(Infinity)) {
    if (child == null || typeof child === "boolean") {
      continue;
    }
    if (typeof child === "string" || typeof child === "number") {
      result.push(createTextVNode(String(child)));
    } else {
      result.push(child as VNode);
    }
  }

  return result;
}

function createTextVNode(text: string): VNode {
  return {
    type: TEXT_ELEMENT,
    props: { nodeValue: text },
    children: [],
    key: null,
  };
}
