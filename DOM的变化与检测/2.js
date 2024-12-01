// 通过Mutation Events来监听DOM的变化 -- 已废弃 监听是同步的 会影响性能

// 通过MutationObserver来监听DOM的变化

// 要观察的DOM元素
const div = document.querySelector("div");

const config = {
  attributes: true, // 监听属性变化
  childList: true, // 监听子节点变化 是否有子节点被添加或删除
  subtree: true, // 监听后代节点变化 默认为false
  characterData: true, // 监听文本变化
  attributeOldValue: true, // 监听属性变化时 记录变化前的属性值
  characterDataOldValue: true // 监听文本变化时 记录变化前的文本值
};

/**
 * @param {MutationRecord[]} mutationsList 发生变化的DOM节点
 * @param {MutationObserver} observer 观察者对象
 */
const callback = function (mutationsList) {
  for (const mutation of mutationsList) {
    console.log(mutation);
    // mutation所有参数
    /**
     * 1. type 变化类型 attributes、childList、characterData
     * 2. target 变化的DOM节点
     * 3. attributeName 变化的属性
     * 4. attributeValue 变化的属性值
     * 5. oldValue 变化前的属性值
     * 6. addedNodes 添加的节点
     * 7. removedNodes 删除的节点
     * 8. previousSibling 变化节点的前一个兄弟节点 type为childList时有效
     * 9. nextSibling 变化节点的后一个兄弟节点 type为childList时有效
     */
  }
};

// 创建观察者对象
const observer = new MutationObserver(callback);

// 传入要观察的DOM元素和配置
observer.observe(div, config);

const span = document.createElement("span");
const span2 = document.createElement("span");
span.textContent = "span";
span2.textContent = "span2";
div.append(span, span2);
span.textContent = "span1";
const text = document.createTextNode("");
div.append(text);
text.textContent = "text1";
const text2 = document.createTextNode("text2");
div.append(text2);
text2.textContent = "text21";

const text3 = document.createTextNode("text3");
console.log(Object.getPrototypeOf(text2).toString);
text2.textContent = text3;
// text3.textContent = "text31";
