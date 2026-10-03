import { ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

import type { LessonId } from '../navigation';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { LessonPagination } from './LessonPagination';
import { MathChapterRoute } from './MathChapterRoute';
import { DeterminantLab, DotLab, NormalMatrixLab, PointVectorDiagram, TrigLab, VectorLab, WindingLab } from './MathLabs';

/* ---------- 共用结构 ---------- */

function Hero({ title, lead, meta }: { title: string; lead: ReactNode; meta: string[] }) {
  return (
    <header className="lesson-hero">
      <nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>数学</span></nav>
      <h1 id="lesson-title" tabIndex={-1}>{title}</h1>
      <p className="lesson-lead">{lead}</p>
      <ul className="lesson-meta" aria-label="课程信息">{meta.map((item) => <li key={item}>{item}</li>)}</ul>
    </header>
  );
}

function LearningNote({ id, items }: { id: string; items: ReactNode[] }) {
  return (
    <section className="learning-note" aria-labelledby={id}>
      <div className="learning-note__icon" aria-hidden="true"><CheckCircle2 /></div>
      <div><h2 id={id}>完成这一节后</h2><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
    </section>
  );
}

function Pitfalls({ items }: { items: Array<{ question: ReactNode; answer: ReactNode }> }) {
  return (
    <dl className="math-pitfalls">
      {items.map((item, index) => <div key={index}><dt>{item.question}</dt><dd>{item.answer}</dd></div>)}
    </dl>
  );
}

function FormulaCards({ items }: { items: Array<{ badge: string; title: string; formula: ReactNode; detail: ReactNode }> }) {
  return (
    <div className="math-formula-cards">
      {items.map((item) => <article key={item.title}><span>{item.badge}</span><strong>{item.title}</strong><code>{item.formula}</code><p>{item.detail}</p></article>)}
    </div>
  );
}

function RelatedLessons({ items }: { items: Array<{ id: LessonId; badge: string; title: string; detail: string }> }) {
  return (
    <div className="matrix-lesson-links">
      {items.map((item) => <LessonLink key={item.id} lessonId={item.id}><span>{item.badge}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><ArrowRight aria-hidden="true" /></LessonLink>)}
    </div>
  );
}

function Footer({ links }: { links: Array<{ href: string; label: string }> }) {
  return (
    <footer className="lesson-footer">
      <p>本模块的坐标平面采用 Y 轴向上，与裁剪空间一致；Canvas 像素坐标的 Y 轴向下，二者之间由投影矩阵翻转。</p>
      <div className="lesson-footer__links">{links.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer">{link.label} <ExternalLink aria-hidden="true" /></a>)}</div>
    </footer>
  );
}

/* ---------- 1. 向量、长度与单位化 ---------- */

const vectorOpsCode = `type Vec3 = readonly [number, number, number];

// 终点减起点：得到从 from 指向 to 的位移。
const subtract = (to: Vec3, from: Vec3): Vec3 => [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k];

// 勾股定理推广到三维。
const length = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);

// 零向量没有方向；返回 null，让调用方明确处理，而不是得到 NaN。
function normalize(v: Vec3): Vec3 | null {
  const len = length(v);
  return len < 1e-6 ? null : scale(v, 1 / len);
}

// 每帧：位置 = 位置 + 速度 × 经过的秒数。
position = add(position, scale(velocity, deltaSeconds));

// 相机朝向：目标点 − 相机位置，再单位化成纯方向。
const forward = normalize(subtract(target, cameraPosition));`;

const vectorGlslCode = `#version 300 es
precision highp float;

in vec3 v_normal;            // 顶点法线，经光栅化插值后到达
in vec3 v_surfaceToLight;    // 片段指向光源的向量
out vec4 outColor;

void main() {
  // 两个单位向量插值后的中间值通常短于 1，片段着色器里要重新单位化。
  vec3 normal = normalize(v_normal);
  vec3 toLight = normalize(v_surfaceToLight);

  // length 读取距离，用于衰减；向量本身保留方向信息。
  float distanceToLight = length(v_surfaceToLight);
  float attenuation = 1.0 / (1.0 + 0.1 * distanceToLight);

  // swizzle：.xyz、.rgb 读取同一组分量的不同名字。
  outColor = vec4(normal * 0.5 + 0.5, 1.0);
  outColor.rgb *= attenuation;
}`;

export function VectorsArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <Hero title="向量、长度与单位化" lead={<>顶点位置、移动速度、表面法线和光线方向都用向量表示。本篇先区分“点”和“方向”，再讲清加减、缩放、长度与单位化，以及它们在 GLSL 中的写法。</>} meta={['Vector', 'normalize', '约 18 分钟']} />
      {toc}
      <MathChapterRoute current="vectors" />
      <LearningNote id="vectors-learning" items={[
        '区分位置（点）与方向（向量），理解 W = 1 与 W = 0 的差别',
        '用“首尾相接”理解向量加法，用“终点减起点”得到方向',
        '计算二维、三维向量的长度以及两点距离',
        '说明单位化保留什么、丢弃什么，并正确处理零向量',
        <>在 GLSL 中使用 <code>length</code>、<code>distance</code> 与 <code>normalize</code></>,
      ]} />

      <section id="points-and-vectors" className="lesson-section">
        <h2>点与向量写法相同，含义不同</h2>
        <p>点和向量都写成 <code>(x, y)</code> 或 <code>(x, y, z)</code>。点回答“在哪里”，例如顶点位置；向量回答“朝哪走、走多远”，例如速度、法线和光照方向。两点相减得到向量：<code>B − A</code> 是从 A 指向 B 的位移。</p>
        <PointVectorDiagram />
        <p>这层区别在矩阵运算里有具体后果。位置补上 <code>W = 1</code>，矩阵的平移列会作用到它；方向补上 <code>W = 0</code>，平移列被乘以 0，只剩旋转和缩放。同一个 <code>mat4</code> 因此能同时正确处理顶点和法线方向。</p>
        <FormulaCards items={[
          { badge: 'P', title: '点 + 向量 = 点', formula: 'position + velocity', detail: '从某个位置出发，沿位移到达新位置。' },
          { badge: 'V', title: '点 − 点 = 向量', formula: 'target − eye', detail: '两个位置之差给出方向与距离。' },
          { badge: 'W', title: '齐次分量', formula: 'vec4(p, 1.0) / vec4(d, 0.0)', detail: '位置受平移影响，方向只受旋转与缩放影响。' },
        ]} />
      </section>

      <section id="add-and-subtract" className="lesson-section">
        <h2>加法首尾相接，减法得到指向</h2>
        <p>向量加法按分量相加。几何上，把 b 的起点接到 a 的终点，从原点到最终位置的箭头就是 <code>a + b</code>。连续叠加多段位移时，顺序不会影响结果。</p>
        <p>减法可以读成 <code>a + (−b)</code>，结果从 b 的终点指向 a 的终点。在图形代码里最常见的写法是“目标 − 起点”：相机指向目标、表面指向光源、鼠标相对物体的位置，都这样计算。</p>
      </section>

      <section id="scalar-multiply" className="lesson-section">
        <h2>标量乘法只改变长度与朝向</h2>
        <p>标量（scalar）是单个数字。<code>k · v</code> 把每个分量乘以 k：k 大于 1 时拉长，0 到 1 之间缩短，负数让方向反转，0 得到零向量。动画中的 <code>velocity × deltaSeconds</code> 就是用时间缩放速度，得到这一帧应移动的距离。</p>
      </section>

      <section id="length" className="lesson-section">
        <h2>长度来自勾股定理</h2>
        <p>二维向量 <code>(x, y)</code> 与坐标轴组成直角三角形，长度为 <code>√(x² + y²)</code>。三维再加入 <code>z²</code>。两点距离就是它们差向量的长度：<code>distance(A, B) = length(B − A)</code>。</p>
        <FormulaCards items={[
          { badge: '2D', title: '二维长度', formula: '|(3, 4)| = √(9 + 16) = 5', detail: '经典的 3-4-5 直角三角形。' },
          { badge: '3D', title: '三维长度', formula: '|(x, y, z)| = √(x² + y² + z²)', detail: '先求 XY 平面上的斜边，再与 Z 组成新的直角三角形。' },
          { badge: '²', title: '只比较远近', formula: 'dot(v, v) = |v|²', detail: '判断“谁更近”时比较平方长度即可，可省去开方。' },
        ]} />
      </section>

      <section id="normalize" className="lesson-section">
        <h2>单位化：保留方向，长度变为 1</h2>
        <p>单位化（normalize）把向量除以自身长度：<code>v / |v|</code>。结果叫单位向量，长度恒为 1，方向与原向量相同。它丢弃了“多长”，只保留“朝哪”。</p>
        <p>光照、相机和反射计算需要纯方向。两个单位向量的点积恰好等于夹角的余弦；如果输入未单位化，结果会同时混入长度，亮度就会随模型尺寸变化。长度为 0 的向量没有方向，除以 0 会得到 <code>NaN</code>，写进 Uniform 后整片几何可能消失。</p>
      </section>

      <section id="vector-lab" className="lesson-section lesson-section--wide">
        <h2>向量实验</h2>
        <p>拖动 a、b 的终点，切换四种运算。重点观察：加法的虚线 b 与平移后的 b 平行；减法的结果从 b 指向 a；单位化结果始终落在单位圆上。把 a 拖到原点，查看零向量的提示。</p>
        <VectorLab />
      </section>

      <section id="glsl-vectors" className="lesson-section">
        <h2>GLSL 内置向量与函数</h2>
        <p>GLSL ES 3.00 提供 <code>vec2</code>、<code>vec3</code>、<code>vec4</code>，<code>+ − * /</code> 默认逐分量计算；<code>length</code>、<code>distance</code>、<code>normalize</code>、<code>dot</code>、<code>cross</code> 都是内置函数，由 GPU 为每个顶点或片段并行执行。JavaScript 端通常只负责准备 Uniform，例如把光源方向单位化后上传。</p>
        <CodeBlock label="vector-math.ts">{vectorOpsCode}</CodeBlock>
        <CodeBlock label="fragment.glsl" language="glsl">{vectorGlslCode}</CodeBlock>
      </section>

      <section id="pitfalls" className="lesson-section">
        <h2>容易混淆的地方</h2>
        <Pitfalls items={[
          { question: '顶点着色器已经单位化了法线，为何片段着色器还要再做一次？', answer: <>Varying 在三角形内部做线性插值。两个长度为 1、方向不同的向量取平均后，长度会小于 1。片段着色器读取 <code>v_normal</code> 后应再次 <code>normalize</code>。</> },
          { question: '方向向量误用了 W = 1 会怎样？', answer: '方向会被平移列“带走”。例如物体移动到 (100, 0, 0) 后，法线也被加上 100，光照完全错误。方向使用 W = 0，或只用 mat4 左上角的 mat3 变换。' },
          { question: '裁剪空间里长度为 1 的向量，在屏幕上一定一样长吗？', answer: '裁剪空间的 X、Y 都映射到 −1…+1，但 Canvas 通常宽于高，同样 1 个单位在水平方向对应更多像素。只有在同一个、各轴等比的坐标空间里比较长度才有意义，这也是投影矩阵要乘 aspect 的原因。' },
          { question: '如何安全地单位化？', answer: <>先检查长度是否接近 0。JavaScript 中返回 <code>null</code> 或回退到默认方向；GLSL 中对零向量调用 <code>normalize</code> 的结果未定义，应在上传数据前排除这种情况。</> },
        ]} />
      </section>

      <LessonPagination current="vectors" heading="接下来">向量已经能表示方向与长度。下一页用单位圆把角度转换成方向，建立 sin、cos 与弧度之间的直觉。</LessonPagination>
      <Footer links={[{ href: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-camera.html', label: '参考：WebGL2 三维相机（向量运算）' }]} />
    </article>
  );
}

/* ---------- 2. 角度、弧度与三角函数 ---------- */

const circleCode = `// 把圆切成 segments 个扇形，每个扇形是 1 个三角形（圆心 + 圆周上相邻两点）。
function createCircleVertices(radius: number, segments: number): Float32Array {
  const vertices = new Float32Array(segments * 3 * 2);
  for (let i = 0; i < segments; i += 1) {
    const angle0 = (i / segments) * Math.PI * 2;        // 弧度
    const angle1 = ((i + 1) / segments) * Math.PI * 2;
    vertices.set([
      0, 0,
      radius * Math.cos(angle0), radius * Math.sin(angle0),
      radius * Math.cos(angle1), radius * Math.sin(angle1),
    ], i * 6);
  }
  return vertices;
}

const circle = createCircleVertices(0.8, 48);
gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
gl.bufferData(gl.ARRAY_BUFFER, circle, gl.STATIC_DRAW);
// 每个顶点 2 个 float：stride = 8 字节，offset = 0 字节。
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 8, 0);
gl.drawArrays(gl.TRIANGLES, 0, 48 * 3);`;

const atan2Code = `// 让箭头指向鼠标：先求方向向量，再求角度。
const dx = mouseX - arrowX;
const dy = mouseY - arrowY;

// 参数顺序是 (y, x)。返回值范围 (−π, π]，四个象限都能区分。
const angle = Math.atan2(dy, dx);

// GLSL 中对应双参数版本：float angle = atan(dy, dx);`;

const perspectiveCode = `export function perspective4(fieldOfViewRadians: number, aspect: number, near: number, far: number): Matrix4 {
  // 视锥半高 = 1 × tan(fov / 2)；取倒数后，视锥边缘正好映射到 ±1。
  const focalLength = 1 / Math.tan(fieldOfViewRadians / 2);
  const rangeInverse = 1 / (near - far);
  return [
    focalLength / aspect, 0, 0, 0,
    0, focalLength, 0, 0,
    0, 0, (near + far) * rangeInverse, -1,
    0, 0, near * far * rangeInverse * 2, 0,
  ];
}`;

const oscillationCode = `#version 300 es
precision highp float;

uniform float u_time;   // 秒，由 JavaScript 每帧上传
out vec4 outColor;

void main() {
  // sin 在 −1 与 1 之间往返；× 0.5 + 0.5 把范围映射到 0…1。
  // 乘以 2π × 0.5 表示每秒完成 0.5 个周期。
  float pulse = 0.5 + 0.5 * sin(u_time * 6.2831853 * 0.5);
  outColor = vec4(vec3(0.08, 0.62, 0.79) * pulse, 1.0);
}`;

const timeUploadCode = `function frame(now: DOMHighResTimeStamp) {
  // 对周期取模，避免运行数小时后 float 精度下降导致动画抖动。
  const period = 2; // 秒
  const seconds = (now / 1000) % period;
  gl.useProgram(program);
  gl.uniform1f(timeLocation, seconds);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);`;

export function TrigonometryArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <Hero title="角度、弧度与三角函数" lead={<>旋转、圆形几何、视野角和周期动画都依赖三角函数。本篇把角度放到单位圆上，解释代码为何使用弧度，以及 <code>sin</code>、<code>cos</code>、<code>tan</code>、<code>atan2</code> 在 WebGL2 中各自负责什么。</>} meta={['Radians', 'Unit Circle', '约 20 分钟']} />
      {toc}
      <MathChapterRoute current="trigonometry" />
      <LearningNote id="trig-learning" items={[
        '说明弧度的定义，并在角度与弧度之间换算',
        <>从单位圆读出 <code>cos</code> 与 <code>sin</code>，理解它们是方向向量的两个分量</>,
        '用极坐标生成圆形顶点数据',
        <>用 <code>atan2</code> 从方向向量求角度</>,
        <>理解透视投影里 <code>tan(fov / 2)</code> 的作用，以及用 <code>sin</code> 驱动周期动画</>,
      ]} />

      <section id="radian-definition" className="lesson-section">
        <h2>弧度用弧长度量角度</h2>
        <p>弧度（radian）定义为“弧长 ÷ 半径”。在半径为 1 的圆上，弧度就等于沿圆周走过的长度。整圆周长 <code>2πr</code>，所以一圈是 <code>2π</code> 弧度，也就是 360°；1 弧度约为 57.3°。</p>
        <p>JavaScript 的 <code>Math.sin</code>、<code>Math.cos</code> 和 GLSL 的 <code>sin</code>、<code>cos</code> 都接收弧度。界面上给人看的角度用度数，进入计算前乘以 <code>π / 180</code>。GLSL 也内置 <code>radians()</code> 与 <code>degrees()</code> 负责换算。</p>
        <FormulaCards items={[
          { badge: '30°', title: 'π / 6', formula: '≈ 0.524 rad', detail: '1/12 圈' },
          { badge: '90°', title: 'π / 2', formula: '≈ 1.571 rad', detail: '1/4 圈，方向与起点垂直' },
          { badge: '180°', title: 'π', formula: '≈ 3.142 rad', detail: '半圈，方向完全相反' },
        ]} />
      </section>

      <section id="unit-circle" className="lesson-section">
        <h2>单位圆把角度变成方向</h2>
        <p>从 +X 轴出发、沿逆时针转过角度 θ（Y 轴向上时），停在单位圆上的点坐标是 <code>(cos θ, sin θ)</code>。因此 <code>cos</code> 是方向的 X 分量，<code>sin</code> 是 Y 分量。由勾股定理可得 <code>sin² θ + cos² θ = 1</code>，所以这个点永远是单位向量。</p>
        <p><code>tan θ = sin θ / cos θ</code> 是这条方向线的斜率。θ 接近 90° 时 cos 趋近 0，tan 趋向无穷大。二维旋转用的正是这对数值：旋转后的 X 轴是 <code>(cos θ, sin θ)</code>，Y 轴是 <code>(−sin θ, cos θ)</code>。</p>
      </section>

      <section id="trig-lab" className="lesson-section lesson-section--wide">
        <h2>三角函数实验</h2>
        <p>拖动圆上的点或滑块。左侧的 cos、sin 两段线和右侧波形上的两个圆点始终对应同一个角度。试试 90° 与 270°：cos 为 0，tan 没有定义。</p>
        <TrigLab />
      </section>

      <section id="polar-geometry" className="lesson-section">
        <h2>用极坐标生成圆形顶点</h2>
        <p>极坐标用“半径 r + 角度 θ”描述位置，转换成笛卡尔坐标是 <code>(r·cos θ, r·sin θ)</code>。把一圈均分成 N 份，每份与圆心组成一个三角形，就能用 <code>TRIANGLES</code> 画出圆。N 越大边缘越平滑，顶点数为 <code>3N</code>；后续学习索引绘制后可以复用重复的圆心顶点。</p>
        <CodeBlock label="vertex-data.ts">{circleCode}</CodeBlock>
      </section>

      <section id="atan2" className="lesson-section">
        <h2>atan2：从方向反求角度</h2>
        <p>已知方向 <code>(x, y)</code> 求角度时，单参数 <code>atan(y / x)</code> 会丢失象限信息：<code>(1, 1)</code> 与 <code>(−1, −1)</code> 的比值相同，而且 x = 0 时会除以零。<code>Math.atan2(y, x)</code> 同时检查两个分量的符号，返回 (−π, π] 范围内的准确角度。</p>
        <CodeBlock label="aim.ts">{atan2Code}</CodeBlock>
      </section>

      <section id="field-of-view" className="lesson-section">
        <h2>视野角通过 tan 决定缩放</h2>
        <p>透视相机的视野角（FOV）是视锥上下边缘的夹角。距离相机 1 个单位处，视锥半高是 <code>tan(fov / 2)</code>。透视矩阵乘以它的倒数，让视锥边缘恰好映射到裁剪空间的 ±1：FOV 越大，<code>1 / tan</code> 越小，同一物体在屏幕上越小。FOV 接近 180° 时 tan 趋向无穷，因此常用范围约为 30°–90°。</p>
        <CodeBlock label="perspective.ts">{perspectiveCode}</CodeBlock>
      </section>

      <section id="oscillation" className="lesson-section">
        <h2>用 sin 做平滑往返动画</h2>
        <p><code>sin(t)</code> 在 −1 与 1 之间平滑往返，每 <code>2π</code> 重复一次，非常适合呼吸灯、摆动和波浪。<code>0.5 + 0.5 · sin(t)</code> 把范围映射到 0…1，可以直接当作颜色或混合权重。时间由 JavaScript 每帧写入 Uniform，GPU 为每个片段计算同一条公式。</p>
        <CodeBlock label="fragment.glsl" language="glsl">{oscillationCode}</CodeBlock>
        <CodeBlock label="animate.ts">{timeUploadCode}</CodeBlock>
      </section>

      <section id="pitfalls" className="lesson-section">
        <h2>容易混淆的地方</h2>
        <Pitfalls items={[
          { question: <>为何 <code>Math.sin(90)</code> 不等于 1？</>, answer: <>90 被当作 90 弧度，约等于 14 圈多一点。先换算：<code>Math.sin(90 * Math.PI / 180)</code>。</> },
          { question: '同样的正角度，为何有的页面顺时针转、有的逆时针转？', answer: <>公式假定 Y 轴向上时，正角度逆时针转动。Canvas 像素坐标 Y 轴向下，同一公式在屏幕上表现为顺时针。<LessonLink lessonId="rotation-2d">二维旋转</LessonLink>页面正是这种情况。</> },
          { question: <><code>Math.atan2</code> 的参数顺序是什么？</>, answer: <>先 y 后 x：<code>Math.atan2(y, x)</code>。GLSL 的双参数 <code>atan(y, x)</code> 同样先 y 后 x。</> },
          { question: '动画运行很久后为何开始抖动？', answer: <>32 位 float 只有约 7 位有效数字。<code>u_time</code> 越大，小数部分越粗糙。周期动画可以先对周期取模再上传。</> },
        ]} />
      </section>

      <LessonPagination current="trigonometry" heading="接下来">sin、cos 已经能把角度变成方向。下一页反过来，用点积从两个方向求夹角，并用叉积找到同时垂直于它们的方向。</LessonPagination>
      <Footer links={[{ href: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-2d-rotation.html', label: '参考：WebGL2 二维旋转' }, { href: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-perspective.html', label: '参考：WebGL2 三维透视投影' }]} />
    </article>
  );
}

/* ---------- 3. 点积、叉积与坐标基 ---------- */

const lambertCode = `#version 300 es
precision highp float;

in vec3 v_normal;
uniform vec3 u_reverseLightDirection;  // 指向光源、已单位化，由 JavaScript 上传
uniform vec4 u_color;
out vec4 outColor;

void main() {
  vec3 normal = normalize(v_normal);
  // 两个单位向量的点积 = cos θ。背光面结果为负，截为 0。
  float light = max(dot(normal, u_reverseLightDirection), 0.0);
  outColor = vec4(u_color.rgb * light, u_color.a);
}`;

const faceNormalCode = `// 三角形 v0 → v1 → v2 逆时针排列时，叉积指向观察者一侧。
const edge1 = subtract(v1, v0);
const edge2 = subtract(v2, v0);
const faceNormal = normalize(cross(edge1, edge2));

// 交换参数顺序会得到相反方向：cross(b, a) = −cross(a, b)。`;

const lookAtCode = `export function lookAt4(cameraPosition: Vector3, target: Vector3, up: Vector3): Matrix4 {
  // 1. 相机看向 −Z，所以 Z 轴取“目标指向相机”的方向。
  const zAxis = normalize3(subtract3(cameraPosition, target));
  // 2. 叉积得到同时垂直于 up 与 Z 的右方向。
  const xAxis = normalize3(cross3(up, zAxis));
  // 3. 再用叉积得到严格垂直的上方向，修正调用者传入的近似 up。
  const yAxis = normalize3(cross3(zAxis, xAxis));
  // 三根单位轴写进前三列，相机位置写进平移列。
  return [
    xAxis[0], xAxis[1], xAxis[2], 0,
    yAxis[0], yAxis[1], yAxis[2], 0,
    zAxis[0], zAxis[1], zAxis[2], 0,
    cameraPosition[0], cameraPosition[1], cameraPosition[2], 1,
  ];
}`;

export function DotAndCrossArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <Hero title="点积、叉积与坐标基" lead={<>点积回答“两个方向有多一致”，叉积回答“哪个方向同时垂直于它们”。漫反射光照、背面剔除和相机坐标系都建立在这两种运算上。</>} meta={['dot', 'cross', '约 24 分钟']} />
      {toc}
      <MathChapterRoute current="dot-and-cross" />
      <LearningNote id="dot-cross-learning" items={[
        '用分量公式和夹角公式两种方式计算点积',
        '根据点积符号判断同向、垂直与反向',
        <>理解漫反射公式 <code>max(dot(N, L), 0.0)</code></>,
        '用叉积求垂直方向，理解右手定则与参数顺序',
        <>用二维叉积判断三角形绕序，联系 <code>CULL_FACE</code></>,
        <>用叉积构造 <code>lookAt</code> 的正交坐标基</>,
      ]} />

      <section id="dot-definition" className="lesson-section">
        <h2>点积的两种读法</h2>
        <p>代数读法：对应分量相乘再求和，<code>dot(a, b) = a.x·b.x + a.y·b.y + a.z·b.z</code>。这正是矩阵乘向量时“一行乘以整个向量”的计算。几何读法：<code>a · b = |a| |b| cos θ</code>，θ 是两个向量的夹角。</p>
        <p>把两种读法连起来：点积等于“b 在 a 方向上的投影长度 × a 的长度”。当 a、b 都是单位向量时，点积直接等于 <code>cos θ</code>，这就是光照前必须单位化的原因。</p>
        <FormulaCards items={[
          { badge: '> 0', title: '夹角小于 90°', formula: 'cos θ > 0', detail: '两个方向大体一致，例如表面朝向光源。' },
          { badge: '= 0', title: '互相垂直', formula: 'cos 90° = 0', detail: '常用来检验坐标轴、切线与法线是否正交。' },
          { badge: '< 0', title: '夹角大于 90°', formula: 'cos θ < 0', detail: '方向相背，例如背光面、背对相机的面。' },
        ]} />
      </section>

      <section id="dot-lab" className="lesson-section lesson-section--wide">
        <h2>点积实验</h2>
        <p>拖动 a、b。粗箭头是 b 在 a 方向上的投影，虚线垂直于 a。把 b 拖到分界线上，点积变为 0；拖到另一侧，点积变为负数，左侧色块显示的漫反射强度也降到 0。</p>
        <DotLab />
      </section>

      <section id="dot-lighting" className="lesson-section">
        <h2>点积决定漫反射亮度</h2>
        <p>光线越倾斜，同一束光铺开的面积越大，单位面积接收到的能量越少，比例正好是 <code>cos θ</code>（Lambert 余弦定律）。片段着色器把插值后的法线 N 和指向光源的方向 L 单位化，点积就是亮度系数；负值表示表面背对光源，用 <code>max</code> 截为 0。</p>
        <CodeBlock label="fragment.glsl" language="glsl">{lambertCode}</CodeBlock>
      </section>

      <section id="cross-definition" className="lesson-section">
        <h2>叉积得到垂直方向</h2>
        <p>三维叉积 <code>cross(a, b) = (a.y·b.z − a.z·b.y, a.z·b.x − a.x·b.z, a.x·b.y − a.y·b.x)</code>。结果同时垂直于 a 和 b；长度为 <code>|a| |b| sin θ</code>，等于两者张成的平行四边形面积；方向按右手定则：右手四指从 a 弯向 b，拇指指向结果。</p>
        <p>叉积的顺序会改变方向：<code>a × b = −(b × a)</code>。a、b 平行时 sin θ = 0，结果是零向量。只关心二维平面时，前两个分量恒为 0，只剩 Z 分量 <code>a.x·b.y − a.y·b.x</code>，它的符号说明 b 在 a 的逆时针一侧还是顺时针一侧。</p>
        <CodeBlock label="face-normal.ts">{faceNormalCode}</CodeBlock>
      </section>

      <section id="winding-lab" className="lesson-section lesson-section--wide">
        <h2>二维叉积决定绕序与面剔除</h2>
        <p>光栅化前，WebGL 在窗口坐标中计算每个三角形的有向面积。<code>gl.frontFace</code> 默认 <code>CCW</code>：逆时针三角形是正面。启用 <code>CULL_FACE</code> 且 <code>cullFace</code> 保持默认 <code>BACK</code> 时，顺时针三角形会在生成片段前被丢弃。</p>
        <WindingLab />
      </section>

      <section id="basis" className="lesson-section">
        <h2>用叉积构造正交坐标基</h2>
        <p>三根互相垂直、长度为 1 的轴组成正交基（orthonormal basis）。把它们写进矩阵前三列，就得到一个只包含旋转的变换。相机的 <code>lookAt</code> 只知道“看向哪里”和“大致的上方”，两次叉积就能补全三根严格垂直的轴。</p>
        <CodeBlock label="look-at.ts">{lookAtCode}</CodeBlock>
        <RelatedLessons items={[
          { id: 'camera-3d', badge: '3D', title: '三维相机', detail: '用 lookAt 与逆矩阵建立视图空间' },
          { id: 'orthographic-3d', badge: '3D', title: '三维正射投影', detail: '面剔除与深度测试的实际效果' },
        ]} />
      </section>

      <section id="pitfalls" className="lesson-section">
        <h2>容易混淆的地方</h2>
        <Pitfalls items={[
          { question: '为何模型放大后光照变亮了？', answer: <>点积前没有单位化法线，<code>dot(N, L)</code> 同时乘上了法线长度。片段着色器中先 <code>normalize</code> 再计算。</> },
          { question: '法线朝向物体内部怎么办？', answer: '通常是叉积参数顺序或三角形顶点顺序反了。统一使用逆时针绕序，并按 cross(v1 − v0, v2 − v0) 计算。' },
          { question: <>相机直视正上方时画面为何消失？</>, answer: <>此时视线与 <code>up = (0, 1, 0)</code> 平行，<code>cross(up, zAxis)</code> 为零向量，单位化失败。需要在这种情况下换用另一个 up，例如 <code>(0, 0, 1)</code>。</> },
          { question: '二维叉积为何是一个数？', answer: '两个二维向量的叉积只可能沿 Z 轴，因此只保留 Z 分量这一个标量。它的绝对值是平行四边形面积，符号表示旋转方向。' },
        ]} />
      </section>

      <LessonPagination current="dot-and-cross" heading="接下来">点积已经出现在矩阵乘法的每一行里，叉积构造出的坐标轴正是矩阵的列。下一页用行、列和齐次坐标正式组织这些运算。</LessonPagination>
      <Footer links={[{ href: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-lighting-directional.html', label: '参考：WebGL2 三维方向光源' }, { href: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-camera.html', label: '参考：WebGL2 三维相机' }]} />
    </article>
  );
}

