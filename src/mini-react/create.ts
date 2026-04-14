import { ElementType, Fiber, Props, ReactElement, ReactNode, TEXT_NODE } from "./types";

export function createElement(
  type: ElementType,
  props: Props,
  ...children: ReactNode[]
): ReactElement {
  return {
    type,
    props: {
      ...props,
      children: children.map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return {
            type: TEXT_NODE,
            props: {
              nodeValue: String(item)
            }
          };
        }
        if (item === null || item === undefined || typeof item === "boolean") {
          return null;
        }
        return item;
      })
    }
  };
}

export function createFiber(reactNode: ReactNode): Fiber {
  const fiber: Fiber = {
    type: null,
    dom: null
  };
  if (typeof reactNode === "string" || typeof reactNode === "number") {
    fiber.type = TEXT_NODE;
    fiber.props = {
      nodeValue: reactNode.toString()
    };
  } else if (Array.isArray(reactNode)) {
    fiber.type = "ARRAY";
    fiber.children = reactNode;
  } else if (typeof reactNode === "object" && reactNode !== null) {
    fiber.type = reactNode.type;
    const { key, children, ...rest } = reactNode.props;
    fiber.props = rest;
    fiber.key = key;
    fiber.children = children;
  }
  return fiber;
}
