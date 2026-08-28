# WebGL Learning 项目协作说明

## 项目目标

这是一个面向个人学习的中文 WebGL2 教程站点。内容参考 WebGL2 Fundamentals 的知识路线，使用现代技术栈重新编写，并通过动画、状态图和可交互实验解释 JavaScript、WebGL2 API、GLSL 与 GPU 之间的关系。

完整课程规划见 `docs/curriculum-outline.md`。

## 技术栈

- React 19
- TypeScript
- Vite
- 原生 WebGL2 API
- GLSL ES 3.00
- Motion
- Prism React Renderer
- Vitest

## 常用命令

```bash
npm run dev -- --host 127.0.0.1 --port 5193
npm test
npm run check:types
npm run build
```

完成代码修改后至少运行：

```bash
npm test
npm run check:types
npm run build
git diff --check
```

## 目录约定

- `src/demo/`：教程站点的 React 页面和交互组件。
- `src/core/`：WebGL2 绘制、Shader 源码和可独立测试的核心逻辑。
- `docs/`：课程规划、技术说明和学习笔记。
- `DESIGN.md`：视觉语言与设计约束。

## 内容编写规范

- 使用简体中文解释概念，API、GLSL 变量和类型保留英文名称。
- 首次出现术语时解释它在当前渲染流程中的职责。
- 避免只给出孤立代码；说明数据来源、绑定关系、执行时机和最终去向。
- 每篇课程保持单一主线，新概念按依赖顺序出现。
- 示例使用 WebGL2 和 `#version 300 es`。
- JavaScript 示例优先使用 TypeScript 和 TypedArray。
- 代码注释需要说明原因和数据关系，避免逐字翻译 API 名称。
- 避免使用对立式双重否定句式。
- 引用外部教程时保留来源链接，并对过时的兼容性信息进行校正。

## 页面结构建议

每篇课程根据内容选择以下模块：

1. 标题、简介和预计阅读时间。
2. 学习目标。
3. 核心概念与数据流。
4. 可视化流程或状态图。
5. 可交互 WebGL2 实验。
6. 完整源码面板。
7. 常见问题或容易混淆的概念。
8. 上一篇、下一篇和参考资料。

源码面板优先采用以下标签：

- `vertex-data.ts`
- `vertex.glsl`
- `fragment.glsl`

## 交互与视觉规范

- 延续 React 文档风格的清晰层级和宽松阅读节奏。
- 主色使用偏蓝的实验室色彩，兼顾明暗主题。
- 不使用渐变背景。
- 桌面端和移动端侧边导航都要支持展开与收起。
- 代码区域设置合理的最大高度，并提供滚动。
- Tab、按钮、输入框必须有清晰的悬停、选中和键盘焦点状态。
- 动画需要兼容 `prefers-reduced-motion`。
- Canvas 需要处理设备像素比和容器尺寸变化。

## WebGL2 实现约定

- 检查 `canvas.getContext('webgl2')` 的返回值。
- Shader 编译和 Program 链接失败时展示完整错误信息。
- 清晰区分 JavaScript 内存、GPU Buffer、VAO 配置和 Shader 输入。
- 创建 GPU 资源后提供对应的清理逻辑。
- 调整 Canvas 尺寸后同步调用 `viewport`。
- Attribute 的 `stride` 和 `offset` 使用字节作为单位，并在示例中明确标注。
- 交互实验重新绘制时避免遗留失效的 Buffer、VAO 或 Program。

## Git 约定

- 保留用户已有的未提交修改。
- 一个提交聚焦一个完整变化。
- 提交前检查工作区差异和验证结果。
- 禁止使用破坏性 Git 命令清除工作区。

