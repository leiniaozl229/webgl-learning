import { ArrowLeft, ArrowRight, CheckCircle2, CircleDot, Combine, Expand, Move, RotateCw, Rows3 } from 'lucide-react';
import type { ReactNode } from 'react';

import { MATRIX_TRANSFORM_VERTEX_SHADER } from '../../core/transforms2d';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { Transform2DPlayground } from './Transform2DPlayground';

const fGeometryCode = `// 18 个顶点组成 6 个三角形，局部原点固定在 (0, 0)。
const positions = new Float32Array([
  // 左竖
   0,   0,  30,   0,   0, 150,
   0, 150,  30,   0,  30, 150,
  // 上横
  30,   0, 100,   0,  30,  30,
  30,  30, 100,   0, 100,  30,
  // 中横
  30,  60,  67,  60,  30,  90,
  30,  90,  67,  60,  67,  90,
]);

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);`;

const translationShaderCode = `#version 300 es
layout(location = 0) in vec2 a_position;

uniform vec2 u_resolution;
uniform vec2 u_translation;

void main() {
  vec2 position = a_position + u_translation;
  vec2 clipSpace = position / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
}`;

const translationDrawCode = `// 滑块只改变这两个 JavaScript 数值。
const translation = new Float32Array([x, y]);

gl.useProgram(program);
gl.bindVertexArray(vao);
gl.uniform2f(resolutionLocation, canvas.clientWidth, canvas.clientHeight);
gl.uniform2fv(translationLocation, translation);
gl.drawArrays(gl.TRIANGLES, 0, 18);`;

const rotationCode = `const radians = degrees * Math.PI / 180;
const sine = Math.sin(radians);
const cosine = Math.cos(radians);

// u_rotation.x 保存 sin，u_rotation.y 保存 cos。
gl.uniform2f(rotationLocation, sine, cosine);`;

const rotationShaderCode = `vec2 rotated = vec2(
  a_position.x * u_rotation.y - a_position.y * u_rotation.x,
  a_position.x * u_rotation.x + a_position.y * u_rotation.y
);

vec2 position = rotated + u_translation;`;

const scaleShaderCode = `vec2 scaled = a_position * u_scale;

vec2 rotated = vec2(
  scaled.x * u_rotation.y - scaled.y * u_rotation.x,
  scaled.x * u_rotation.x + scaled.y * u_rotation.y
);

vec2 position = rotated + u_translation;`;

const matrixHelpersCode = `type Matrix3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

const translation = (tx: number, ty: number): Matrix3 => [
  1, 0, 0,
  0, 1, 0,
  tx, ty, 1,
];

const rotation = (radians: number): Matrix3 => {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [c, s, 0, -s, c, 0, 0, 0, 1];
};

const scaling = (sx: number, sy: number): Matrix3 => [
  sx, 0, 0,
  0, sy, 0,
  0, 0, 1,
];`;

const projectionCode = `const projection = (width: number, height: number): Matrix3 => [
   2 / width,           0, 0,
           0, -2 / height, 0,
          -1,           1, 1,
];

// 像素 (0, 0) → 裁剪空间 (-1, +1)
// 像素 (width, height) → 裁剪空间 (+1, -1)`;

const compositionCode = `// 右侧矩阵先作用到顶点。
// 实际顺序：缩放 → 旋转 → 平移 → 投影
let matrix = multiply(rotationMatrix, scaleMatrix);
matrix = multiply(translationMatrix, matrix);
matrix = multiply(projectionMatrix, matrix);

gl.useProgram(matrixProgram);
gl.uniformMatrix3fv(matrixLocation, false, matrix);
gl.drawArrays(gl.TRIANGLES, 0, 18);`;

const alternateOrderCode = `// 顺序 A：缩放 → 旋转 → 平移
const orderA = projection * translation * rotation * scale;

// 顺序 B：平移 → 旋转 → 缩放
const orderB = projection * scale * rotation * translation;

// 乘法顺序写在 CPU 端，Shader 始终只有一条矩阵乘法。
gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1);`;

function LearningNote({ id, children }: { id: string; children: ReactNode }) {
  return <section className="learning-note" aria-labelledby={id}><div className="learning-note__icon" aria-hidden="true"><CheckCircle2 /></div><div><h2 id={id}>完成这一节后</h2>{children}</div></section>;
}