/* ---------- 5. 逆矩阵、转置与法线矩阵 ---------- */

const inverseTrsCode = `// 相机矩阵：先旋转，再移动到世界中的位置。
const camera = multiply4(translation4(px, py, pz), yRotation4(angle));

// 逆矩阵按相反顺序撤销：先移回原点，再反向旋转。
// (T × R)⁻¹ = R⁻¹ × T⁻¹
const view = multiply4(yRotation4(-angle), translation4(-px, -py, -pz));

// 通用写法：任何可逆矩阵都可以直接求逆，每帧在 CPU 上计算一次即可。
const viewGeneral = inverse4(camera);`;

const normalMatrixCode = `import { inverse3, transpose3, upperLeft3 } from './mathBasics';

// 1. 取左上 3×3：法线是方向，平移列与它无关。
// 2. 求逆撤销缩放比例；3. 转置让结果作用在法线上。
const inverse = inverse3(upperLeft3(worldMatrix));
if (inverse) {
  const normalMatrix = transpose3(inverse);
  gl.uniformMatrix3fv(normalMatrixLocation, false, new Float32Array(normalMatrix));
}
// 行列式为 0（某轴缩放为 0）时物体已被压扁，直接跳过绘制。`;

const normalVertexCode = `#version 300 es
layout(location = 0) in vec4 a_position;
layout(location = 1) in vec3 a_normal;

uniform mat4 u_worldViewProjection;
uniform mat3 u_normalMatrix;   // (world 左上 3×3)⁻¹ 的转置

out vec3 v_normal;

void main() {
  gl_Position = u_worldViewProjection * a_position;
  // 方向与长度都可能变化，片段着色器会重新 normalize。
  v_normal = u_normalMatrix * a_normal;
}`;

