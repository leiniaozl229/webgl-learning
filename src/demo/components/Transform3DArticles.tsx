import { ArrowRight, Box, Camera, CheckCircle2, Eye, Layers3, Move, Rows3 } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import type { LessonId } from '../navigation';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { LessonPagination } from './LessonPagination';
import { Transform3DPlayground } from './Transform3DPlayground';

const mat4ShaderCode = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_color;

uniform mat4 u_matrix;
out vec3 v_color;

void main() {
  // 显式补齐 W = 1，让平移对该顶点生效。
  gl_Position = u_matrix * vec4(a_position, 1.0);
  v_color = a_color;
}`;

const attributeCode = `// Position：每个顶点读取 3 个 FLOAT。
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

// Color：三个 0–255 字节在读取时归一化到 0–1。
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.vertexAttribPointer(1, 3, gl.UNSIGNED_BYTE, true, 0, 0);`;

const depthStateCode = `gl.enable(gl.CULL_FACE);
gl.enable(gl.DEPTH_TEST);

// 每一帧同时清除颜色和上一帧留下的深度值。
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);`;

const orthographicCode = `const orthographic = (
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number,
): Matrix4 => [
  2 / (right - left), 0, 0, 0,
  0, 2 / (top - bottom), 0, 0,
  0, 0, 2 / (near - far), 0,
  (left + right) / (left - right),
  (bottom + top) / (bottom - top),
  (near + far) / (near - far),
  1,
];`;

const perspectiveDivideCode = `// 顶点着色器只提交齐次裁剪坐标。
gl_Position = u_matrix * vec4(a_position, 1.0);

// 随后 WebGL 自动执行：
// ndc.x = gl_Position.x / gl_Position.w
// ndc.y = gl_Position.y / gl_Position.w
// ndc.z = gl_Position.z / gl_Position.w`;

const perspectiveCode = `const perspective = (
  fieldOfView: number,
  aspect: number,
  near: number,
  far: number,
): Matrix4 => {
  const f = 1 / Math.tan(fieldOfView / 2);
  const rangeInv = 1 / (near - far);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0,
  ];
};`;

const viewMatrixCode = `const cameraMatrix = lookAt(cameraPosition, target, [0, 1, 0]);
const viewMatrix = inverse(cameraMatrix);
const viewProjection = multiply(projectionMatrix, viewMatrix);

for (const object of sceneObjects) {
  const clipFromLocal = multiply(viewProjection, object.worldMatrix);
  gl.uniformMatrix4fv(matrixLocation, false, clipFromLocal);
  gl.drawArrays(gl.TRIANGLES, 0, object.vertexCount);
}`;

const lookAtCode = `function lookAt(cameraPosition: Vec3, target: Vec3, up: Vec3): Matrix4 {
  const zAxis = normalize(subtract(cameraPosition, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = normalize(cross(zAxis, xAxis));

  return [
    xAxis[0], xAxis[1], xAxis[2], 0,
    yAxis[0], yAxis[1], yAxis[2], 0,
    zAxis[0], zAxis[1], zAxis[2], 0,
    cameraPosition[0], cameraPosition[1], cameraPosition[2], 1,
  ];
}`;

const mvpCode = `const clipFromLocal = multiply(
  clipFromView,            // Projection
  multiply(
    viewFromWorld,         // View
    worldFromLocal,        // Model
  ),
);

gl.uniformMatrix4fv(matrixLocation, false, clipFromLocal);
gl.drawArrays(gl.TRIANGLES, 0, vertexCount);`;

const lessons: Array<{ id: LessonId; index: string; label: string }> = [
  { id: 'orthographic-3d', index: '01', label: '正射投影' },
  { id: 'perspective-3d', index: '02', label: '透视投影' },
  { id: 'camera-3d', index: '03', label: '相机' },
  { id: 'matrix-naming-3d', index: '04', label: '矩阵命名' },
  { id: 'model-view-projection', index: '05', label: 'MVP' },
];

function Transform3DRoute({ current }: { current: LessonId }) {
  return (
    <nav className="transform-3d-route" aria-label="三维基础学习路线">
      <div><span>三维基础 · 5 个连续步骤</span><strong>从立体顶点走到完整空间链</strong></div>
      <ol>{lessons.map((lesson) => <li key={lesson.id} data-current={lesson.id === current ? 'true' : undefined}><LessonLink lessonId={lesson.id}><span>{lesson.index}</span><strong>{lesson.label}</strong></LessonLink></li>)}</ol>
    </nav>
  );
}

