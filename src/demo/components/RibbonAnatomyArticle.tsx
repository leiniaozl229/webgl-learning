import { Hourglass, Layers3, Sparkles, Sprout } from 'lucide-react';
import type { ReactNode } from 'react';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { LessonPagination } from './LessonPagination';
import '../openshaders.css';

const emitterHref = `${import.meta.env.BASE_URL}ribbon-emitter.html`;

const localFrameCode = `vec2 q = p - frame.xy;                       // frame.xy = 根部（发射点）
vec2 local = vec2(dot(q, frame.zw),          // frame.zw = 发射方向 (cos, sin)
                  dot(q, vec2(-frame.w, frame.z)));
float u = local.x / form.x;                  // 0 = 根部，1 = 末端`;

const widthCode = `float width = form.y                                   // 基础宽度，正负号决定往哪一侧铺开
  * mix(1.0 - u_look.w, 1.0, smoothstep(0.0, 0.4, u))   // 根部收窄
  * mix(0.25, 1.0, smoothstep(0.0, 0.3, life.y - u));   // 生长中的头部收成尖
float swell = 0.6 * sin(u * 5.0 - u_time * 0.5 + traits.x)
            + 0.4 * sin(u * 11.0 - u_time * 0.7 - traits.x * 2.0);
width *= max(1.0 + traits.w * swell * smoothstep(0.0, 0.25, u), 0.15);

// 曲线倾斜时竖直偏移会被 cos θ 压扁：先放大 1/cos θ，算距离时再乘回去。
float perpendicular = inversesqrt(1.0 + slope * slope);
float lift = width / perpendicular;`;

const twistCode = `float twist = cos(form.z * TAU * u - form.w);          // 投影宽度 = 宽度 × cos(转角)
// 侧对画面时同样多的光挤进更窄的投影，亮度约按 1 / |cos| 增加；下限 0.2 防止除以零。
float fold = 1.0 + u_decay.z * 0.5 * (1.0 / max(abs(twist), 0.2) - 1.0);`;

const layersCode = `for (int i = 0; i < 48; ++i) {
  if (float(i) >= u_layers.x) break;
  vec4 shape = u_layerShape[i];                          // (tᵞ, 间距, 丝纹 cos, 丝纹 sin)
  vec4 tint = texelFetch(u_palette, ivec2(i, k), 0);     // 这一层的颜色，a = 消失先后
  float d = (offset - liftTwist * (shape.x + shape.z * silkSin + shape.w * silkCos)) * perpendicular;
  float glow = max(u_layers.z, glowScale * shape.y) * blur;
  float edgeWeight = 1.0 - (float(i) + 0.5) * invLayers;
  float alive = 1.0 - smoothstep(tint.a - 0.12, tint.a + 0.12, dissolve);
  light += tint.rgb * ((1.0 + vary * edgeWeight * edgeWeight) * alive * glow / (d * d + glow * glow));
}`;

const layerShapeCode = `export function fillLayerShape(target: Float32Array, options: Pick<EmitterOptions, 'layers' | 'gamma'>) {
  const { layers, gamma } = options;
  for (let i = 0; i < Math.min(layers, MAX_LAYERS); i++) {
    const t = (i + 0.5) / layers;
    target[i * 4] = t ** gamma;                                                       // 离亮边多远
    target[i * 4 + 1] = (gamma * Math.max(t, 0.5 / layers) ** (gamma - 1)) / layers;  // 与下一层的间距
    target[i * 4 + 2] = 0.08 * t * Math.cos(7 * t);                                   // 丝纹系数
    target[i * 4 + 3] = 0.08 * t * Math.sin(7 * t);
  }
}`;