function Footer({ href }: { href: string }) {
  return <footer className="lesson-footer"><p>示例使用 CSS 像素描述二维几何，Canvas 绘图缓冲区会按设备像素比同步调整。</p><a href={href} target="_blank" rel="noreferrer">阅读参考教程</a></footer>;
}

export function Translation2DArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>二维变换</span></nav><h1 id="lesson-title" tabIndex={-1}>二维平移</h1><p className="lesson-lead">顶点坐标只上传一次。每次绘制通过 <code>u_translation</code> 给所有顶点增加相同偏移，让复杂几何整体移动。</p><ul className="lesson-meta" aria-label="课程信息"><li>Translation</li><li>vec2 Uniform</li><li>约 16 分钟</li></ul></header>
      {toc}
      <LearningNote id="translation-learning"><ul><li>理解局部坐标与 Canvas 像素坐标的关系</li><li>能说明平移量怎样从滑块进入顶点着色器</li><li>知道为何几何 Buffer 无需随位置变化重复上传</li><li>能在重绘前更新 <code>u_translation</code></li></ul></LearningNote>

      <section id="local-geometry" className="lesson-section"><h2>几何体保留在局部坐标</h2><p>字母 F 由六个三角形组成，18 个顶点都围绕局部原点 <code>(0, 0)</code>。这份 <code>Float32Array</code> 在初始化阶段用 <code>STATIC_DRAW</code> 上传，后续位置变化不会改写 Buffer。</p><CodeBlock label="f-geometry.ts">{fGeometryCode}</CodeBlock></section>

      <section id="translation-uniform" className="lesson-section"><h2>一个 Uniform 移动全部顶点</h2><p><code>u_translation</code> 在一次 Draw Call 中保持一致，因此 18 次顶点着色器调用都会加上同一个 X、Y 偏移。得到的像素位置继续换算到裁剪空间。</p><CodeBlock label="vertex.glsl" language="glsl">{translationShaderCode}</CodeBlock></section>

      <section id="translation-lab" className="lesson-section lesson-section--wide"><h2>移动局部原点</h2><p>拖动 X、Y。十字标记显示局部原点到 Canvas 左上角的距离，字母 F 的每个顶点都相对该点保持原有布局。</p><Transform2DPlayground variant="translation" /></section>

      <section id="translation-redraw" className="lesson-section"><h2>滑块变化只更新状态并重绘</h2><p>TypedArray 中的顶点仍留在 GPU Buffer。页面选择 Program 和 VAO，上传新的两个平移数值，然后再次处理 18 个顶点。</p><CodeBlock label="draw-translation.ts">{translationDrawCode}</CodeBlock></section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination"><LessonLink lessonId="multi-pass-image-processing"><ArrowLeft aria-hidden="true" /> 多阶段图像处理</LessonLink><div><h2>接下来</h2><p>位置偏移已经独立于几何数据。下一页使用单位圆上的正弦和余弦，让同一组局部顶点围绕原点旋转。</p></div><LessonLink className="next-steps__link" lessonId="rotation-2d">二维旋转 <ArrowRight aria-hidden="true" /></LessonLink></section>
      <Footer href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-2d-translation.html" />
    </article>
  );
}

