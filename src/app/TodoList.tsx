import MiniReact from "../mini-react";
import { useState } from "../mini-react";

interface TodoItem {
  id: number;
  text: string;
}

let nextId = 1;

export function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [inputVal, setInputVal] = useState("");

  function handleAdd() {
    const text = inputVal.trim();
    if (!text) return;
    setTodos((prev: TodoItem[]) => [...prev, { id: nextId++, text }]);
    setInputVal("");
  }

  function handleRemove(id: number) {
    setTodos((prev: TodoItem[]) => prev.filter((t) => t.id !== id));
  }

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
      <h2 style={{ marginBottom: "12px", color: "#333" }}>Todo List</h2>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          type="text"
          value={inputVal}
          onInput={(e: any) => setInputVal(e.target.value)}
          onKeyDown={(e: any) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="Add a todo..."
          style={{
            flex: "1",
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            outline: "none",
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            cursor: "pointer",
            background: "#4a90d9",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Add
        </button>
      </div>

      {todos.length === 0 ? (
        <p style={{ color: "#999", fontStyle: "italic" }}>No todos yet. Add one above!</p>
      ) : (
        <ul style={{ listStyle: "none", padding: "0" }}>
          {todos.map((todo: TodoItem) => (
            <li
              key={todo.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                borderBottom: "1px solid #eee",
              }}
            >
              <span>{todo.text}</span>
              <button
                onClick={() => handleRemove(todo.id)}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  cursor: "pointer",
                  background: "#e74c3c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <p style={{ marginTop: "12px", color: "#666", fontSize: "13px" }}>
        Total: {String(todos.length)} items
      </p>
    </div>
  );
}
