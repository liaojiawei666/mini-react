// ---- 常量 ----
export const TEXT_ELEMENT = "TEXT_ELEMENT";

// ---- 类型 ----
export type Props = Record<string, any>;

export interface VNode {
  type: string | ComponentFunction;
  props: Props;
  children: VNode[];
  key: string | number | null;
  /** 对应的真实 DOM 节点（挂载后赋值） */
  _dom?: HTMLElement | Text | null;
  /** 函数组件上次渲染产出的子 VNode（用于 reconcile） */
  _rendered?: VNode | null;
  /** 函数组件的 hooks 状态数组 */
  _hooks?: Hook[];
}

/** 单个 hook 存储 */
export interface Hook {
  state: any;
}

export type ComponentFunction<P extends Props = Props> = (props: P) => VNode;
