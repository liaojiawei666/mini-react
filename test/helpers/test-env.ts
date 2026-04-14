/**
 * 与 `src/mini-react/schedule.ts` 对齐：
 * - 调度使用 MessageChannel + `shouldYield`（时间切片），不用 requestIdleCallback。
 * - 在测试里让 `port2.postMessage` 同步调用 `port1.onmessage`，这样切片后的 `workLoop` 仍能在同一次栈内跑完并 `commitRoot`。
 *
 * 务必在 `vi.resetModules()` 之后、`import("../src/mini-react")` 之前调用 `installSyncScheduler()`，
 * 否则 `schedule` 已用原生异步 Channel 初始化，测试可能不稳定或挂起。
 */

type MessageHandler = ((this: MessagePort, ev: MessageEvent) => void) | null;

export function installSyncScheduler(): { restore: () => void } {
  const Original = globalThis.MessageChannel;

  globalThis.MessageChannel = class SyncMessageChannel {
    port1: MessagePort;
    port2: MessagePort;

    constructor() {
      let port1Handler: MessageHandler = null;
      let port1ErrorHandler: MessageHandler = null;

      const port1Stub = {
        get onmessage() {
          return port1Handler;
        },
        set onmessage(fn: MessageHandler) {
          port1Handler = fn;
        },
        get onmessageerror() {
          return port1ErrorHandler;
        },
        set onmessageerror(fn: MessageHandler) {
          port1ErrorHandler = fn;
        },
        close: () => {},
        postMessage: () => {},
        start: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true
      };

      const port2Stub = {
        get onmessage() {
          return null;
        },
        set onmessage(_fn: MessageHandler) {},
        get onmessageerror() {
          return null;
        },
        set onmessageerror(_fn: MessageHandler) {},
        close: () => {},
        postMessage: (data?: unknown) => {
          const fn = port1Handler;
          if (fn) fn.call(port1Stub as unknown as MessagePort, { data } as MessageEvent);
        },
        start: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true
      };

      this.port1 = port1Stub as MessagePort;
      this.port2 = port2Stub as MessagePort;
    }
  } as unknown as typeof MessageChannel;

  return {
    restore: () => {
      globalThis.MessageChannel = Original;
    }
  };
}

export function mountRoot(): HTMLElement {
  document.body.innerHTML = "";
  const root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);
  return root;
}