const coreCode = `float d0 = offset * perpendicular;                       // 到亮边曲线的垂直距离
float sigma = max(u_edge.y * traits.z, 0.8 / u_resolution.y) * blur;
float gain = u_edge.x * traits.y * mix(1.0, highlight, u_edge.w) * (1.0 - smoothstep(0.0, 0.6, late));
vec3 core = texelFetch(u_palette, ivec2(48, k), 0).rgb * gain * exp(-d0 * d0 / (sigma * sigma));`;

const lifeCode = `float along = smoothstep(life.z - 0.06, life.z + 0.12, u)      // 尾：回缩时从根部开始消失
            * (1.0 - smoothstep(life.y - 0.15, life.y + 0.02, u)) // 头：生长的前沿柔和淡出
            * smoothstep(-0.03, 0.05, u);                          // 根部之前不发光
return (light * 6.0 / u_layers.x + core) * fold * along * window * life.x;`;

const layerShapeRows = [
  ['shape.x', 'tᵞ', '这一层离亮边多远，占总宽度的比例。γ > 1 时前几层挤在亮边附近'],
  ['shape.y', 'γ·t^(γ−1) / N', '相邻两层的间距，即 tᵞ 的导数除以层数，用来放大光晕'],
  ['shape.z', '0.08t·cos 7t', '丝纹扰动的系数，t 越大扰动越大，外侧细线轻轻错开'],
  ['shape.w', '0.08t·sin 7t', '与 shape.z 配对，用和角公式省掉逐层的 sin'],
] as const;

const knobs = [
  ['每条光带走向不同', '出生时抽定发射方向和五个局部控制点', '扩散角（弧度）'],
  ['从发射点被拉出来', '头部位置 life.y 从 0 长到 1，靠近头部的一段收成尖', '生长时长（占寿命）'],
  ['宽窄沿光带流动', '两段正弦叠加，起伏幅度出生时抽定', '宽度起伏'],
  ['亮边一段亮一段暗', '三段正弦叠加后 smoothstep，只作用在亮边附近的层', '亮边明暗变化'],
  ['锐利的高光边', '在亮边上再叠一条高斯细线', '亮线强度、亮线宽度'],
  ['衰老消散', '光晕变宽（失焦），各层按随机先后退出（丝缕）', '晚年失焦、晚年散成丝缕'],
  ['交叠处偏暖偏亮', '按叠加后的能量换色相', '按能量上色、暖色色相（圈）'],
] as const;

