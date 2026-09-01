---
name: WebGL2 Learning
description: 一册可运行、可修改、持续生长的中文 WebGL2 实验讲义
colors:
  page: "#ffffff"
  surface: "#ffffff"
  surface-soft: "#f6f7f9"
  ink: "#23272f"
  ink-soft: "#404756"
  border: "#e5e7eb"
  lab-blue: "#149eca"
  lab-blue-strong: "#087ea4"
  lab-blue-soft: "#e6f7ff"
  success: "oklch(0.6 0.14 158)"
  error: "oklch(0.58 0.19 28)"
---

# Design System: WebGL2 Learning

## Creative North Star

“The Living Lab Manual”——阅读区像编校清楚的技术书，互动区像可随手修改的图形实验台。页面依靠稳定导航、宽松留白、清楚层级和真实 WebGL2 输出组织信息，让复杂图形概念保持精确且亲和。

## Visual Language

- 浅色主题使用纯白页面、React 风格中性灰表面、深蓝灰文字和少量实验室蓝。
- 深色主题使用 `#23272f` 页面、`#343a46` 中性表面和 `#16181d` 代码区；代码工具栏与中性表面同色，保证文件名栏与页面背景分开。
- 文字保持三级层次：标题使用 `ink`，正文使用 `ink-soft`，面包屑、状态和规划项使用 muted 色；两个主题维持相同语义。
- 蓝色在单个视窗中控制在约 10%，只标记方向、状态和可操作位置。
- 常驻卡片依靠 1px 边框和背景明度分层；阴影只用于移动抽屉等覆盖层。
- 页面不使用渐变背景。

## Typography and Rhythm

- 展示标题：每页一个，40px / 50px，桌面和移动端保持一致。
- 章节标题：28px / 40px，清晰区分新概念。
- 正文：17px / 30px，优先系统界面字体并使用 Atkinson Hyperlegible Next 回退。
- 代码：SFMono-Regular、Consolas 与 Liberation Mono 回退。
- 间距以 8px 为基准，触控目标最小 44px，圆角控制在 8–16px。

## Navigation

课程使用查询参数和 History API 保留可复制 URL、浏览器前进与后退。桌面侧栏宽 320px、固定显示并可收起；导航文字按 20px、40px、60px 表达根级、一级和二级缩进。窄屏使用带遮罩的抽屉，支持关闭按钮与 Escape。页内锚点在常规窗口使用文章右上角的可展开目录，宽度达到 1440px 后切换为常驻右栏，并高亮当前章节。切换课程后焦点移动到新标题。

## Code and Lab Surfaces

- TypeScript 与 GLSL 使用同一套 Prism 语义色。
- 编辑器、状态区、Canvas 和运行操作组合为一个闭环。
- Shader 编译与 Program 链接错误保留完整消息。
- 宽屏实验主体可扩展到 64rem；窄屏代码与 Canvas 顺序堆叠。
- Canvas 使用真实 WebGL2 输出，响应 ResizeObserver、DPR 和 `viewport` 同步。

## Interactive Components

- Execution Flow：六阶段展示 JavaScript 准备、GPU 上传、绘制命令、顶点着色器、光栅化与片段着色器，支持播放、暂停、重播和阶段直达。
- Shader Playground：可编辑顶点/片段着色器，重新编译 Program，并显示编译诊断。
- Uniform Lab：实时更新 Uniform，观察颜色与变换变化。
- Varying Playground：调整三个顶点颜色，观察 GPU 插值结果。
- Pixel Playground：用像素坐标绘制矩形，验证裁剪空间换算。
- State Explorer：逐步查看绑定点、VAO 与 draw call 读取的状态。

## Motion and Accessibility

- Motion 只负责帮助理解阶段变化，文字说明始终可直接访问。
- `prefers-reduced-motion` 下取消自动播放和长过渡。
- 所有 Tabs、按钮、输入与导航提供清晰 hover、selected 和 focus-visible 状态。
- 成功与错误信息通过 `aria-live` 宣告，状态含可读文字。

## Do

- 先解释数据与对象的关系，再展示 API 调用顺序。
- 为 Buffer、VAO、Attribute、Uniform、Program 和 Shader 标明职责。
- 明确 stride、offset、绑定关系和资源生命周期。
- 让每个实验都能运行、失败、重试和安全清理。

## Avoid

- 用大面积装饰抢占阅读注意力。
- 省略编译失败、上下文丢失和 GPU 资源释放。
- 提供脱离数据来源与最终去向的孤立代码。
- 用重型抽象遮蔽原生 WebGL2 API。
