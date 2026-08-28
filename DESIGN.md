---
name: WebGL2 Learning
description: 一册可运行、可修改、持续生长的中文 WebGL2 实验讲义
colors:
  page: "oklch(0.985 0.006 230)"
  surface: "oklch(1 0 0)"
  surface-soft: "oklch(0.965 0.012 230)"
  ink: "oklch(0.255 0.025 245)"
  ink-soft: "oklch(0.47 0.025 245)"
  border: "oklch(0.88 0.014 230)"
  lab-blue: "oklch(0.69 0.145 238)"
  lab-blue-strong: "oklch(0.52 0.17 244)"
  lab-blue-soft: "oklch(0.95 0.035 238)"
  code-night: "oklch(0.205 0.018 250)"
  success: "oklch(0.6 0.14 158)"
  error: "oklch(0.58 0.19 28)"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, Avenir Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.35rem, 7vw, 4.75rem)"
    fontWeight: 720
    lineHeight: 0.98
    letterSpacing: "-0.05em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, Avenir Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.65rem, 4vw, 2.35rem)"
    fontWeight: 700
    lineHeight: 1.16
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, Avenir Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Atkinson Hyperlegible Next, Avenir Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.04em"
  code:
    fontFamily: "SFMono-Regular, Consolas, Liberation Mono, monospace"
    fontSize: "0.88rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
  3xl: "4.5rem"
components:
  button-action:
    backgroundColor: "{colors.lab-blue-strong}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.65rem 1rem"
    height: "2.75rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.65rem 0.75rem"
    height: "2.75rem"
  chip-meta:
    backgroundColor: "{colors.lab-blue-soft}"
    textColor: "{colors.lab-blue-strong}"
    typography: "{typography.label}"
    rounded: "999px"
    padding: "0.22rem 0.55rem"
  card-lab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  nav-active:
    backgroundColor: "{colors.lab-blue-soft}"
    textColor: "{colors.lab-blue-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0.58rem 0.75rem"
---

# Design System: WebGL2 Learning

## Overview

**Creative North Star: “The Living Lab Manual”**

这套界面是一册会运行的实验讲义：阅读区像编校清楚的技术书，互动区像随手可改的图形实验台。整体延续 React 文档轻盈、开放的阅读气质，用克制的实验室蓝色建立节奏，让复杂图形概念保持亲和与精确。

页面依靠稳定导航、宽松留白、清楚层级和真实 WebGL2 输出组织信息。它拒绝堆砌旧 WebGL1 写法、整页密集文字、照搬第三方教程、无法运行的代码片段，以及用重型框架或黑盒抽象隐藏底层图形 API。

**Key Characteristics:**

- 高密度内容配合舒展的阅读节奏。
- 蓝色只承担方向、状态和关键动作。
- 概念、代码与画布结果在同一视野内互相印证。
- 明暗主题共用相同的信息结构与交互语义。

## Colors

色彩像光线充足的图形实验室：冷白纸面、深蓝灰文字和少量清透天空蓝组成主体，代码区使用安静的夜蓝提供专注对比。

### Primary

- **Lab Blue** (`lab-blue`): 用于品牌记号、学习路径和轻量提示。
- **Focused Blue** (`lab-blue-strong`): 用于链接、激活导航和主要操作。
- **Mist Blue** (`lab-blue-soft`): 用于标签、选中项和概念提示背景。

### Neutral

- **Cool Paper** (`page`): 页面底色，提供略带冷意的纸张感。
- **Clean Surface** (`surface`): 文章、实验和浮层的内容表面。
- **Deep Technical Ink** (`ink`): 正文与标题的主要文字色。
- **Quiet Technical Ink** (`ink-soft`): 辅助信息与非激活控件。
- **Code Night** (`code-night`): 代码展示和编辑器背景。

**The Ten Percent Blue Rule.** 蓝色在单个视窗中的占比保持在约 10% 内，只标记方向、状态和可操作位置。

## Typography

**Display Font:** Atkinson Hyperlegible Next（Avenir Next 与系统无衬线回退）  
**Body Font:** Atkinson Hyperlegible Next（Avenir Next 与系统无衬线回退）  
**Label/Mono Font:** SFMono-Regular（Consolas 与 Liberation Mono 回退）

**Character:** 高辨识度字形支撑长时间技术阅读；紧凑标题与舒展正文形成类似现代参考手册的节奏。中文依赖经过平台优化的系统字形，代码保持等宽对齐。

### Hierarchy

- **Display**（720，`clamp(2.35rem, 7vw, 4.75rem)`，0.98）：只用于课程首屏标题。
- **Headline**（700，`clamp(1.65rem, 4vw, 2.35rem)`，1.16）：用于主要概念章节。
- **Title**（700，约 `1.15rem`，1.35）：用于实验面板和内容卡片。
- **Body**（400，`1rem`，1.7）：正文宽度控制在约 68ch，让代码与文字能并列阅读。
- **Label**（700，`0.78rem`，`0.04em`）：用于元信息、导航分组和控件。

**The One Display Rule.** 每页只出现一个 Display 级标题，其余内容依靠 Headline 与 Title 组织。

## Elevation