function LearningNote({ id, children }: { id: string; children: ReactNode }) {
  return <section className="learning-note" aria-labelledby={id}><div className="learning-note__icon" aria-hidden="true"><CheckCircle2 /></div><div><h2 id={id}>完成这一节后</h2>{children}</div></section>;
}

function Footer({ href }: { href: string }) {
  return <footer className="lesson-footer"><p>实验使用原生 WebGL2、GLSL ES 3.00、独立 Buffer 与可释放的 GPU 资源。</p><a href={href} target="_blank" rel="noreferrer">阅读参考教程</a></footer>;
}

function DimensionUpgrade() {
  return (
    <div className="dimension-upgrade">
      <article><span>二维</span><strong>vec3 × mat3</strong><code>(x, y, 1)</code><small>一个旋转轴：Z</small></article>
      <ArrowRight aria-hidden="true" />
      <article><span>三维</span><strong>vec4 × mat4</strong><code>(x, y, z, 1)</code><small>三个旋转轴：X、Y、Z</small></article>
    </div>
  );
}

function AxisCards() {
  return <div className="axis-cards"><article><b>X</b><strong>绕左右方向旋转</strong><code>Y ↔ Z</code></article><article><b>Y</b><strong>绕上下方向旋转</strong><code>X ↔ Z</code></article><article><b>Z</b><strong>绕屏幕法线旋转</strong><code>X ↔ Y</code></article></div>;
}

function RasterStateFlow() {
  return (
    <div className="raster-state-flow">
      <span><Rows3 aria-hidden="true" /><strong>三角形绕序</strong><small>裁剪空间中判断正面与背面</small></span><i>→</i>
      <span><Eye aria-hidden="true" /><strong>CULL_FACE</strong><small>丢弃背向观察者的三角形</small></span><i>→</i>
      <span><Layers3 aria-hidden="true" /><strong>DEPTH_TEST</strong><small>保留每个像素位置上更近的片段</small></span>
    </div>
  );
}

function PerspectiveDistances() {
  return (
    <div className="perspective-distances" aria-label="同一长度除以不同深度后的结果">
      {[1, 2, 3].map((depth) => <article key={depth}><span>Z = {depth}</span><div style={{ '--depth': depth } as CSSProperties} /><strong>{(10 / depth).toFixed(depth === 3 ? 2 : 0)} units</strong><code>10 ÷ {depth}</code></article>)}
    </div>
  );
}

function FrustumVisual() {
  return (
    <div className="frustum-visual">
      <svg viewBox="0 0 640 260" role="img" aria-label="相机视锥从近裁剪面延伸到远裁剪面">
        <path className="frustum-shape" d="M70 130L520 26V234Z" />
        <line className="frustum-near" x1="170" y1="107" x2="170" y2="153" />
        <line className="frustum-far" x1="520" y1="26" x2="520" y2="234" />
        <circle cx="70" cy="130" r="8" />
        <text x="42" y="158">Camera</text><text x="148" y="94">near</text><text x="502" y="250">far</text>
      </svg>
      <div><span><b>FOV</b>控制视锥张开角度</span><span><b>aspect</b>匹配画布宽高比</span><span><b>near / far</b>限定可见深度</span></div>
    </div>
  );
}

function CameraInverseVisual() {
  return (
    <div className="camera-inverse-visual">
      <article><Camera aria-hidden="true" /><strong>Camera Matrix</strong><span>相机从原点移动到世界位置</span><code>worldFromCamera</code></article>
      <div><span>inverse</span><ArrowRight aria-hidden="true" /></div>
      <article><Move aria-hidden="true" /><strong>View Matrix</strong><span>整个世界向相反方向移动</span><code>cameraFromWorld</code></article>
    </div>
  );
}

function LookAtBasis() {
  return (
    <div className="look-at-basis">
      <div><span>1</span><code>zAxis = normalize(camera − target)</code><small>得到相机的后方</small></div>
      <div><span>2</span><code>xAxis = normalize(cross(up, zAxis))</code><small>得到相机的右方</small></div>
      <div><span>3</span><code>yAxis = cross(zAxis, xAxis)</code><small>重新得到严格垂直的上方</small></div>
    </div>
  );
}

