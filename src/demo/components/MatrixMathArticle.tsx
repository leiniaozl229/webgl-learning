import { ArrowRight, ExternalLink, RotateCcw } from 'lucide-react';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';

import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { LessonPagination } from './LessonPagination';
import { MathChapterRoute } from './MathChapterRoute';

type BasisPreset = 'identity' | 'rotate' | 'scale' | 'shear';

interface BasisState {
  xx: number;
  xy: number;
  yx: number;
  yy: number;
  tx: number;
  ty: number;
}

const basisPresets: Record<BasisPreset, BasisState> = {
  identity: { xx: 1, xy: 0, yx: 0, yy: 1, tx: 0, ty: 0 },
  rotate: { xx: 0.71, xy: 0.71, yx: -0.71, yy: 0.71, tx: 0, ty: 0 },
  scale: { xx: 1.6, xy: 0, yx: 0, yy: 0.65, tx: 0, ty: 0 },
  shear: { xx: 1, xy: 0.25, yx: 0.85, yy: 1, tx: 0.4, ty: -0.25 },
};

const matrixVectorCode = `const transformPoint = (matrix: Matrix3, x: number, y: number) => [
  matrix[0] * x + matrix[3] * y + matrix[6],
  matrix[1] * x + matrix[4] * y + matrix[7],
];`;

const uploadCode = `// 数组连续存放每一列：X 轴、Y 轴、平移列。
const matrix = new Float32Array([
  a, b, 0,
  c, d, 0,
  tx, ty, 1,
]);

// 数组已按列存放，transpose 传 false（WebGL1 只允许 false，WebGL2 也允许 true）。
gl.uniformMatrix3fv(matrixLocation, false, matrix);`;

const shaderCode = `#version 300 es
layout(location = 0) in vec2 a_position;
uniform mat3 u_matrix;

void main() {
  vec3 transformed = u_matrix * vec3(a_position, 1.0);
  gl_Position = vec4(transformed.xy, 0.0, 1.0);
}`;

const composeCode = `// 列向量约定：最靠近顶点的矩阵最先作用。
const clipFromLocal = multiply3(
  projection,
  multiply3(translation, multiply3(rotation, scaling)),
);

// p_clip = P × T × R × S × p_local`;

function format(value: number) {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return normalized.toFixed(2);
}

function LearningGoals() {
  return (
    <aside className="learning-note">
      <h2>完成这一节后</h2>
      <ul>
        <li>能区分标量、向量和矩阵，并判断乘法维度是否匹配</li>
        <li>能把矩阵乘向量拆成逐行点积</li>
        <li>能从矩阵列读取变换后的坐标轴与平移</li>
        <li>理解二维 <code>mat3</code> 与三维 <code>mat4</code> 的共同结构</li>
        <li>能追踪组合矩阵的实际执行顺序</li>
      </ul>
    </aside>
  );
}

function MathObjects() {
  return (
    <div className="math-object-cards">
      <article><span>0D</span><strong>标量 Scalar</strong><code>2.5</code><p>一个数。可表示缩放系数、角度或时间。</p></article>
      <article><span>1D</span><strong>向量 Vector</strong><code>[x, y, z]</code><p>一组有顺序的分量。可表示位置、方向或颜色。</p></article>
      <article><span>2D</span><strong>矩阵 Matrix</strong><code>m × n</code><p>按行和列组织的系数，用来组合多个输入分量。</p></article>
    </div>
  );
}

function MatrixShapeGuide() {
  return (
    <div className="matrix-shape-guide">
      <div className="matrix-shape-guide__matrix" aria-label="两行三列矩阵">
        {['a₁₁', 'a₁₂', 'a₁₃', 'a₂₁', 'a₂₂', 'a₂₃'].map((value) => <span key={value}>{value}</span>)}
      </div>
      <div className="matrix-shape-guide__labels">
        <span><b>2 行</b>决定输出有两个分量</span>
        <span><b>3 列</b>要求输入有三个分量</span>
        <code>(2 × 3) × (3 × 1) → (2 × 1)</code>
      </div>
    </div>
  );
}

function DotProductWalkthrough() {
  const [activeRow, setActiveRow] = useState<0 | 1>(0);
  return (
    <div className="dot-product-walkthrough">
      <div className="dot-product-walkthrough__equation" aria-label="二乘二矩阵乘二维向量">
        <div className="dot-product-walkthrough__matrix">
          {[2, 1, -1, 3].map((value, index) => <span key={`${value}-${index}`} data-active={Math.floor(index / 2) === activeRow ? 'true' : undefined}>{value}</span>)}
        </div>
        <b>×</b>
        <div className="dot-product-walkthrough__vector"><span>4</span><span>2</span></div>
        <b>=</b>
        <div className="dot-product-walkthrough__vector dot-product-walkthrough__result"><span>10</span><span>2</span></div>
      </div>
      <div className="dot-product-walkthrough__steps">
        <button type="button" data-active={activeRow === 0 ? 'true' : undefined} onClick={() => setActiveRow(0)}><span>第 1 行</span><code>2 × 4 + 1 × 2 = 10</code></button>
        <button type="button" data-active={activeRow === 1 ? 'true' : undefined} onClick={() => setActiveRow(1)}><span>第 2 行</span><code>−1 × 4 + 3 × 2 = 2</code></button>
      </div>
      <p>每个输出分量来自“矩阵的一行”和“整个输入向量”的点积。行数决定输出长度，列数必须等于输入长度。</p>
    </div>
  );
}

