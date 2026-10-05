import { ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

import type { LessonId } from '../navigation';
import { CodeBlock } from './CodeBlock';
import { HomogeneousWSection } from './HomogeneousWSection';
import { LessonLink } from './LessonLink';
import { LessonPagination } from './LessonPagination';
import { MathChapterRoute } from './MathChapterRoute';
import { AtanLab, DeterminantLab, DotLab, FovFigure, NormalMatrixLab, PointVectorDiagram, RadianDiagram, TrigLab, TurnLab, VectorLab, WindingLab } from './MathLabs';
import { PolarLab } from './PolarLab';

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
      <Hero title="向量、长度与单位化" lead={<>顶点位置、移动速度、表面法线和光线方向都用向量表示。本篇先区分位置与方向，解释 w 怎样参与平移，再讲清加减、缩放、长度与单位化，以及它们在 GLSL 中的写法。</>} meta={['Vector', 'normalize', '约 22 分钟']} />
      {toc}
      <MathChapterRoute current="vectors" />
      <LearningNote id="vectors-learning" items={[
        '区分位置（点）与方向（向量），用平移实验理解 w = 1 与 w = 0',
        '用“首尾相接”理解向量加法，用“终点减起点”得到方向',
        '计算二维、三维向量的长度以及两点距离',
        '说明单位化保留什么、丢弃什么，并正确处理零向量',
        <>在 GLSL 中使用 <code>length</code>、<code>distance</code> 与 <code>normalize</code></>,
      ]} />

      <section id="points-and-vectors" className="lesson-section">
        <h2>点与向量写法相同，含义不同</h2>
        <p>点和向量都写成 <code>(x, y)</code> 或 <code>(x, y, z)</code>。点回答“在哪里”，例如顶点位置；向量回答“朝哪走、走多远”，例如速度、法线和光照方向。两点相减得到向量：<code>B − A</code> 是从 A 指向 B 的位移。</p>
        <PointVectorDiagram />
        <FormulaCards items={[
          { badge: 'P', title: '点 + 向量 = 点', formula: 'position + velocity', detail: '从某个位置出发，沿位移到达新位置。' },
          { badge: 'V', title: '点 − 点 = 向量', formula: 'target − eye', detail: '两个位置之差给出方向与距离。' },
          { badge: 'w', title: '齐次分量', formula: '位置 w = 1；方向 w = 0', detail: '把三维 xyz 扩展成四个分量，让矩阵按用途处理平移。' },
        ]} />
      </section>

      <HomogeneousWSection />

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
          { question: '方向向量误用了 w = 1 会怎样？', answer: '平移项会混进方向。例如速度 (1, 0, 0) 经过 (100, 0, 0) 的平移后，会错误地变为 (101, 0, 0)。普通方向用 w = 0；法线遇到非均匀缩放时，还需要逆转置法线矩阵。' },
          { question: 'NDC 中长度为 1 的向量，在屏幕上一定一样长吗？', answer: '透视除法后的 NDC 可视范围为每轴 −1…+1。Canvas 通常宽于高，同样 1 个单位在水平方向对应更多像素。只有在同一个、各轴等比的坐标空间里比较长度才有意义，投影矩阵中的 aspect 用于补偿宽高比。' },
          { question: '如何安全地单位化？', answer: <>先检查长度是否接近 0。JavaScript 中返回 <code>null</code> 或回退到默认方向；GLSL 中对零向量调用 <code>normalize</code> 的结果未定义，应在上传数据前排除这种情况。</> },
        ]} />
      </section>

      <LessonPagination current="vectors" heading="接下来">向量已经能表示方向与长度。下一页用单位圆把角度转换成方向，建立 sin、cos 与弧度之间的直觉。</LessonPagination>
      <Footer links={[
        { href: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-camera.html', label: '参考：WebGL2 三维相机（向量运算）' },
        { href: 'https://webgl2fundamentals.org/webgl/lessons/webgl-3d-perspective.html', label: '参考：透视投影与 w' },
        { href: 'https://webgl2fundamentals.org/webgl/lessons/webgl-3d-perspective-correct-texturemapping.html', label: '参考：w 与透视正确插值' },
        { href: 'https://registry.khronos.org/OpenGL/specs/es/3.0/es_spec_3.0.pdf#page=95', label: '规范：透视除法（§2.13）' },
      ]} />
    </article>
  );
}