const spaces = [
  { short: 'L', label: 'Local', detail: '模型文件中的顶点' },
  { short: 'W', label: 'World', detail: '物体在场景中的位置' },
  { short: 'V', label: 'View', detail: '相对于相机的坐标' },
  { short: 'C', label: 'Clip', detail: '投影后的齐次坐标' },
  { short: 'N', label: 'NDC', detail: '完成 x/w、y/w、z/w' },
  { short: 'S', label: 'Screen', detail: 'viewport 映射到像素' },
];

function SpaceChain() {
  return <div className="space-chain">{spaces.map((space, index) => <div key={space.short}><span>{space.short}</span><strong>{space.label}</strong><small>{space.detail}</small>{index < spaces.length - 1 ? <i>→</i> : null}</div>)}</div>;
}

function NamingTable() {
  return (
    <div className="matrix-naming-table" role="table" aria-label="三维矩阵命名对照">
      <div role="row"><strong role="columnheader">空间方向命名</strong><strong role="columnheader">常见简称</strong><strong role="columnheader">职责</strong></div>
      <div role="row"><code role="cell">worldFromLocal</code><code role="cell">model</code><span role="cell">Local → World</span></div>
      <div role="row"><code role="cell">viewFromWorld</code><code role="cell">view</code><span role="cell">World → View</span></div>
      <div role="row"><code role="cell">clipFromView</code><code role="cell">projection</code><span role="cell">View → Clip</span></div>
      <div role="row"><code role="cell">clipFromLocal</code><code role="cell">mvp</code><span role="cell">Local → Clip</span></div>
    </div>
  );
}

function UpdateFrequency() {
  return (
    <div className="matrix-update-frequency">
      <article><span>镜头参数变化时</span><strong>Projection</strong><small>FOV、aspect、near、far</small></article>
      <article><span>相机移动时</span><strong>View</strong><small>camera position、target、up</small></article>
      <article><span>每个物体</span><strong>Model</strong><small>position、rotation、scale</small></article>
      <article><span>每次 draw call</span><strong>MVP Uniform</strong><small>P × V × M</small></article>
    </div>
  );
}

export function Orthographic3DArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>三维基础</span></nav><h1 id="lesson-title" tabIndex={-1}>三维正射投影</h1><p className="lesson-lead">给二维点增加 Z 和 W，把 <code>mat3</code> 扩展为 <code>mat4</code>，再用面剔除和深度缓冲让立体几何拥有稳定的遮挡关系。</p></header>
      {toc}<Transform3DRoute current="orthographic-3d" />
      <LearningNote id="orthographic-learning"><ul><li>能说明 <code>vec3</code> 顶点为何使用 <code>mat4</code></li><li>理解三个旋转轴分别混合哪些分量</li><li>区分背面剔除和深度测试的职责</li><li>能构造可控六个边界的正射投影体</li></ul></LearningNote>
      <section id="mat4-upgrade" className="lesson-section"><h2>从 mat3 再迈一步</h2><p>二维变换把 <code>(x, y)</code> 扩展成 <code>(x, y, 1)</code>。三维顶点包含 X、Y、Z，再补齐齐次分量 W=1，于是需要 4×4 矩阵保存旋转、缩放和平移。</p><DimensionUpgrade /><CodeBlock label="vertex.glsl" language="glsl">{mat4ShaderCode}</CodeBlock></section>
      <section id="volume-geometry" className="lesson-section"><h2>平面 F 沿 Z 轴拉出厚度</h2><p>实验把三个长方体组合成立体 F。位置 Buffer 每个顶点读取三个 <code>FLOAT</code>；颜色 Buffer 使用三个 <code>UNSIGNED_BYTE</code> 并启用归一化，让不同朝向的表面更容易辨认。</p><CodeBlock label="vertex-layout.ts">{attributeCode}</CodeBlock></section>
      <section id="three-axes" className="lesson-section"><h2>三维提供三个旋转轴</h2><p>绕某一轴旋转时，该轴分量保持不变，另外两个分量通过 sin 与 cos 互相混合。二维旋转对应三维中的 Z 轴旋转。</p><AxisCards /></section>
      <section id="orthographic-volume" className="lesson-section"><h2>正射投影把长方体空间压进裁剪空间</h2><p><code>left</code>、<code>right</code>、<code>bottom</code>、<code>top</code>、<code>near</code> 和 <code>far</code> 定义一个长方体可见范围。距离变化不会改变物体显示尺寸，工程制图和二维编辑器常用这种投影。</p><CodeBlock label="mat4.ts · orthographic">{orthographicCode}</CodeBlock></section>
      <section id="depth-and-culling" className="lesson-section"><h2>朝向与距离解决两类遮挡</h2><p>面剔除根据三角形绕序跳过背面。深度测试比较同一像素位置上的 Z 值，让更近的片段覆盖更远的片段；每帧绘制前要清除深度缓冲。</p><RasterStateFlow /><CodeBlock label="draw-state.ts">{depthStateCode}</CodeBlock></section>
      <section id="orthographic-lab" className="lesson-section lesson-section--wide"><h2>正射三维实验</h2><p>旋转三个轴，并分别关闭 <code>CULL_FACE</code> 与 <code>DEPTH_TEST</code>。观察缺少每项状态时，哪些表面会穿到前方。</p><Transform3DPlayground variant="orthographic" /></section>
      <LessonPagination current="orthographic-3d" heading="接下来">正射投影已经建立三维遮挡。下一页把深度写入 W，让远处物体自然缩小。</LessonPagination>
      <Footer href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-orthographic.html" />
    </article>
  );
}

