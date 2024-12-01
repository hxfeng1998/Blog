// 通过 CSS animation 来检测DOM变化
// animationend 事件
// 缺点：需要为一个或一组元素进行不同处理，不能抽象为通用方案

const div = document.querySelector("div");
div.addEventListener("animationend", () => {
  console.log("动画结束了");
});
