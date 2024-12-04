const { SyncHook } = require("tapable");
const path = require("path");
const fs = require("fs");
const parser = require("@babel/parser");
let types = require("@babel/types"); //用来生成或者判断节点的AST语法树的节点
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;

//将\替换成/
function toUnixPath(filePath) {
  return filePath.replace(/\\/g, "/");
}

const baseDir = toUnixPath(process.cwd()); //获取工作目录，在哪里执行命令就获取哪里的目录

//获取文件路径
function tryExtensions(modulePath, extensions) {
  if (fs.existsSync(modulePath)) {
    return modulePath;
  }
  for (let i = 0; i < extensions?.length; i++) {
    let filePath = modulePath + extensions[i];
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  throw new Error(`无法找到${modulePath}`);
}

class Compiler {
  constructor(webpackOptions) {
    this.options = webpackOptions;
    this.hooks = {
      run: new SyncHook(),
      done: new SyncHook()
    };
  }

  compile(callback) {
    //虽然webpack只有一个Compiler，但是每次编译都会产出一个新的Compilation，
    //这里主要是为了考虑到watch模式，它会在启动时先编译一次，然后监听文件变化，如果发生变化会重新开始编译
    //每次编译都会产出一个新的Compilation，代表每次的编译结果
    let compilation = new Compilation(this.options);
    compilation.build(callback); //执行compilation的build方法进行编译，编译成功之后执行回调
  }

  // 4.执行`Compiler`的`run`方法开始执行编译
  run(callback) {
    this.hooks.run.call();
    const onCompiled = (err, stats, fileDependencies) => {
      // 10. 确定好输出内容后，根据配置的输出路径和文件名，将文件内容写入到文件系统
      if (!fs.existsSync(this.options.output.path)) {
        fs.mkdirSync(this.options.output.path);
      }
      for (let filename in stats.assets) {
        let filePath = path.join(this.options.output.path, filename);
        fs.writeFileSync(filePath, stats.assets[filename], "utf-8");
      }

      callback(err, {
        toJson: () => stats
      });

      this.hooks.done.call();
    };
    this.compile(onCompiled);
  }
}

//生成运行时代码
function getSource(chunk) {
  return `
    (() => {
        var modules = {
        ${chunk.modules.map(
          module => `
            "${module.id}": (module) => {
            ${module._source}
        }
        `
        )}
    };
        var cache = {};
        function require(moduleId) {
    var cachedModule = cache[moduleId];
        if (cachedModule !== undefined) {
            return cachedModule.exports;
        }
        var module = (cache[moduleId] = {
            exports: {},
        });
        modules[moduleId](module, module.exports, require);
        return module.exports;
        }
        var exports ={};
        ${chunk.entryModule._source}
    })();
    `;
}

class Compilation {
  constructor(webpackOptions) {
    this.options = webpackOptions;
    this.modules = []; // 本地编译生成的模块
    this.chunks = []; // 本地编译生成的代码块，入口模块和依赖的模块打包在一起为代码块
    this.assets = {}; // 本地编译生成的资源文件
    this.fileDependencies = []; // 本地编译设计到的文件，为了实现watch监听文件变化，文件发生变化后重新编译
  }

  // 模块编译的时候，name是chunk的名字，modulePath是模块的绝对路径
  buildModule(name, modulePath) {
    // 6.2.1 读取模块内容，获取源代码
    let sourceCode = fs.readFileSync(modulePath, "utf-8");
    //buildModule最终会返回一个modules模块对象，每个模块都会有一个id,id是相对于根目录的相对路径
    let moduleId = "./" + path.posix.relative(baseDir, modulePath); //模块id:从根目录出发，找到该模块的相对路径（./src/index.js）
    // 6.2.2 创建模块对象
    let module = {
      id: moduleId,
      names: [name], // names设计成数组是表示此模块属于哪个代码块，可能属于多个代码块
      dependencies: [], // 依赖的模块
      _source: "" // 源代码
    };

    // 6.2.3 找到对应的 `loader` 对源代码进行翻译和替换
    let loaders = [];
    let { rules } = this.options.module;
    rules.forEach(rule => {
      let { test } = rule;
      if (modulePath.match(test)) {
        loaders.push(...rule.use);
      }
    });

    // loader自右向左执行
    sourceCode = loaders.reduceRight((code, loader) => {
      return loader(code);
    }, sourceCode);

    // 7. 找出此模块所依赖的模块，再对依赖的模块进行编译
    // 7.1 先把源代码编译成ast
    let ast = parser.parse(sourceCode, { sourceType: "module" });
    traverse(ast, {
      CallExpression: nodePath => {
        const { node } = nodePath;
        // 7.2 在 `AST` 中查找 `require` 语句，找出依赖的模块名称和绝对路径
        if (node.callee.name === "require") {
          let depModuleName = node.arguments[0].value; //获取依赖的模块
          let dirname = path.posix.dirname(modulePath); //获取当前正在编译的模所在的目录
          let depModulePath = path.posix.join(dirname, depModuleName); //获取依赖模块的绝对路径
          let extensions = this.options.resolve?.extensions || [".js"]; //获取配置中的extensions
          depModulePath = tryExtensions(depModulePath, extensions); //尝试添加后缀，找到一个真实在硬盘上存在的文件
          //7.3：将依赖模块的绝对路径 push 到 `this.fileDependencies` 中
          this.fileDependencies.push(depModulePath);
          //7.4：生成依赖模块的`模块 id`
          let depModuleId = "./" + path.posix.relative(baseDir, depModulePath);
          //7.5：修改语法结构，把依赖的模块改为依赖`模块 id` require("./name")=>require("./src/name.js")
          node.arguments = [types.stringLiteral(depModuleId)];
          //7.6：将依赖模块的信息 push 到该模块的 `dependencies` 属性中
          module.dependencies.push({ depModuleId, depModulePath });
        }
      }
    });

    // 7.7 生成新代码，并把转移后的源代码放到 `module._source` 属性上
    let { code } = generator(ast);
    module._source = code;
    // 7.8 对依赖模块进行编译
    module.dependencies.forEach(({ depModuleId, depModulePath }) => {
      // 检查模块是否已经处理
      let existModule = this.modules.find(item => item.id === depModuleId);
      //如果modules里已经存在这个将要编译的依赖模块了，那么就不需要编译了
      //直接把此代码块的名称添加到对应模块的names字段里就可以
      if (existModule) {
        existModule.names.push(name);
      } else {
        // 7.9 编译依赖模块
        let depModule = this.buildModule(name, depModulePath);
        this.modules.push(depModule);
      }
    });
    // 7.10 依赖模块全部编译完成后，返回入口模块的 `module` 对象
    return module;
  }

  build(callback) {
    // 5.根据配置文件找到所有入口
    let entry = {};
    if (typeof this.options.entry === "string") {
      entry.main = this.options.entry;
    } else {
      entry = this.options.entry;
    }

    // 6.从入口文件出发，调用配置的`loader`规则，对各模块进行编译
    for (let entryName in entry) {
      // entryName="main" entryName就是entry的属性名，也将会成为chunk的名称
      let entryFilePath = path.posix.join(baseDir, entry[entryName]); //path.posix为了解决不同操作系统的路径分隔符,这里拿到的就是入口文件的绝对路径
      // 6.1 把入口文件的绝对路径添加到依赖数组中，记录此次编译依赖的模块
      this.fileDependencies.push(entryFilePath);
      // 6.2 得到入口模块的 `module` 对象（里面存放模块路径、依赖模块、源代码等）
      let entryModule = this.buildModule(entryName, entryFilePath);
      // 6.3 将生成的 `module` 对象添加到 `modules` 中
      this.modules.push(entryModule);
      // 8. 等所有模块编译完成后，组装代码块 `chunk`
      // 一般来说，每个入口文件会对应一个代码块`chunk`，每个代码块`chunk`里面会放着本入口模块和它依赖的模块
      let chunk = {
        name: entryName,
        entryModule,
        modules: this.modules.filter(item => item.names.includes(entryName))
      };
      this.chunks.push(chunk);
    }

    // 9. 把各个代码块 `chunk` 转换成一个一个文件加入到输出列表
    this.chunks.forEach(chunk => {
      let filename = this.options.output.filename.replace("[name]", chunk.name);
      this.assets[filename] = getSource(chunk);
    });

    // 编译成功执行callback
    callback(
      null,
      {
        chunks: this.chunks,
        modules: this.modules,
        assets: this.assets
      },
      this.fileDependencies
    );
  }
}

// 1.搭建结构，读取配置参数
function webpack(webpackOptions) {
  // 2.用配置参数初始化`Compiler`对象
  const compiler = new Compiler(webpackOptions);
  // 3.挂载配置文件中的插件
  const { plugins } = webpackOptions;
  for (let plugin of plugins) {
    plugin.apply(compiler);
  }
  return compiler;
}

const loader1 = source => {
  return source + "//给你的代码加点注释：loader1";
};

const loader2 = source => {
  return source + "//给你的代码加点注释：loader2";
};

//自定义插件WebpackRunPlugin
class WebpackRunPlugin {
  apply(compiler) {
    compiler.hooks.run.tap("WebpackRunPlugin", () => {
      console.log("开始编译");
    });
  }
}

//自定义插件WebpackDonePlugin
class WebpackDonePlugin {
  apply(compiler) {
    compiler.hooks.done.tap("WebpackDonePlugin", () => {
      console.log("结束编译");
    });
  }
}

module.exports = {
  webpack,
  loader1,
  loader2,
  WebpackRunPlugin,
  WebpackDonePlugin
};
