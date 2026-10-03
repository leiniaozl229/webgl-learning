# Shader 效果常见手法

配套交互课程：[Shader 效果常见手法](http://127.0.0.1:5193/?lesson=shader-effects-handbook)。页面包含十六类实时效果、参数与基础对照、七步噪声光环实验和 Ping-Pong 绑定演示。速查表中的每个效果名称都能打开对应实验；Bloom 使用五遍绘制，拖尾保存 GPU 帧间状态，水面与旗帜使用可变形网格。

这份文档面向已经了解 Shader、Uniform 和纹理的 WebGL2 学习者。目标是把一种视觉效果拆成可解释的数据流：坐标怎样变化，图案怎样产生，颜色怎样合成，以及哪些结果需要保存在纹理中。

多数网页 shader 可以按“坐标变换 → 标量场或纹理采样 → 颜色映射 → 合成与后处理”理解。复杂效果通常由几种基础手法组合而成。与本手册配套的 [OpenShaders 实现研究](./openshaders-implementation-study.md) 记录了一个实际网站怎样组合这些手法。

本文的公式和教学代码为独立示例；网站的具体实现以配套研究中的源码证据为准。完整示例采用 WebGL2 和 `#version 300 es`，中间的 GLSL 片段放进同版本片段着色器中使用。

## 效果与实现手法速查

| 想得到的效果 | 主要手法 | 输入与中间数据 | 首先检查的参数 |
| --- | --- | --- | --- |
| 波纹和呼吸 | `sin`、距离场、时间相位 | 坐标、时间 | 频率、振幅、传播速度 |
| 丝带和流动光线 | 坐标扭曲、重复变换、发光累加 | 坐标、时间、层数 | 扭曲量、缩放率、衰减 |
| 云雾和烟状纹理 | 平滑 noise、fBM、domain warping | 噪声场 | octave 数、频率、振幅 |
| 圆角形状和图标 | SDF、阈值、导数抗锯齿 | 到形状边界的有符号距离 | 半径、线宽、边缘宽度 |
| 彩色流动场 | 标量场、palette、色彩空间转换 | 一个数值场 | 色相跨度、亮度、饱和度 |
| 液体和玻璃观感 | UV 扭曲、法线、反射或折射采样 | 背景纹理、法线或高度场 | 扭曲强度、折射率、Fresnel |
| 色散和虹彩 | RGB 分离、随视角变化的色相 | 纹理、观察方向或相位 | 通道偏移量、色相变化 |
| 星光和闪烁 | 网格 hash、亮度门控、衰减光斑 | 单元随机值、时间、源图亮度 | 密度、光斑尺寸、闪烁频率 |
| 胶片颗粒 | hash、亮度相关的噪声幅度 | 源图、像素坐标、时间 | 颗粒尺寸、强度、刷新频率 |
| 复古抖动 | 量化、Bayer 矩阵或噪声阈值 | 源图亮度 | 色阶数、网格尺寸 |
| 印刷网点 | 网格、亮度控制圆面积、SDF | 单元平均亮度 | 网点间距、旋转角、半径 |
| ASCII 和马赛克 | 分块平均采样、字形图集 | 源图、可选字形纹理 | 单元大小、字符密度 |
| 光晕 Bloom | 亮部提取、低分辨率模糊、合成 | 多张离屏纹理 | 阈值、模糊半径、增益 |
| 拖尾和扩散 | 上一帧采样、Ping-Pong | 两张交替读写的状态纹理 | 衰减、时间步长、扩散量 |
| 程序化三维物体 | 三维 SDF、ray marching、光照 | 距离场、相机射线 | 最大步数、命中阈值 |
| 水面和旗帜 | 顶点位移、法线更新 | 网格顶点、时间或高度纹理 | 网格密度、位移幅度 |

## 先明确数据经过哪些对象

```text
JavaScript 中的时间、尺寸、指针、效果参数
    │ uniform* 上传到当前 Program
    ▼
顶点着色器生成覆盖视口的三角形
    │ 光栅化产生片段
    ▼
片段着色器读取 gl_FragCoord、Uniform、可选 Texture
    │ 坐标变换 → 求场 → 映射颜色 → 合成
    ▼
Canvas，或 Framebuffer 的颜色附件 Texture
    │ 后续 pass 把该 Texture 绑定到纹理单元
    ▼
最终显示
```

**Uniform** 为一次绘制提供共享输入，例如时间和扭曲强度。**Texture** 可以保存图像，也可以保存高度、速度等数据。**Framebuffer** 指定绘制结果写入哪些附件；颜色附件纹理保存实际像素。**Pass** 指一次明确输入与输出的渲染阶段。

片段着色器中的局部变量只服务当前片段。本帧需要保留给下一帧的数据必须写入纹理等存储。多个 pass 之间的关系可参考 [WebGL2 多阶段图像处理](https://webgl2fundamentals.org/webgl/lessons/webgl-image-processing-continued.html)。

## 坐标变换

### 区分像素坐标和 UV

`gl_FragCoord.xy` 表示当前绘图目标内的像素中心坐标，默认原点在左下角。`u_resolution` 应传入当前目标的像素尺寸。对 Canvas 使用绘图缓冲区尺寸，对离屏纹理使用纹理尺寸。

```glsl
vec2 uv = gl_FragCoord.xy / u_resolution;
vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
```

`uv` 适合纹理采样，通常位于 `[0, 1]`。`p` 以画面中心为原点，两轴使用相同尺度，适合圆、距离和旋转。若横纵轴分别除以宽高，宽屏上的圆会变成椭圆。坐标职责与全屏绘制见 [WebGL2 Shadertoy 工作方式](https://webgl2fundamentals.org/webgl/lessons/webgl-shadertoy.html)。

### 平移旋转和缩放

```glsl
vec2 rotate2D(vec2 p, float angle) {
  float c = cos(angle), s = sin(angle);
  return mat2(c, s, -s, c) * p;
}

vec2 q = rotate2D(p - centre, angle) * frequency;
```

对采样坐标乘以更大的 `frequency`，图案在相同视口内重复得更多。GLSL 的矩阵构造函数按列填写，以上写法让列向量逆时针旋转。

极坐标 `r = length(p)`、`angle = atan(p.y, p.x)` 可以生成环、旋涡和放射线。角度在负 π 与正 π 之间有接缝，周期图案应让接缝两侧的值连续。

## 距离场和形状边缘

**SDF（Signed Distance Field，有符号距离场）** 用一个数描述到形状边界的距离。常用约定为内部负、边界零、外部正。它让填充、描边和软边共享同一份形状定义。

```glsl
float sdCircle(vec2 p, float radius) {
  return length(p) - radius;
}

float sdBox(vec2 p, vec2 halfSize) {
  vec2 q = abs(p) - halfSize;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}

float d = sdCircle(p, 0.25);
float w = max(0.5 * fwidth(d), 1e-6);
float fill = 1.0 - smoothstep(-w, w, d);
float stroke = 1.0 - smoothstep(-w, w, abs(d) - 0.01);
```

`fwidth(d)` 估计距离值在相邻屏幕片段间的变化，边缘过渡因此能跟随分辨率调整。`0.01` 是此坐标系下的描边半宽。`min(d1, d2)` 可以合并形状，`max(d1, d2)` 可以取交集，`max(d1, -d2)` 可以裁去第二个形状。合成或扭曲后的场未必保留精确距离性质。

`smoothstep(edge0, edge1, x)` 要求 `edge0 < edge1`。需要反向过渡时使用 `1.0 - smoothstep(...)`。导数应在非一致分支和 `discard` 之前计算；相关约束见 [GLSL ES 3.00 规范](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)。

## 波形与时间动画

```glsl
float stripe = 0.5 + 0.5 * sin(p.x * 20.0 - u_time * 2.0);
float ripple = sin(length(p) * 40.0 - u_time * 3.0);
vec2 bent = p + 0.03 * vec2(
  sin(p.y * 8.0 + u_time),
  cos(p.x * 6.0 - u_time)
);
```

空间频率决定条纹或波纹密度，时间系数决定移动速度，振幅决定扭曲量。`u_time` 使用秒；`requestAnimationFrame` 的时间戳使用毫秒，上传前乘以 `0.001`。

直接按时间求函数适合循环、波纹和呼吸。需要积累状态的粒子运动或扩散则使用时间步长。暂停后恢复时，应限制或分割过大的步长，避免一次更新跨过许多模拟步骤。

## 重复图案和确定性随机

```glsl
vec2 cellId = floor(uv * 12.0);
vec2 local = fract(uv * 12.0) - 0.5;

float hash21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float randomValue = hash21(cellId);
```

`floor` 得到单元编号，`fract` 得到单元内坐标。hash 把单元编号映射为可复现的伪随机数，可用于星点位置、砖块颜色和每个单元的动画相位。它没有密码学用途。

让时间连续进入 hash 会产生跳变噪点；让时间进入平滑 noise 更适合连续流动。需要胶片颗粒时，可以使用 `floor(u_time * 24.0)` 固定每秒更新次数。

浮点 hash 的末位结果可能随 GPU 精度变化。若需要用户名对应同一组参数，应在 JavaScript 中用整数 hash 和确定性 PRNG 生成参数，再作为 Uniform 上传；固定算法版本才能保证长期复现。

## 平滑噪声 fBM 和坐标扭曲

### Value noise

平滑 noise 的作用是提供连续的不规则场。GLSL ES 3.00 需要自行提供噪声函数或采样噪声纹理。下面的 **value noise** 在网格顶点生成随机标量，再在单元内插值。

```glsl
float valueNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
```

**Gradient noise** 则使用格点梯度与位移的点积；经典 Perlin noise 属于这一类。白噪声、value noise、gradient noise 和具有特定频谱的 blue noise 有不同职责。上述 hash 加插值函数应称为 value noise。原理见作者教程 [The Book of Shaders Noise](https://thebookofshaders.com/11/)。

### fBM

**fBM（fractal Brownian motion）** 在 shader 实践中常指叠加多个频率的噪声。每个频率层称为一个 octave，高频层通常使用更小振幅。

```glsl
float fbm(vec2 p) {
  float total = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; ++i) {
    total += amplitude * valueNoise(p);
    p = rotate2D(p, 0.5) * 2.0 + vec2(7.1, 3.7);
    amplitude *= 0.5;
  }
  return total / 0.9375;
}
```

这里四层振幅之和为 `0.9375`，归一化后方便阈值和配色。频率倍率、振幅倍率、层数分别影响细节尺度、粗糙度和计算量。对有正负变化的噪声使用 `abs(n)` 或 `1.0 - abs(n)`，可形成湍流或脊状图案；上面的 value noise 位于 `[0, 1]`，应先用 `n = 2.0 * n - 1.0` 转到有符号范围。见 [The Book of Shaders fBM](https://thebookofshaders.com/13/)。

### Domain warping

**Domain warping（定义域扭曲）** 先用一个场改变坐标，再在新坐标上求另一个场。

```glsl
vec2 drift = vec2(u_time * 0.12, -u_time * 0.08);
vec2 warp = vec2(fbm(p * 2.0 + drift), fbm(p * 2.0 + drift + 13.7));
float field = fbm(p * 3.0 + 1.4 * (warp - 0.5));
```

扭曲幅度控制团块与褶皱的程度。噪声本身可以保持稳定，移动采样坐标就能得到动画。连续扭曲会增加函数求值次数；嵌套两次 fBM 时，应先算清每个片段实际需要多少次 noise。

## 颜色映射和亮度管理

先产生一个标量场，再把场值映射到颜色，有助于独立调整形状与配色。

```glsl
vec3 cosinePalette(float t) {
  vec3 a = vec3(0.50);
  vec3 b = vec3(0.45);
  vec3 c = vec3(1.00);
  vec3 d = vec3(0.00, 0.18, 0.35);
  return a + b * cos(6.28318530718 * (c * t + d));
}
```

也可以用 `mix(colorA, colorB, field)`、颜色查找表纹理，或 OKLCH 等色彩空间。cosine palette 容易产生周期色带，公式可对照作者维护的 [LYGIA palette 实现](https://github.com/patriciogonzalezvivo/lygia/blob/main/color/palette.glsl)；OKLCH 可以分别控制感知亮度、彩度和色相，超出目标色域时仍需处理。颜色系统的选择见 [The Book of Shaders Color](https://thebookofshaders.com/06/) 和 [CSS Color 4 的 OKLab 定义](https://www.w3.org/TR/css-color-4/#ok-lab)。

发光或多个光源相加后，颜色可能超过 `1.0`。Tone mapping 把较大的亮度压入显示范围，例如教学中可用 `color / (1.0 + color)`。这一步和线性 RGB 到 sRGB 的编码有不同职责。

用于光照、模糊和光能相加的颜色应在线性空间计算，最终显示时再编码。使用 `SRGB8_ALPHA8` 等纹理格式时，应明确采样端已经完成的解码，避免重复转换。下方最小示例使用艺术配色和简单压缩，展示参数组合，不承担物理光照或完整颜色管理。

## 发光场和丝带

```glsl
vec2 q = p - centre;
float glow = intensity / (dot(q, q) + softness);
```

这类倒数衰减可生成柔亮光斑；`exp(-k * dot(q, q))` 可生成更集中、尾部更短的光斑。`softness` 应保持正值，控制峰值并避免除零。

将 `q` 的两轴乘以不同系数，光斑会拉长。对坐标重复执行旋转、剪切、缩放和正弦扭曲，再累加多层光斑，可以形成丝带或细丝。层数控制结构与成本，衰减控制外围亮度，Tone mapping 控制累加后的高光。

这种解析发光已经能表现柔和亮边。**Bloom** 还需要对亮部进行空间模糊，具体管线见后文。OpenShaders 的基础丝带属于重复坐标变换与发光累加，细节见 [网站研究](./openshaders-implementation-study.md)。

## 表面法线反射和折射

**法线（normal）** 描述表面朝向，光照与反射依靠它判断入射方向。二维高度场也能估计法线，让平面纹理具有起伏观感。

```glsl
// height 是连续高度函数；eps 与高度场采样尺度匹配。
float dx = height(p + vec2(eps, 0.0)) - height(p - vec2(eps, 0.0));
float dy = height(p + vec2(0.0, eps)) - height(p - vec2(0.0, eps));
vec3 N = normalize(vec3(-dx / (2.0 * eps), -dy / (2.0 * eps), 1.0));
float diffuse = max(dot(N, L), 0.0);
vec3 reflected = reflect(-V, N);
float fresnel = F0 + (1.0 - F0) * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
```

`L`、`V` 分别是朝向光源和观察者的单位向量。`F0` 为正视方向的基础反射率；Schlick 近似让反射随观察角度增强。反射方向需要环境贴图、场景纹理或明确的解析环境才能产生内容。材质基础见 [WebGL2 环境映射](https://webgl2fundamentals.org/webgl/lessons/webgl-environment-maps.html)。

`refract(I, N, eta)` 计算折射方向，其中 `eta` 是入射侧与透射侧折射率的比值。它还需要厚度或交点等信息，才能决定采样背景的位置；全反射时返回零向量。见 [GLSL ES 3.00 规范](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)。

只根据二维场偏移背景 UV，已经可以制造玻璃或液体观感；真实几何折射、遮挡关系和体积传播需要更多数据。教学中应先说明当前效果依赖哪一层近似。

## 纹理扭曲与 RGB 分离

```glsl
vec2 offset = 0.02 * vec2(sin(uv.y * 12.0 + u_time), cos(uv.x * 9.0 - u_time));
vec3 liquid = texture(u_scene, uv + offset).rgb;

vec2 split = vec2(0.004, 0.0);
vec3 chroma = vec3(
  texture(u_scene, uv + split).r,
  texture(u_scene, uv).g,
  texture(u_scene, uv - split).b
);
```

这里 `u_scene` 是上一 pass 的颜色纹理，Uniform 中的采样器值是纹理单元编号。UV 偏移表达采样点变化。若希望偏移始终等于固定像素数，应使用 `pixelOffset / vec2(textureSize(u_scene, 0))`。

RGB 分离可以模拟色散或镜头色差，也适合作为艺术效果。偏移过大时会出现明显重影。边缘如何采样由纹理环绕模式决定，常用 `CLAMP_TO_EDGE` 防止图像从另一侧卷回。

## 颗粒抖动和量化

**Grain（颗粒）** 为图像添加细小随机变化。**Dither（抖动）** 在量化前调整阈值，用空间或时间分布缓解有限色阶造成的色带。

```glsl
float y = clamp(dot(color, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
float n = hash21(floor(gl_FragCoord.xy / grainSize) + floor(u_time * 24.0));
vec3 grain = color + (n - 0.5) * strength * 4.0 * y * (1.0 - y);
```

亮度响应 `4y(1-y)` 把颗粒集中到中间调。亮度系数按线性 RGB 使用时有明确色度学含义；对编码后的 RGB 使用时属于视觉近似。

有序抖动可用 4×4 Bayer 矩阵，把整数像素或网格编号映射到阈值，再计算 `floor(value * levels + threshold) / levels`。应匹配阈值范围、限制输出范围，并决定是否保留原图的色相。

hash、Bayer、interleaved gradient noise 和 blue noise 的空间频谱不同，选型取决于网格感、颗粒感和闪烁是否可接受。函数名带有 `blueNoise` 仍需核对实际公式。

## 网点 ASCII 和马赛克

这三类效果都先划分单元，再用单元的代表颜色或平均亮度生成更粗的表示。

| 手法 | 单元内如何输出 | 容易遗漏的数据关系 |
| --- | --- | --- |
| Halftone | 用亮度控制圆点面积 | 半径与亮度平方根相关，网格旋转后要反向变换采样点 |
| ASCII | 根据亮度选择字符，再采样字形图集遮罩 | 字符需要按笔画覆盖率排序，图集尺寸与 UV 留边影响清晰度 |
| Mosaic | 单元内统一输出代表颜色 | 多点平均比单次中心采样更稳定，但不等于完整面积平均 |

Halftone 可从 `πr² = brightness × cellArea` 推出半径。在正方形单元中，圆半径超过半个单元边长会产生相邻点重叠；高亮区域可截断半径、接受重叠或改用反相孔洞。圆点边缘同样需要抗锯齿。

ASCII 的字形纹理可以由 JavaScript 的 2D Canvas 生成，再上传 GPU。GLSL 读取字符索引和单元局部 UV；用户名、标题等界面文字通常仍使用 HTML，以保留选择、可访问性和清晰排版。

## 后处理和 Bloom

```text
场景 → 颜色纹理
颜色纹理 → 亮部提取 → 低分辨率亮部纹理
亮部纹理 → 横向模糊 → 纹理 A
纹理 A → 纵向模糊 → 纹理 B
颜色纹理 + 纹理 B × 增益 → Tone mapping → 显示
```

每个 pass 绑定自己的输出 Framebuffer，更新 `viewport`，把输入纹理绑定到纹理单元，再设置对应采样器 Uniform。采样步长使用输入纹理尺寸，输出视口使用输出附件尺寸。

高斯模糊可拆成横向和纵向两次一维采样；降分辨率能显著减少像素成本。Bloom 中的高动态范围数据适合浮点颜色纹理。在 WebGL2 中，浮点纹理作为颜色附件需要核对 `EXT_color_buffer_float` 等能力并检查 Framebuffer 完整性；具体组合还须验证过滤能力。见 [扩展规范](https://registry.khronos.org/webgl/extensions/EXT_color_buffer_float/) 和 [WebGL2 渲染到纹理](https://webgl2fundamentals.org/webgl/lessons/webgl-render-to-texture.html)。

## 帧间状态和 Ping-Pong

**Ping-Pong** 使用两张纹理交替保存状态，保证一个 pass 的输入和输出分离。

```text
帧 n：读取 A → 更新状态 → 写入 B
交换引用
帧 n+1：读取 B → 更新状态 → 写入 A
```

拖尾可从“上一帧 × 衰减 + 当前光点”开始，帧率无关的衰减可设为 `exp(-decayRate * dt)`。扩散可读取邻域并更新浓度；流体还需要速度、压力及边界处理等计算。连续时间函数生成的液体外观与保存速度压力状态的模拟各有适用场景。

同一个 draw call 不能采样当前输出附件中的同一张纹理，这会形成 feedback loop。需要为两张纹理初始化、设置明确边界，在尺寸变化后重建附件并重置状态。状态纹理要选择足够的精度；`RGBA8` 的量化可能让细微更新消失。数据纹理的完整流程见 [WebGL2 GPGPU](https://webgl2fundamentals.org/webgl/lessons/webgl-gpgpu.html)。

## 三维 Ray marching

**Ray marching（射线步进）** 在片段着色器中沿相机射线寻找表面。对距离场使用距离作为步长的方式通常称为 sphere tracing。

```glsl
float travel = 0.0;
bool hit = false;
for (int i = 0; i < 96; ++i) {
  vec3 samplePosition = rayOrigin + travel * rayDirection;
  float d = sceneDistance(samplePosition);
  if (d < 0.001) { hit = true; break; }
  travel += d;
  if (travel > 20.0) break;
}
```

该片段假定射线方向单位化、起点在表面外侧，且 `sceneDistance` 提供可靠的非负距离或保守下界。扭曲、非等比缩放和任意混合可能破坏距离性质，步长过大时会跨过薄表面。命中后仍需估计法线并计算光照；最大距离、步数和随距离变化的命中阈值共同影响质量与成本。

距离步进的理论来源见 John C. Hart 的 [Sphere Tracing 论文](https://doi.org/10.1007/s003710050084)。二维丝带和 UV 扭曲通常可以先用更少的场求值完成，三维步进适合需要空间轮廓与遮挡的目标。

## 顶点位移

顶点着色器可以用 `sin(position.x * frequency + time)` 或高度纹理改变网格坐标，再按模型、视图和投影矩阵输出。它适合旗帜、水面、起伏地形等会改变轮廓的效果。

位移需要足够的网格密度，法线也要根据变形更新。片段着色器中的高度与法线扰动可以增加表面细节，但几何轮廓仍由提交的顶点决定。

## 一个可以组合修改的 WebGL2 示例

下面把 value noise、fBM、domain warping、palette、SDF 和发光组合到一次绘制中。它是独立教学效果，方便逐项调整参数。将三个文件放在 Vite 项目的 `src/core/`，`vertex-data.ts` 复用当前项目的 `webgl2.ts` 编译与链接函数；UI 在组件挂载时调用 `startEffect`，卸载时调用返回的清理函数。

### vertex.glsl

```glsl
#version 300 es

void main() {
  // 三个顶点覆盖整个视口，片段坐标由光栅化产生。
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
```

### fragment.glsl

```glsl
#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 outColor;

float hash21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float sum = 0.0, amplitude = 0.5;
  mat2 turn = mat2(0.87758256, 0.47942554, -0.47942554, 0.87758256);
  for (int i = 0; i < 4; ++i) {
    sum += amplitude * valueNoise(p);
    p = turn * p * 2.0 + vec2(7.1, 3.7);
    amplitude *= 0.5;
  }
  return sum / 0.9375;
}

vec3 palette(float t) {
  return vec3(0.5) + vec3(0.45) * cos(
    6.28318530718 * (vec3(t) + vec3(0.0, 0.18, 0.35))
  );
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  vec2 drift = vec2(u_time * 0.12, -u_time * 0.08);
  vec2 warp = vec2(fbm(p * 2.0 + drift), fbm(p * 2.0 + drift + 13.7));
  float field = fbm(p * 3.0 + 1.4 * (warp - 0.5));

  // field 同时控制局部轮廓和配色，两者共享连续的空间变化。
  float d = abs(length(p) - (0.25 + 0.08 * (field - 0.5))) - 0.006;
  float w = max(0.5 * fwidth(d), 1e-6);
  float ring = 1.0 - smoothstep(-w, w, d);
  float glow = 0.0015 / (d * d + 0.002);
  vec3 color = vec3(0.015, 0.025, 0.045);
  color += palette(field + u_time * 0.03) * (0.12 * field + ring + glow);
  color = color / (1.0 + color);
  outColor = vec4(color, 1.0);
}
```

### vertex-data.ts

```ts
import { compileShader, createProgram } from './webgl2';
import vertexSource from './vertex.glsl?raw';
import fragmentSource from './fragment.glsl?raw';

export function startEffect(
  canvas: HTMLCanvasElement,
  onError: (message: string) => void,
): () => void {
  const context = canvas.getContext('webgl2', { alpha: false });
  if (!context) throw new Error('当前设备没有可用的 WebGL2 上下文。');
  const gl = context;
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  let fs: WebGLShader | null = null;
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  try {
    fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    program = createProgram(gl, vs, fs);
    vao = gl.createVertexArray();
    if (!vao) throw new Error('无法创建 VAO。');
  } catch (error) {
    if (program) gl.deleteProgram(program);
    if (vao) gl.deleteVertexArray(vao);
    throw error;
  } finally {
    gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
  }

  const resolution = gl.getUniformLocation(program, 'u_resolution');
  const time = gl.getUniformLocation(program, 'u_time');
  if (resolution === null || time === null) {
    gl.deleteVertexArray(vao);
    gl.deleteProgram(program);
    throw new Error('缺少效果需要的 Uniform。');
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let dprQuery = matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`);
  let raf = 0, stopped = false;
  const start = performance.now();

  function draw(now: number) {
    if (stopped || gl.isContextLost()) return;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    // 分辨率 Uniform 和 viewport 始终使用同一绘图目标的尺寸。
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform2f(resolution, width, height);
    gl.uniform1f(time, reduced.matches ? 0 : (now - start) * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduced.matches && !document.hidden) raf = requestAnimationFrame(draw);
  }

  function restart() {
    cancelAnimationFrame(raf);
    if (!stopped && !document.hidden) draw(performance.now());
  }
  function dprChanged() {
    dprQuery.removeEventListener('change', dprChanged);
    dprQuery = matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`);
    dprQuery.addEventListener('change', dprChanged);
    restart();
  }
  function lost(event: Event) {
    event.preventDefault();
    cancelAnimationFrame(raf);
    onError('WebGL 上下文已丢失，恢复后需要重新初始化效果。');
  }
  function restored() {
    dispose();
    onError('WebGL 上下文已恢复，请重新调用 startEffect。');
  }
  const observer = new ResizeObserver(restart);
  observer.observe(canvas);
  reduced.addEventListener('change', restart);
  dprQuery.addEventListener('change', dprChanged);
  document.addEventListener('visibilitychange', restart);
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  restart();

  function dispose() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    observer.disconnect();
    reduced.removeEventListener('change', restart);
    dprQuery.removeEventListener('change', dprChanged);
    document.removeEventListener('visibilitychange', restart);
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
    gl.deleteVertexArray(vao);
    gl.deleteProgram(program);
  }
  return dispose;
}
```

这个例子通过 `gl_VertexID` 生成顶点，只有 VAO 和 Program，没有需要上传的顶点 Buffer。普通网格仍需要 Buffer 与 Attribute 读取配置，`stride`、`offset` 单位为字节。

UI 应捕获 `startEffect` 抛出的错误并显示 `error.message`，这样当前项目辅助函数提供的完整 Shader 编译和 Program 链接日志能传到学习者。`onError` 负责运行时上下文消息。恢复后，宿主重新调用初始化函数并保存新的清理函数；该示例没有自动重建资源。Canvas 需要明确 CSS 尺寸，例如宽 `100%`、高 `320px`，避免绘图缓冲区尺寸改变反过来影响布局。

先把 `field` 直接设为 `0.5`，观察规则圆环；随后把 `warp` 设为 `vec2(0.5)` 并恢复 `field = fbm(p * 3.0)`，观察噪声怎样改变轮廓；再恢复完整的扭曲表达式。把 fBM 层数从四层改为两层时，将归一化分母同步从 `0.9375` 改为 `0.75`，方便比较细节和成本；最后独立修改 `palette`。每次只改变一个因素，容易看清手法之间的依赖。

示例在 2026 年 10 月 2 日通过独立 TypeScript 严格检查，并在浏览器中完成 WebGL2 编译、链接、绘制、尺寸调整和重复清理验证。上下文恢复流程和跨显示器 DPR 切换尚未实测；接入组件后应验证宿主的重新初始化行为。

## 工程实现与性能检查

- **分辨率成本**：相同 CSS 尺寸下，DPR 从 1 变成 2，片段数约变成四倍。先调整绘图尺寸，再优化噪声层数。
- **分离空间频率**：平滑的流动场可以低分辨率计算，颗粒、字符和细网点留到最终分辨率生成。升采样会损失细节，参数要与效果尺度匹配。
- **统计实际求值次数**：fBM、法线差分、色散和多次采样会叠加成本；一个看似短的调用可能包含多层循环。
- **可见性调度**：页面隐藏时暂停；多卡片画廊还要控制视口外效果。减少运动模式提供静态帧或主动播放按钮。
- **资源复用**：每帧更新 Uniform 和必要纹理内容，参数变化无需反复创建 Program、VAO 和 Texture。React effect 必须返回清理函数。
- **尺寸与状态**：ResizeObserver、DPR、Canvas 尺寸、离屏附件和 `viewport` 需要同步。每个 pass 显式设置目标、输入纹理和依赖的绘制状态。
- **诊断**：保留完整编译与链接日志；检查 Framebuffer 状态和上下文丢失。`readPixels` 等读回可造成 CPU/GPU 同步，避免放进常规动画循环。
- **颜色与透明度**：明确在线性还是编码空间处理颜色；纹理数据、Canvas 的 `premultipliedAlpha` 与 blend 函数应使用一致约定。

## 按效果选择组合

| 目标 | 建议先实现的组合 | 后续增加的内容 |
| --- | --- | --- |
| OpenShaders 风格丝带 | 正弦扭曲 + 重复变换 + 椭圆光斑累加 + Tone mapping | 参数种子、低分辨率场、表面后处理 |
| 云雾背景 | value noise + fBM + 缓慢坐标漂移 | domain warping、颜色查找表 |
| 液体卡片 | 背景纹理 + 连续 UV 位移 | 高度法线、Fresnel、轻微 RGB 分离 |
| 印刷风格 | 颜色纹理 + 分块采样 + 网点 SDF | 网格旋转、弱颗粒、纸色合成 |
| 星光拖尾 | hash 网格光点 + 时间脉冲 | Ping-Pong 状态、帧率无关衰减 |

对当前课程，推荐按“全屏三角形与 Uniform → SDF 与抗锯齿 → 波形与 noise → fBM 与坐标扭曲 → 配色与合成 → Framebuffer 后处理 → 帧间状态”补充实验。三维距离步进和材质可在相机、法线和纹理基础之后学习。

## 参考资料

以下资料分别支撑文中相应章节，查阅日期为 2026 年 10 月 2 日。

- [OpenShaders 实现研究](./openshaders-implementation-study.md)：网站当前发布版本的 shader、参数和渲染管线。
- [GLSL ES 3.00 规范](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)：语言、内置函数和导数约束。
- [WebGL2 Fundamentals](https://webgl2fundamentals.org/webgl/lessons/zh_cn/)：WebGL2 状态、Uniform、纹理、Framebuffer 和 GPGPU。
- [The Book of Shaders](https://thebookofshaders.com/)：颜色、图案、噪声和 fBM 的作者教程。其部分完整示例采用 GLSL ES 1.00，迁移到本项目时使用 `#version 300 es`、`out vec4` 和 `texture(...)`，并替换顶点阶段的 `attribute` / `varying` 为 `in` / `out`。
- [CSS Color 4](https://www.w3.org/TR/css-color-4/#ok-lab)：OKLab 和 OKLCH 色彩定义。
- [Sphere Tracing](https://doi.org/10.1007/s003710050084)：距离场射线步进的理论依据。
