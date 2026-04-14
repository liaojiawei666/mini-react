import { FiberState, StateAction } from "./types";

let fiberState: FiberState | null = null;
let useStateIndex = 0;
let rerender: () => void = () => {};
export function setRerender(_rerender: () => void) {
  rerender = _rerender;
}

export function prepareHookContext(state: FiberState) {
  fiberState = state;
  useStateIndex = 0;
}

export function clearHookContext() {
  fiberState = null;
  useStateIndex = 0;
}

export function useState<T = unknown>(initialState?: T): [T, (nextState: StateAction<T>) => void] {
  if (fiberState === null) {
    throw new Error("useState must be called inside a component");
  }
  const currentState = fiberState;
  let stateIndex = useStateIndex;
  useStateIndex++;
  if (currentState.list[stateIndex] === undefined) {
    currentState.list[stateIndex] = initialState;
  }
  const state = currentState.list[stateIndex] as T;
  const setState = (nextState: StateAction<T>) => {
    const latestState = currentState.list[stateIndex] as T;
    const realNextState =
      typeof nextState === "function" ? (nextState as (prev: T) => T)(latestState) : nextState;
    if (!Object.is(latestState, realNextState)) {
      currentState.list[stateIndex] = realNextState;
      currentState.isDirty = true;
      scheduleUpdate();
    }
  };
  return [state, setState];
}

let pendingUpdate = false;
function scheduleUpdate() {
  if (pendingUpdate) return;
  pendingUpdate = true;
  queueMicrotask(() => {
    pendingUpdate = false;
    rerender();
  });
}
