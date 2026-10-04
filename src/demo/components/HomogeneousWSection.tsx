import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { HomogeneousWLab } from './MathLabs';

const translationCode = `// 下面按行展示矩阵；最后一列是平移量。
        [ 1  0  0  tx ]   [ x ]   [ x + tx × w ]
T · p = [ 0  1  0  ty ] · [ y ] = [ y + ty × w ]
        [ 0  0  1  tz ]   [ z ]   [ z + tz × w ]
        [ 0  0  0   1 ]   [ w ]   [      w     ]

// 同一份平移：t = (3, 2, 0)
T · (2, 1, 0, 1) = (5, 3, 0, 1)  // 位置加上平移
T · (2, 1, 0, 0) = (2, 1, 0, 0)  // 方向保持不变`;

const homogeneousVertexCode = `#version 300 es
precision highp float;

in vec3 a_position;
uniform mat4 u_model;
uniform mat4 u_viewProjection;
uniform vec3 u_velocity;
out vec3 v_worldVelocity;

void main() {
  // Buffer 中的位置补上 w = 1，让模型矩阵的平移列参与计算。
  vec4 worldPosition = u_model * vec4(a_position, 1.0);

  // 速度是方向与长度；w = 0 排除平移，xyz 保留变换后的三维向量。
  v_worldVelocity = (u_model * vec4(u_velocity, 0.0)).xyz;

  // 输出完整裁剪坐标；投影产生的 w 留给 GPU 后续的透视除法。
  gl_Position = u_viewProjection * worldPosition;
}`;

export function HomogeneousWSection() {
  return (
    <section id="homogeneous-w" className="lesson-section lesson-section--wide" tabIndex={-1}>
      <h2>w：让位置和方向共用一个矩阵</h2>
      <p><code>vec4</code> 有四个分量 <code>x、y、z、w</code>。表示三维位置和方向时，我们把前三个空间分量扩展成<strong>齐次坐标（homogeneous coordinates）</strong>，用第四个分量参与矩阵运算。<code>w</code> 的含义由数据用途决定；例如存 RGBA 的 <code>vec4</code> 中，<code>.w</code> 与 <code>.a</code> 都读取 alpha。</p>

      <h3>为什么位置补 1，方向补 0？</h3>
      <p>只看平移矩阵，输出的 X 分量是 <code>x′ = x + tx × w</code>，Y、Z 同理。位置用 <code>w = 1</code>，会加上整份平移；方向用 <code>w = 0</code>，平移项的贡献为 0。这个差别直接来自乘法中的最后一项。</p>
      <CodeBlock label="平移矩阵 × 齐次坐标" language="text">{translationCode}</CodeBlock>
      <p>因此，两个位置相减时，第四个分量也满足 <code>1 − 1 = 0</code>，结果成为方向；位置加位移满足 <code>1 + 0 = 1</code>，结果仍是位置。这与上一节“终点减起点”的规则一致。</p>

      <div id="w-translation-lab" className="homogeneous-w-lab" tabIndex={-1}>
        <h3>实验：对照位置与方向</h3>
        <p>两项输入都是 <code>(2, 1, 0)</code>，只改变第四个分量。调整平移量，比较位置 P 和方向 d。图中显示 XY 平面，Z 始终为 0。</p>
        <HomogeneousWLab />
      </div>

      <h3>w 可以取 0 和 1 之外的值吗？</h3>
      <p>可以。对于有限位置，只要 <code>w ≠ 0</code>，就能用 <code>(x / w, y / w, z / w)</code> 还原普通三维坐标。例如 <code>(2, 1, 0, 1)</code> 与 <code>(4, 2, 0, 2)</code> 都还原为 <code>(2, 1, 0)</code>。把四个分量同时乘同一个非零数，会保留这份位置表示；取 <code>w = 1</code> 只是常用写法。</p>
      <p><code>w = 0</code> 表示方向，无法通过除以 w 得到一个有限位置。计算三维方向的长度、单位化或光照时，使用 <code>vec3</code> 的 xyz 分量；<code>normalize(vec4(...))</code> 会把 w 也计入四维长度。</p>

      <h3 id="clip-w">输入的 w = 1，为何 gl_Position.w 会变化？</h3>
      <p><code>vec4(a_position, 1.0)</code> 表示输入位置；<code>gl_Position</code> 则是经过模型、视图和投影变换后的<strong>裁剪坐标</strong>。投影矩阵可以改变 w。GPU 对裁剪后的顶点执行<strong>透视除法</strong>，把 <code>gl_Position.xyz / gl_Position.w</code> 转成归一化设备坐标（NDC），再通过 viewport 映射到画布。</p>
      <p>单看这次除法，<code>(1, 0.5, 0, 1)</code> 得到 NDC <code>(1, 0.5, 0)</code>；保持 xyz 不变、把 w 改为 2，则得到 <code>(0.5, 0.25, 0)</code>，更靠近画面中心。与上面的等价表示相比，这里只改了 w。常见透视矩阵让 w 与相机空间深度关联，由此产生远处物体看起来更小的效果。</p>
      <p>下面的 <code>a_position</code> 来自顶点 Buffer；JavaScript 在绘制前通过 Uniform 上传模型矩阵 <code>u_model</code>、视图投影矩阵 <code>u_viewProjection</code> 和速度 <code>u_velocity</code>。顶点着色器把位置送到 <code>gl_Position</code>，把变换后的速度通过 Varying 传给片段着色器。</p>
      <CodeBlock label="vertex.glsl · 位置与方向的写法" language="glsl">{homogeneousVertexCode}</CodeBlock>
      <p>保留矩阵算出的 <code>gl_Position.w</code>。将 xyz 手动除以 w 后再把 w 设为 1，会改变后续裁剪与透视正确插值所需的数据。</p>
      <p>这里的方向规则适用于速度、位移等普通向量。表面法线还要保持与表面的垂直关系；模型含非均匀缩放时，应使用<LessonLink lessonId="inverse-and-normals" hash="normal-problem">逆转置法线矩阵</LessonLink>。接下来可在<LessonLink lessonId="matrix-math" hash="homogeneous-coordinates">矩阵课的齐次坐标部分</LessonLink>继续看平移列与矩阵组合。</p>
    </section>
  );
}