/* ---------- 2. 角度、弧度与三角函数 ---------- */

function MathTable({ caption, head, rows }: { caption: string; head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="math-table">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{head.map((cell) => <th key={cell} scope="col">{cell}</th>)}</tr></thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, index) => index === 0 ? <th key={index} scope="row">{cell}</th> : <td key={index}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const quadrants = [
  { id: 'i', name: '第一象限', range: '0°–90°', cos: '+', sin: '+' },
  { id: 'ii', name: '第二象限', range: '90°–180°', cos: '−', sin: '+' },
  { id: 'iii', name: '第三象限', range: '180°–270°', cos: '−', sin: '−' },
  { id: 'iv', name: '第四象限', range: '270°–360°', cos: '+', sin: '−' },
];

function QuadrantGrid() {
  return (
    <ul className="math-quadrants" aria-label="四个象限中 cos 与 sin 的符号">
      {quadrants.map((quadrant) => (
        <li key={quadrant.id} data-quadrant={quadrant.id}>
          <strong>{quadrant.name}</strong>
          <span>{quadrant.range}</span>
          <code className="math-tone--a">cos {quadrant.cos}</code>
          <code className="math-tone--b">sin {quadrant.sin}</code>
        </li>
      ))}
    </ul>
  );
}

const angleUnitsCode = `// 只在界面与计算的边界换算：读入时转成弧度，显示时再转回度数。
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const slider = document.querySelector<HTMLInputElement>('#rotation')!;
const label = document.querySelector<HTMLOutputElement>('#rotation-label')!;

// 之后的状态、Uniform 和矩阵参数都保存弧度。
let rotation = slider.valueAsNumber * DEG_TO_RAD;

// 角速度 ω 的单位是 rad/s：每帧转过 ω × 经过的秒数。
const angularSpeed = Math.PI; // 每秒半圈

function update(deltaSeconds: number) {
  // 对 2π 取模，角度始终保持在一圈之内。
  rotation = (rotation + angularSpeed * deltaSeconds) % (Math.PI * 2);
  gl.useProgram(program);
  gl.uniform1f(rotationLocation, rotation); // 着色器中的 sin、cos 直接使用
  label.value = \`\${(rotation * RAD_TO_DEG).toFixed(0)}°\`;
}`;

const oscillationCode = `#version 300 es
precision highp float;

const float TAU = 6.283185307179586;  // 2π；GLSL 没有内置圆周率常量

uniform float u_time;   // 秒，由 JavaScript 每帧上传，已对周期取模
out vec4 outColor;

void main() {
  // A = 0.5、c = 0.5：把 sin 的 −1…1 映射到 0…1。
  // f = 0.5 Hz：ω = 2π × 0.5，每 2 秒完成一次往返。
  float pulse = 0.5 + 0.5 * sin(TAU * 0.5 * u_time);
  outColor = vec4(vec3(0.08, 0.62, 0.79) * pulse, 1.0);
}`;

const timeUploadCode = `const period = 2; // 秒，对应片段着色器中的 f = 0.5 Hz

function frame(now: DOMHighResTimeStamp) {
  // 对周期取模：u_time 始终小于 2，长时间运行也保留足够的小数精度。
  const seconds = (now / 1000) % period;
  gl.useProgram(program);
  gl.uniform1f(timeLocation, seconds);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);`;

const circleCode = `// 把圆切成 segments 个扇形，每个扇形是 1 个三角形（圆心 + 圆周上相邻两点）。
function createCircleVertices(radius: number, segments: number): Float32Array {
  const vertices = new Float32Array(segments * 3 * 2);
  for (let i = 0; i < segments; i += 1) {
    const angle0 = (i / segments) * Math.PI * 2;        // 弧度：0 → 2π
    const angle1 = ((i + 1) / segments) * Math.PI * 2;  // 最后一段的 angle1 = 2π，回到起点
    vertices.set([
      0, 0,
      radius * Math.cos(angle0), radius * Math.sin(angle0),
      radius * Math.cos(angle1), radius * Math.sin(angle1),
    ], i * 6);
  }
  return vertices;
}

const circle = createCircleVertices(0.8, 48);  // 48 × 3 = 144 个顶点，共 1152 字节

gl.bindVertexArray(circleVao);                 // 下面的读取规则记录进这个 VAO
gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer);
gl.bufferData(gl.ARRAY_BUFFER, circle, gl.STATIC_DRAW);
gl.enableVertexAttribArray(positionLocation);
// 每个顶点 2 个 float：stride = 8 字节，offset = 0 字节。
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 8, 0);

gl.useProgram(program);
gl.drawArrays(gl.TRIANGLES, 0, circle.length / 2);`;

const atan2Code = `// 让箭头指向鼠标：先求方向向量，再求角度。
// Canvas 像素坐标的 Y 轴向下，得到的正角度在屏幕上表现为顺时针。
const dx = mouseX - arrowX;
const dy = mouseY - arrowY;

// 参数顺序是 (y, x)。atan2 同时检查两个分量的符号，返回 −π…π，四个象限都能区分。
const angle = Math.atan2(dy, dx);

// 两个单位向量求夹角：浮点误差可能让点积略大于 1，先限制范围，否则 acos 返回 NaN。
const cosine = Math.min(1, Math.max(-1, dot3(normalA, normalB)));
const between = Math.acos(cosine); // 0…π，只有夹角大小，不区分转向

// GLSL：float angle = atan(dy, dx);  float between = acos(clamp(d, -1.0, 1.0));`;

const turnCode = `// 把任意角度差折回 −π…π：sin、cos 只保留方向，atan2 取出该方向上绝对值最小的角度。
function shortestAngle(from: number, to: number): number {
  const delta = to - from;
  return Math.atan2(Math.sin(delta), Math.cos(delta));
}

// 每帧最多转 turnSpeed × deltaSeconds 弧度，平滑地转向目标。
function turnToward(heading: number, target: number, turnSpeed: number, deltaSeconds: number): number {
  const delta = shortestAngle(heading, target);
  const maxStep = turnSpeed * deltaSeconds;
  return heading + Math.min(maxStep, Math.max(-maxStep, delta));
}

// 两个角度之间插值同理：沿最短差值前进，t 取 0…1。
const lerpAngle = (from: number, to: number, t: number) => from + shortestAngle(from, to) * t;`;

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

const colorWheelCode = `#version 300 es
precision highp float;

const float PI = 3.141592653589793;  // GLSL ES 3.00 没有内置圆周率常量

in vec2 v_uv;          // 0…1 的坐标，由顶点着色器输出并经光栅化插值
uniform float u_time;  // 秒，由 JavaScript 每帧上传
out vec4 outColor;

void main() {
  vec2 p = v_uv * 2.0 - 1.0;           // 以画面中心为原点，范围 −1…1
  float angle = atan(p.y, p.x);        // 双参数版本，相当于 atan2，返回 −π…π
  float t = angle / (2.0 * PI) + 0.5;  // 映射到 0…1：绕中心转一圈，t 走完一次

  // cos 对 vec3 逐分量计算：R、G、B 的相位各差 1/3 圈（120°），u_time 让色环旋转。
  vec3 color = 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.0, 1.0, 2.0) / 3.0) + u_time);
  outColor = vec4(color, 1.0);
}`;

export function TrigonometryArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <Hero title="角度、弧度与三角函数" lead={<>旋转、圆形几何、视野角和周期动画都依赖三角函数。本篇从弧长出发定义弧度，在单位圆上读出 <code>sin</code>、<code>cos</code>、<code>tan</code>，再把它们放进 WebGL2：生成圆形顶点、用 <code>atan2</code> 从方向反求角度、驱动周期动画，并决定透视投影的视野。</>} meta={['Radians', 'Unit Circle', 'atan2', '约 35 分钟']} />
      {toc}
      <MathChapterRoute current="trigonometry" />
      <LearningNote id="trig-learning" items={[
        '用“弧长 ÷ 半径”定义弧度，说明代码为何统一使用弧度',
        <>从单位圆读出 <code>cos</code>、<code>sin</code>、<code>tan</code>，判断四个象限中的符号与周期</>,
        <>用 <code>A · sin(ω·t + φ) + c</code> 控制周期动画的幅度、速度与相位</>,
        '用极坐标生成圆形顶点，追踪角度从滑块经 Uniform 到达顶点着色器的路径',
        <>用 <code>atan2</code> 从方向求角度，并用最短角度差跨过 ±180° 边界</>,
        <>理解透视投影里 <code>tan(fov / 2)</code> 的作用</>,
      ]} />

      <section id="radian-definition" className="lesson-section">
        <h2>弧度用弧长度量角度</h2>
        <p>角度描述“转了多少”。度数把一圈约定为 360 份；弧度（radian）直接用圆来量：圆心角所对的弧长除以半径，就是这个角的弧度值。弧长恰好等于半径时，角度为 1 弧度，约 57.3°。</p>
        <RadianDiagram />
        <p>整圆周长是 <code>2πr</code>，除以半径得到 <code>2π</code>，所以一圈 = 2π 弧度 = 360°，半圈 = π = 180°。在半径为 1 的单位圆上，弧度值就是沿圆周走过的长度，后面的实验会一直画出这段弧。</p>
        <FormulaCards items={[
          { badge: '° → rad', title: '度数换算为弧度', formula: 'rad = deg × π / 180', detail: <>反向换算乘 <code>180 / π</code>；GLSL 内置 <code>radians()</code> 与 <code>degrees()</code>。</> },
          { badge: 's', title: '弧长', formula: 's = r · θ', detail: 'θ 使用弧度时，弧长等于半径乘角度，公式里没有换算系数。' },
          { badge: '1 rad', title: '一弧度', formula: '180° / π ≈ 57.3°', detail: '一圈约 6.28 弧度。代码中直接写 2π，比手写小数更精确。' },
        ]} />
      </section>

      <section id="why-radians" className="lesson-section">
        <h2>为什么代码统一使用弧度</h2>
        <p>弧度让角度与长度共用一套单位。圆周运动中，弧长 <code>s = r·θ</code>、线速度 <code>v = r·ω</code> 都可以直接相乘，其中角速度（angular velocity）ω 表示每秒转过的弧度。角度很小时还有 <code>sin θ ≈ θ</code>，例如 <code>sin(0.01) ≈ 0.0099998</code>；这类近似与求导公式也只在弧度下保持简洁。因此 JavaScript 的 <code>Math.sin</code>、<code>Math.cos</code>、<code>Math.atan2</code> 与 GLSL 的 <code>sin</code>、<code>cos</code>、<code>atan</code> 都以弧度作为输入或返回值。</p>
        <p>度数更适合给人阅读，例如滑块、配置文件和调试面板。实践中只在界面与计算的边界换算一次：读到度数后立即乘 <code>π / 180</code>，之后的状态、Uniform 和矩阵参数都保持弧度，需要显示时再换回度数。</p>
        <CodeBlock label="angle-units.ts">{angleUnitsCode}</CodeBlock>
        <p>GLSL 没有内置的圆周率常量，需要时在着色器顶部写 <code>const float PI = 3.141592653589793;</code>。<code>radians(60.0)</code> 等价于 <code>60.0 * PI / 180.0</code>，适合着色器里固定不变的角度。</p>
      </section>

      <section id="unit-circle" className="lesson-section">
        <h2>单位圆把角度变成方向</h2>
        <p>从 +X 轴出发、沿逆时针转过角度 θ（Y 轴向上时），停在单位圆上的点坐标是 <code>(cos θ, sin θ)</code>。因此 <code>cos</code> 是方向的 X 分量，<code>sin</code> 是 Y 分量。由勾股定理可得 <code>sin² θ + cos² θ = 1</code>，这个点总是单位向量；反过来，上一篇得到的任何二维单位向量，都能写成某个角度的 <code>(cos θ, sin θ)</code>。</p>
        <QuadrantGrid />
        <p>角度继续增大，点依次经过四个象限，cos 与 sin 的符号随之变化。转满一圈回到起点，所以 θ 与 θ + 2π 表示同一方向，sin 和 cos 的周期都是 2π。负角度表示顺时针转动，<code>−90°</code> 与 <code>270°</code> 指向同一处。对称关系还给出 <code>cos(−θ) = cos θ</code>、<code>sin(−θ) = −sin θ</code>，以及 <code>sin(θ + π/2) = cos θ</code>：两条波形形状相同，只差四分之一个周期。</p>
        <p><code>tan θ = sin θ / cos θ</code> 是这条方向线的斜率。把方向线延长到竖线 <code>x = 1</code>，交点高度就是 <code>tan θ</code>。θ 接近 90° 时方向线越来越陡，交点趋向无穷远；θ 等于 90° 或 270° 时 cos 为 0，tan 没有定义。方向反转 180° 后斜率不变，所以 tan 的周期是 π。</p>
        <MathTable caption="常用角度的弧度与三角函数值" head={['角度', '弧度', 'cos', 'sin', 'tan']} rows={[
          ['0°', '0', '1', '0', '0'],
          ['30°', 'π/6', '√3/2 ≈ 0.866', '1/2', '√3/3 ≈ 0.577'],
          ['45°', 'π/4', '√2/2 ≈ 0.707', '√2/2 ≈ 0.707', '1'],
          ['60°', 'π/3', '1/2', '√3/2 ≈ 0.866', '√3 ≈ 1.732'],
          ['90°', 'π/2', '0', '1', '未定义'],
          ['180°', 'π', '−1', '0', '0'],
          ['270°', '3π/2', '0', '−1', '未定义'],
        ]} />
        <p>二维旋转用的正是这对数值：X 轴单位向量 <code>(1, 0)</code> 转过 θ 后变成 <code>(cos θ, sin θ)</code>，Y 轴 <code>(0, 1)</code> 变成 <code>(−sin θ, cos θ)</code>。<LessonLink lessonId="rotation-2d">二维旋转</LessonLink>页会把这两根轴组合成旋转公式。</p>
      </section>

      <section id="trig-lab" className="lesson-section lesson-section--wide">
        <h2>三角函数实验</h2>
        <p>拖动圆上的点或滑块。单位圆上的 cos、sin 两段线与波形图上的两个圆点始终对应同一个角度；沿圆周加粗的弧就是弧长，它的数值与弧度相同。勾选“显示 tan θ”，观察方向线与 <code>x = 1</code> 的交点：接近 90° 时交点冲出画面，越过 90° 后从下方重新出现。</p>
        <TrigLab />
      </section>

      <section id="oscillation" className="lesson-section">
        <h2>用 sin 做周期动画</h2>
        <p>把波形图的横轴从角度换成时间，<code>sin</code> 就成了动画曲线：数值在 −1 与 1 之间平滑往返，每 2π 重复一次，适合呼吸灯、摆动和波浪。完整写法是 <code>y = A · sin(ω · t + φ) + c</code>，四个参数分别控制幅度、快慢、起点和中心。</p>
        <FormulaCards items={[
          { badge: 'A', title: '振幅与中心', formula: 'A · sin(…) + c', detail: <>A 决定往返幅度，c 平移中心。<code>0.5 + 0.5 · sin</code> 把 −1…1 映射到 0…1，可直接作为颜色或混合权重。</> },
          { badge: 'ω', title: '角频率', formula: 'ω = 2π · f', detail: 'f 是每秒循环次数（Hz），ω 是每秒转过的弧度，周期 T = 1 / f。' },
          { badge: 'φ', title: '相位', formula: 'sin(ω · t + φ)', detail: '让不同物体处在周期的不同位置。φ 随位置变化（例如 k·x）时，整体会形成一道移动的波。' },
        ]} />
        <p>时间由 JavaScript 每帧写入 Uniform，GPU 为每个片段计算同一条公式。<code>u_time</code> 在上传前先对周期取模：32 位 float 只有约 7 位有效数字，数值越大，小数部分越粗糙。</p>
        <CodeBlock label="fragment.glsl" language="glsl">{oscillationCode}</CodeBlock>
        <CodeBlock label="animate.ts">{timeUploadCode}</CodeBlock>
      </section>

      <section id="polar-geometry" className="lesson-section">
        <h2>用极坐标生成圆形顶点</h2>
        <p>极坐标（polar coordinates）用“半径 r + 角度 θ”描述位置，转换成笛卡尔坐标是 <code>(r·cos θ, r·sin θ)</code>。把一圈均分成 N 份，第 i 个圆周点的角度是 <code>i / N × 2π</code>；每份与圆心组成一个三角形，就能用 <code>TRIANGLES</code> 画出圆。N 越大，多边形越接近圆。</p>
        <p>数据量：每个扇形 3 个顶点，每个顶点 2 个 float，共 <code>3N × 2 × 4 = 24N</code> 字节，N = 48 时为 1152 字节。下面的写法在 JavaScript 中算好 x、y，一次上传后保持不变，适合静态几何。WebGL2 也支持 <code>gl.TRIANGLE_FAN</code>：圆心加 N + 1 个圆周点即可，共 N + 2 个顶点。</p>
        <CodeBlock label="circle-vertices.ts">{circleCode}</CodeBlock>
      </section>

      <section id="polar-lab" className="lesson-section lesson-section--wide">
        <h2>在顶点着色器中计算 sin 与 cos</h2>
        <p>如果扇形的角度要随滑块或时间变化，每次都在 CPU 上重算并重新上传整份 Buffer 会很浪费。下面的实验把三角函数移到顶点着色器：Buffer 只保存每个顶点的 <code>(t, ring)</code>，其中 <code>t</code> 是 0…1 的角度进度，<code>ring</code> 区分圆心（0）与圆周（1）；起始角、扫掠角和波形参数作为 Uniform 上传，GPU 为每个顶点计算 <code>θ = θ₀ + t × sweep</code>，再用 <code>cos</code>、<code>sin</code> 得到位置。</p>
        <PolarLab />
        <p>观察读数中的 <code>bufferData</code> 次数：只有分段数 N 改变顶点数量时才会重新上传，拖动角度和波形参数只更新几个 Uniform。线框使用同一个 VAO 再画一次，图元模式换成 <code>LINE_STRIP</code>，相邻顶点依次连线，正好经过每个三角形的边。半径公式里的 <code>k · t · sweep + φ</code> 就是周期动画中的相位：φ 随时间增加时，波峰沿圆周移动。</p>
        <FormulaCards items={[
          { badge: 'CPU', title: '在 CPU 上生成顶点', formula: 'Buffer = (x, y)', detail: '形状固定时最直接；角度一变就要重算并重新上传整份数据。' },
          { badge: 'GPU', title: '在顶点着色器中逐顶点计算', formula: 'Buffer = (t, ring)', detail: '角度来自 Uniform，修改参数只需上传几个数字，适合动画。' },
          { badge: 'u', title: '共享角度预先计算', formula: 'u_rotation = (sin θ, cos θ)', detail: '所有顶点共用同一个角度时，在 CPU 上算一次 sin、cos 再上传，避免每个顶点重复计算。' },
        ]} />
      </section>

      <section id="atan2" className="lesson-section lesson-section--wide">
        <h2>atan2：从方向反求角度</h2>
        <p>已知方向 <code>(x, y)</code> 求角度时，单参数 <code>atan(y / x)</code> 只看比值：<code>(1, 1)</code> 与 <code>(−1, −1)</code> 的比值相同，返回值只落在 −90°…90°，x = 0 时还要除以零。<code>Math.atan2(y, x)</code> 同时检查两个分量的符号，返回 −π…π 之间的准确角度；GLSL 用双参数重载 <code>atan(y, x)</code> 提供同样的功能。</p>
        <AtanLab />
        <p>其余反三角函数也有固定的返回范围。输入超出定义域时，JavaScript 返回 <code>NaN</code>，GLSL 的结果未定义。两个单位向量的点积可能因浮点误差得到 1.0000001，用 <code>acos</code> 求夹角前先把它限制到 −1…1。</p>
        <MathTable caption="反三角函数的输入范围、返回范围与常见用途" head={['函数', '输入', '返回值', '常见用途']} rows={[
          [<code>asin(v)</code>, '−1…1', '−π/2…π/2', '由高度比例求仰角'],
          [<code>acos(v)</code>, '−1…1', '0…π', '由点积求两个单位向量的夹角，不区分转向'],
          [<code>atan(v)</code>, '任意实数', '−π/2…π/2', '由斜率求倾角'],
          [<code>atan2(y, x)</code>, '任意 x、y', '−π…π', '由方向向量求完整角度'],
        ]} />
        <CodeBlock label="aim.ts">{atan2Code}</CodeBlock>
      </section>

      <section id="shortest-turn" className="lesson-section lesson-section--wide">
        <h2>角度差与最短转向</h2>
        <p>atan2 的结果在 −180° 与 180° 处首尾相接。箭头朝向 170°、目标在 −170° 时，直接相减得到 −340°，箭头会顺时针绕一大圈，逆时针转 20° 其实就能到达。把角度差折回 −π…π，就得到最短转向：正数逆时针，负数顺时针。</p>
        <TurnLab />
        <p>折回的方法正好用到本篇的三件工具：<code>sin</code>、<code>cos</code> 把角度差还原成方向，<code>atan2</code> 再从这个方向取出绝对值最小的角度。两个角度之间插值也一样，先求最短差，再按比例前进。</p>
        <CodeBlock label="turn-toward.ts">{turnCode}</CodeBlock>
      </section>

      <section id="field-of-view" className="lesson-section">
        <h2>视野角通过 tan 决定缩放</h2>
        <p>透视相机的视野角（field of view，FOV）是视锥上下边缘的夹角。距离相机 1 个单位处，视锥半高是 <code>tan(fov / 2)</code>。透视矩阵乘以它的倒数，经过透视除法后，视锥边缘恰好落在 NDC 的 ±1：FOV 越大，<code>1 / tan</code> 越小，同一物体在屏幕上越小。FOV 接近 180° 时 tan 趋向无穷，因此常用范围约为 30°–90°。</p>
        <FovFigure />
        <CodeBlock label="perspective.ts">{perspectiveCode}</CodeBlock>
        <p>参数 <code>fieldOfViewRadians</code> 同样是弧度：界面里的 60° 先乘 <code>π / 180</code> 再传入。在<LessonLink lessonId="perspective-3d" hash="perspective-lab">三维透视投影实验</LessonLink>中调整 FOV，可以看到同一组几何随之放大或缩小。</p>
      </section>

      <section id="glsl-trig" className="lesson-section">
        <h2>JavaScript 与 GLSL 对照</h2>
        <p>GLSL ES 3.00 的角度与三角函数和 JavaScript 一一对应，参数同样使用弧度。它们还接受 <code>vec2</code>–<code>vec4</code>，对每个分量分别计算，例如 <code>cos(vec3(a, b, c))</code> 一次得到三个余弦值。</p>
        <MathTable caption="JavaScript 与 GLSL ES 3.00 的角度和三角函数对照" head={['用途', 'JavaScript', 'GLSL ES 3.00']} rows={[
          ['度数 → 弧度', <code>deg * Math.PI / 180</code>, <code>radians(deg)</code>],
          ['弧度 → 度数', <code>rad * 180 / Math.PI</code>, <code>degrees(rad)</code>],
          ['正弦、余弦、正切', <code>Math.sin / cos / tan</code>, <><code>sin / cos / tan</code>，可逐分量作用于向量</>],
          ['反正弦、反余弦', <><code>Math.asin / acos</code>，超出 −1…1 返回 NaN</>, <><code>asin / acos</code>，超出 −1…1 时结果未定义</>],
          ['由方向求角度', <><code>Math.atan2(y, x)</code>，(0, 0) 返回 0</>, <><code>atan(y, x)</code>，x、y 同为 0 时结果未定义</>],
          ['圆周率', <code>Math.PI</code>, <code>const float PI = 3.141592653589793;</code>],
        ]} />
        <p>下面的片段着色器把每个像素看作从画面中心出发的方向，用 <code>atan(y, x)</code> 求出它的角度，再让 R、G、B 三个通道的余弦相位各差 120°，得到一圈随时间旋转的色环。</p>
        <CodeBlock label="fragment.glsl" language="glsl">{colorWheelCode}</CodeBlock>
      </section>

      <section id="pitfalls" className="lesson-section">
        <h2>容易混淆的地方</h2>
        <Pitfalls items={[
          { question: <>为何 <code>Math.sin(90)</code> 不等于 1？</>, answer: <>90 被当作 90 弧度，约等于 14 圈多一点。先换算：<code>Math.sin(90 * Math.PI / 180)</code>。</> },
          { question: '同样的正角度，为何有的页面顺时针转、有的逆时针转？', answer: <>公式假定 Y 轴向上时，正角度逆时针转动。Canvas 像素坐标 Y 轴向下，同一公式在屏幕上表现为顺时针，<LessonLink lessonId="rotation-2d">二维旋转</LessonLink>页面正是这种情况。用鼠标的像素坐标调用 <code>atan2</code> 时，角度方向同样会翻转。</> },
          { question: <><code>Math.atan2</code> 的参数顺序是什么？</>, answer: <>先 y 后 x：<code>Math.atan2(y, x)</code>。GLSL 的双参数 <code>atan(y, x)</code> 同样先 y 后 x；只传一个比值的 <code>atan(y / x)</code> 会丢失象限。</> },
          { question: '用点积求夹角时，为何偶尔得到 NaN？', answer: <>两个单位向量的点积理论上在 −1…1 之间，浮点误差可能算出 1.0000001，超出了 <code>acos</code> 的定义域。先用 <code>clamp(d, -1.0, 1.0)</code> 或 <code>Math.min(1, Math.max(-1, d))</code> 限制范围。</> },
          { question: '箭头转向目标时，为何偶尔绕一大圈？', answer: <>直接相减的角度差可能接近 ±360°。先用 <code>atan2(sin Δ, cos Δ)</code> 把差值折回 −π…π，再按最短方向旋转或插值。</> },
          { question: '动画运行很久后为何开始抖动？', answer: <>32 位 float 只有约 7 位有效数字，<code>u_time</code> 越大，小数部分越粗糙。片段着色器使用 <code>mediump</code> 时，规范只保证约 2⁻¹⁰ 的相对精度，问题会更早出现。周期动画先对周期取模再上传，并为时间相关的计算声明 <code>highp</code>。</> },
          { question: <>GLSL 中直接写 <code>PI</code> 为何编译失败？</>, answer: <>GLSL ES 3.00 没有内置圆周率常量。在着色器顶部定义 <code>const float PI = 3.141592653589793;</code>，或用 <code>radians(180.0)</code> 得到 π。</> },
        ]} />
      </section>

      <LessonPagination current="trigonometry" heading="接下来">sin、cos 把角度变成方向，atan2 又能把方向变回角度。下一页用点积从两个方向求夹角，并用叉积找到同时垂直于它们的方向。</LessonPagination>
      <Footer links={[
        { href: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-2d-rotation.html', label: '参考：WebGL2 二维旋转' },
        { href: 'https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-perspective.html', label: '参考：WebGL2 三维透视投影' },
        { href: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Math/atan2', label: 'MDN：Math.atan2()' },
        { href: 'https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf#page=93', label: '规范：GLSL ES 3.00 角度与三角函数（§8.1）' },
      ]} />
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
