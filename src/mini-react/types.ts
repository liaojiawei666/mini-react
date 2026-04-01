/** @format */

export type Props = {
  [key: string]: any;
  children: (Element | null)[];
};

export type HostType = string;
export type FunctionType = (props: Props) => Element;
export type ElementType = HostType | FunctionType | "TEXT_NODE";

// 描述层 - 每次渲染新建
export type Element = {
  type: ElementType;
  props: Props;
};

// 运行时层 - 跨渲染复用
export type Instance = {
  element: Element;
  dom: Node | null;
  hooks: unknown[];
  childInstances: Array<Instance | null>;
  isDirty?: boolean;
};
