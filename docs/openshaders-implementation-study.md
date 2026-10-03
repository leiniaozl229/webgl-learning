# OpenShaders Shader 实现研究

研究对象为 [OpenShaders Explore](https://openshaders.com/explore)，查阅日期为 2026 年 10 月 2 日。本文结合实际页面、公开客户端 JavaScript、GLSL 字符串、参数生成器和代码导出器，解释当前用户名卡片的实现。它是一份当前发布版本的研究快照。

**核心结论：卡片共享一套二维程序化发光场，用户名决定参数，八种后处理提供不同表面风格。** 实时页面使用 WebGL2 和 GLSL ES 3.00；复制菜单还提供 WebGPU、React WebGL 和 React WebGPU 代码。流动丝带主要来自重复坐标扭曲、旋转剪切、各向异性光斑和加色累积。

通用手法与独立教学代码见 [Shader 效果常见手法](./shader-effects-handbook.md)。

交互拆解已接入本站“Shader 实战 → OpenShaders 效果拆解”。启动 `npm run dev -- --host 127.0.0.1 --port 5193` 后，访问 [八步教学实验](http://127.0.0.1:5193/?lesson=openshaders-breakdown)，依次开启坐标、光斑、拉伸、扭曲、折叠累加、配色、后处理与降分辨率。页面提供当前步骤与完成画面的对照、参数控制、输入输出说明和实际运行源码。教学实现使用独立参数生成器、RGBA8 与 LINEAR 升采样；与原站浮点纹理、三次重建等实现的差异在页面中单独说明。

## 研究范围和证据

官方 [GitHub 仓库](https://github.com/openshaders/openshaders) 在本次查阅时只有 README、LICENSE 和展示素材，README 将完整平台描述为仍在建设中。[About 页面](https://openshaders.com/about) 也区分当前用户名卡片与未来的编辑、发布和组件库功能。因此本文以当前网页实际加载的客户端代码为实现证据，未来规划只按规划记录。

| 公开来源 | 可验证的内容 | 便于定位的标识 |
| --- | --- | --- |
| [参数生成器](https://openshaders.com/_next/static/chunks/username-shader-params-BgxULHTP.js) | 用户名 hash、PRNG、参数筛选、rarity 权重 | `Float32Array`、`Shader parameter layout drifted.`、`none:.39` |
| [实时 Shader 与渲染器](https://openshaders.com/_next/static/chunks/username-shader-CusopM4Y.js) | 基础场、后处理、纹理与重建管线 | `oklchToLinear`、`mat2 fold`、`reconstructField`、`uChromaDisplay` |
| [卡片生命周期](https://openshaders.com/_next/static/chunks/username-shader-Dys261tT.js) | Context 池和挂载调度 | `webgl2`、`requestIdleCallback` |
| [代码导出器](https://openshaders.com/_next/static/chunks/username-shader-export-IKgZWTdB.js) | GLSL、WGSL 和宿主代码生成 | `createShader`、`createRenderPipelineAsync` |
| [复制菜单](https://openshaders.com/_next/static/chunks/shader-code-menu-UTPCpfyA.js) | 四种导出格式 | `WebGL`、`WebGPU`、`React` |

这些带构建哈希的文件链接可能在重新部署后失效。本文保留实现名称、关键公式和管线关系，以便以后对照新版本。已验证的范围为公开前端实现；没有后端数据、GPU 性能测量或 WebGL 与 WebGPU 的逐像素一致性结果。

## 用户名怎样成为画面

```text
用户名小写化
    ├─ 整数 hash → 确定性 PRNG → 参数候选 → CPU 画面筛选
    │                                      │
    │                                      ▼
    │                                Float32Array 34 项
    │                                      │ uniform uP[]
    │                                      ▼
    │                               基础丝带发光场
    │
    └─ 独立 rarity 种子 → 风格、strength、scale、seed
                                           │
                                           ▼
                                     可选后处理
```

参数生成器先把用户名转成小写，以整数 hash 和 PRNG 生成稳定的候选序列。34 项基础参数按固定顺序打包，GLSL 通过宏把数组下标映射到语义名称。参数主要控制颜色、折叠矩阵、正弦扰动、光斑形状、画面位置与时间节奏。[参数源码](https://openshaders.com/_next/static/chunks/username-shader-params-BgxULHTP.js)

生成器还在 CPU 上用 48×30 个采样点粗略评估候选的覆盖率、平均亮度和过曝比例，最多尝试 16 组。合格候选须满足覆盖率 0.35–0.85、平均值 0.14–0.42、过曝比例不超过 0.09；全部失败时选择覆盖率最接近 0.6 的候选。由此可见，画面受到受限参数范围和视觉质量筛选共同约束。源码还含个别用户名的色调特例，复现时应保留版本和这些规则。[参数源码](https://openshaders.com/_next/static/chunks/username-shader-params-BgxULHTP.js)

rarity 使用附加了独立后缀的用户名种子，避免和基础参数生成过程混用随机序列。风格强度约为 0.7–1.3，尺度约为 0.8–1.25。相同用户名在同版本生成器下得到相同参数；算法和筛选规则更新后，需要重新确认复现性。

## 基础丝带怎样生成

### 坐标和时间

片段坐标减去画面中心，再统一除以画面高度，让两轴使用相同尺度。随后应用偏移、缩放和整体旋转。时间结合速度、方向和初始相位；两条不同频率的正弦波构成呼吸量，控制缩放、光斑位置和亮度。[实时源码](https://openshaders.com/_next/static/chunks/username-shader-CusopM4Y.js)

### 重复扭曲和折叠

每层先用正弦波扰动横纵坐标，再乘一个含旋转与剪切的矩阵，最后缩小。第二个正弦扰动读取本层刚更新的横坐标，因此两个方向相互影响。参数中的 `LAYERS` 为 70–95；Shader 循环上限为 96，超过实际层数时退出。

这种迭代让同一个像素在不同变换后的坐标中查询光斑，多个拉长光斑逐层累加，形成细丝和褶皱。层数参与结构生成，减少层数也会改变外观。

### 光斑和颜色

光斑可以概括为：

```text
s = 两轴按不同尺度拉伸后的查询坐标
glow = 发光强度 / (s·s + 正的柔化常数)
该层贡献 = glow × 该层颜色 × exp2(-半径 × 衰减系数)
```

两轴尺度差产生细长亮核，正的柔化常数限制中心峰值。可选的 echo 再增加一个横向偏移光斑。每层颜色由层号、时间与半径共同调制，然后通过 OKLCH 转线性 RGB，累加到同一像素的颜色中。[实时源码](https://openshaders.com/_next/static/chunks/username-shader-CusopM4Y.js)

### 压缩亮度并匹配主题

累加后应用 ACES 风格的亮度压缩拟合、各通道幂函数和轻微暗角。暗主题将光场合成到页面底色；亮主题用场强度让纸色透出。最后加入幅度约为 `1/255` 的微弱噪声，降低 8 位显示中的色带感。

源码函数名为 `blueNoise`，实现公式属于 interleaved gradient noise，噪声相位按 24 Hz 更新。阅读 shader 时应核对函数体，名称本身不足以确定频谱特性。

核心循环使用二维坐标与解析光斑，没有三维 SDF 射线步进、法线材质计算或速度压力状态求解。这里的柔亮丝带可以用二维场函数直接生成；基础场中也没有独立的亮部提取与模糊 Bloom 管线。

## 九种分类怎样产生

以下显示名称由页面筛选菜单核对，内部名称和权重来自参数源码。百分比表示生成器的设定权重，线上当前成员的样本比例可能不同。具体算法来自 [后处理源码](https://openshaders.com/_next/static/chunks/username-shader-CusopM4Y.js) 和 [参数源码](https://openshaders.com/_next/static/chunks/username-shader-params-BgxULHTP.js)。

| 页面名称 | 内部名称与权重 | 实际手法 | 复现时的重点 |
| --- | --- | --- | --- |
| Pure field | `none` 39% | 直接显示基础发光场 | 坐标、层数、曝光与颜色 |
| Grain | `grain` 13% | 两个随机值相加再减一，生成三角分布颗粒 | 24 Hz 更新，中间调更明显 |
| ASCII | `ascii` 12% | 每格五个位置加权采样，亮度选择字符，读取字形图集 | 保留较暗的底层光场，字符沿用源颜色 |
| Dither | `dither` 10% | 设置 `levels = 8.0` 的量化步长，用源码标记为 BAYER 的 4×4 有序阈值分配余量 | 包含端点时可有九个离散值，再与连续的平滑场混合 |
| Halftone | `halftone` 9% | 旋转网格，亮度控制圆点面积，平滑处理圆边缘 | 半径与调整后的亮度平方根相关 |
| Sparkle | `sparkle` 7% | 两层网格随机光点、正弦脉冲、核心与十字光芒 | 源场亮度决定可见度，闪光集中于亮区 |
| Liquid | `wave` 5% | 正弦与多方向余弦生成连续位移，再偏移源场 UV | 修正宽高比，用同一场驱动连续变化 |
| Mosaic | `pixel` 4% | 每个单元取四个子点平均，整格输出相同颜色 | 网格尺寸随 DPR 调整 |
| Chroma | `prism` 1% | 红蓝通道反向偏移，绿色保留，再调制色相与饱和度 | 偏移方向受时间和卡片倾斜输入影响 |

ASCII 图集在 JavaScript 中用 2D Canvas 绘制，再上传 GPU 并生成多级缩小图。它使用十个按覆盖率变化排列的字符，图集尺寸为 480×80。系统等宽字体会影响实际字形，因此跨平台复现还受字体环境影响。

后处理围绕相对页面背景的“ink”进行计算：暗底取颜色减背景，亮底取背景减颜色，再合成回显示色。这个约定让颗粒、网点和色散能兼顾两种主题，直接把所有操作加到最终 RGB 上会得到不同的亮主题结果。

## 实时渲染管线和性能处理

所有 pass 使用 `gl_VertexID` 生成全屏大三角形，不需要为这些背景提交网格顶点属性。JS 上传参数和 Uniform，片段着色器逐像素求值。

网站把计算密集的基础场放到宽高各约一半的离屏纹理，再进行 Catmull-Rom 三次重建。该重建利用线性过滤把组合权重压成九次纹理采样。基础场片段量因此约为全尺寸的四分之一，而颗粒、字符等细节在最终尺寸处理。[实时渲染器](https://openshaders.com/_next/static/chunks/username-shader-CusopM4Y.js)

```text
Pure field：半尺寸基础场 → 三次重建 → Canvas
普通风格：半尺寸基础场 → 全尺寸颜色纹理 → 风格后处理 → Canvas
Chroma：半尺寸浮点 ink 场 → 带重建的色散后处理 → Canvas
```

这三条路径在降采样支持正常、主题稳定时通常分别为 2、3、2 个 pass。主题过渡期间，部分管线会分别生成暗亮端点再混合，实际 pass 数会增加。纯场的抗色带噪声放在最终显示尺寸，避免升采样把细颗粒一同放大。

降采样场检查 `EXT_color_buffer_float`，按过滤能力选择 `RGBA32F` 或 `RGBA16F`，并检查 Framebuffer 完整性。失败时释放该路径资源并回退。普通后处理输入可存为 8 位颜色；Chroma 的 ink 计算需要保留某些负通道值，优先使用浮点目标，并有显示色回退分支。[实时渲染器](https://openshaders.com/_next/static/chunks/username-shader-CusopM4Y.js)

宿主层还负责这些限制和调度：

- DPR 上限 2，单个绘图缓冲区限制约 240 万像素，还检查设备尺寸上限。
- 实时绘制目标上限为 60 FPS；这是一条调度限制，无法据此推导实际设备稳定帧率。
- ResizeObserver 同步尺寸，IntersectionObserver 和页面可见性暂停无须显示的动画；减少运动模式保留静态帧。
- 卡片 Context 池最多容纳 12 个；画廊窗口化可见的 GPU surface，并分散初始化，降低集中编译压力。
- 销毁时取消动画、移除监听并释放 GPU 对象，上下文恢复时重建渲染器。

这些策略见 [卡片调度模块](https://openshaders.com/_next/static/chunks/username-shader-Dys261tT.js)、[画廊模块](https://openshaders.com/_next/static/chunks/explore-browser-B6nqmTzq.js) 与 [共享渲染辅助模块](https://openshaders.com/_next/static/chunks/landing-shader-CuOs4PqU.js)。它们说明，效果的可用性同时取决于 Shader 和宿主资源管理。

## WebGL 与 WebGPU 导出

页面的 Copy code 菜单提供四种格式。WebGL 与 WebGPU 生成独立 JavaScript 模块，React 两种格式生成 TSX 组件。[菜单实现](https://openshaders.com/_next/static/chunks/shader-code-menu-UTPCpfyA.js)

导出器把同一用户名的参数固定成 GLSL 或 WGSL 常量，保留基础场和后处理公式。WGSL 版本还适配片段坐标与纹理坐标的纵向方向、矩阵布局、整数 hash 和 Uniform 对齐，并包含 WebGPU adapter、device、pipeline、bind group 和 render pass 的创建代码。[导出器实现](https://openshaders.com/_next/static/chunks/username-shader-export-IKgZWTdB.js)

**线上页面与复制代码的性能路径存在差别。** 当前导出 runtime 使用全尺寸场；基础风格通常一次绘制，其他风格通常两次绘制，没有包含线上半尺寸场的完整优化路径。因此复制代码的分辨率、采样细节和 GPU 成本需要单独验证。WebGPU 导出的存在也不能证明 Explore 当前实时入口使用了 WebGPU。

研究中调用公开导出器生成了九种分类的 WebGL 与 WebGPU JavaScript 模块，共 18 份，均通过 JavaScript 语法检查。该验证只覆盖生成结果的 JS 语法，GLSL、WGSL 的 GPU 编译和跨后端像素一致性尚未实测。

## 如何把这些手法用于当前教程

建议做成连续实验，每次只引入一组新关系：

1. **二维发光核**：用统一尺度坐标生成圆形光斑，修改两轴尺度观察细丝。
2. **单层与多层折叠**：逐层显示坐标变化和累加贡献，解释层数怎样改变结构。
3. **固定种子与参数筛选**：在 JS 生成参数，让学习者观察候选画面的覆盖率与过曝。
4. **离屏场与重建**：显示原始低分辨率纹理，对比线性过滤和三次重建，记录质量与成本。
5. **风格后处理**：复用同一源图，从 Mosaic 开始，再增加 Halftone、ASCII、Liquid、Chroma。
6. **画廊资源管理**：展示当前活跃 Context、可见卡片和动画状态，解释为何多效果需要调度。

这是面向本项目的教学建议，尚未修改课程页面。通用公式和数据流在 [常见手法文档](./shader-effects-handbook.md) 中展开。

## 复用边界

当前卡片的 Liquid 是连续 UV 位移，Chroma 是通道采样分离与色彩调制。若要扩展为保存速度压力场的流体、基于法线与厚度的玻璃、或三维隐式表面，需要引入新的数据与渲染阶段。本文只把实际读取到的算法归到已验证的类别。

公开仓库的 MIT 许可覆盖平台；官方也明确作者可自行选择作品许可。网页可查看或复制代码提供了技术入口，具体再发布范围仍按对应作品授权核对。本文以公式和机制说明为主，常见手法文档提供独立教学代码。[官方许可说明](https://github.com/openshaders/openshaders#open-source)