export function Rotation2DArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>二维变换</span></nav><h1 id="lesson-title" tabIndex={-1}>二维旋转</h1><p className="lesson-lead">把界面角度转换为弧度，用单位圆上的 <code>sin</code> 与 <code>cos</code> 混合 X、Y 分量，使几何体围绕局部原点转动。</p><ul className="lesson-meta" aria-label="课程信息"><li>Rotation</li><li>Radians</li><li>约 20 分钟</li></ul></header>
      {toc}
      <LearningNote id="rotation-learning"><ul><li>理解角度、弧度、正弦和余弦的连接</li><li>能追踪角度从 UI 到 <code>u_rotation</code> 的路径</li><li>能计算二维点绕原点旋转后的坐标</li><li>知道平移与旋转的执行顺序会影响旋转中心</li></ul></LearningNote>

      <section id="unit-circle" className="lesson-section"><h2>单位圆提供旋转所需的两个数</h2><p>半径为 1 的圆叫单位圆。角度确定圆上的一点，它的横向分量是 <code>cos</code>，纵向分量是 <code>sin</code>。二者会随角度连续变化，同时保持 <code>sin² + cos² = 1</code>。</p><div className="concept-cards"><article><CircleDot aria-hidden="true" /><h3>0°</h3><p><code>sin = 0</code>，<code>cos = 1</code>，几何保持初始方向。</p></article><article><RotateCw aria-hidden="true" /><h3>90°</h3><p><code>sin = 1</code>，<code>cos = 0</code>，X 轴方向转向页面下方。</p></article></div></section>

      <section id="radians" className="lesson-section"><h2>界面显示角度，代码使用弧度</h2><p>JavaScript 的三角函数接收弧度。一整圈是 <code>2π</code>，180° 是 <code>π</code>。页面读取滑块角度后先乘以 <code>Math.PI / 180</code>。</p><CodeBlock label="rotation-uniform.ts">{rotationCode}</CodeBlock></section>

      <section id="rotation-formula" className="lesson-section"><h2>X 与 Y 互相贡献分量</h2><p>旋转后的 X 同时使用原始 X、Y，旋转后的 Y 也使用两个分量。Canvas 的 Y 轴朝下，当前公式让正角度在页面上顺时针增长。</p><CodeBlock label="vertex.glsl · 旋转部分" language="glsl">{rotationShaderCode}</CodeBlock></section>

      <section id="rotation-lab" className="lesson-section lesson-section--wide"><h2>旋转实验</h2><p>单位圆会同步显示当前 <code>sin</code> 和 <code>cos</code>。平移改变旋转后的整体位置，局部原点仍是字母 F 的旋转中心。</p><Transform2DPlayground variant="rotation" /></section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination"><LessonLink lessonId="translation-2d"><ArrowLeft aria-hidden="true" /> 二维平移</LessonLink><div><h2>接下来</h2><p>旋转会混合两个坐标分量。下一页分别乘 X、Y 比例，控制宽度、高度和翻转方向。</p></div><LessonLink className="next-steps__link" lessonId="scale-2d">二维缩放 <ArrowRight aria-hidden="true" /></LessonLink></section>
      <Footer href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-2d-rotation.html" />
    </article>
  );
}

export function Scale2DArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>二维变换</span></nav><h1 id="lesson-title" tabIndex={-1}>二维缩放</h1><p className="lesson-lead">用 <code>u_scale</code> 分别乘顶点的 X、Y，改变几何体相对局部原点的距离，并观察零值压扁与负值翻转。</p><ul className="lesson-meta" aria-label="课程信息"><li>Scale</li><li>Negative Scale</li><li>约 15 分钟</li></ul></header>
      {toc}
      <LearningNote id="scale-learning"><ul><li>能解释缩放为何围绕局部原点发生</li><li>理解 X、Y 独立缩放的效果</li><li>知道 0 和负缩放值的几何含义</li><li>能说明缩放、旋转、平移当前的执行顺序</li></ul></LearningNote>

      <section id="scale-distance" className="lesson-section"><h2>缩放改变顶点到原点的距离</h2><p>比例 2 会让对应轴上的距离变成两倍，0.5 会缩短为一半。局部原点的坐标一直是零，乘任何有限比例仍为零，所以它保持固定。</p><div className="transform-equations"><span><strong>X′</strong><code>X × scaleX</code></span><span><strong>Y′</strong><code>Y × scaleY</code></span></div></section>

      <section id="scale-order" className="lesson-section"><h2>先缩放，再旋转和平移</h2><p>顶点着色器先生成 <code>scaled</code>，然后旋转该结果，最后加上平移量。三步处理的输出依次成为下一步输入。</p><CodeBlock label="vertex.glsl · 变换部分" language="glsl">{scaleShaderCode}</CodeBlock></section>

      <section id="scale-lab" className="lesson-section lesson-section--wide"><h2>缩放与翻转实验</h2><p>把某一轴拖到 0，几何会沿该轴压成一条线。继续拖到负数后，顶点跨过局部原点，字母方向发生镜像翻转。</p><Transform2DPlayground variant="scale" /></section>

      <section id="negative-scale" className="lesson-section"><h2>负缩放同时改变朝向</h2><p><code>scaleX = -1</code> 会水平翻转且保持宽度，<code>scaleY = -1</code> 会垂直翻转。两个轴都为负数时，视觉效果等价于围绕局部原点旋转 180°。</p></section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination"><LessonLink lessonId="rotation-2d"><ArrowLeft aria-hidden="true" /> 二维旋转</LessonLink><div><h2>接下来</h2><p>三类变换目前对应三组公式和 Uniform。下一页把二维点扩展成齐次坐标，用 3×3 矩阵表达它们。</p></div><LessonLink className="next-steps__link" lessonId="matrices-2d">二维矩阵 <ArrowRight aria-hidden="true" /></LessonLink></section>
      <Footer href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-2d-scale.html" />
    </article>
  );
}

