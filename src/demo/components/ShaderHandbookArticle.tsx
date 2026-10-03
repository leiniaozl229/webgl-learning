import { ArrowRight, Play, RotateCcw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { parseEffectId, type EffectId } from '../../core/effectGallery';
import { effectRecipes } from '../effectRecipes';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { LessonPagination } from './LessonPagination';
import { ShaderHandbookLab } from './ShaderHandbookLab';
import { EffectGalleryLab } from './EffectGalleryLab';
import '../openshaders.css';
import '../shader-handbook.css';

function PingPongDiagram() {
  const [frame, setFrame] = useState(0);
  const read = frame % 2 === 0 ? 'A' : 'B';
  const write = read === 'A' ? 'B' : 'A';
  return <div className="handbook-feedback">
    <div className="handbook-feedback__header"><strong>纹理绑定演示</strong><span>第 {frame + 1} 帧</span></div>
    <ol className="handbook-flow handbook-flow--three" aria-label={`读取纹理 ${read}，更新状态，写入纹理 ${write}`}><li><strong>Texture {read}</strong><span>作为上一帧输入</span><code>纹理单元 0</code></li><li><strong>更新 Program</strong><span>采样旧状态，计算新状态</span><code>previous × decay + source</code></li><li><strong>Texture {write}</strong><span>作为当前帧输出</span><code>Framebuffer 颜色附件</code></li></ol>
    <p aria-live="polite">当前读取 {read}、写入 {write}。绘制结束后交换引用，下一帧读取 {write}、写入 {read}。</p>
    <div className="handbook-feedback__actions"><button type="button" onClick={() => setFrame((value) => value + 1)}>下一帧：交换读写<ArrowRight aria-hidden="true" /></button><button type="button" onClick={() => setFrame(0)}><RotateCcw aria-hidden="true" />重置帧序</button></div>
  </div>;
}

export function ShaderHandbookArticle({ toc }: { toc?: ReactNode }) {
  const [effect, setEffect] = useState<EffectId>(() => parseEffectId(typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('effect')));
  function selectEffect(value: EffectId, scroll = false) {
    setEffect(value);
    const url = new URL(window.location.href);
    url.searchParams.set('effect', value);
    if (scroll) url.hash = 'effect-gallery';
    window.history.replaceState(null, '', url);
    if (scroll) requestAnimationFrame(() => {
      document.getElementById('effect-gallery')?.scrollIntoView();
      document.getElementById('effect-gallery-title')?.focus({ preventScroll: true });
    });
  }
  return <article className="lesson-article shader-handbook-article">
    <header className="lesson-hero">
      <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGL2</LessonLink><span aria-hidden="true">/</span><span>Shader 实战</span></nav>
      <h1 id="lesson-title" tabIndex={-1}>Shader 效果常见手法</h1>
      <p className="lesson-lead">调节 16 类实时效果，再用七步拆解噪声光环，追踪坐标、颜色与帧间状态。</p>
      <ul className="lesson-meta" aria-label="课程信息"><li>16 类实时效果</li><li>7 步组合实验</li><li>约 50 分钟</li></ul>
    </header>
    {toc}
    <section id="effect-gallery" className="lesson-section lesson-section--wide">
      <h2 id="effect-gallery-title" tabIndex={-1}>每一种手法，都可以动手试</h2>
      <p>默认暂停。调参数看变化，播放后观察时间的作用；速查表也能直接打开演示。</p>
      <EffectGalleryLab effect={effect} onSelect={selectEffect} />
      <p className="ribbon-teaching-note">均为独立教学实现。背景测试图和字形图集由程序生成；玻璃采用薄层 UV 折射近似，虹彩采用艺术配色。Bloom 实际执行五遍绘制，拖尾使用两张交替读写的状态纹理，水面与旗帜使用索引网格和顶点位移。</p>
    </section>
    <section id="handbook-experiment" className="lesson-section lesson-section--wide ribbon-walkthrough" aria-label="七步噪声光环实验">
      <ShaderHandbookLab />
      <p className="ribbon-teaching-note">根据手册的独立示例实现。前六步右侧为同参数的完整光环，第七步对照关闭发光的结果。默认冻结时间；各步参数会保留，回到前一步可以继续比较。完整源码与实际绘制文件同步。</p>
    </section>

    <section id="effect-index" className="lesson-section lesson-section--wide">
      <h2>从想要的效果找到手法</h2>
      <p>点击效果名称打开实时演示，点击“原理”阅读对应章节，再沿着“坐标 → 场或纹理 → 颜色 → 合成”检查数据。</p>
      <div className="handbook-table"><table><caption className="sr-only">十六类效果的实时演示、主要手法和优先调整的参数</caption><thead><tr><th>目标效果 · 点击演示</th><th>主要手法</th><th>先调这些参数</th></tr></thead><tbody>{effectRecipes.map((item) => <tr key={item.id}><th scope="row"><button className="handbook-effect-link" type="button" aria-label={`查看${item.name}演示`} onClick={() => selectEffect(item.id, true)}><Play aria-hidden="true" />{item.name}</button><a className="handbook-effect-principle" href={`#${item.anchor}`}>原理</a></th><td>{item.method}</td><td>{item.parameters}</td></tr>)}</tbody></table></div>
    </section>

    <section id="effect-dataflow" className="lesson-section">
      <h2>先明确输入、运算和输出</h2>
      <p><strong>Uniform</strong> 为一次绘制提供共享数值，如时间、尺寸和强度。<strong>Texture</strong> 保存图像，也可以保存高度、速度等数据。<strong>Framebuffer</strong> 指定输出附件，颜色附件纹理保存实际像素。<strong>Pass</strong> 是输入和输出明确的一次渲染阶段。</p>
      <ol className="handbook-flow" aria-label="Shader 效果数据流"><li><strong>JavaScript 参数</strong><span>时间、尺寸、效果设置</span><code>uniform* → Program</code></li><li><strong>查询坐标</strong><span>平移、旋转、扭曲</span><code>gl_FragCoord → p → q</code></li><li><strong>场与颜色</strong><span>求距离、噪声或采样纹理</span><code>field → palette → color</code></li><li><strong>绘制目标</strong><span>显示或交给下一遍</span><code>Canvas / Texture</code></li></ol>
      <p>片段着色器中的局部变量只服务当前片段。需要留给下一帧的数据应写入纹理。七步光环在一个 Program 内组合解析函数；效果实验台先写入颜色纹理，再显示或后处理。Bloom 增加亮部提取与模糊阶段，Ping-Pong 在两张纹理之间保存和更新状态。</p>
      <p>先备知识可以回看 <LessonLink lessonId="shaders-and-glsl">Shader 与 Uniform</LessonLink>、<LessonLink lessonId="texture-sampling">纹理采样</LessonLink> 和 <LessonLink lessonId="multi-pass-image-processing">多阶段图像处理</LessonLink>。</p>
    </section>

    <section id="effect-coordinates" className="lesson-section">
      <h2>坐标：决定到哪里求值</h2>
      <p><code>gl_FragCoord.xy</code> 是当前绘图目标内的像素中心坐标，默认原点在左下角。UV 通常处于 0～1，适合纹理采样；居中坐标 <code>p</code> 的两个方向统一除以高度，适合距离、圆和旋转。每个离屏目标都应使用自己的像素尺寸。</p>
      <CodeBlock label="坐标与旋转 · GLSL ES 3.00 片段" language="glsl">{`vec2 uv = gl_FragCoord.xy / u_resolution;
vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

float c = cos(angle), s = sin(angle);
vec2 q = mat2(c, s, -s, c) * (p - centre) * frequency;`}</CodeBlock>
      <p>矩阵构造函数按列填写，上面的写法让列向量逆时针旋转。查询坐标乘以更大频率后，同一视口里会出现更多重复。<code>length(p)</code> 给出半径，<code>atan(p.y, p.x)</code> 给出角度；用极坐标生成旋涡和放射图案时，要处理 −π 与 π 处的接缝。</p>
    </section>

    <section id="effect-sdf" className="lesson-section">
      <h2>SDF：让形状共享一份距离</h2>
      <p>有符号距离场把每个位置映射为到边界的距离，常用内部负、边界零、外部正的约定。填充、描边、软边都从同一个距离值产生，第二步已经可以切换这些表达。</p>
      <CodeBlock label="圆、盒子与形状组合" language="glsl">{`float sdCircle(vec2 p, float radius) {
  return length(p) - radius;
}
float sdBox(vec2 p, vec2 halfSize) {
  vec2 q = abs(p) - halfSize;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}

float unionDistance = min(d1, d2);
float intersectionDistance = max(d1, d2);
float cutDistance = max(d1, -d2);`}</CodeBlock>
      <p><code>fwidth(d)</code> 估计距离在相邻屏幕片段间的变化，让边缘过渡跟随分辨率调整。<code>smoothstep</code> 的两个边界必须递增，反向过渡使用 <code>1.0 - smoothstep(...)</code>。导数应在非一致分支和 <code>discard</code> 前求出；组合、扭曲后的场可能失去精确距离性质。</p>
    </section>

    <section id="effect-waves" className="lesson-section">
      <h2>波形：把空间和时间放进相位</h2>
      <CodeBlock label="条纹、波纹与正弦扭曲" language="glsl">{`float stripe = 0.5 + 0.5 * sin(p.x * 20.0 - u_time * 2.0);
float ripple = sin(length(p) * 40.0 - u_time * 3.0);
vec2 bent = p + 0.03 * vec2(
  sin(p.y * 8.0 + u_time),
  cos(p.x * 6.0 - u_time)
);`}</CodeBlock>
      <p>空间频率决定纹路密度，时间系数决定移动速度，振幅决定位移量。<code>u_time</code> 使用秒，<code>requestAnimationFrame</code> 时间戳使用毫秒，上传前乘以 <code>0.001</code>。直接按时间求函数适合波纹和呼吸；积累状态的运动或扩散需要时间步长。</p>
      <p>可以在 <LessonLink lessonId="openshaders-breakdown">OpenShaders 拆解的第四步与第五步</LessonLink> 观察两次顺序正弦扭曲，以及重复变换怎样增加褶皱。</p>
    </section>

    <section id="effect-noise" className="lesson-section">
      <h2>随机、平滑噪声与 fBM</h2>
      <p><code>floor</code> 得到网格编号，<code>fract</code> 得到单元内位置。Hash 把编号映射为可复现的伪随机值，适合星点位置和每格动画相位。连续时间直接进入 hash 会产生跳变；Value noise 通过格点插值产生连续的不规则场，适合云雾和流动。</p>
      <CodeBlock label="单元编号与局部坐标" language="glsl">{`vec2 cellId = floor(uv * 12.0);
vec2 local = fract(uv * 12.0) - 0.5;
float randomValue = hash21(cellId);`}</CodeBlock>
      <p><strong>Value noise</strong> 在格点生成随机标量，再插值；<strong>Gradient noise</strong> 使用格点梯度与位移的点积，经典 Perlin noise 属于这一类。GLSL ES 3.00 中应自行提供噪声函数或纹理。浮点 hash 的末位可能随 GPU 精度变化；需要名字对应长期一致的参数时，在 JavaScript 中用整数 hash 与固定版本 PRNG 生成，再上传 Uniform。</p>
      <h3>fBM 叠加尺度，domain warping 改变坐标</h3>
      <p>fBM 在 Shader 实践中常指多频率噪声的加权叠加，每层称为一个 <strong>octave</strong>。四层振幅 0.5、0.25、0.125、0.0625 的和为 0.9375；实验允许调整层数和倍率，并同步计算分母。想用 <code>abs(n)</code> 生成湍流或脊状图案时，先用 <code>2.0 * n - 1.0</code> 把 0～1 转到有符号范围。</p>
      <p>Domain warping 先用一个场偏移查询坐标，再到新坐标求另一个场。实验第五步需要两份 fBM 提供位移，加一份 fBM 产生最终场；默认四层时，每个片段执行 12 次 Value noise。查看位移来源时只计算前两份，共 8 次。</p>
    </section>

    <section id="effect-color" className="lesson-section">
      <h2>颜色：把场值映射到显示结果</h2>
      <p>先求一个标量场，再映射颜色，能分别调整空间结构和配色。第六步使用余弦调色板；也可以用 <code>mix(colorA, colorB, field)</code>、颜色查找表纹理，或 OKLCH 分别管理感知亮度、彩度和色相。超出显示色域时仍需处理。</p>
      <CodeBlock label="颜色映射与简单 Tone mapping" language="glsl">{`vec3 color = mix(colorA, colorB, field);
// 多个光源相加可能超过 1；压缩到可显示范围。
color = color / (1.0 + color);`}</CodeBlock>
      <p>Tone mapping 管理过亮的数值，线性 RGB 到 sRGB 编码负责显示传递，两者有各自职责。光照、模糊和光能相加应在线性空间完成；使用 <code>SRGB8_ALPHA8</code> 时也要确认采样已进行的解码。顶部实验采用艺术配色和简单压缩，便于观察公式组合。</p>
    </section>

    <section id="effect-glow" className="lesson-section">
      <h2>发光与丝带：距离衰减再累加</h2>
      <CodeBlock label="两种解析光斑" language="glsl">{`vec2 q = p - centre;
float softGlow = intensity / (dot(q, q) + softness);
float compactGlow = exp(-k * dot(q, q));`}</CodeBlock>
      <p>倒数衰减提供较长的柔亮尾部，指数衰减更集中。<code>softness</code> 保持正值，以控制峰值并避免除零。把两个方向乘以不同系数会拉长光斑；对查询坐标反复旋转、剪切、缩放和正弦扭曲，再累加光斑，便能生成细丝和丝带。</p>
      <p>层数影响结构与成本，外围衰减影响覆盖率，高光压缩控制累加后的亮度。顶部第七步使用解析衰减；Bloom 还要对亮部做空间模糊。丝带的完整交互可以回看 <LessonLink lessonId="openshaders-breakdown">OpenShaders 八步实验</LessonLink>。</p>
    </section>

    <section id="effect-material" className="lesson-section">
      <h2>表面朝向、反射与折射</h2>
      <p><strong>法线 normal</strong> 描述表面朝向。二维连续高度场也能通过相邻采样估算法线，让平面拥有起伏观感。采样间距 <code>eps</code> 应与高度场尺度匹配，<code>L</code> 和 <code>V</code> 分别是朝向光源与观察者的单位向量。</p>
      <CodeBlock label="高度差分 → 法线 → 光照与反射" language="glsl">{`float dx = height(p + vec2(eps, 0.0)) - height(p - vec2(eps, 0.0));
float dy = height(p + vec2(0.0, eps)) - height(p - vec2(0.0, eps));
vec3 N = normalize(vec3(-dx / (2.0 * eps), -dy / (2.0 * eps), 1.0));
float diffuse = max(dot(N, L), 0.0);
vec3 reflected = reflect(-V, N);
float fresnel = F0 + (1.0 - F0)
  * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);`}</CodeBlock>
      <p><code>F0</code> 是正视方向的基础反射率，Schlick 近似让反射随观察角度增强。反射方向还需要环境贴图、场景纹理或解析环境提供内容。<code>refract(I, N, eta)</code> 中 <code>eta</code> 是入射侧与透射侧折射率之比；厚度或交点帮助确定采样位置，全反射时返回零向量。</p>
      <p>连续偏移背景 UV 已能产生液体或玻璃观感。几何折射、遮挡与体积传播还需要额外数据，学习时应先明确使用的近似。</p>
    </section>

    <section id="effect-sampling" className="lesson-section">
      <h2>纹理扭曲与 RGB 分离</h2>
      <p>这里的 <code>u_scene</code> 是上一遍的颜色纹理。JavaScript 把它绑定到纹理单元，再把单元编号写入采样器 Uniform。连续 UV 位移改变查询位置；RGB 分离让三个通道从不同位置采样。</p>
      <CodeBlock label="上一遍纹理 → 液体扭曲或色差" language="glsl">{`vec2 offset = 0.02 * vec2(
  sin(uv.y * 12.0 + u_time),
  cos(uv.x * 9.0 - u_time)
);
vec3 liquid = texture(u_scene, uv + offset).rgb;

vec2 split = pixelOffset / vec2(textureSize(u_scene, 0));
vec3 chroma = vec3(
  texture(u_scene, uv + split).r,
  texture(u_scene, uv).g,
  texture(u_scene, uv - split).b
);`}</CodeBlock>
      <p>像素偏移除以输入纹理尺寸后，能保持固定的采样像素距离。色差偏移过大会出现重影，边缘采样由纹理环绕模式决定，常用 <code>CLAMP_TO_EDGE</code> 避免另一侧卷入。在 <LessonLink lessonId="openshaders-breakdown">OpenShaders 第七步</LessonLink> 可切换 Liquid 与 Chroma。</p>
    </section>

    <section id="effect-stylization" className="lesson-section">
      <h2>颗粒、抖动与单元表达</h2>
      <p><strong>Grain</strong> 添加细小随机变化；<strong>Dither</strong> 在量化前调整阈值，用分布缓解色阶有限造成的色带。下面让颗粒集中在中间调，并固定每秒刷新 24 次。</p>
      <CodeBlock label="亮度相关的颗粒" language="glsl">{`float y = clamp(dot(color, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
float n = hash21(floor(gl_FragCoord.xy / grainSize)
  + floor(u_time * 24.0));
vec3 grain = color + (n - 0.5) * strength * 4.0 * y * (1.0 - y);`}</CodeBlock>
      <p>亮度系数用于线性 RGB 时有明确色度学意义，用于编码后的 RGB 时属于视觉近似。4×4 Bayer 矩阵为不同单元分配阈值，再按 <code>floor(value * levels + threshold) / levels</code> 量化；阈值、输出范围和保留色相的方式要一起确定。Hash、Bayer、blue noise 的频谱不同，函数名称仍需对照公式。</p>
      <div className="handbook-table"><table><thead><tr><th>表达</th><th>单元里的计算</th><th>数据关系</th></tr></thead><tbody><tr><th scope="row">星光</th><td>网格随机位置 + 时间脉冲 + 光斑衰减</td><td>源图亮度决定哪些单元能闪烁</td></tr><tr><th scope="row">Halftone</th><td>亮度控制圆点面积</td><td>半径随亮度平方根变化</td></tr><tr><th scope="row">ASCII</th><td>亮度选择字符，局部 UV 采样字形</td><td>字符按笔画覆盖率排序</td></tr><tr><th scope="row">Mosaic</th><td>同一格共享代表颜色</td><td>多点采样平均更稳定</td></tr></tbody></table></div>
      <p>网点半径由 <code>πr² = brightness × cellArea</code> 推导。半径超过半个单元边长可能让圆点重叠；可以截断、接受重叠或改成反相孔洞。旋转网格时需反向变换采样位置，圆点边缘同样需要抗锯齿。</p>
      <p>ASCII 图集可以由 JavaScript 的 2D Canvas 生成后上传 GPU，图集留边和尺寸影响清晰度。界面文字仍用 HTML 保持可选择和可访问。马赛克的几次采样属于代表平均，完整面积平均需要更充分的滤波。九种表面风格可以在 <LessonLink lessonId="openshaders-breakdown">已有实验的后处理步骤</LessonLink> 直接比较。</p>
    </section>

    <section id="effect-bloom" className="lesson-section">
      <h2>Bloom：让亮部扩散到邻域</h2>
      <ol className="handbook-pass-list"><li><strong>场景 → 颜色纹理</strong><span>保存原始颜色，供最后合成。</span></li><li><strong>亮部提取 → 低分辨率纹理</strong><span>阈值决定哪些亮度进入光晕。</span></li><li><strong>横向模糊 → 纹理 A</strong><span>沿 x 方向采样邻域。</span></li><li><strong>纵向模糊 → 纹理 B</strong><span>沿 y 方向采样纹理 A。</span></li><li><strong>场景 + 光晕 × 增益 → 显示</strong><span>合成后进行 Tone mapping。</span></li></ol>
      <p>高斯模糊可以拆成两次一维采样。每一遍绑定自己的 Framebuffer 和输入纹理，采样步长使用输入尺寸，<code>viewport</code> 使用输出附件尺寸。降低亮部纹理分辨率能减少像素成本。</p>
      <p>HDR 光晕适合浮点颜色纹理。WebGL2 要检查 <code>EXT_color_buffer_float</code>、Framebuffer 完整性及具体过滤能力。可以先在 <LessonLink lessonId="multi-pass-image-processing">多阶段图像处理实验</LessonLink> 验证目标与采样器的连接。</p>
    </section>

    <section id="effect-feedback" className="lesson-section">
      <h2>Ping-Pong：给下一帧留下状态</h2>
      <p>两张纹理交替读写，能让拖尾、扩散和粒子积累历史。顶部“拖尾与扩散”已将新状态绘制到颜色附件，并显示实际累积帧数与读写目标；下图可以独立演示每帧的绑定关系。</p>
      <PingPongDiagram />
      <CodeBlock label="按时间步长衰减上一帧" language="glsl">{`float decay = exp(-decayRate * dt);
vec3 previous = texture(u_previous, uv).rgb;
vec3 nextState = previous * decay + currentLight;`}</CodeBlock>
      <p>同一次绘制应把输入纹理和当前输出附件分开，采样同一张输出纹理会形成 feedback loop。两张纹理都要初始化，尺寸改变时重建并重置状态，边界条件也要明确。<code>RGBA8</code> 的量化可能吞掉细微更新，状态数据要选择足够精度。</p>
      <p>衰减使用 <code>exp(-decayRate * dt)</code> 以减少帧率影响，暂停恢复时限制或分割过大的时间步长。扩散还要读取邻域，流体需要速度、压力和边界求解；仅由连续时间函数产生的液体外观可以直接按当前时间求值。</p>
    </section>

    <section id="effect-3d" className="lesson-section">
      <h2>Ray marching：沿射线寻找三维表面</h2>
      <p>片段着色器为像素建立相机射线，沿射线求三维场。当使用距离作为步长时，通常称为 <strong>sphere tracing</strong>。它适合需要空间轮廓、遮挡和光照的程序化物体。</p>
      <CodeBlock label="三维距离场的射线步进" language="glsl">{`float travel = 0.0;
bool hit = false;
for (int i = 0; i < 96; ++i) {
  vec3 position = rayOrigin + travel * rayDirection;
  float d = sceneDistance(position);
  if (d < 0.001) { hit = true; break; }
  travel += d;
  if (travel > 20.0) break;
}`}</CodeBlock>
      <p>这段代码假定方向单位化、起点位于表面外，距离函数提供可靠的非负距离或保守下界。扭曲、非等比缩放和任意混合可能破坏距离性质，过大的步长会跨过薄表面。命中后仍需估算法线并计算光照，步数、最大距离和命中阈值共同影响质量与成本。</p>
    </section>

    <section id="effect-geometry" className="lesson-section">
      <h2>顶点位移：让几何轮廓跟着变化</h2>
      <CodeBlock label="网格顶点中的波形位移" language="glsl">{`vec3 displaced = a_position;
displaced.y += amplitude * sin(a_position.x * frequency + u_time);
gl_Position = u_projection * u_view * u_model * vec4(displaced, 1.0);`}</CodeBlock>
      <p>顶点阶段改变网格位置，适合旗帜、水面和起伏地形。足够的网格密度提供轮廓细节，法线也要根据变形更新。片段中的高度与法线扰动可以增加表面细节，几何轮廓由提交的顶点决定。</p>
      <p>全屏效果通过 <code>gl_VertexID</code> 生成三个顶点。顶部“水面与旗帜”使用 TypedArray → GPU Buffer → VAO 的网格数据，每个顶点保存 position.xyz 与 uv.xy：<code>stride = 20</code> 字节，UV 的 <code>offset = 12</code> 字节，索引类型为 <code>UNSIGNED_SHORT</code>。可以接着复习 <LessonLink lessonId="model-view-projection">模型、视图与投影</LessonLink>。</p>
    </section>

    <section id="effect-performance" className="lesson-section">
      <h2>把效果接进页面时检查什么</h2>
      <dl className="handbook-checks"><div><dt>分辨率与求值量</dt><dd>DPR 从 1 到 2，片段数约变成四倍。噪声层数、法线差分、色散采样还会继续叠加成本。平滑场可先降分辨率，字符、网点和颗粒留到显示分辨率。</dd></div><div><dt>目标尺寸与状态</dt><dd>ResizeObserver、DPR、Canvas、离屏附件和 viewport 需要同步。每个 pass 明确目标、输入纹理和依赖的绘制状态。</dd></div><div><dt>资源与生命周期</dt><dd>参数变化更新 Uniform，复用 Program、VAO 和 Texture。组件卸载释放资源，上下文恢复重新初始化，编译、链接和 Framebuffer 错误保留完整诊断。</dd></div><div><dt>可见性与运动</dt><dd>页面隐藏或画布离屏时暂停；减少运动偏好下使用静态帧或主动播放。顶部实验默认暂停，并限制绘图像素量。</dd></div><div><dt>颜色与透明度</dt><dd>明确线性或编码空间、premultipliedAlpha 与 blend 函数的约定。readPixels 可能同步 CPU 与 GPU，避免放进常规动画循环。</dd></div></dl>
    </section>

    <section id="effect-recipes" className="lesson-section">
      <h2>从小组合开始做自己的效果</h2>
      <div className="handbook-table"><table><thead><tr><th>目标</th><th>先实现</th><th>再增加</th></tr></thead><tbody><tr><th scope="row">流动丝带</th><td>正弦扭曲 + 重复变换 + 光斑累加</td><td>参数种子、低分辨率场、后处理</td></tr><tr><th scope="row">云雾背景</th><td>Value noise + fBM + 缓慢漂移</td><td>Domain warping、颜色查找表</td></tr><tr><th scope="row">液体卡片</th><td>背景纹理 + 连续 UV 位移</td><td>高度法线、Fresnel、轻微 RGB 分离</td></tr><tr><th scope="row">印刷风格</th><td>分块采样 + 网点 SDF</td><td>网格旋转、弱颗粒、纸色合成</td></tr><tr><th scope="row">星光拖尾</th><td>Hash 网格光点 + 时间脉冲</td><td>Ping-Pong、按时间步长衰减</td></tr></tbody></table></div>
      <p>每次只改变一个因素，先观察坐标和灰度场，再开启配色与合成。需要三维轮廓时，再进入相机、法线、材质和距离步进。</p>
    </section>

    <LessonPagination current="shader-effects-handbook" heading="继续实验">回到任一步调整参数，追踪一个场值怎样同时影响轮廓与颜色；然后把速查表里的手法组合成自己的效果。</LessonPagination>
    <footer id="effect-references" className="lesson-footer"><p>根据项目中的 shader-effects-handbook.md 整理。实验与公式为独立教学实现，使用 WebGL2 与 GLSL ES 3.00。下面资料补充语言、噪声、色彩和渲染阶段的原理。</p><div className="lesson-footer__links"><a href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/" target="_blank" rel="noreferrer">WebGL2 Fundamentals</a><a href="https://thebookofshaders.com/11/" target="_blank" rel="noreferrer">Noise</a><a href="https://thebookofshaders.com/13/" target="_blank" rel="noreferrer">fBM</a><a href="https://thebookofshaders.com/06/" target="_blank" rel="noreferrer">Color</a><a href="https://github.com/patriciogonzalezvivo/lygia/blob/main/color/palette.glsl" target="_blank" rel="noreferrer">LYGIA palette</a><a href="https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf" target="_blank" rel="noreferrer">GLSL ES 3.00 规范</a><a href="https://www.w3.org/TR/css-color-4/#ok-lab" target="_blank" rel="noreferrer">OKLab / OKLCH</a><a href="https://registry.khronos.org/webgl/extensions/EXT_color_buffer_float/" target="_blank" rel="noreferrer">浮点颜色附件扩展</a><a href="https://webgl2fundamentals.org/webgl/lessons/webgl-environment-maps.html" target="_blank" rel="noreferrer">环境映射</a><a href="https://webgl2fundamentals.org/webgl/lessons/webgl-gpgpu.html" target="_blank" rel="noreferrer">纹理中的状态计算</a><a href="https://doi.org/10.1007/s003710050084" target="_blank" rel="noreferrer">Sphere Tracing 论文</a></div><p className="handbook-reference-note">The Book of Shaders 的部分完整示例使用 GLSL ES 1.00。移植时使用 <code>#version 300 es</code>、<code>out vec4</code> 和 <code>texture(...)</code>，并把顶点阶段的 <code>attribute / varying</code> 改为 <code>in / out</code>。</p></footer>
  </article>;
}
