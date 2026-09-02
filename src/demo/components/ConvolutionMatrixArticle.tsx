import { ArrowLeft, ArrowRight, CheckCircle2, Divide, Grid3X3, Orbit, Palette, Sigma } from 'lucide-react';
import type { ReactNode } from 'react';

import { CodeBlock } from './CodeBlock';
import { ConvolutionMatrixPlayground } from './ConvolutionMatrixPlayground';
import { LessonLink } from './LessonLink';

const resultFormula = `output = (
  pixel0 * kernel0 + pixel1 * kernel1 + ... + pixel8 * kernel8
) / divisor + offset`;

const gimpExampleCode = `// 上方中间位置的权重为 1，其余位置为 0。
const kernel = [
  0, 1, 0,
  0, 0, 0,
  0, 0, 0,
];

// 当前像素会读取它上方的像素值 42。
const output = (
  40 * 0 + 42 * 1 + 46 * 0 +
  46 * 0 + 50 * 0 + 55 * 0 +
  52 * 0 + 56 * 0 + 58 * 0
) / 1 + 0; // 42`;

const borderCode = `// Extend：复制最靠近的边缘 Texel
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

// Wrap：从图像另一侧继续采样
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

// Crop：在 Shader 中检测边缘片段，直接输出中心样本。`;

const webglFragmentCode = `vec2 onePixel = 1.0 / vec2(textureSize(u_image, 0));
vec4 center = texture(u_image, v_texCoord);

vec4 sum =
  texture(u_image, v_texCoord + onePixel * vec2(-1, -1)) * u_kernel[0] +
  texture(u_image, v_texCoord + onePixel * vec2( 0, -1)) * u_kernel[1] +
  texture(u_image, v_texCoord + onePixel * vec2( 1, -1)) * u_kernel[2] +
  texture(u_image, v_texCoord + onePixel * vec2(-1,  0)) * u_kernel[3] +
  center                                                     * u_kernel[4] +
  texture(u_image, v_texCoord + onePixel * vec2( 1,  0)) * u_kernel[5] +
  texture(u_image, v_texCoord + onePixel * vec2(-1,  1)) * u_kernel[6] +
  texture(u_image, v_texCoord + onePixel * vec2( 0,  1)) * u_kernel[7] +
  texture(u_image, v_texCoord + onePixel * vec2( 1,  1)) * u_kernel[8];

vec4 convolved = sum / u_divisor + vec4(u_offset);
outColor = mix(center, convolved, u_channelMask);`;

const alphaWeightingCode = `// 透明图像模糊时，可先使用预乘颜色参与卷积。
vec4 sample = texture(u_image, uv);
vec3 weightedRgb = sample.rgb * sample.a;

// 卷积结束后，在 Alpha 大于 0 时恢复直通颜色。
vec3 rgb = convolvedAlpha > 0.0
  ? convolvedPremultipliedRgb / convolvedAlpha
  : vec3(0.0);`;