export function RibbonAnatomyArticle({ toc }: { toc?: ReactNode }) {
  return <article className="lesson-article ribbon-anatomy-article">
    <header className="lesson-hero">
      <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGL2</LessonLink><span aria-hidden="true">/</span><span>Shader 实战</span></nav>
      <h1 id="lesson-title" tabIndex={-1}>光带发射器原理：生长、衰老与消散</h1>
      <p className="lesson-lead"><a href={emitterHref}>光带发射器</a> 从同一个点陆续放出多条光带，每条光带会生长、飘动、衰老，最后散成丝缕消失。单条光带的画法沿用 <LessonLink lessonId="controlled-ribbon">可控光带</LessonLink>，本篇讲发射器在它之上加了什么。</p>
      <ul className="lesson-meta" aria-label="课程信息"><li>GLSL ES 3.00</li><li>建议先读可控光带</li><li>约 12 分钟</li></ul>
    </header>
    {toc}

    <section id="ribbon-overview" className="lesson-section">
      <h2>从一条光带到一群光带</h2>
      <p>片段着色器里的 <code>ribbon(k, p)</code> 计算第 k 条光带在像素 <code>p</code> 处的光，<code>main</code> 把最多 8 条光带的结果相加。和可控光带相比，每条光带多了这几样东西：</p>
      <ol className="pipeline" aria-label="发射器给每条光带新增的内容">
        <li><span><Sprout aria-hidden="true" /></span><strong>自己的坐标系与性格</strong><small>发射方向、控制点和随机特征都在出生时抽定</small></li>
        <li><span><Layers3 aria-hidden="true" /></span><strong>流动的形状</strong><small>头部收尖、宽度起伏、亮边明暗滑动</small></li>
        <li><span><Sparkles aria-hidden="true" /></span><strong>高斯亮线</strong><small>贴着亮边的锐利高光</small></li>
        <li><span><Hourglass aria-hidden="true" /></span><strong>生命周期</strong><small>生长、回缩、晚年失焦与散成丝缕</small></li>
      </ol>
      <p>可以先在发射器里按“参数”打开面板，边读边调。整个函数只输出线性光，背景、泛光和高光压缩在后面的合成步骤里完成。</p>
    </section>

    <section id="shared-basics" className="lesson-section">
      <h2>沿用可控光带的画法</h2>
      <p>以下几部分与 <LessonLink lessonId="controlled-ribbon">可控光带</LessonLink> 相同，那里有交互实验和扭转示意图，这里只列出发射器里的细节：</p>
      <ul>
        <li><strong>亮边曲线</strong>：五个控制点做三次 Hermite 插值。发射器把切线斜率限制在 ±1.5 以内，避免随机抽到的相邻点太近时曲线甩出钩子。</li>
        <li><strong>细线位置 tᵞ</strong>：前几层挤在亮边附近叠出亮边，越往外越稀。</li>
        <li><strong>光晕跟着间距放大</strong>：相邻细线的光晕刚好接上，光面里不露线条。</li>
        <li><strong>扭转</strong>：偏移乘 cos(扭转角)，过零处收成亮结，之后翻到另一侧。发射器额外给翻折处增亮：</li>
      </ul>
      <CodeBlock label="ribbonEmitter.glsl" language="glsl">{twistCode}</CodeBlock>
      <p>侧对画面时同样多的光挤进更窄的投影，亮度约按 1 / |cos| 增加，亮结更醒目。</p>
    </section>

    <section id="local-frame" className="lesson-section">
      <h2>每条光带自己的坐标系</h2>
      <p>可控光带只有一条，固定从左往右画。发射器里的光带方向各不相同，片段着色器先把像素坐标平移到根部，再用两次点积旋转到光带的局部坐标：<code>local.x</code> 沿发射方向，<code>local.y</code> 垂直于它。</p>
      <CodeBlock label="ribbonEmitter.glsl" language="glsl">{localFrameCode}</CodeBlock>
      <p>控制点也存在局部坐标里，所以“x 递增”的要求只在局部成立，发射方向可以任意。<code>u</code> 是把位置除以长度得到的比例：宽度、头尾和晚年效果都按 <code>u</code> 计算，长短不同的光带表现一致。</p>
      <p>每条光带出生时还会抽定一组特征存进 <code>u_traits</code>：相位、亮线强度、亮线宽度和宽度起伏幅度。它们跟着光带走，同时出现的几条光带因此各有性格。</p>
    </section>

    <section id="width" className="lesson-section">
      <h2>宽度：收尖与起伏</h2>
      <CodeBlock label="ribbonEmitter.glsl" language="glsl">{widthCode}</CodeBlock>
      <p>根部收窄让所有光带在发射点收拢，看起来连在同一个源头上。头部收尖只在生长期间起作用：<code>life.y</code> 是头部已经长到的位置，靠近头部的一段宽度降到 25%，光带像是从发射点被拉出来。</p>
      <p>宽度起伏由两段波长不同的正弦相加，减去时间后沿光带向末端流动；起伏不作用在根部，发射点保持收拢。斜率修正 <code>perpendicular</code> 与可控光带相同，保证曲线陡的地方光带不会变细。</p>
    </section>

    <section id="layers" className="lesson-section lesson-section--wide">
      <h2>细线循环与 CPU 预计算</h2>
      <p>光面仍然是几十条洛伦兹衰减的细线相加，但一个像素最多要对 8 条光带各跑 48 层，循环体必须足够轻：</p>
      <CodeBlock label="ribbonEmitter.glsl" language="glsl">{layersCode}</CodeBlock>
      <p>每层只和层号有关的量，由 CPU 每帧算好一次放进 <code>u_layerShape</code>，像素里不再对每层重复算 <code>pow</code> 和 <code>sin</code>：</p>
      <CodeBlock label="ribbonEmitter.ts">{layerShapeCode}</CodeBlock>
      <div className="ribbon-style-table"><table><thead><tr><th>分量</th><th>值</th><th>作用</th></tr></thead><tbody>{layerShapeRows.map(([name, value, role]) => <tr key={name}><th scope="row"><code>{name}</code></th><td>{value}</td><td>{role}</td></tr>)}</tbody></table></div>
      <p>丝纹 0.08t·sin(A + 7t) 中 A 随 <code>local.x</code> 和时间变化，按和角公式拆成 sin A·cos 7t + cos A·sin 7t 后，每个像素只需算一次 sin A 和 cos A。</p>
      <p>颜色同理：每条光带每一层的颜色已经乘好外缘渐隐和柔和度，写进调色板纹理 <code>u_palette</code>，第 k 行是第 k 条光带，片段着色器用 <code>texelFetch</code> 直接读取。OKLCH 换算因此只在 CPU 上做。</p>
    </section>

    <section id="edge-highlight" className="lesson-section">
      <h2>亮边一段亮一段暗</h2>
      <p>三段波长不同的正弦叠加成 <code>wave</code>，经过 <code>smoothstep(-0.5, 0.85, wave)</code> 再平方，大部分区段被压暗，只剩几段高光顺着光带慢慢滑动。频率按 <code>local.x</code>（场景长度）计算，长光带和短光带的高光段一样密。</p>
      <p>明暗通过 <code>vary × edgeWeight²</code> 作用到每一层，<code>edgeWeight</code> 在亮边处为 1、外侧为 0。所以明暗只影响亮边附近的层，外侧光面保持连贯。</p>
    </section>

    <section id="core-line" className="lesson-section">
      <h2>高斯亮线</h2>
      <p>洛伦兹衰减的尾巴很长，亮边总带着一圈晕，边缘不够锐利。高斯 exp(−d²/σ²) 在半宽之外迅速归零，所以沿亮边再叠一条高斯细线作为高光边。</p>
      <CodeBlock label="ribbonEmitter.glsl" language="glsl">{coreCode}</CodeBlock>
      <p>σ 至少 0.8 像素，降低渲染分辨率时也不会闪烁。<code>gain</code> 同样乘了 <code>highlight</code>：高光段的亮线又亮又锐，暗段几乎只剩柔和的光面。调色板第 48 列存放亮线颜色，比光面更接近白色。</p>
    </section>

    <section id="lifecycle" className="lesson-section">
      <h2>生命周期与晚年</h2>
      <CodeBlock label="ribbonEmitter.glsl" language="glsl">{lifeCode}</CodeBlock>
      <p><code>life.y</code>（头）从 0 长到 1，光带从发射点被拉出来；之后 <code>life.z</code>（尾）从 0 追上去，光带从根部开始收回。<code>window</code> 让离光带太远的像素平滑归零，避免硬切出一条边。</p>
      <p>晚年进度 <code>u_late</code> 从 0 走到 1，带来两个效果：</p>
      <ul>
        <li><strong>失焦</strong>：<code>blur</code> 让每层光晕最多变宽到 4 倍，宽度也张开一些。亮线比光面更早消失，最后剩下柔和的光雾。</li>
        <li><strong>散成丝缕</strong>：调色板的 alpha 存着每层随机的消失时刻。<code>dissolve</code> 从末端向根部推进，越过时刻的层逐个淡出，光面裂成一缕一缕。</li>
      </ul>
      <p>随机量由每条光带出生时的 seed 决定，不依赖数组下标。老光带消失后数组会整体前移，用下标会让其他光带的外观突然跳变。</p>
    </section>

    <section id="early-exit" className="lesson-section">
      <h2>提前退出</h2>
      <ul>
        <li><code>u</code> 落在头尾之外，或这条光带亮度为 0 时，直接返回黑色，不进入细线循环。</li>
        <li>像素离亮边超过 |lift| + 0.3 时 <code>window</code> 为 0，同样直接返回。</li>
        <li>大部分像素只落在一两条光带附近，其余光带在循环前就退出了，8 条光带的实际成本远低于 8 倍。</li>
      </ul>
    </section>

    <section id="after-ribbon" className="lesson-section">
      <h2>光带相加之后</h2>
      <ol>
        <li><code>main</code> 把各条光带的线性光相加，再加上发射点光晕。</li>
        <li><code>heatColor</code> 按叠加后的能量换色相：越亮越从冷色经品红走向暖色、接近白，只换颜色不改亮度。多条光带交叠处因此偏暖、偏亮。</li>
        <li>结果写进离屏纹理，降到 1/4 分辨率做几遍可分离模糊，得到泛光（bloom）。</li>
        <li>合成 Pass 叠上背景，用 ACES 风格的 <code>compressLight</code> 压缩高光后输出。多遍绘制的数据流可参考 <LessonLink lessonId="multi-pass-image-processing">多阶段图像处理</LessonLink>。</li>
      </ol>
    </section>

    <section id="parameter-map" className="lesson-section">
      <h2>参数对照</h2>
      <p>只列发射器新增的效果，亮边集中度、柔和度、扭转等共用参数见 <LessonLink lessonId="controlled-ribbon">可控光带的参数对照</LessonLink>。</p>
      <div className="ribbon-style-table ribbon-knobs"><table><thead><tr><th>想要的效果</th><th>做法</th><th>对应参数</th></tr></thead><tbody>{knobs.map(([goal, method, control]) => <tr key={goal}><th scope="row">{goal}</th><td>{method}</td><td>{control}</td></tr>)}</tbody></table></div>
    </section>

    <section id="pitfalls" className="lesson-section">
      <h2>容易混淆的地方</h2>
      <dl className="math-pitfalls">
        <div><dt>晚年光晕变宽，为什么光带没有变亮？</dt><dd>洛伦兹线 glow / (d² + glow²) 在整条直线上的积分是 π，与 glow 无关。半径变大时峰值按比例降低，同样多的光散到更宽的范围。</dd></div>
        <div><dt>已经有洛伦兹细线，为什么还要高斯亮线？</dt><dd>洛伦兹衰减适合做柔光，边缘却总带着一圈晕。高斯在几倍 σ 之外几乎为 0，能给出锐利的高光边，两者叠加才有“锐边 + 柔光面”的质感。</dd></div>
        <div><dt>随机特征为什么不按数组下标取？</dt><dd>老光带消失后，后面的光带在数组里整体前移一位。按下标取随机数，每次有光带消失，其余光带的相位和亮度都会跳变。</dd></div>
      </dl>
    </section>

    <LessonPagination current="ribbon-anatomy" heading="继续实验">回到 <a href={emitterHref}>光带发射器</a>，把“晚年失焦”和“晚年散成丝缕”分别调到 0，对比光带消失的方式；再把“按能量上色”调到 0，看交叠处的颜色变化。</LessonPagination>
    <footer className="lesson-footer"><p>光带发射器为独立教学实现，单条光带的画法延续本站的可控光带。</p><div className="lesson-footer__links"><a href="https://openshaders.com/explore" target="_blank" rel="noreferrer">OpenShaders</a><a href="https://en.wikipedia.org/wiki/Cauchy_distribution" target="_blank" rel="noreferrer">洛伦兹（Cauchy）分布</a><a href="https://en.wikipedia.org/wiki/Gaussian_function" target="_blank" rel="noreferrer">高斯函数</a></div></footer>
  </article>;
}