function BasisLab() {
  const [basis, setBasis] = useState<BasisState>(basisPresets.identity);
  const point = { x: 1.5, y: 1 };
  const output = useMemo(() => ({
    x: basis.xx * point.x + basis.yx * point.y + basis.tx,
    y: basis.xy * point.x + basis.yy * point.y + basis.ty,
  }), [basis]);
  const toSvg = (x: number, y: number) => ({ x: 230 + x * 48, y: 170 - y * 48 });
  const transform = (x: number, y: number) => toSvg(
    basis.xx * x + basis.yx * y + basis.tx,
    basis.xy * x + basis.yy * y + basis.ty,
  );
  const grid = [-3, -2, -1, 0, 1, 2, 3];
  const origin = transform(0, 0);
  const xAxis = transform(1, 0);
  const yAxis = transform(0, 1);
  const pointPosition = transform(point.x, point.y);

  function update(key: keyof BasisState, value: number) {
    setBasis((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="matrix-basis-lab">
      <header>
        <div><strong>Basis Matrix Lab</strong><small>拖动矩阵的两列，观察局部坐标轴怎样重建每个点</small></div>
        <button type="button" onClick={() => setBasis(basisPresets.identity)}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="matrix-basis-lab__body">
        <div className="matrix-basis-lab__controls">
          <div className="matrix-basis-lab__presets" aria-label="矩阵预设">
            {(Object.keys(basisPresets) as BasisPreset[]).map((preset) => <button type="button" key={preset} onClick={() => setBasis(basisPresets[preset])}>{({ identity: '单位', rotate: '旋转', scale: '缩放', shear: '错切' })[preset]}</button>)}
          </div>
          <fieldset><legend>第 1 列 · 新 X 轴</legend><Range label="X 分量 a" value={basis.xx} onChange={(value) => update('xx', value)} /><Range label="Y 分量 b" value={basis.xy} onChange={(value) => update('xy', value)} /></fieldset>
          <fieldset><legend>第 2 列 · 新 Y 轴</legend><Range label="X 分量 c" value={basis.yx} onChange={(value) => update('yx', value)} /><Range label="Y 分量 d" value={basis.yy} onChange={(value) => update('yy', value)} /></fieldset>
          <fieldset><legend>第 3 列 · 平移</legend><Range label="X 平移 tx" value={basis.tx} onChange={(value) => update('tx', value)} limit={2.5} /><Range label="Y 平移 ty" value={basis.ty} onChange={(value) => update('ty', value)} limit={2.5} /></fieldset>
        </div>
        <div className="matrix-basis-lab__visual">
          <svg viewBox="0 0 460 340" role="img" aria-label={`点 1.5, 1 经过矩阵后得到 ${format(output.x)}, ${format(output.y)}`}>
            <defs><marker id="basis-arrow-x" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" /></marker><marker id="basis-arrow-y" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" /></marker></defs>
            <g className="matrix-basis-lab__base-grid">{grid.map((value) => <line key={`base-v-${value}`} x1={toSvg(value, -3).x} y1={toSvg(value, -3).y} x2={toSvg(value, 3).x} y2={toSvg(value, 3).y} />)}{grid.map((value) => <line key={`base-h-${value}`} x1={toSvg(-3, value).x} y1={toSvg(-3, value).y} x2={toSvg(3, value).x} y2={toSvg(3, value).y} />)}</g>
            <g className="matrix-basis-lab__transformed-grid">{grid.map((value) => { const start = transform(value, -3); const end = transform(value, 3); return <line key={`v-${value}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />; })}{grid.map((value) => { const start = transform(-3, value); const end = transform(3, value); return <line key={`h-${value}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />; })}</g>
            <line className="matrix-basis-lab__axis-x" x1={origin.x} y1={origin.y} x2={xAxis.x} y2={xAxis.y} markerEnd="url(#basis-arrow-x)" />
            <line className="matrix-basis-lab__axis-y" x1={origin.x} y1={origin.y} x2={yAxis.x} y2={yAxis.y} markerEnd="url(#basis-arrow-y)" />
            <circle className="matrix-basis-lab__origin" cx={origin.x} cy={origin.y} r="4" />
            <circle className="matrix-basis-lab__point" cx={pointPosition.x} cy={pointPosition.y} r="7" />
            <text x={pointPosition.x + 10} y={pointPosition.y - 10}>M × (1.5, 1)</text>
          </svg>
          <div className="matrix-basis-lab__equation"><code>输出 = 1.5 × X轴 + 1 × Y轴 + 平移</code><strong>({format(output.x)}, {format(output.y)})</strong></div>
        </div>
      </div>
      <div className="matrix-basis-lab__readout">
        <div><span>{format(basis.xx)}</span><span>{format(basis.yx)}</span><span>{format(basis.tx)}</span><span>{format(basis.xy)}</span><span>{format(basis.yy)}</span><span>{format(basis.ty)}</span><span>0.00</span><span>0.00</span><span>1.00</span></div>
        <p><b>第 1 列</b>是新 X 轴，<b>第 2 列</b>是新 Y 轴，<b>第 3 列</b>是平移。点的 X、Y 分量决定两根轴各取多少。</p>
      </div>
    </div>
  );
}

function Range({ label, value, onChange, limit = 2 }: { label: string; value: number; onChange: (value: number) => void; limit?: number }) {
  return <label className="matrix-basis-range"><span>{label}<code>{format(value)}</code></span><input type="range" min={-limit} max={limit} step="0.05" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function HomogeneousBridge() {
  const matrices = [
    { label: '二维 · mat3', axes: ['X 轴', 'Y 轴', '平移'], values: [['a', 'b', '0'], ['c', 'd', '0'], ['tx', 'ty', '1']] },
    { label: '三维 · mat4', axes: ['X 轴', 'Y 轴', 'Z 轴', '平移'], values: [['a', 'b', 'c', '0'], ['d', 'e', 'f', '0'], ['g', 'h', 'i', '0'], ['tx', 'ty', 'tz', '1']] },
  ];
  return (
    <div className="homogeneous-bridge">
      {matrices.map((matrix) => <article key={matrix.label}><header><strong>{matrix.label}</strong><code>{matrix.axes.join(' · ')}</code></header><div className={`homogeneous-bridge__matrix homogeneous-bridge__matrix--${matrix.values.length}`} style={{ '--matrix-size': matrix.values.length } as CSSProperties}>{matrix.values.flatMap((_, rowIndex) => matrix.values.map((column, columnIndex) => <span key={`${columnIndex}-${rowIndex}`} data-translation={columnIndex === matrix.values.length - 1 ? 'true' : undefined}>{column[rowIndex]}</span>))}</div><p>{matrix.values.length === 3 ? <><code>(x, y, 1)</code> 让最后一列参与位置计算。</> : <><code>(x, y, z, 1)</code> 延续同一结构，并增加 Z 轴。</>}</p></article>)}
    </div>
  );
}

function CompositionOrder() {
  return (
    <div className="matrix-composition-order">
      {[
        { code: 'S', label: '缩放', detail: '先改变局部长度' },
        { code: 'R', label: '旋转', detail: '再转动缩放后的轴' },
        { code: 'T', label: '平移', detail: '最后放到目标位置' },
        { code: 'P', label: '投影', detail: '映射到裁剪空间' },
      ].map((step, index) => <div key={step.code}><span>{step.code}</span><strong>{step.label}</strong><small>{step.detail}</small>{index < 3 ? <i><ArrowRight aria-hidden="true" /></i> : null}</div>)}
      <p>代码写成 <code>P × T × R × S × point</code>，从最右侧的 <code>S</code> 开始作用到列向量。</p>
    </div>
  );
}

function IdentityInversePreview() {
  return (
    <div className="identity-inverse-preview">
      <article><span>I</span><div><strong>单位矩阵 Identity</strong><code>I × p = p</code><p>保持向量不变，也是组合变换的安全起点。</p></div></article>
      <article><span>M⁻¹</span><div><strong>逆矩阵 Inverse</strong><code>M⁻¹ × M = I</code><p>撤销原变换；View Matrix 就是 Camera Matrix 的逆。</p></div></article>
      <article><span>Mᵀ</span><div><strong>转置 Transpose</strong><code>row ↔ column</code><p>交换行列，后续法线矩阵会结合逆矩阵与转置。</p></div></article>
    </div>
  );
}

export function MatrixMathArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>数学</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>矩阵基础：从二维到三维</h1>
        <p className="lesson-lead">从“输入若干数字，输出若干数字”开始理解矩阵，再把行列、点积、坐标轴、齐次坐标和组合顺序连接到 WebGL2 的 <code>mat3</code> 与 <code>mat4</code>。</p>
      </header>
      {toc}
      <MathChapterRoute current="matrix-math" />
      <LearningGoals />
      <section id="scalar-vector-matrix" className="lesson-section"><h2>先认识三种数学对象</h2><p>标量只有一个数；向量把多个相关分量排成一列；矩阵用一组系数描述“每个输出分量如何读取输入”。WebGL2 的顶点位置、颜色和变换都建立在这三种对象上。</p><MathObjects /></section>
      <section id="rows-columns-shape" className="lesson-section"><h2>行、列与形状先决定能否相乘</h2><p>一个 <code>m × n</code> 矩阵有 m 行、n 列。它接收 n 个输入分量，产生 m 个输出分量。先检查中间维度，能够在计算前发现许多错误。</p><MatrixShapeGuide /></section>
      <section id="matrix-vector-product" className="lesson-section"><h2>矩阵乘向量就是一组点积</h2><p>用矩阵的每一行依次读取输入向量。点击下面两行，观察两个输出分量各自使用了哪些系数。</p><DotProductWalkthrough /><CodeBlock label="matrix-vector.ts">{matrixVectorCode}</CodeBlock></section>
      <section id="basis-columns" className="lesson-section lesson-section--wide"><h2>从列读取变换后的坐标轴</h2><p>矩阵乘向量也可以读成列的线性组合。二维点 <code>(x, y)</code> 表示取 x 份第 1 列、y 份第 2 列；平移列最后再加入结果。这个视角能直接解释旋转、缩放、镜像与错切。</p><BasisLab /></section>
      <section id="homogeneous-coordinates" className="lesson-section"><h2>多一个分量，让平移进入乘法</h2><p>普通 2×2 或 3×3 线性变换会把原点保持在原点，无法单独表达平移。给位置补上 W=1 后，矩阵的最后一列可以加入固定偏移；方向向量使用 W=0，因此不会受到平移影响。</p><HomogeneousBridge /></section>
      <section id="mat3-to-mat4" className="lesson-section"><h2>mat3 与 mat4 使用同一套阅读方式</h2><p>二维 <code>mat3</code> 用两列保存 X、Y 轴，再用一列保存平移。三维 <code>mat4</code> 增加 Z 轴，最后一列继续保存位置。Model、View 和 Projection 都沿用 4×4 结构。</p><CodeBlock label="vertex.glsl" language="glsl">{shaderCode}</CodeBlock></section>
      <section id="composition-order" className="lesson-section"><h2>矩阵组合把多个步骤压成一个接口</h2><p>本站采用列向量和矩阵左乘。表达式从右向左作用到点，因此交换两个矩阵通常会改变结果。平移后旋转与旋转后平移会得到不同轨迹。</p><CompositionOrder /><CodeBlock label="compose.ts">{composeCode}</CodeBlock></section>
      <section id="storage-and-upload" className="lesson-section"><h2>区分数学排版、数组存储和 GLSL 索引</h2><p>页面把矩阵按数学习惯画成横向的行。JavaScript 数组按列连续存放，GLSL 的 <code>matrix[column][row]</code> 也先取列。因此上传时 <code>transpose</code> 传 <code>false</code>。WebGL1 只接受 <code>false</code>；WebGL2 允许传 <code>true</code>，适合行主序数组。</p><CodeBlock label="upload-mat3.ts">{uploadCode}</CodeBlock></section>
      <section id="identity-and-inverse" className="lesson-section"><h2>三个后续会反复出现的矩阵操作</h2><p>单位矩阵提供初始状态，逆矩阵撤销变换，转置交换行列。先记住它们的职责，下一页会用行列式判断可逆性，并推导光照需要的法线矩阵。</p><IdentityInversePreview /></section>
      <section id="webgl-connections" className="lesson-section"><h2>回到二维与三维课程验证</h2><div className="matrix-lesson-links"><LessonLink lessonId="matrices-2d"><span>二维</span><div><strong>二维矩阵</strong><small>用 mat3 组合平移、旋转、缩放和像素投影</small></div><ArrowRight aria-hidden="true" /></LessonLink><LessonLink lessonId="model-view-projection"><span>三维</span><div><strong>模型、视图与投影</strong><small>用 mat4 串起 Local、World、View 与 Clip</small></div><ArrowRight aria-hidden="true" /></LessonLink></div></section>
      <LessonPagination current="matrix-math" heading="接下来">矩阵已经能组合平移、旋转与缩放。下一页研究如何撤销变换：行列式、逆矩阵、转置，以及光照需要的法线矩阵。</LessonPagination>
      <footer className="lesson-footer"><p>内容约定：WebGL2、GLSL ES 3.00、列向量与 column-major 存储。</p><div className="lesson-footer__links"><a href="https://webgl2fundamentals.org/webgl/lessons/webgl-matrix-vs-math.html" target="_blank" rel="noreferrer">参考：WebGL2 Matrices vs Math Matrices <ExternalLink aria-hidden="true" /></a></div></footer>
    </article>
  );
}
