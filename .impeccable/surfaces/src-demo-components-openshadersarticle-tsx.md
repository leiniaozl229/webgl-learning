---
version: 1
slug: "src-demo-components-openshadersarticle-tsx"
primary_target: "src/demo/components/OpenShadersArticle.tsx"
related_targets: ["src/demo/components/OpenShadersLab.tsx","src/demo/openshaders.css"]
---

# OpenShaders 分步实验

Mode: Read. Existing lesson extension, code-led. User confirmed progressive experiments with a live preview and parameter controls. Preserve the incumbent course shell and all existing work.

## Direction contract

THESIS: See one light grow into a ribbon by enabling one operation at a time.
OWN-WORLD: Inherit DESIGN.md reading rhythm, laboratory blue, neutral surfaces, Base UI tabs, and both themes.
STORY: Compare the current stage with the finished field, change its parameters, then inspect the actual shader and render targets.
FIRST VIEWPORT: Short lesson heading, eight-step navigator, a large comparison canvas; step explanation and previous/next actions immediately follow. Controls stay adjacent on desktop and follow the preview on mobile.
FORM: A sequential lab inside the existing lesson composition; precise local extension, seed key not applicable. Signature interaction is a visible one-operation-at-a-time comparison.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

No external images or new identity. Teaching rewrite with explicit differences from the researched production pipeline. No unresolved decisions.

## 已实现的页面与交互

本次扩展延续根目录 `DESIGN.md` 的课程视觉与明暗主题，采用代码主导实现，没有批准的视觉稿或产品栅格素材。设计记录限定在本页面；全局设计文档与元数据保持原有状态。

- 八个步骤按钮支持直达，配合上一步、下一步、当前步骤说明、输入／新增运算／输出和观察提示，逐步启用 Shader 运算。
- 各步共享本地参数种子、对照开关、播放／暂停和重置。名字去除首尾空白并统一大小写，经确定性 PRNG 生成可复现参数；空名字使用 `webgl`。

| 步骤 | 当前步骤的参数与观察入口 |
| --- | --- |
| 1. 建立坐标 | 网格、坐标轴与半径 0.25 的圆环 |
| 2. 点亮一个光斑 | 曝光 |
| 3. 把光斑拉成细丝 | 纵轴尺度 |
| 4. 让坐标连续弯曲 | 扭曲强度、时间相位 |
| 5. 重复折叠并累加 | 累加层数、时间相位 |
| 6. 配色与压缩高光 | 曝光、色相、Tone mapping、时间相位 |
| 7. 叠加表面风格 | 风格、效果强度、时间相位 |
| 8. 拆开计算与显示分辨率 | 风格、效果强度、1×／½×／¼× 基础场分辨率、时间相位 |

- 对照共享参数和时间：前六步右侧显示完成效果；第七步右侧为原始光场，左侧为当前后处理结果；第八步右侧为同风格的全尺寸基础场，左侧采用所选基础场分辨率。工具栏、画布标签与可访问名称同步表达这些含义。
- 九种风格为 Pure field、Grain、ASCII、Dither、Halftone、Sparkle、Liquid、Mosaic、Chroma。Pure field 保留原始光场，其余风格显示效果强度控件。
- 动画默认暂停，需主动播放；画布离屏或页面隐藏时停止绘制与时间推进，减少运动偏好开启时暂停播放。第四步起，播放中的时间读数按 5 Hz 更新；时间滑块上限随播放按 30 秒扩展，拖动滑块会暂停并定位时间。
- 源码采用 Base UI Tabs，包含当前公式、`vertex-data.ts`、`vertex.glsl`、`fragment.glsl`、`post.glsl`；完整源码直接读取实际运行文件，代码区最大高度 22rem 并可滚动。

## 绘制与教学边界

- 一个 WebGL2 Context 复用两个 Program 和一个 VAO。每个画面分区执行两遍绘制：光场写入独立 Framebuffer 的 `RGBA8` 颜色纹理，后处理采样该纹理并绘制到 Canvas。开启对照时，当前与参考分区各执行两遍。
- 三份 GLSL 使用 `#version 300 es`。顶点阶段以 `gl_VertexID` 生成全屏三角形；参数通过 Uniform 上传，参数变化复用 GPU 资源。错误区展示绘制诊断并支持重试，卸载时释放纹理、Framebuffer、VAO 和 Program。
- 容器尺寸与 DPR 变化触发重绘，各输出目标同步更新 `viewport`；绘图像素比上限为 1.5，并设置 700,000 像素预算。状态栏显示当前画面和基础场尺寸，以及基础场片段数比例。
- 页面披露教学简化：使用较少参数和独立 PRNG、`RGBA8` 与 `LINEAR` 升采样，并解释原站的参数筛选、浮点纹理与三次重建差异。基础场片段数比例仅描述该遍计算量。

## 局部布局与视觉继承

- 桌面实验台采用画布加 15rem 参数栏的网格，八步导航横向排列。宽度不超过 45rem 时，导航改为四列两行，参数栏位于画布下方。
- 按钮、表单、边框、圆角与源码区域沿用课程变量和焦点规则。参数栏小提示使用现有 `--color-text-soft`，本次对比度修复限定在实验栏内。

## 收尾状态与证据

2026-10-02 完成文档收尾。最终审阅处置为 **ship**：同一审阅者在 verdict pass 中将实时读数、分阶段对照标签、小提示对比度三项修复全部评分为 resolved，并确认该批修复未见回归；此结论仅覆盖这三项修复。

- 三个 UI 目标的检测器结果为 `[]`；此前两项颜色问题已修正，未添加抑制规则。
- 实现验证已通过：127 项测试、TypeScript 检查、生产构建和差异空白检查。构建保留既有的大体积 chunk 提示。
- 既有截图证据位于 `.impeccable/review/`：`desktop.jpg`、`desktop-full.jpg`（1280 桌面），`mobile.jpg`、`mobile-full.jpg`（390 移动端），以及 `desktop-light.jpg`、`desktop-effect.jpg`、`desktop-time.jpg`、`desktop-resolution.jpg`。
- 浏览器验证未强制触发完整 Context 丢失／恢复与跨显示器 DPR 切换。本次文档收尾复用已有证据，没有追加 UI 检查。