export function Perspective3DArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>三维基础</span></nav><h1 id="lesson-title" tabIndex={-1}>三维透视投影</h1><p className="lesson-lead">透视矩阵把视图空间深度写入裁剪坐标 W。WebGL 完成除法后，远处物体占据更小的标准化坐标范围。</p></header>
      {toc}<Transform3DRoute current="perspective-3d" />
      <LearningNote id="perspective-learning"><ul><li>能用除以深度解释近大远小</li><li>知道 <code>gl_Position.w</code> 何时参与透视除法</li><li>理解 FOV、aspect、near 与 far 的职责</li><li>能识别物体被近远裁剪面切除的原因</li></ul></LearningNote>
      <section id="distance-scaling" className="lesson-section"><h2>同一长度除以更大的深度</h2><p>长度为 10 的线段位于不同深度时，投影后的长度会随除数增大而缩短。这是透视投影最直观的计算核心。</p><PerspectiveDistances /></section>
      <section id="perspective-divide" className="lesson-section"><h2>WebGL 自动执行透视除法</h2><p>顶点着色器输出齐次裁剪坐标 <code>(x, y, z, w)</code>。进入裁剪和光栅化前，GPU 自动计算 <code>x/w</code>、<code>y/w</code> 和 <code>z/w</code>。</p><CodeBlock label="perspective-divide.glsl" language="glsl">{perspectiveDivideCode}</CodeBlock></section>
      <section id="w-component" className="lesson-section"><h2>透视矩阵把视图深度送进 W</h2><p>标准相机看向负 Z。矩阵中的特定元素让 <code>w_clip = -z_view</code>，因此离相机更远的点拥有更大的正 W，除法后的 X、Y 更接近画面中心。</p><div className="w-equation"><span><code>w_clip = −z_view</code></span><i>→</i><span><code>x_ndc = x_clip / w_clip</code></span><i>→</i><span><strong>距离增加，屏幕尺寸减小</strong></span></div></section>
      <section id="frustum" className="lesson-section"><h2>视锥限定相机能看到的空间</h2><p>视野角决定张开程度，宽高比避免画面拉伸，近远裁剪面限定有效深度。视锥以外的几何会在裁剪阶段被移除。</p><FrustumVisual /></section>
      <section id="perspective-matrix" className="lesson-section"><h2>一个矩阵完成缩放、Z 映射与 W 构造</h2><p>透视矩阵将视锥映射到裁剪空间，同时把 near、far 对应到可裁剪的深度范围。顶点着色器仍只需要一次矩阵乘法。</p><CodeBlock label="mat4.ts · perspective">{perspectiveCode}</CodeBlock></section>
      <section id="perspective-lab" className="lesson-section lesson-section--wide"><h2>透视与裁剪实验</h2><p>缩小视野角会产生长焦感；增大视野角会看到更宽区域。拖动 near 和 far，观察 F 的表面何时穿过裁剪面。</p><Transform3DPlayground variant="perspective" /></section>
      <LessonPagination current="perspective-3d" heading="接下来">投影假定相机位于原点并朝向负 Z。下一页把相机移动到世界位置，再用逆矩阵建立视图空间。</LessonPagination>
      <Footer href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-perspective.html" />
    </article>
  );
}

