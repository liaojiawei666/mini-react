import MiniReact from "../mini-react";
import { useState } from "../mini-react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div
      style={{
        padding: "20px",
        background: "#fff",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        marginBottom: "16px",
      }}
    >
      <h2 style={{ marginBottom: "12px", color: "#333" }}>Counter</h2>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={() => setCount((prev: number) => prev - 1)}
          style={{
            padding: "6px 16px",
            fontSize: "18px",
            cursor: "pointer",
            borderRadius: "4px",
            border: "1px solid #ccc",
            background: "#f0f0f0",
          }}
        >
          -
        </button>
        <span style={{ fontSize: "24px", fontWeight: "bold", minWidth: "40px", textAlign: "center" }}>
          {String(count)}
        </span>
        <button
          onClick={() => setCount((prev: number) => prev + 1)}
          style={{
            padding: "6px 16px",
            fontSize: "18px",
            cursor: "pointer",
            borderRadius: "4px",
            border: "1px solid #ccc",
            background: "#f0f0f0",
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
