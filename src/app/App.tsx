import MiniReact from "../mini-react";
import { Counter } from "./Counter";
import { TodoList } from "./TodoList";

export function App() {
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h1
        style={{
          textAlign: "center",
          color: "#2c3e50",
          marginBottom: "24px",
          fontSize: "28px",
        }}
      >
        Mini React Demo
      </h1>
      <Counter />
      <TodoList />
      <footer
        style={{
          textAlign: "center",
          color: "#aaa",
          fontSize: "12px",
          marginTop: "24px",
        }}
      >
        Powered by mini-react — Virtual DOM + Diff/Reconcile
      </footer>
    </div>
  );
}
