const path = require("path");
const {
  loader1,
  loader2,
  WebpackRunPlugin,
  WebpackDonePlugin
} = require("./webpack");
module.exports = {
  mode: "development", //防止代码被压缩
  entry: "./src/index.js", //入口文件
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [loader1, loader2]
      }
    ]
  },
  plugins: [new WebpackRunPlugin(), new WebpackDonePlugin()],
  devtool: "source-map" //防止干扰源文件
};