export function Matrices2DArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>二维变换</span></nav><h1 id="lesson-title" tabIndex={-1}>二维矩阵</h1><p className="lesson-lead">把二维点写成 <code>(x, y, 1)</code>，让一个 3×3 矩阵同时保存线性变换与平移，再将像素空间直接投影到裁剪空间。</p><ul className="lesson-meta" aria-label="课程信息"><li>mat3</li><li>Homogeneous Coordinates</li><li>约 24 分钟</li></ul></header>
      {toc}
      <LearningNote id="matrix-learning"><ul><li>理解齐次坐标中第三个分量的用途</li><li>能识别单位、平移、旋转、缩放和投影矩阵</li><li>知道 TypeScript 数组与 GLSL <code>mat3</code> 的列主序布局</li><li>能把组合矩阵上传到 <code>u_matrix</code></li></ul></LearningNote>

      <section id="homogeneous-coordinate" className="lesson-section"><h2>二维点增加一个值 1</h2><p>二维线性变换可以用 2×2 矩阵表示，平移需要额外的常量项。把点扩展为 <code>vec3(x, y, 1)</code> 后，3×3 矩阵的第三列就能保存 X、Y 平移量。</p><div className="matrix-anatomy" aria-label="二维平移矩阵"><span>1</span><span>0</span><strong>tx</strong><span>0</span><span>1</span><strong>ty</strong><span>0</span><span>0</span><span>1</span></div></section>

      <section id="matrix-factories" className="lesson-section"><h2>每种变换生成一种矩阵</h2><p>单位矩阵保持输入不变。平移矩阵存储 <code>tx</code>、<code>ty</code>，旋转矩阵存储 <code>sin</code>、<code>cos</code>，缩放矩阵把比例放在主对角线上。</p><CodeBlock label="mat3.ts · 变换矩阵">{matrixHelpersCode}</CodeBlock></section>

      <section id="projection-matrix" className="lesson-section"><h2>投影矩阵完成像素到裁剪空间的换算</h2><p>投影矩阵把左上原点的 CSS 像素范围映射到 WebGL2 裁剪空间，同时翻转 Y 轴。Canvas 绘图缓冲区可使用更高设备像素比，几何布局仍按 CSS 像素计算。</p><CodeBlock label="mat3.ts · 投影矩阵">{projectionCode}</CodeBlock></section>

      <section id="matrix-shader" className="lesson-section"><h2>顶点着色器收敛为一次乘法</h2><p>CPU 先构造当前组合矩阵，再通过 <code>uniformMatrix3fv</code> 上传。每个顶点调用只需把位置扩展为 <code>vec3</code> 并乘以 <code>u_matrix</code>。</p><CodeBlock label="vertex.glsl" language="glsl">{MATRIX_TRANSFORM_VERTEX_SHADER}</CodeBlock></section>

      <section id="matrix-lab" className="lesson-section lesson-section--wide"><h2>观察实际上传的 mat3</h2><p>拖动任意参数，实验下方九个数值会同步更新。界面按数学行展示；WebGL2 上传的 TypedArray 使用列主序排列，并将 <code>transpose</code> 参数保持为 <code>false</code>。</p><Transform2DPlayground variant="matrix" /></section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination"><LessonLink lessonId="scale-2d"><ArrowLeft aria-hidden="true" /> 二维缩放</LessonLink><div><h2>接下来</h2><p>一个矩阵已经覆盖全部变换。最后一页专门比较矩阵乘法顺序，并建立可复用的组合写法。</p></div><LessonLink className="next-steps__link" lessonId="unified-2d-transforms">统一表达二维变换 <ArrowRight aria-hidden="true" /></LessonLink></section>
      <Footer href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-2d-matrices.html" />
    </article>
  );
}

