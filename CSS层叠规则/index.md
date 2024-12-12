# CSS层叠相关知识点

## 层叠上下文

- 层叠上下文是什么？

  层叠上下文是 HTML 元素的一种属性，它决定了元素在层叠顺序中的位置。可以想象页面的 HTML 元素是沿着一条 z 轴排列的，在一个层叠上下文中的元素，会按照基于层叠优先级进行 z 轴排序。

- 层叠上下文有哪些？

  1. 根元素(`<html>`)
  2. 定位元素(`position` 属性为 `absolute`、`relative`、`fixed` 或 `sticky`，z-index设置为auto会破坏absolute和relative的层叠上下文，即不会创建层叠上下文)
  3. flex 元素(`display: flex`，z-index设置为auto会破坏flex的层叠上下文，即不会创建层叠上下文)
  4. grid 元素(`display: grid`，z-index设置为auto会破坏grid的层叠上下文，即不会创建层叠上下文)
  5. 具有 opacity 属性小于 1 的元素
  6. mix-blend-mode 属性不为 normal 的元素
  7. 以下任意属性不为 none 的元素：
     - `transform`
     - `filter`
     - `backdrop-filter`
     - `clip-path`
     - `mask`
     - `mask-image`
     - `mask-border`
     - `perspective`
  8. `will-change` 设置了任一属性而该属性在非初始值时会创建层叠上下文
  9. `isolation` 属性设置为 `isolate` 的元素
  10. `contain` 属性设置为 `layout`、`paint` 或包含它们其中之一的合成值（`contain: strict`、`contain: content`）的元素

**注意：**

- 每个层叠上下文都是独立的，当元素的层叠上下文发生变化时，不会影响到其他层叠上下文中的元素。(eg: 根元素下有两个绝对定位的元素，如果第一个元素的层叠优先级低于另一个，这时给第一个元素添加一个子元素，并创建层叠上下文，就算把这个子元素的z-index设置为很大，也不会覆盖第二个元素，因为只在第一个元素的层叠上下文内生效)
- z-index的默认值是auto，单独设置z-index并不会创建层叠上下文，z-index必须配合定位盒子（position不为static的盒子），给position为static的盒子设置z-index不会产生任何作用。
- z-index设置为auto和0时，层叠顺序相同，但是z-index为具体数字会创建新的层叠上下文，包括0

## 层叠顺序

- 层叠顺序是什么？

  层叠顺序是基于层叠上下文中的元素在 z 轴上的顺序，每个层叠上下文中的元素都有一个层叠顺序，层叠顺序大的会覆盖层叠顺序小的。

- 层叠顺序的值是多少？

  层叠顺序的值从小到大如下：

  1. background 和 border
  2. 负的 z-index 值
  3. 块级盒子
  4. 浮动盒子
  5. 内联盒子
  6. z-index为0或auto
  7. 正的 z-index 值

**注意：**

- 层叠顺序不会叠加，以当前盒子最大的层叠顺序为准。
- 相同层叠顺序，DOM结构在后面的元素会覆盖前面的元素。
- 层叠顺序可以修改，但是根元素除外。不然不就乱套了![alt text](98D8AA0C.png)。


## 记录两个有意思的问题，案例在index.html

- 为什么inline-child的文字会被inline的背景覆盖？

  -  最开始我一直认为inline-child在inline的层叠上下文环境中，所以就算z-index设置为负值，也会显示在inline的背景之上
  -  后来发现z-index的默认值是auto，position为absolute并不会创建层叠上下文，所以inline-child和inline的层叠上下文其实都是根元素，而inline的z-index为auto比inline-child的-1大，所以inline的背景会覆盖inline-child的文字。

- 对于绝对定位的元素，盒子的display会被设置为block。可以在控制台通过getComputedStyle($0).display查看。还有一些条件，比如浮动元素、flex/grid的直接子元素，它们的display也会被设置为block。
