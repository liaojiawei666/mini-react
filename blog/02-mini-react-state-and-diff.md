# 从零开始写 React（二）：状态与更新

## 一、问题：函数怎么记住东西

上一篇我们写了纯展示组件。但真实的应用需要交互：点击按钮、输入文字、切换页面。

**核心问题：函数执行完就销毁了，怎么"记住"状态？**

```jsx
function Counter() {
  // 普通变量，每次执行都是新的
  let count = 0;
  
  return <button onClick={() => count++}>{count}</button>;
}
```

点击按钮，`count` 确实加了 1，但下次渲染时，`let count = 0` 又执行了一遍，回到 0。

**我们需要一个外部的地方存状态。**

---

## 二、useState：把状态挂到 VNode 上

### 存储位置的选择

状态可以存哪儿？

| 方案 | 问题 |
|-----|------|
| 全局变量 | 多个组件状态会互相覆盖 |
| 闭包 | 组件重新执行后，闭包也变了 |
| VNode 对象 | 每个组件实例都有独立的 VNode，完美 |

**选择 VNode**：每个组件对应一个 VNode 对象，把状态挂上去，下次渲染时还能找到。

### 怎么对应多个状态

一个组件可能有多个 `useState`：

```jsx
function Form() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState(0);
}
```

**解决方案：数组 + 索引**

```javascript
// VNode 上的结构
{
  _hooks: [
    { state: '' },      // name
    { state: '' },      // email
    { state: 0 },       // age
  ]
}
```

每次调用 `useState`，按顺序取下一个索引。这就是为什么 React 规定 **hooks 必须在顶层调用，不能在 if/for 里**——否则会打乱索引顺序。

### 首次渲染 vs 再次渲染

- **首次**：初始化状态，存到 `vnode._hooks[index]`
- **再次**：从 `oldVNode._hooks[index]` 复用状态

**setter 怎么知道更新哪个组件？**

通过闭包。创建 setter 时，捕获当前的 hook 对象和组件引用。调用 setter 时，修改状态并触发重新渲染。

---

## 三、重新渲染：对比新旧 VNode

状态变了，需要更新界面。最简单的方法是清空重新渲染，但这样性能差。

**更好的方法：对比新旧 VNode，只更新变化的部分。**

### 对比策略

假设旧 VNode 是：

```javascript
{ type: 'div', props: { className: 'a' }, children: [...] }
```

新 VNode 是：

```javascript
{ type: 'div', props: { className: 'b' }, children: [...] }
```

**对比过程**：

1. `type` 相同（都是 `div`）→ 复用 DOM 节点
2. `props` 不同（`a` → `b`）→ 更新 `className`
3. `children` 需要递归对比

**如果 `type` 不同呢？** 比如 `div` 变成 `span`。

直接销毁旧 DOM，创建新 DOM。因为不同类型的元素，结构和语义完全不同，复用没有意义。

### 文本节点的特殊处理

文本没有属性，只需要对比内容：

```javascript
if (oldText !== newText) {
  dom.nodeValue = newText;  // 直接修改文本内容
}
```

这比替换整个元素快得多。

---

## 四、列表的噩梦：key 的出现

### 问题场景

假设有一个列表：

```jsx
<ul>
  <li>A</li>
  <li>B</li>
  <li>C</li>
</ul>
```

现在删除 B，变成：

```jsx
<ul>
  <li>A</li>
  <li>C</li>
</ul>
```

**按索引对比会发生什么？**

| 索引 | 旧 | 新 | 操作 |
|-----|---|---|------|
| 0 | A | A | 复用 ✓ |
| 1 | B | C | 把 B 改成 C ✗ |
| 2 | C | - | 删除 C |

**结果错了**：C 被当成 B 修改，然后又被删除。

### key 的作用

给每个元素一个唯一标识：

```jsx
<ul>
  <li key="a">A</li>
  <li key="b">B</li>
  <li key="c">C</li>
</ul>
```

**按 key 对比**：

- `key="a"`：找到旧 A，复用
- `key="b"`：没找到，说明被删除了
- `key="c"`：找到旧 C，复用

