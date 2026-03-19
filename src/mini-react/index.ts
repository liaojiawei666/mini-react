export { createElement } from "./createElement";
export { reconcile } from "./reconcile";
export { createApp, useState } from "./component";
export { TEXT_ELEMENT } from "./types";
export type { VNode, Props, ComponentFunction } from "./types";

// 默认导出，方便 JSX 工厂使用：import MiniReact from "../mini-react"
import { createElement } from "./createElement";
const MiniReact = { createElement };
export default MiniReact;
