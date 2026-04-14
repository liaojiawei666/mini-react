const RESERVED = new Set(["children", "key"]);

function isEventProp(name: string): boolean {
  return name.length > 2 && name.startsWith("on");
}

function toEventType(name: string): string {
  const rest = name.slice(2);
  return rest.charAt(0).toLowerCase() + rest.slice(1);
}

function removeProp(dom: Element, name: string, prev: unknown) {
  if (isEventProp(name)) {
    dom.removeEventListener(toEventType(name), prev as EventListener);
    return;
  }
  if (name === "className") {
    dom.removeAttribute("class");
    return;
  }
  if (name === "style" && prev && typeof prev === "object") {
    const el = dom as HTMLElement;
    const s = el.style as unknown as Record<string, string>;
    for (const key of Object.keys(prev as Record<string, unknown>)) {
      s[key] = "";
    }
    return;
  }
  if (name === "value" && (dom instanceof HTMLInputElement || dom instanceof HTMLTextAreaElement)) {
    dom.value = "";
    return;
  }
  if (name === "checked" && dom instanceof HTMLInputElement) {
    dom.checked = false;
    return;
  }
  dom.removeAttribute(name);
}

function applyStyle(
  dom: HTMLElement,
  next: Record<string, unknown>,
  prev?: Record<string, unknown>
) {
  const s = dom.style as unknown as Record<string, string>;
  if (prev) {
    for (const key of Object.keys(prev)) {
      if (!(key in next)) s[key] = "";
    }
  }
  for (const key of Object.keys(next)) {
    const val = next[key];
    if (val == null || val === false) {
      s[key] = "";
      continue;
    }
    s[key] = String(val);
  }
}

function setProp(dom: Element, name: string, next: unknown, prev: unknown) {
  if (isEventProp(name)) {
    const type = toEventType(name);
    if (prev) dom.removeEventListener(type, prev as EventListener);
    if (typeof next === "function") dom.addEventListener(type, next as EventListener);
    return;
  }
  if (name === "className") {
    dom.setAttribute("class", next == null ? "" : String(next));
    return;
  }
  if (name === "style" && next && typeof next === "object") {
    applyStyle(
      dom as HTMLElement,
      next as Record<string, unknown>,
      prev && typeof prev === "object" ? (prev as Record<string, unknown>) : undefined
    );
    return;
  }
  if (name === "value" && (dom instanceof HTMLInputElement || dom instanceof HTMLTextAreaElement)) {
    dom.value = next == null ? "" : String(next);
    return;
  }
  if (name === "checked" && dom instanceof HTMLInputElement) {
    dom.checked = Boolean(next);
    return;
  }
  if (next === false || next == null) {
    dom.removeAttribute(name);
    return;
  }
  if (next === true) {
    dom.setAttribute(name, "");
    return;
  }
  dom.setAttribute(name, String(next));
}

/**
 * 将 nextProps 同步到 DOM；prevProps 为空时表示首次挂载，只做赋值。
 */
export function updateProps(
  dom: Element,
  nextProps: Record<string, unknown>,
  prevProps: Record<string, unknown> = {}
) {
  for (const name in prevProps) {
    if (RESERVED.has(name)) continue;
    if (!(name in nextProps)) {
      removeProp(dom, name, prevProps[name]);
    }
  }
  for (const name in nextProps) {
    if (RESERVED.has(name)) continue;
    const next = nextProps[name];
    const prev = prevProps[name];
    if (Object.is(prev, next)) continue;
    setProp(dom, name, next, prev);
  }
}
