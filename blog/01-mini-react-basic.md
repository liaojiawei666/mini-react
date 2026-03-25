# React 原理（一）：JSX、虚拟 DOM 与挂载

## 一、从 Hello World 说起

先用react写一个hello world

```jsx
function App() {
  return <h1>Hello, World!</h1>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

但如果你把这段代码复制到浏览器控制台运行，会得到一个报错：

```
Uncaught SyntaxError: Unexpected token '<'
```

浏览器不认识 `<h1>` 这种语法——它只认识标准的 JavaScript。

**那么问题来了：这段代码是怎么在页面上显示出 "Hello, World!" 的？**

本文将一步步揭开这个过程：上面的 JSX 代码，要经历哪些转换，最终才能在浏览器中运行起来。

## 二、JSX介绍
JSX要转换成js代码，才能在浏览器中运行，我们可以利用babel来完成这个转换，上述JSX代码经过babel的转化后
```js
function App() {
  return React.createElement("h1", null, "Hello, World!");
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App, null));
```
可以[在这里](https://babeljs.io/repl#?config_lz=N4IgZglgNgpgdgQwLYxALhAJxgBygOgCsBnADxABoQdtiYAXY9AbWZHgDdLR6FMBzBkwwATGGAQBXKIwoACOAHt6ciDDkBGDfKUq1AfSSKARpo2UQRkdJjCJUOlWOT-kUrfT1MkmAF8AuhRs2AgAxvTcWJJw9BAo6CChUAjExBChIAFBIMS8ggC0AEyRYqGKmAj05cQAajCYaYpwCYUADIUAzPlaFjgQODBQEHAwAAqYijiKxAhQCQAWYQDWmf6BOYqSmKEwACoAngMJVjaZQA&code_lz=GYVwdgxgLglg9mABAQQA6oBQEpEG8CwAUIogE4CmUIpSAPABYCMAfABLkA2HcANIgOpxSHACYBCWgHomzANxEAvkSIQEAZyhk4cTQF5EAJXIBDaABEA8gFkAdBArGo5A9qgYRcCCAC25MFBsAc0oAUQ5yX38AIQBPAEkRDAByUlckrCx5QlSdGwowEXJSDFo0VERJZkygA&lineWrap=true&version=7.29.2)直接尝试

### React 17 的新转换方式

从 React 17 开始，JSX 的转换方式变了。上面代码将转换成

```javascript
import { jsx as _jsx } from "react/jsx-runtime";
function App() {
  return /*#__PURE__*/_jsx("h1", {
    children: "Hello, World!"
  });
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(/*#__PURE__*/_jsx(App, {}));
```

**`_jsx` 和 `createElement` 本质一样**，都是接收参数、返回虚拟 DOM 对象。

值得注意的是： Babel 会自动处理 import：
- 旧方式：你需要手动写 `import React from 'react'`
- 新方式：Babel 自动插入 `import { jsx as _jsx } from "react/jsx-runtime"`

这个 `react/jsx-runtime` 是 React 17 新增的模块，专门提供 `_jsx` 函数。

所以虽然看起来变了，但核心逻辑没变：**JSX → 函数调用 → 虚拟 DOM**。理解 `React.createElement` 仍然有助于理解 React 的工作原理。

通过配置 `runtime` 参数，可以控制 Babel 的转换方式：

| runtime 值 | 转换结果 | 是否需要 import React |
|-----------|---------|---------------------|
| `"classic"` | `React.createElement(...)` | 需要 |
| `"automatic"` | `import { jsx as _jsx } from "react/jsx-runtime"` + `_jsx(...)` | 不需要 |

例如，使用 `"classic"` 模式：

```json
{
  "presets": [
    ["@babel/preset-react", { "runtime": "classic" }]
  ]
}
```

这样 JSX 会转换成 `React.createElement` 调用。


## 三、JSX 转换的原理

> 为了简单起见，以下示例都以转换成 `React.createElement` 为例（即 `runtime: "classic"` 模式）。`runtime: "automatic"` 模式的转换逻辑相同，只是函数名不同。

JSX 转换的核心规则很简单：**把标签语法转换成 `createElement` 函数调用**。

`createElement` 的函数签名是：

```javascript
React.createElement(type, props, ...children)
```

| 参数 | 含义 | 示例 |
|-----|------|------|
| `type` | 标签名或组件 | `'div'`、`Card` |
| `props` | 属性对象 | `{ className: 'container' }` |
| `...children` | 子节点（可变参数） | 字符串、其他元素等 |

转换器就是按照这个签名，把 JSX 的各部分映射到对应的参数上。

### 例子 1：基础标签

```jsx
// 你写的 JSX
<div className="container">Hello</div>
```

```javascript
// 转换后
React.createElement('div', { className: 'container' }, 'Hello')
```

- `type` → `'div'`（标签名字符串）
- `props` → `{ className: 'container' }`（属性对象）
- `children` → `'Hello'`（文本子节点）

### 例子 2：嵌套结构

```jsx
// 你写的 JSX
<div>
  <h1>Title</h1>
  <p>Content</p>
</div>
```

```javascript
// 转换后
React.createElement('div', null,
  React.createElement('h1', null, 'Title'),
  React.createElement('p', null, 'Content')
)
```

子标签也被转换成 `createElement` 调用，作为父标签的参数。

### 例子 3：组件

```jsx
// 你写的 JSX
<Card title="Hello">
  <Text>World</Text>
</Card>
```

```javascript
// 转换后
React.createElement(Card, { title: 'Hello' },
  React.createElement(Text, null, 'World')
)
```

大写字母开头的标签被识别为组件，直接作为变量传入，而不是字符串。

### 例子 4：JavaScript 表达式

大括号 `{}` 里的内容会被原样保留为 JavaScript 表达式：

```jsx
// 简单表达式
<div>{count + 1}</div>
// → React.createElement('div', null, count + 1)

// 条件渲染
<div>{show && <span>显示</span>}</div>
// → React.createElement('div', null, show && React.createElement('span', null, '显示'))

// 列表渲染
<ul>{items.map(item => <li>{item.name}</li>)}</ul>
// → React.createElement('ul', null, items.map(item => React.createElement('li', null, item.name)))
```

**规则**：`{}` 里的代码原样保留，只对其中出现的标签进行转换。

### 例子 5：函数组件中的代码

```jsx
// 你写的 JSX
function Counter() {
  const count = 1 + 1;  // 这行不会转换
  console.log(count);    // 这行不会转换
  
  return <div>{count}</div>;  // 只有这里会转换
}
```

```javascript
// 转换后
function Counter() {
  const count = 1 + 1;  // 原样保留
  console.log(count);    // 原样保留
  
  return React.createElement('div', null, count);  // 只有 return 被转换
}
```

**关键点**：JSX 转换器只处理标签语法，函数组件中的其他 JavaScript 代码（变量声明、函数调用、条件判断等）完全原样保留。

### 转换的本质

从上面的例子可以看出，JSX 转换器只做一件事：**把类 HTML 的语法转换成 `createElement` 函数调用**。

它只关注：
- 标签名 → `type` 参数
- 属性 → `props` 对象
- 子节点 → `children` 参数

其他所有代码（变量、表达式、逻辑控制等）都原样保留，留给 JavaScript 引擎在运行时处理。


