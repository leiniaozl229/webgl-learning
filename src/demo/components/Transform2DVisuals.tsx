import { ArrowRight, Box, Cpu, Expand, GitBranch, MonitorUp, Move, RotateCw, Rows3 } from 'lucide-react';
import type { CSSProperties } from 'react';

import type { LessonId } from '../navigation';
import { LessonLink } from './LessonLink';

const transformLessons: Array<{ id: LessonId; index: string; label: string; detail: string }> = [
  { id: 'translation-2d', index: '01', label: '平移', detail: '给每个顶点加上相同偏移' },
  { id: 'rotation-2d', index: '02', label: '旋转', detail: '用 sin、cos 混合 X 与 Y' },
  { id: 'scale-2d', index: '03', label: '缩放', detail: '改变顶点到局部原点的距离' },
  { id: 'matrices-2d', index: '04', label: '矩阵', detail: '把三类公式写入 mat3' },
  { id: 'unified-2d-transforms', index: '05', label: '组合', detail: '用顺序、层级和中心点组织变换' },
];

export function TransformChapterRoute({ current }: { current: LessonId }) {
  return (
    <nav className="transform-route" aria-label="二维变换学习路线">
      <div className="transform-route__heading">
        <span>二维变换 · 5 个连续步骤</span>
        <strong>从独立公式走到统一矩阵</strong>
      </div>
      <ol>
        {transformLessons.map((lesson) => (
          <li key={lesson.id} data-current={lesson.id === current ? 'true' : undefined}>
            <LessonLink lessonId={lesson.id}>
              <span>{lesson.index}</span>
              <div><strong>{lesson.label}</strong><small>{lesson.detail}</small></div>
            </LessonLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function TranslationBoundary() {
  return (
    <div className="translation-boundary" aria-label="CPU 改写顶点与 GPU Uniform 平移对比">
      <article>
        <span><Cpu aria-hidden="true" /> 每次拖动</span>
        <strong>CPU 重算 18 个顶点</strong>
        <code>(x + tx, y + ty) × 18</code>
        <p>TypedArray 被重写并再次上传，几何数据与物体位置绑在一起。</p>
      </article>
      <ArrowRight aria-hidden="true" />
      <article className="translation-boundary__target">
        <span><Box aria-hidden="true" /> 初始化一次</span>
        <strong>Buffer 保存局部几何</strong>
        <code>u_translation = [tx, ty]</code>
        <p>交互只上传两个数，顶点着色器为每个顶点执行同一条加法。</p>
      </article>
    </div>
  );
}

export function RotationWorkedExample() {
  return (
    <div className="rotation-worked-example">
      <div className="rotation-worked-example__plot" role="img" aria-label="点 9, 3 顺时针旋转 30 度得到约 6.3, 7.1">
        <svg viewBox="0 0 280 220" aria-hidden="true">
          <path className="rotation-grid" d="M32 20V198M32 20H260M32 76H260M32 132H260M88 20V198M144 20V198M200 20V198" />
          <path className="rotation-before" d="M32 20L205 78" />
          <path className="rotation-after" d="M32 20L153 157" />
          <path className="rotation-arc" d="M125 51A98 98 0 0 1 97 94" />
          <circle className="rotation-before" cx="205" cy="78" r="6" />
          <circle className="rotation-after" cx="153" cy="157" r="6" />
          <text x="212" y="72">(9, 3)</text>
          <text x="160" y="173">(6.3, 7.1)</text>
          <text x="111" y="76">30°</text>
        </svg>
      </div>
      <div className="rotation-worked-example__math">
        <span>已知 <code>sin 30° = 0.50</code>，<code>cos 30° ≈ 0.87</code></span>
        <div><strong>X′</strong><code>9 × 0.87 − 3 × 0.50 = 6.33</code></div>
        <div><strong>Y′</strong><code>9 × 0.50 + 3 × 0.87 = 7.11</code></div>
        <p>原始 X、Y 都会参与两个输出分量。沿单位圆改变 sin 与 cos，点会连续绕原点转动。</p>
      </div>
    </div>
  );
}

type MatrixKind = 'translation' | 'rotation' | 'scale';

const matrixDetails: Record<MatrixKind, {
  title: string;
  icon: typeof Move;
  matrix: string[];
  active: number[];
  equations: string[];
}> = {
  translation: {
    title: '平移矩阵 T',
    icon: Move,
    matrix: ['1', '0', 'tx', '0', '1', 'ty', '0', '0', '1'],
    active: [2, 5],
    equations: ['x′ = x + tx', 'y′ = y + ty'],
  },
  rotation: {
    title: '旋转矩阵 R',
    icon: RotateCw,
    matrix: ['cos', '−sin', '0', 'sin', 'cos', '0', '0', '0', '1'],
    active: [0, 1, 3, 4],
    equations: ['x′ = x·cos − y·sin', 'y′ = x·sin + y·cos'],
  },
  scale: {
    title: '缩放矩阵 S',
    icon: Expand,
    matrix: ['sx', '0', '0', '0', 'sy', '0', '0', '0', '1'],
    active: [0, 4],
    equations: ['x′ = x × sx', 'y′ = y × sy'],
  },
};

export function MatrixDerivations() {
  return (
    <div className="matrix-derivations">
      {(Object.keys(matrixDetails) as MatrixKind[]).map((kind) => {
        const detail = matrixDetails[kind];
        const Icon = detail.icon;
        return (
          <article key={kind}>
            <header><Icon aria-hidden="true" /><strong>{detail.title}</strong></header>
            <div className="matrix-derivations__operation">
              <div className="matrix-grid" aria-label={`${detail.title}的三乘三矩阵`}>
                {detail.matrix.map((value, index) => <span key={`${value}-${index}`} data-active={detail.active.includes(index) ? 'true' : undefined}>{value}</span>)}
              </div>
              <span>×</span>
              <div className="matrix-vector" aria-label="齐次坐标 x y 1"><span>x</span><span>y</span><span>1</span></div>
            </div>
            <div className="matrix-derivations__result">{detail.equations.map((equation) => <code key={equation}>{equation}</code>)}</div>
          </article>
        );
      })}
    </div>
  );
}

export function ShaderInterfaceComparison() {
  const oldUniforms = ['u_resolution', 'u_translation', 'u_rotation', 'u_scale'];
  return (
    <div className="shader-interface-comparison">
      <article>
        <span>独立公式阶段</span>
        <strong>Shader 了解每一种变换</strong>
        <ul>{oldUniforms.map((uniform) => <li key={uniform}><code>{uniform}</code></li>)}</ul>
        <small>调整执行顺序时，需要改写顶点着色器中的计算过程。</small>
      </article>
      <ArrowRight aria-hidden="true" />
      <article className="shader-interface-comparison__target">
        <span>矩阵阶段</span>
        <strong>Shader 接收统一接口</strong>
        <ul><li><code>u_matrix</code></li></ul>
        <small>CPU 负责组合顺序，Shader 始终执行一次 <code>mat3 × vec3</code>。</small>
      </article>
    </div>
  );
}

export function HierarchyAndPivot() {
  return (
    <div className="hierarchy-pivot-grid">
      <article>
        <header><GitBranch aria-hidden="true" /><div><strong>矩阵可以继续累乘</strong><small>每个 F 继承前一个 F 的空间</small></div></header>
        <div className="hierarchy-fs" aria-label="五个层级相连的字母 F">
          {[0, 1, 2, 3, 4].map((index) => <span key={index} style={{ '--level': index } as CSSProperties}>F</span>)}
        </div>
        <code>Mₙ₊₁ = Mₙ × T × R × S</code>
        <p>手臂关节、行星系统和场景图都依赖这种父子空间。父矩阵变化后，所有后代跟随更新。</p>
      </article>
      <article>
        <header><Move aria-hidden="true" /><div><strong>原点决定旋转中心</strong><small>先把目标中心移到局部原点</small></div></header>
        <div className="pivot-formula">
          <span>移回位置</span><b>×</b><span>旋转 / 缩放</span><b>×</b><span>中心移到原点</span>
        </div>
        <code>M = T(position) × R × S × T(−pivot)</code>
        <p>局部数据无需重写。改变 <code>pivot</code> 的两个数值，就能绕中心、角点或任意锚点变换。</p>
      </article>
    </div>
  );
}

const spaces = [
  { code: 'I', label: '裁剪空间', range: 'X / Y：−1 → +1', icon: Rows3 },
  { code: 'P', label: '像素空间', range: '原点来到 Canvas 左上角', icon: MonitorUp },
  { code: 'P × T', label: '平移后的空间', range: '原点移动到 (tx, ty)', icon: Move },
  { code: 'P × T × R', label: '旋转后的空间', range: '局部坐标轴一起转动', icon: RotateCw },
  { code: 'P × T × R × S', label: '缩放后的空间', range: '轴上的单位长度发生变化', icon: Expand },
];

export function CoordinateSpaceReading() {
  return (
    <div className="coordinate-space-reading">
      <div className="coordinate-space-reading__head">
        <span>从左向右读取矩阵</span>
        <strong>每一步都在改造后续顶点所在的坐标空间</strong>
      </div>
      <ol>
        {spaces.map((space, index) => {
          const Icon = space.icon;
          return (
            <li key={space.code}>
              <span>{index + 1}</span>
              <Icon aria-hidden="true" />
              <div><code>{space.code}</code><strong>{space.label}</strong><small>{space.range}</small></div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function CanvasSizingNote() {
  return (
    <aside className="canvas-sizing-note">
      <MonitorUp aria-hidden="true" />
      <div>
        <strong>投影矩阵使用 CSS 显示尺寸</strong>
        <p><code>canvas.clientWidth</code> 与 <code>canvas.clientHeight</code> 描述页面上的布局尺寸；绘图缓冲区可按 DPR 放大。页面在 ResizeObserver 中同步两者并调用 <code>viewport</code>，所以 F 在不同屏幕上保持正确比例。</p>
      </div>
    </aside>
  );
}