export function Camera3DArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>三维基础</span></nav><h1 id="lesson-title" tabIndex={-1}>三维相机</h1><p className="lesson-lead">Camera Matrix 描述相机在世界中的位置与朝向；它的逆矩阵把整个世界转换到相机空间，形成真正用于绘制的 View Matrix。</p></header>
      {toc}<Transform3DRoute current="camera-3d" />
      <LearningNote id="camera-learning"><ul><li>理解相机移动为何等价于世界反向移动</li><li>区分 Camera Matrix 与 View Matrix</li><li>能组合共享的 ViewProjection Matrix</li><li>知道 <code>lookAt</code> 怎样构造相机的三个正交轴</li></ul></LearningNote>
      <section id="move-the-world" className="lesson-section"><h2>渲染时把世界移到相机前</h2><p>透视投影固定观察原点和负 Z 方向。相机在世界中向右移动 10 个单位，对所有物体应用向左 10 个单位的 View 变换，就能保持相同的相对画面。</p><div className="camera-motion-pair"><article><Camera aria-hidden="true" /><strong>相机世界位置</strong><code>(+10, 0, +300)</code></article><i>⇄</i><article><Box aria-hidden="true" /><strong>View 变换世界</strong><code>(−10, 0, −300)</code></article></div></section>
      <section id="camera-inverse" className="lesson-section"><h2>View Matrix 是 Camera Matrix 的逆</h2><p>Camera Matrix 把相机从原点放进世界；View Matrix 抵消这一变换，把世界带回相机原点。平移、旋转与缩放都能通过逆矩阵撤销。</p><CameraInverseVisual /></section>
      <section id="shared-view-projection" className="lesson-section"><h2>同一帧中的物体共享相机与投影</h2><p>先计算一次 <code>projection × view</code>。绘制每个物体时，只需要继续乘上该物体自己的 World Matrix。</p><CodeBlock label="draw-scene.ts">{viewMatrixCode}</CodeBlock></section>
      <section id="look-at" className="lesson-section"><h2>用 position、target 和 up 构造 lookAt</h2><p>相机位置减去目标得到 Z 轴；up 与 Z 叉乘得到 X 轴；Z 与 X 再叉乘得到 Y 轴。三个单位轴和相机位置共同组成 Camera Matrix。</p><LookAtBasis /><CodeBlock label="look-at.ts">{lookAtCode}</CodeBlock></section>
      <section id="camera-lab" className="lesson-section lesson-section--wide"><h2>环绕相机实验</h2><p>相机沿圆周移动，<code>lookAt</code> 让它持续对准场景中心。七个 F 共享同一个 Projection 和 View，各自拥有独立 Model Matrix。</p><Transform3DPlayground variant="camera" /></section>
      <LessonPagination current="camera-3d" heading="接下来">相机页已经出现多种矩阵。下一页用来源空间和目标空间为它们命名，让乘法方向可以直接阅读。</LessonPagination>
      <Footer href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-3d-camera.html" />
    </article>
  );
}

export function MatrixNaming3DArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>三维基础</span></nav><h1 id="lesson-title" tabIndex={-1}>WebGL2 三维矩阵命名</h1><p className="lesson-lead">矩阵名称同时写出输入空间和输出空间，能够在阅读代码时验证乘法顺序，并减少 Model、World、Camera、View 等术语混用。</p></header>
      {toc}<Transform3DRoute current="matrix-naming-3d" />
      <LearningNote id="naming-learning"><ul><li>能用 <code>targetFromSource</code> 表达矩阵方向</li><li>理解 Camera 与 View 的互逆关系</li><li>能从变量名检查相邻空间能否连接</li><li>知道常见简称与完整空间命名的对应关系</li></ul></LearningNote>
      <section id="space-naming" className="lesson-section"><h2>把矩阵读成“从哪里到哪里”</h2><p><code>worldFromLocal</code> 接收 Local 坐标并输出 World 坐标。名字中的右侧是输入，左侧是输出，和矩阵作用到列向量的阅读方向一致。</p><div className="space-name-equation"><code>worldPosition</code><span>=</span><code>worldFromLocal</code><span>×</span><code>localPosition</code></div></section>
      <section id="read-the-chain" className="lesson-section"><h2>相邻空间像接口一样首尾相接</h2><p>从右向左读取时，每个矩阵的输入空间都要匹配右侧结果。若出现 <code>viewFromWorld × clipFromView</code>，名称会立即暴露方向错误。</p><SpaceChain /></section>
      <section id="naming-table" className="lesson-section"><h2>完整名称与常见简称对照</h2><p>Model、View、Projection 适合教学和行业交流；方向式名称适合复杂引擎代码。项目可以同时保留注释中的概念简称和变量中的空间方向。</p><NamingTable /></section>
      <section id="contract" className="lesson-section"><h2>统一项目接口约定</h2><p>本站使用列向量、矩阵左乘，组合矩阵写在顶点左侧。JavaScript 数组按 column-major 上传，<code>uniformMatrix4fv</code> 的 transpose 参数保持 <code>false</code>。</p><div className="matrix-contract"><span><strong>Vector</strong><code>column vector</code></span><span><strong>Expression</strong><code>M × position</code></span><span><strong>Storage</strong><code>column-major</code></span><span><strong>Upload</strong><code>transpose = false</code></span></div></section>
      <LessonPagination current="matrix-naming-3d" heading="接下来">命名规则已经固定。最后一页把 Model、View、Projection 的职责、更新频率和 GPU 提交流程收束成完整模式。</LessonPagination>
      <Footer href="https://webgl2fundamentals.org/webgl/lessons/webgl-3d-matrix-naming.html" />
    </article>
  );
}

