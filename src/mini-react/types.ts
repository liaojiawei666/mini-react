export const TEXT_NODE = "TEXT_NODE";

export type Key = string;

export type StateAction<S> = S | ((prev: S) => S);

export type FunctionComponent<P extends Record<string, unknown> = Record<string, unknown>> = (
  props: P
) => ReactNode;

export type ElementType = string | FunctionComponent | typeof TEXT_NODE;
export type FiberType = ElementType | "ARRAY" | null;

export interface Props {
  children?: ReactNode[];
  key?: Key;
  [prop: string]: unknown;
}

export interface ReactElement {
  type: ElementType;
  props: Props;
}

export type ReactNode = ReactElement | string | number | boolean | null | undefined | ReactNode[];

export type EffectTag = "PLACEMENT" | "UPDATE";

export interface FiberState {
  list: unknown[];
  isDirty: boolean;
}

export interface Fiber {
  type: FiberType;
  key?: Key;
  children?: ReactNode[];
  props?: Record<string, unknown>;
  dom: Node | null;
  state?: FiberState;
  parent?: Fiber;
  child?: Fiber;
  sibling?: Fiber;
  alternate?: Fiber;
  effectTag?: EffectTag;
  isRerender?: boolean;
}
