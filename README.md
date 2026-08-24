# WebGL Learning

用于学习 WebGL、GLSL 和图形学基础的本地实验项目。工程结构参考相邻的 `liquid-glass-gl`，保留 Vite、React、TypeScript 和分层源码目录，省略组件库发布、业务代理与专属素材流水线。

## 开始

```bash
npm install
npm run dev
```

打开 <http://localhost:5193>。

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