export function ModelViewProjectionArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>三维基础</span></nav><h1 id="lesson-title" tabIndex={-1}>模型、视图与投影矩阵</h1><p className="lesson-lead">Model 把局部顶点放入世界，View 把世界转换到相机，Projection 把视图空间映射到裁剪空间。三者共同组成每次绘制上传的 MVP。</p></header>
      {toc}<Transform3DRoute current="model-view-projection" />
      <LearningNote id="mvp-learning"><ul><li>能区分 Model、View、Projection 的输入与输出</li><li>能从右向左追踪 Local → World → View → Clip</li><li>知道哪些矩阵按镜头、相机或物体更新</li><li>能组织多个物体共享相机的绘制循环</li></ul></LearningNote>
      <section id="three-responsibilities" className="lesson-section"><h2>三个矩阵各自只负责一段空间转换</h2><div className="mvp-responsibilities"><article><Box aria-hidden="true" /><strong>Model</strong><code>worldFromLocal</code><p>物体的位置、旋转、缩放和层级。</p></article><article><Camera aria-hidden="true" /><strong>View</strong><code>viewFromWorld</code><p>相机世界矩阵的逆，把世界带到镜头前。</p></article><article><Eye aria-hidden="true" /><strong>Projection</strong><code>clipFromView</code><p>FOV、aspect、near、far 与透视除法所需的 W。</p></article></div></section>
      <section id="mvp-chain" className="lesson-section"><h2>完整空间链从顶点一直走到屏幕</h2><p>CPU 组合到 Clip Space，GPU 完成透视除法、viewport 映射、光栅化和深度测试。每个阶段的输入来源与最终去向都可以沿链条追踪。</p><SpaceChain /><CodeBlock label="mvp.ts">{mvpCode}</CodeBlock></section>
      <section id="update-frequency" className="lesson-section"><h2>按变化频率安排矩阵计算</h2><p>Projection 通常随镜头或画布变化，View 随相机变化，Model 随物体变化。先缓存共享部分，可以减少同一帧内重复计算。</p><UpdateFrequency /></section>
      <section id="mvp-lab" className="lesson-section lesson-section--wide"><h2>多物体 MVP 实验</h2><p>三个 F 拥有不同 Model Matrix，共享相机生成的 View 与 Perspective Projection。环绕相机时只更新共享的 ViewProjection。</p><Transform3DPlayground variant="mvp" /></section>
      <section id="complete-3d-flow" className="lesson-section"><h2>三维基础数据流闭环</h2><ul className="resource-checklist"><li><Box aria-hidden="true" /><div><strong>Local → World</strong><span>Position Buffer 由 VAO 读取，Model Matrix 放置每个物体。</span></div></li><li><Camera aria-hidden="true" /><div><strong>World → View → Clip</strong><span>相机逆矩阵和投影矩阵形成共享空间，组合结果上传到 <code>u_matrix</code>。</span></div></li><li><Layers3 aria-hidden="true" /><div><strong>NDC → Fragment</strong><span>GPU 完成透视除法、裁剪、光栅化、面剔除与深度测试。</span></div></li></ul></section>
      <LessonPagination current="model-view-projection" heading="三维基础完成">空间、相机、投影和深度已经连成完整链路。下一章将在这些坐标基础上计算表面方向与光照。</LessonPagination>
      <Footer href="https://webgl2fundamentals.org/webgl/lessons/webgl-3d-matrix-naming.html" />
    </article>
  );
}
