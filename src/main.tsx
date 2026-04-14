/** @format */

import { createElement, render, useState } from "./mini-react";

function Counter({ name }: { name: string }) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>
        {name}: {count}
      </p>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        +1
      </button>
    </div>
  );
}

function ListItem({ item }: { item: string; key?: string }) {
  const [clicked, setClicked] = useState(false);
  return (
    <li
      style={{ color: clicked ? "red" : "black", cursor: "pointer" }}
      onClick={() => setClicked((c) => !c)}
    >
      {item} (clicked: {clicked ? "yes" : "no"})
    </li>
  );
}

function App() {
  const [showA, setShowA] = useState(true);
  const [items, setItems] = useState(["a", "b", "c"]);

  return (
    <div>
      <h2>Test 1: useState</h2>
      <Counter name="Counter1" />
      <Counter name="Counter2" />

      <h2>Test 2: Conditional Render</h2>
      <button onClick={() => setShowA((s) => !s)}>Toggle A</button>
      {showA && <div key="a">Item A</div>}
      <div key="b">Item B</div>

      <h2>Test 3: List with Key (diff)</h2>
      <button onClick={() => setItems((items) => ["x", ...items])}>Add to Head</button>
      <ul>
        {items.map((item) => (
          <ListItem key={item} item={item} />
        ))}
        <div>tail</div>
      </ul>
      {/* <h2>Test 4: tail</h2> */}
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");
render(<App />, root);
