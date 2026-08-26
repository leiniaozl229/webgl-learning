# WebGL2 Learning

用于系统学习 WebGL2、GLSL ES 3.00 和图形学基础的本地教程站。工程结构参考相邻的 `liquid-glass-gl`，内容路线参考 WebGL2 Fundamentals，界面采用适合长期阅读与动手实验的文档站布局。

当前课程包含：

- “WebGL2 基本原理”与“WebGL2 如何工作”两篇可切换课程
- WebGL2 渲染路径和四类着色器数据通道
- 可播放、暂停和逐步查看的 JavaScript → GPU 六阶段执行流程
- 原生 WebGL2 三角形示例
- 可切换、编辑和重新编译的顶点/片段着色器
- 可读的 GLSL 编译错误反馈
- 可调整三个顶点颜色的 Varying 插值实验
- 明暗主题、桌面课程导航和移动抽屉

## 开始

```bash
npm install
npm run dev
```

打开 <http://localhost:5193>。需要支持 WebGL2 的现代浏览器。

## 质量命令

- `npm run check:types` — 严格 TypeScript 检查
- `npm test` — 运行 Vitest 测试
- `npm run build` — 类型检查与生产构建
- `npm run preview` — 本地预览生产构建

## 目录

```text
src/core/       框架无关的 WebGL、GLSL、数学与渲染代码
src/react/      后续可复用的 React 封装和 hooks
src/ui/         后续可复用的界面组件与样式 token
src/demo/       浏览器入口与学习示例展示层
public/         原样复制到构建产物的静态资源
docs/           学习笔记、原理说明与实验记录
tests/          跨模块或浏览器测试
```

`PRODUCT.md` 记录产品目标，`DESIGN.md` 记录视觉系统和组件约束。新增课程时优先复用现有文章结构、实验面板和设计 token。

## 内容参考

知识路线参考 [WebGL2 Fundamentals 中文教程](https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-fundamentals.html)。站内文字组织、TypeScript 示例和互动实验均在本项目中重新编写。