**结果正确**：A 和 C 保持不动，B 被删除。

### key 的算法

1. 遍历旧列表，建立 `key → 索引` 的映射表
2. 遍历新列表，用 key 查找对应的旧节点
3. 找到就复用，找不到就新建
4. 最后删除没被复用的旧节点

**一个细节：移动**

如果列表顺序变了：

```
旧: [A, B, C]  (key: a, b, c)
新: [B, A, C]  (key: b, a, c)
```

B 在新列表的第 0 位，但在旧列表是第 1 位。需要把 B 移动到 A 前面。

算法用一个变量 `lastPlacedIndex` 记录最后一个确定位置的索引。如果旧节点的索引比它小，说明需要移动。

---

## 五、异步更新：批量处理

### 问题

连续调用多次 `setState`：

```javascript
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);
```

结果只加了 1，不是 3。

**原因**：三次都基于同一个 `count` 值。

### 解决方案一：函数式更新

```javascript
setCount(prev => prev + 1);
setCount(prev => prev + 1);
setCount(prev => prev + 1);
```

每次基于最新值计算，结果正确。

### 解决方案二：批量更新

即使不用函数式更新，也希望多次 `setState` 只触发一次渲染。

**实现：把更新推迟到当前事件循环结束**

```javascript
function scheduleUpdate() {
  if (pending) return;  // 已经在等待，直接返回
  
  pending = true;
  
  queueMicrotask(() => {
    pending = false;
    render();  // 实际执行更新
  });
}
```

**原理**：
- 同一事件循环内的多次 `setState`，都往队列里加任务
- 用 `queueMicrotask` 把真正的渲染推迟到当前循环结束
- 多次调用只触发一次渲染

想象你在餐厅：
- 同步更新 = 点一道菜，厨师做一道，你再点下一道
- 批量更新 = 点完所有菜，一次性交给厨房

---

## 六、函数组件的特殊处理

函数组件本身不对应 DOM，它返回的 VNode 才对应 DOM。

```jsx
function Counter() {
  return <div>{count}</div>;
}
```

**VNode 结构**：

```javascript
{
  type: Counter,           // 函数本身
  _rendered: {             // 渲染结果
    type: 'div',
    _dom: HTMLDivElement   // 真实 DOM 在这里
  }
}
```

**对比时需要"穿透"**：

1. 执行函数，得到新的渲染结果
2. 对比新旧渲染结果（而不是对比函数本身）
3. 把新的 DOM 关联回函数组件的 VNode

---

## 七、完整示例：TodoList

```jsx
function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: '学习 React', done: false },
  ]);
  const [input, setInput] = useState('');

  const add = () => {
    if (!input.trim()) return;
    setTodos(prev => [...prev, { id: Date.now(), text: input, done: false }]);
    setInput('');
  };

  const toggle = (id) => {
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, done: !t.done } : t
    ));
  };

  return (
    <div>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={add}>添加</button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id} onClick={() => toggle(todo.id)}>
            <span style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
              {todo.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

这个例子展示了：
- `useState` 管理列表和输入框状态
- `key` 确保列表更新正确
- 函数式更新 `setTodos(prev => ...)`
- 事件处理触发状态变更

---

## 八、总结

| 特性 | 解决的问题 | 核心机制 |
|-----|-----------|---------|
| useState | 函数记不住状态 | 状态挂 VNode，数组索引对应 |
| Diff | 如何高效更新 | 对比类型，复用 DOM，增量更新 |
| key | 列表身份识别 | key 映射表，复用不重建 |
| 异步更新 | 多次 setState 合并 | queueMicrotask 批量处理 |

至此，一个极简但完整的 React 已实现。核心代码约 300 行，包含 JSX、虚拟 DOM、状态管理、Diff、异步更新。

**可以继续探索的方向**：
- useEffect：副作用怎么处理
- 组件通信：props drilling vs Context
- 性能优化：memo、useMemo、useCallback

---

## 参考

- [React Hooks 文档](https://react.dev/reference/react)
- [React Reconciliation](https://react.dev/learn/thinking-in-react)