系统以色块、边框和位置层级表达深度。桌面常驻结构保持平坦，阴影只服务于移动端抽屉等真正覆盖内容的临时表面；深色主题取消环境阴影，使用边界与明度分层。

### Shadow Vocabulary

- **Floating Overlay** (`0 8px 32px oklch(0.2 0.03 245 / 0.12)`): 只用于移动导航抽屉和临时浮层。

**The Flat-at-Rest Rule.** 常驻卡片和工具栏静止时不使用投影，1px 边框与背景明度承担结构分隔。

## Components

组件克制、明确、可触摸，任何装饰都需要帮助阅读或实验操作。

### Buttons

- **Shape:** 8px 圆角，最小触控高度 44px。
- **Primary:** Focused Blue 背景配白色文字，水平内边距 16px。
- **Hover / Focus:** 160ms 状态过渡；键盘焦点使用 3px Focus Cyan 轮廓。
- **Ghost:** 透明背景配 Quiet Technical Ink，悬停时切换为 Soft Surface。

### Chips

- **Style:** 药丸形、Mist Blue 背景、Focused Blue 文字，无装饰性描边。
- **State:** 只呈现版本、难度、时长等短元数据，不承担长文本操作。

### Cards / Containers

- **Corner Style:** 12–16px 圆角。
- **Background:** Clean Surface 或 Soft Surface，代码容器使用 Code Night。
- **Shadow Strategy:** 常驻状态无阴影。
- **Border:** 1px Cool Border，强调结构边界。
- **Internal Padding:** 16–24px，复杂实验在宽屏使用 24px。

### Inputs / Fields

- **Style:** 着色器编辑器采用 Code Night 背景和等宽字体，透明输入层与 Prism 高亮层保持同步滚动。
- **Focus:** 由全局 3px 焦点轮廓明确标记。
- **Error / Disabled:** 错误同时显示 Error 色与可复制的编译信息；禁用状态降低对比并保留文字说明。

### Interaction Primitives

Tabs、Collapsible、Dialog、Tooltip 等复合交互以 Base UI 提供行为、ARIA 语义、焦点管理和键盘路径。视觉层继续使用本项目的 CSS Token 与组件类，避免引入独立主题系统。组件状态优先通过 Base UI 提供的 `data-*` 属性设置样式。

### Code Surfaces

TypeScript 和 GLSL 使用同一套 Prism token 语义色：紫色标记关键字、黄色标记函数、绿色标记字符串、橙色标记数字，注释保持较低对比。代码实验统一使用 `code-workbench` 外壳、工具栏色值和 Tab 指示器。普通内容宽度上限为 52rem，实验与执行流程可扩展到 64rem，正文段落仍限制在 72ch 内。

### Navigation

左侧课程树维持稳定章节顺序，可在“WebGL2 基本原理”和“WebGL2 如何工作”之间无刷新切换；History API 保留可复制 URL 以及浏览器前进、后退，切换后焦点移到新课程标题。当前项使用 Mist Blue 表面和 Focused Blue 文字。桌面默认固定显示并允许从页头收起，窄屏转为带遮罩的抽屉，并提供明确关闭按钮和 Escape 键路径。

### Shader Playground

着色器实验台将编辑器、运行操作、错误反馈和画布结果组合为一个可理解的闭环。宽屏双列展示，实验主体高度随视窗保持在 31–42rem，代码在左侧独立滚动；窄屏顺序堆叠，代码区高度上限为 32rem。运行成功后状态信息通过可见文字和礼貌播报同步更新。

### Varying Playground

Varying 插值实验将三个顶点颜色控件与真实 WebGL2 画布并列展示。任意颜色变化都会立即更新交错顶点 Buffer，让用户直接观察从三个 <code>a_color</code> 到连续 <code>v_color</code> 的 GPU 插值结果。窄屏上控件和画布顺序堆叠，状态信息保持可见。

### Execution Flow

六阶段执行流程将 JavaScript 资源准备、GPU 上传、绘制命令、顶点着色器、光栅化和片段着色器连成一条完整时间线。CPU 与 GPU 状态区展示当前由谁工作，WebGL API 上的动画信号表示资源或命令跨过边界。流程首次进入时自动播放一遍，同时提供暂停、重播和阶段直达；当系统启用“减少动态效果”时，流程改为手动逐步查看。Motion 只负责视觉过渡，阶段选择和文字说明始终可直接访问。

## Do's and Don'ts

### Do:

- **Do** 先建立心智模型，再展示 API 调用顺序。
- **Do** 为每个核心概念提供可观察、可修改的运行结果。
- **Do** 保持学习代码短小透明，抽象只服务于重复劳动。
- **Do** 使用 8px 间距基准、44px 触控目标和清晰的键盘焦点。
- **Do** 在明暗主题中保持相同内容层级、语义颜色和交互路径。

### Don't:

- **Don't** 堆砌旧 WebGL1 写法。
- **Don't** 制造整页密集文字。
- **Don't** 照搬第三方教程。
- **Don't** 提供无法运行的代码片段。
- **Don't** 用重型框架或黑盒抽象隐藏底层图形 API。
- **Don't** 让蓝色承担大面积装饰或让投影成为默认容器边界。