export function Unified2DTransformsArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero"><nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>二维变换</span></nav><h1 id="lesson-title" tabIndex={-1}>使用矩阵统一表达二维变换</h1><p className="lesson-lead">固定顶点着色器的矩阵接口，把投影、平移、旋转与缩放全部放在 CPU 端组合，并用乘法顺序明确空间转换过程。</p><ul className="lesson-meta" aria-label="课程信息"><li>Composition</li><li>Transform Order</li><li>约 22 分钟</li></ul></header>
      {toc}
      <LearningNote id="unified-learning"><ul><li>能从右向左读出矩阵作用到顶点的顺序</li><li>理解矩阵乘法不满足交换律</li><li>能在不修改 Shader 的情况下改变变换顺序</li><li>能追踪完整的 CPU → Uniform → 顶点 → Canvas 流程</li></ul></LearningNote>

      <section id="composition" className="lesson-section"><h2>组合矩阵把多个步骤连接起来</h2><p>每个矩阵接收前一步坐标并输出下一空间坐标。表达式 <code>P × T × R × S × position</code> 从右向左执行：局部点先缩放、再旋转和平移，最后由投影矩阵进入裁剪空间。</p><div className="composition-flow" aria-label="二维矩阵组合数据流"><span><Expand aria-hidden="true" /><strong>Scale</strong></span><i>→</i><span><RotateCw aria-hidden="true" /><strong>Rotate</strong></span><i>→</i><span><Move aria-hidden="true" /><strong>Translate</strong></span><i>→</i><span><Rows3 aria-hidden="true" /><strong>Projection</strong></span></div></section>

      <section id="cpu-composition" className="lesson-section"><h2>CPU 组合，GPU 重复使用</h2><p>交互参数变化时，TypeScript 重新计算九个数值并上传一次。GPU 随后对 18 个顶点重复使用同一个 <code>u_matrix</code>，Buffer 和 VAO 都保持原状态。</p><CodeBlock label="draw-transform.ts">{compositionCode}</CodeBlock></section>

      <section id="order-matters" className="lesson-section"><h2>乘法顺序改变坐标空间</h2><p>缩放放在平移之前时，平移量保持原值；平移放在缩放之前时，平移向量也会被缩放。旋转同样会改变后续平移轴的方向，因此矩阵交换位置通常会得到另一幅画面。</p><CodeBlock label="transform-orders.ts">{alternateOrderCode}</CodeBlock></section>

      <section id="order-lab" className="lesson-section lesson-section--wide"><h2>用同一组参数比较两种顺序</h2><p>先设置明显的平移、旋转和非等比缩放，再切换实际执行顺序。Shader、几何和 Uniform 类型全部保持一致，画面变化只来自 CPU 组合出的九个矩阵元素。</p><Transform2DPlayground variant="unified" /></section>

      <section id="complete-flow" className="lesson-section"><h2>二维变换学习闭环</h2><ul className="resource-checklist"><li><Combine aria-hidden="true" /><div><strong>输入与创建</strong><span>局部 F 顶点进入静态 Buffer，VAO 保存属性读取规则。</span></div></li><li><Rows3 aria-hidden="true" /><div><strong>绑定与提交</strong><span>页面选择 Program、VAO，上传组合 <code>mat3</code>，随后调用 <code>drawArrays</code>。</span></div></li><li><Move aria-hidden="true" /><div><strong>输出与清理</strong><span>18 次顶点调用生成裁剪空间位置，片段写入 Canvas；卸载时删除 Buffer、VAO 与 Program。</span></div></li></ul></section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination"><LessonLink lessonId="matrices-2d"><ArrowLeft aria-hidden="true" /> 二维矩阵</LessonLink><div><h2>二维章节完成</h2><p>图像处理、平移、旋转、缩放与矩阵组合已经连成完整二维路径。下一章可以从三维正射投影开始，把 <code>mat3</code> 扩展为 <code>mat4</code>。</p></div><span /></section>
      <Footer href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-2d-matrices.html" />
    </article>
  );
}