export function InverseAndNormalsArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <Hero title="逆矩阵、转置与法线矩阵" lead={<>逆矩阵撤销变换，转置交换行列。二者组合成法线矩阵，保证模型被非均匀缩放后，表面法线仍然垂直于表面。本篇从行列式出发，逐步推导光照前必须理解的 normal matrix。</>} meta={['inverse', 'transpose', '约 26 分钟']} />
      {toc}
      <MathChapterRoute current="inverse-and-normals" />
      <LearningNote id="inverse-learning" items={[
        <>说明逆矩阵的含义：<code>M⁻¹ × M = I</code></>,
        '用行列式判断矩阵能否求逆，并读出面积缩放与镜像',
        <>写出组合矩阵的逆：<code>(A × B)⁻¹ = B⁻¹ × A⁻¹</code></>,
        '知道旋转矩阵的逆等于它的转置',
        <>解释非均匀缩放为何让法线偏斜，以及 <code>(M⁻¹)ᵀ</code> 怎样修正</>,
        <>在 WebGL2 中计算并上传 <code>mat3</code> 法线矩阵</>,
      ]} />

      <section id="inverse-undo" className="lesson-section">
        <h2>逆矩阵撤销一次变换</h2>
        <p>如果 M 把局部坐标带到世界坐标，逆矩阵 <code>M⁻¹</code> 就把世界坐标带回局部坐标，二者相乘得到单位矩阵 I。基础变换的逆可以直接写出来，不需要通用算法。</p>
        <FormulaCards items={[
          { badge: 'T', title: '平移的逆', formula: 'T(tx, ty)⁻¹ = T(−tx, −ty)', detail: '反方向移动同样的距离。' },
          { badge: 'R', title: '旋转的逆', formula: 'R(θ)⁻¹ = R(−θ) = R(θ)ᵀ', detail: '反向旋转；稍后会看到它也等于转置。' },
          { badge: 'S', title: '缩放的逆', formula: 'S(sx, sy)⁻¹ = S(1/sx, 1/sy)', detail: '缩放为 0 时无法恢复，因此没有逆。' },
        ]} />
        <p>三维相机页面的 View 矩阵正是 Camera 矩阵的逆：相机向前移动，等价于整个世界向后移动。</p>
      </section>

      <section id="determinant" className="lesson-section">
        <h2>行列式判断能否撤销</h2>
        <p>2×2 矩阵的两列是新的 X 轴 <code>(a, b)</code> 和新的 Y 轴 <code>(c, d)</code>，行列式 <code>det = a·d − c·b</code>。它等于单位正方形变换后的有向面积，也就是上一页二维叉积的同一个公式。三维中行列式是单位立方体变换后的有向体积。</p>
        <FormulaCards items={[
          { badge: '|det| ≠ 1', title: '面积缩放', formula: 'det = 2 → 面积 × 2', detail: '纯旋转的行列式恒为 1。' },
          { badge: '< 0', title: '发生镜像', formula: 'scale(−1, 1)', detail: '图形被翻转，三角形绕序随之反转。' },
          { badge: '= 0', title: '不可逆', formula: '平面 → 直线', detail: '多个点被压到同一位置，无法区分原来是谁。' },
        ]} />
      </section>

      <section id="determinant-lab" className="lesson-section lesson-section--wide">
        <h2>行列式实验</h2>
        <p>拖动两根轴的终点，浅色方框是原始单位正方形，彩色平行四边形是变换结果。把两根轴拖到同一条直线上，行列式变为 0，控制区里的 <code>M⁻¹</code> 随之消失；把 X 轴拖到 Y 轴另一侧，面积变为负数，表示发生了镜像。</p>
        <DeterminantLab />
      </section>

      <section id="inverse-order" className="lesson-section">
        <h2>组合矩阵的逆要反转顺序</h2>
        <p>先穿袜子再穿鞋，脱的时候要先脱鞋。矩阵同理：<code>(A × B)⁻¹ = B⁻¹ × A⁻¹</code>。相机矩阵“先旋转、再平移”，它的逆就是“先反向平移、再反向旋转”。通用的 <code>inverse4</code> 可以处理任何可逆矩阵，但计算量较大，应在 JavaScript 中每帧每个相机计算一次，避免放进顶点着色器对每个顶点重复执行。</p>
        <CodeBlock label="view-matrix.ts">{inverseTrsCode}</CodeBlock>
      </section>

      <section id="transpose" className="lesson-section">
        <h2>转置交换行与列</h2>
        <p>转置 <code>Mᵀ</code> 把第 i 行第 j 列的元素移到第 j 行第 i 列。旋转矩阵的各列互相垂直且长度为 1，称为正交矩阵，它的逆恰好等于转置。求一个纯旋转的逆只需交换行列，不需要任何除法。</p>
        <p>存储层面需要校正一条旧资料中的说法：WebGL1 要求 <code>uniformMatrix*fv</code> 的 <code>transpose</code> 参数必须为 <code>false</code>；WebGL2 允许传 <code>true</code>，让 GPU 按行读取数组。本站的数组已按列存放，因此仍然传 <code>false</code>。GLSL ES 3.00 还新增了内置的 <code>transpose()</code> 与 <code>inverse()</code>，GLSL ES 1.00 中没有这两个函数。</p>
      </section>

      <section id="normal-problem" className="lesson-section">
        <h2>非均匀缩放会让法线歪掉</h2>
        <p>切线沿着表面，它是表面上两点之差，用模型矩阵 M 变换总是正确的。法线则必须在变换后继续垂直于切线：<code>n′ · t′ = 0</code>。假设法线用某个矩阵 N 变换，推导如下：</p>
        <ol className="math-derivation">
          <li><span>已知</span><code>nᵀ t = 0</code><small>变换前法线垂直于切线</small></li>
          <li><span>要求</span><code>(N n)ᵀ (M t) = nᵀ Nᵀ M t = 0</code><small>变换后仍然垂直</small></li>
          <li><span>令</span><code>Nᵀ M = I</code><small>这样第 2 式就退化成第 1 式</small></li>
          <li><span>得到</span><code>N = (M⁻¹)ᵀ</code><small>法线矩阵：逆矩阵的转置</small></li>
        </ol>
        <p>只有旋转和均匀缩放时，<code>(M⁻¹)ᵀ</code> 与 M 只差一个整体比例，单位化后方向相同，所以许多入门示例直接用 M 也“看起来正确”。一旦出现 <code>scale(3, 1, 1)</code> 这样的非均匀缩放，差别就会显现。</p>
      </section>

      <section id="normal-lab" className="lesson-section lesson-section--wide">
        <h2>法线矩阵实验</h2>
        <p>单位圆被缩放成椭圆，灰色短线是每个采样点的切线。红色箭头直接用 M 变换法线，绿色箭头使用 <code>(M⁻¹)ᵀ</code>。调大 X、Y 缩放的差距，观察红色箭头怎样偏离垂直；点击“均匀缩放”，两种箭头重合。</p>
        <NormalMatrixLab />
      </section>

      <section id="normal-matrix-webgl" className="lesson-section">
        <h2>在 WebGL2 中使用法线矩阵</h2>
        <p>法线矩阵每个物体计算一次：取模型矩阵左上角 3×3，求逆，再转置，作为 <code>mat3</code> Uniform 上传。顶点着色器用它变换 <code>a_normal</code>，片段着色器在插值后重新单位化。如果光照在视图空间中计算，就对 <code>view × world</code> 求法线矩阵。</p>
        <CodeBlock label="normal-matrix.ts">{normalMatrixCode}</CodeBlock>
        <CodeBlock label="vertex.glsl" language="glsl">{normalVertexCode}</CodeBlock>
        <p>也可以在着色器中直接写 <code>transpose(inverse(mat3(u_world)))</code>，结果相同，但每个顶点都会重复求逆。对于同一次 draw call 内保持不变的矩阵，在 CPU 端计算一次更高效。</p>
      </section>

      <section id="pitfalls" className="lesson-section">
        <h2>容易混淆的地方</h2>
        <Pitfalls items={[
          { question: <>用 <code>mat4</code> 直接乘法线可以吗？</>, answer: <>可以，但法线必须补 <code>W = 0</code>，否则平移会混进方向。更清晰的做法是只使用左上角 <code>mat3</code>。</> },
          { question: '负缩放（镜像）之后，为何正面被剔除了？', answer: <>行列式为负时三角形绕序翻转，原本逆时针的正面变成了顺时针。镜像物体绘制时需要临时切换 <code>gl.frontFace(gl.CW)</code>，或关闭面剔除。</> },
          { question: '某个轴缩放为 0 时会发生什么？', answer: '行列式为 0，逆矩阵不存在，强行计算会得到无穷大或 NaN。物体已经被压扁成面或线，可以直接跳过绘制。' },
          { question: '法线矩阵算好了，为何片段着色器里还要 normalize？', answer: '法线矩阵保证方向正确，但不保证长度为 1；插值也会改变长度。点积光照前始终重新单位化。' },
        ]} />
      </section>

      <LessonPagination current="inverse-and-normals" heading="数学模块完成">向量、三角函数、点积叉积、矩阵与法线矩阵已经齐备。接下来进入图像处理与二维、三维变换，这些工具会在每一章反复出现。</LessonPagination>
      <Footer links={[{ href: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-lighting-directional.html', label: '参考：WebGL2 三维方向光源（逆转置矩阵）' }, { href: 'https://registry.khronos.org/webgl/specs/latest/2.0/', label: 'WebGL 2.0 规范' }]} />
    </article>
  );
}