export function ConvolutionMatrixArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><a href="#lesson-title">学习 WebGL2</a><span aria-hidden="true">/</span><span>二维 · 图像处理</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>卷积矩阵详解</h1>
        <p className="lesson-lead">沿用 GIMP Convolution Matrix 的参数模型，把 Kernel、Divisor、Offset、Border、Channels、Normalize 与 Alpha weighting 映射到 WebGL2 纹理采样。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>Convolution Matrix</li><li>Image Filters</li><li>约 28 分钟</li></ul>
      </header>

      {toc}

      <section className="learning-note" aria-labelledby="convolution-matrix-learning">
        <div className="learning-note__icon" aria-hidden="true"><CheckCircle2 /></div>
        <div><h2 id="convolution-matrix-learning">完成这一节后</h2><ul><li>能把图像理解成按矩形坐标排列的像素矩阵</li><li>能手算一个 3×3 Kernel 的输出</li><li>理解 Divisor 与 Offset 如何调节结果范围</li><li>能比较 Extend、Wrap、Crop 三种边缘策略</li><li>知道通道选择、Normalize 与 Alpha weighting 的用途</li></ul></div>
      </section>

      <section id="image-and-kernel" className="lesson-section">
        <h2>图像矩阵遇到 Kernel</h2>
        <p>图像可以看作二维像素集合，每个像素位于明确的 X、Y 坐标。卷积处理依次访问输出图像的每个位置，以当前像素为中心读取一块邻域，再让邻域数值与 Kernel 中对应位置的权重相乘并求和。</p>
        <p>GIMP 支持 5×5 与 3×3 矩阵。本站实验使用最常见的 3×3 形式：中心像素加周围八个像素，共进行九次纹理采样。</p>
        <div className="convolution-overview" aria-label="图像邻域经过卷积矩阵得到输出像素">
          <span><Grid3X3 aria-hidden="true" /><strong>3×3 像素邻域</strong><small>九个输入颜色</small></span><i>×</i><span><Sigma aria-hidden="true" /><strong>3×3 Kernel</strong><small>九个权重</small></span><i>→</i><span><Palette aria-hidden="true" /><strong>输出像素</strong><small>加权和经过调整</small></span>
        </div>
      </section>

      <section id="one-pixel-example" className="lesson-section">
        <h2>手算一个输出像素</h2>
        <p>GIMP 文档使用一组灰度数值演示计算。Kernel 只有上方中间一项为 1，所以输出会直接取得当前像素上方的值 42。对整张图执行后，每个位置都读取它的上方邻居，视觉内容会整体下移一个像素。</p>
        <CodeBlock label="convolution-example.ts">{gimpExampleCode}</CodeBlock>
      </section>

      <section id="divisor-and-offset" className="lesson-section">
        <h2>Divisor 与 Offset 调整加权和</h2>
        <p><strong>Divisor</strong> 是除数。九个权重全为 1 的均值模糊会产生九项总和，除以 9 后恢复平均亮度。<strong>Offset</strong> 在除法后相加，适合把负结果移回可显示范围；例如边缘检测常配合 128，让正负变化分别落到中灰两侧。</p>
        <CodeBlock label="卷积结果公式">{resultFormula}</CodeBlock>
        <div className="convolution-option-cards"><article><Divide aria-hidden="true" /><h3>Divisor = 9</h3><p>九个邻居取平均，整体亮度保持稳定。</p></article><article><Orbit aria-hidden="true" /><h3>Offset = 128</h3><p>零响应显示为中灰，负值和正值仍可观察。</p></article></div>
      </section>

      <section id="border-modes" className="lesson-section">
        <h2>Border 决定图像边缘外从哪里取值</h2>
        <p>中心像素靠近图像边缘时，Kernel 的一部分会落在纹理范围外。实验提供三种策略，并用 WebGL2 的纹理环绕状态或 Shader 分支实现。</p>
        <dl className="border-mode-list"><div><dt>Extend</dt><dd>使用最靠近的边缘 Texel，映射到 <code>CLAMP_TO_EDGE</code>。</dd></div><div><dt>Wrap</dt><dd>从对边继续读取，映射到 <code>REPEAT</code>。</dd></div><div><dt>Crop</dt><dd>边缘片段保留中心样本，只处理拥有完整 3×3 邻域的位置。</dd></div></dl>
        <CodeBlock label="texture-border.ts">{borderCode}</CodeBlock>
      </section>

      <section id="channels-and-alpha" className="lesson-section">
        <h2>Channels 与 Alpha weighting</h2>
        <p>通道选择决定卷积结果写回 R、G、B、A 中的哪些分量。未选中的通道沿用中心样本。普通彩色滤镜通常处理 RGB 并保留原始 Alpha；需要改变透明轮廓时再启用 A。</p>
        <p>Alpha weighting 用于透明图像。透明像素仍可能保存 RGB，直接模糊容易把隐藏颜色带入边缘。处理时先让 RGB 乘以 Alpha，卷积完成后再按输出 Alpha 恢复颜色，可以减少暗边或彩边。</p>
        <CodeBlock label="alpha-weighting.glsl" language="glsl">{alphaWeightingCode}</CodeBlock>
      </section>

      <section id="normalise" className="lesson-section">
        <h2>Normalize 自动推导结果调整</h2>
        <p>启用 Normalize 后，正权重和直接成为 Divisor。权重和为零时无法执行除法，实验使用 Divisor 1 与 Offset 128；权重和为负数时使用其绝对值作为 Divisor，并设置 Offset 255。这套行为对应 GIMP 文档描述的自动范围修正。</p>
      </section>

      <section id="convolution-matrix-lab" className="lesson-section lesson-section--wide">
        <h2>完整卷积矩阵实验</h2>
        <p>先选择“下移一像素”复现文档示例，再切换锐化、边缘检测与浮雕。你也可以直接编辑九个权重，控制 Divisor、Offset、Border 和 RGBA 通道。输入图像由站内 Canvas 生成，参数变化后会重新执行一次 WebGL2 Draw Call。</p>
        <ConvolutionMatrixPlayground />
      </section>

      <section id="webgl-mapping" className="lesson-section">
        <h2>在片段着色器中映射这些选项</h2>
        <p><code>textureSize</code> 给出纹理尺寸，它的倒数就是相邻 Texel 的 UV 步长。九个样本乘以 <code>u_kernel[9]</code>，随后应用 <code>u_divisor</code> 和 <code>u_offset</code>。<code>u_channelMask</code> 决定保留中心样本还是写入卷积结果。</p>
        <CodeBlock label="fragment.glsl · 核心计算" language="glsl">{webglFragmentCode}</CodeBlock>
        <p>组件卸载时会删除原始 Texture、两张离屏 Texture、Framebuffer、Buffer、VAO 和 Program，GPU 资源生命周期到此结束。</p>
      </section>

      <section id="next-steps" className="lesson-section next-steps lesson-pagination">
        <LessonLink lessonId="convolution-kernels"><ArrowLeft aria-hidden="true" /> 卷积核</LessonLink>
        <div><h2>继续学习</h2><p>现在已经掌握卷积矩阵的完整参数模型。下一页回到常用效果，比较几组经典 Kernel 的视觉特征。</p></div>
        <LessonLink className="next-steps__link" lessonId="image-effects">模糊、锐化与边缘检测 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>

      <footer className="lesson-footer">
        <p>本文依据 GIMP 2.6 Convolution Matrix 文档整理，并将桌面图像编辑器选项映射到 WebGL2。</p>
        <div className="lesson-footer__links"><a href="https://docs.gimp.org/2.6/en/plug-in-convmatrix.html" target="_blank" rel="noreferrer">阅读 GIMP 原文</a><a href="https://webgl2fundamentals.org/webgl/lessons/zh_cn/webgl-image-processing.html" target="_blank" rel="noreferrer">查看 WebGL2 卷积实现</a></div>
      </footer>
    </article>
  );
}
