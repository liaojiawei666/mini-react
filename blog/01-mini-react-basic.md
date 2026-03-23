# 从零开始写 React（一）：JSX 与虚拟 DOM

> **本文目的**：不是为了真的去实现一个 mini-react，而是为了学习和了解 React 工作的过程。通过手写核心代码，理解 JSX、虚拟 DOM、渲染这些概念背后的原理。

---

## 一、JSX 是什么

JSX（JavaScript XML）是一种 JavaScript 语法扩展，允许你在 JS 中写类似 HTML 的代码。

看这段代码：

```jsx
function App() {
  return <h1>Hello, World!</h1>;
}
```

`<h1>...</h1>` 这种写法就是 JSX。它看起来很像 HTML，但实际上是 JavaScript。

---

## 二、JSX 的原理：从 JSX 到 JS

### 2.1 浏览器不认识 JSX

如果你直接把上面的代码丢给浏览器，控制台会报错：

```
Uncaught SyntaxError: Unexpected token '<'
```

因为浏览器只认识标准的 JavaScript，而 `<h1>` 这种语法不是 JS 的一部分。

**所以，我们需要一个"翻译"的过程。**

### 2.2 JSX 的转换规则

JSX 的转换规则很简单：**把标签转换成 `createElement` 函数调用**。

上面的代码会被转换成：

```javascript
function App() {
  return React.createElement('h1', null, 'Hello, World!');
}
```

你可以在线体验这个转换过程：

> **Babel 在线转换工具**：https://babeljs.io/repl
> 
> 在左侧输入 JSX，右侧就能看到转换后的 JavaScript。

转换规则对照：

| JSX 写法 | 转换结果 |
|---------|---------|
| `<div>text</div>` | `React.createElement('div', null, 'text')` |
| `<div className="a" />` | `React.createElement('div', { className: 'a' })` |
| `<div><span /></div>` | `React.createElement('div', null, React.createElement('span'))` |

**注意三个参数**：
1. 第一个参数：标签名（字符串）或组件（函数）
2. 第二个参数：属性对象（props），没有就是 null
3. 第三个及以后：子节点（可以是字符串、其他元素、或数组）

### 2.3 复杂结构的转换

如果结构再复杂一点：

```jsx
<div>
  <h1>Title</h1>
  <p>Content</p>
</div>
```

转换后变成：

```javascript
React.createElement('div', null,
  React.createElement('h1', null, 'Title'),
  React.createElement('p', null, 'Content')
);
```

**感受一下**：嵌套一深，`createElement` 的写法就变得难以阅读。JSX 的出现正是为了解决这个问题。

---

## 三、为什么要用虚拟 DOM

### 3.1 直接操作 DOM 的问题

现在我们知道 JSX 会被转换成 `createElement`。那 `createElement` 应该返回什么？

**方案一：直接返回真实 DOM**

```javascript
function createElement(type, props, children) {
  const el = document.createElement(type);
  // 设置属性、添加子元素...
  return el;
}
```

这个方案有个明显的问题：**一调用就创建真实 DOM**。

如果组件嵌套很深，比如：

```jsx
<App>
  <Header>
    <Nav>
      <Link>...</Link>
    </Nav>
  </Header>
</App>
```

每次渲染都要创建一堆 DOM 节点，性能很差。而且如果后面发现有些节点其实不需要更新，这就白白创建了。

### 3.2 方案二：先返回一个"描述"

这就是**虚拟 DOM** 的核心思想：

> 不立即创建真实 DOM，而是先用一个轻量的 JavaScript 对象描述这个元素，等到真正需要时，再一次性创建或更新真实 DOM。

好处很明显：
1. **创建对象很快**：纯内存操作，不涉及浏览器渲染
2. **可以对比**：更新前比较新旧对象，找出真正变化的部分
3. **批量更新**：把多次修改合并，一次性更新真实 DOM

### 3.3 虚拟 DOM 长什么样

只是一个普通的 JavaScript 对象：

```typescript
interface VNode {
  type: string;              // 标签名，比如 "div"、"h1"
  props: Record<string, any>; // 属性对象，比如 { className: 'title' }
  children: VNode[];         // 子节点数组
}
```

举个例子，这段 JSX：

```jsx
<div className="container">
  <h1>Hello</h1>
</div>
```

对应的虚拟 DOM：

```javascript
{
  type: 'div',
  props: { className: 'container' },
  children: [
    {
      type: 'h1',
      props: {},
      children: [
        { type: 'TEXT_ELEMENT', props: { nodeValue: 'Hello' } }
      ]
    }
  ]
}
```

**注意**：文本节点没有标签名，我们用 `TEXT_ELEMENT` 作为特殊标记。

---

## 四、createElement：创建虚拟 DOM

`createElement` 的任务就是把 JSX 转换后的参数，组装成虚拟 DOM 对象。

### 4.1 要处理的几种情况

**情况一：普通元素**

```javascript
createElement('div', { className: 'app' }, 'Hello')
// 返回 { type: 'div', props: { className: 'app' }, children: [...] }
```

**情况二：嵌套子元素**

```jsx
<div><span>A</span><span>B</span></div>
```

子元素已经是 `createElement` 的返回值（VNode），直接放入 children 数组。

**情况三：字符串/数字**

```jsx
<div>Hello</div>
```

文本需要包装成特殊的 VNode：

```javascript
{ type: 'TEXT_ELEMENT', props: { nodeValue: 'Hello' }, children: [] }
```

**情况四：数组（列表渲染）**

```jsx
<ul>{items.map(i => <li>{i}</li>)}</ul>
```

`map` 返回的是数组，需要把数组"拍平"放入 children。

