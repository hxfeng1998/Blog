// 通过Object.defineProperty()方法来监听DOM属性变化
// 兼容性好：只有IE8及以下不兼容
// 只能监听属性的读取和设置，不能监听元素的添加和删除
Object.defineProperty(HTMLDivElement.prototype, "rows", {
  configurable: true,
  enumerable: true,
  get() {
    console.log("访问了rows属性", this.getAttribute("rows"));
    return this.getAttribute("rows");
  },
  set(value) {
    this.setAttribute("rows", value);
    console.log("rows变化了", value);
  }
});

const div = document.querySelector("div");
div.rows = 20;
console.log(div.rows);