**情况五：null/undefined/false**

```jsx
<div>{show && <span>显示</span>}</div>
```

条件为 false 时，应该过滤掉，不放入 children。

### 4.2 核心逻辑

```javascript
function createElement(type, props, ...children) {
  return {
    type,
    props: props || {},
    children: children
      .flat()                    // 拍平嵌套数组
      .filter(c => c != null && typeof c !== 'boolean')  // 过滤 null/false
      .map(c => typeof c === 'string' || typeof c === 'number'
        ? { type: 'TEXT_ELEMENT', props: { nodeValue: String(c) }, children: [] }
        : c
      )
  };
}
```

---

## 五、Mount：从虚拟 DOM 到真实 DOM

有了虚拟 DOM，下一步就是把它变成屏幕上真实的东西。这个过程叫做 **Mount（挂载）**。

### 5.1 挂载的过程

就像搭积木，从根节点开始，一层层往下：

1. 看 `type` 是什么标签，用 `document.createElement` 创建对应元素
2. 把 `props` 里的属性设置到元素上（className、style、事件等）
3. 对每个子节点，递归执行步骤 1-2
4. 把子元素添加到父元素中

### 5.2 文本节点的处理

文本节点用 `document.createTextNode` 创建：

```javascript
if (vnode.type === 'TEXT_ELEMENT') {
  return document.createTextNode(vnode.props.nodeValue);
}
```

为什么不用 `innerHTML`？因为直接设置 HTML 字符串有安全风险（XSS 攻击），而且会重新解析整个内容。用 `createTextNode` 更安全、更高效。

### 5.3 属性的处理

不同类型的属性需要不同的处理方式：

- `className` → `element.className`
- `style`（对象）→ `Object.assign(element.style, styleObj)`
- `onClick` 等事件 → `element.addEventListener('click', handler)`
- 其他属性 → `element.setAttribute(key, value)`

---

## 六、完整流程图

把整个过程串起来：

```
┌─────────────────────────────────────────────────────────────┐
│  1. 你写的 JSX 代码                                          │
│                                                             │
│  function App() {                                           │
│    return <h1 className="title">Hello, World!</h1>;        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼  Babel/Vite 编译
┌─────────────────────────────────────────────────────────────┐
│  2. 转换后的 JavaScript                                      │
│                                                             │
│  function App() {                                           │
│    return createElement('h1', { className: 'title' },       │
│      'Hello, World!');                                      │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼  执行 createElement
┌─────────────────────────────────────────────────────────────┐
│  3. 虚拟 DOM（VNode）                                        │
│                                                             │
│  {                                                          │
│    type: 'h1',                                              │
│    props: { className: 'title' },                           │
│    children: [                                              │
│      { type: 'TEXT_ELEMENT', props: { nodeValue: 'Hello...' }}
│    ]                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼  递归 Mount
┌─────────────────────────────────────────────────────────────┐
│  4. 真实 DOM（HTML）                                         │
│                                                             │
│  <h1 class="title">Hello, World!</h1>                       │
│                                                             │
│  最终插入页面，用户看到界面                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 七、为什么要用 JSX

看完上面的内容，你可能会问：**为什么要多此一举用 JSX？直接写 `createElement` 不行吗？**

### 7.1 对比两种写法

假设要写一个导航栏：

**不用 JSX：**

```javascript
React.createElement('nav', { className: 'navbar' },
  React.createElement('div', { className: 'logo' }, 'MyApp'),
  React.createElement('ul', { className: 'menu' },
    React.createElement('li', null, 
      React.createElement('a', { href: '/' }, 'Home')
    ),
    React.createElement('li', null,
      React.createElement('a', { href: '/about' }, 'About')
    )
  )
);
```

**用 JSX：**

```jsx
<nav className="navbar">
  <div className="logo">MyApp</div>
  <ul className="menu">
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>
```

### 7.2 JSX 的好处

| 好处 | 说明 |
|-----|------|
| **直观** | 一眼就能看出界面的结构，像看 HTML 一样 |
| **易维护** | 结构和逻辑分离，修改界面不用在嵌套函数里找 |
| **错误少** | 标签不匹配时，编辑器能提示；写 `createElement` 容易漏参数 |
| **生态好** | 编辑器支持语法高亮、自动补全、代码折叠 |

### 7.3 一个常见的误解

有人说"JSX 让代码更快"，这是错的。**JSX 最终还是要转换成 `createElement`**，性能上没有区别。

JSX 的价值在于**开发体验**——让写代码的人更舒服，让读代码的人更容易理解。

---

## 八、总结

本文介绍了 React 最基础的工作原理：

| 阶段 | 做了什么 | 核心思想 |
|-----|---------|---------|
| **JSX** | 用类 HTML 语法描述界面 | 声明式编程，直观易懂 |
| **转换** | Babel 把 JSX 编译成 `createElement` 调用 | 浏览器只认识标准 JS |
| **虚拟 DOM** | `createElement` 返回轻量对象 | 延迟创建真实 DOM，便于优化 |
| **Mount** | 递归创建真实 DOM 并插入页面 | 自顶向下构建界面 |

**关键洞察**：

React 的核心不是"快"，而是**让复杂界面易于维护**。虚拟 DOM 和 Diff 算法是手段，声明式编程和组件化才是目的。

**下一篇预告**：

- 如何让组件"记住"状态？（useState 原理）
- 状态变了如何高效更新？（Diff 算法）
- 连续多次更新能否合并？（异步更新策略）

---

## 参考与工具

- **Babel 在线转换**：https://babeljs.io/repl
- [React 官方文档](https://react.dev/)
- [Vite 配置参考](https://vitejs.dev/config/)
