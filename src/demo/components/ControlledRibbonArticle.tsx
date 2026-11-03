import type { ReactNode } from 'react';
import { ControlledRibbonLab } from './ControlledRibbonLab';
import { LessonLink } from './LessonLink';
import { LessonPagination } from './LessonPagination';
import { RibbonTwistDiagram } from './RibbonTwistDiagram';
import '../openshaders.css';
import '../controlled-ribbon.css';

const knobs = [
  ['光带走向', '五个控制点，Hermite 插值成亮边曲线', '拖动预览中的圆点'],
  ['飘逸感', '控制点绕中心沿李萨如轨迹移动，相位逐点延后，波从根部传到末端', '飘动幅度、传播延迟'],
  ['亮结流动', '扭转角减去 时间 × 流速，亮结顺着光带移动', '亮结流速'],
  ['宽窄', '宽度沿长度变化：根部收窄、中段展开、末端再收', '宽度、根部收窄、末端收窄'],
  ['亮边锐利度', '细线间距 = tᵞ：γ 越大，细线越挤向亮边', '亮边集中度 γ'],
  ['翻转与亮结', '横向偏移乘 cos(扭转角)，转到侧面时所有细线叠在一起', '扭转圈数'],
  ['清晰或朦胧', '每条细线的衰减半径', '柔和度'],
  ['光面里不露线条', '发光半径随细线间距放大，总光量不变', '光面平滑'],
  ['外缘柔和消失', '外侧细线乘以渐隐权重 1 − smoothstep(1 − f, 1, t)', '外缘渐隐'],
  ['光面里的丝纹', '每层独立的小幅波动，t 越大波动越大', '层间流动'],
  ['冷暖分区', '颜色按层号插值：亮边一种色相，光面另一种', '亮边色相、光面色相'],
] as const;

export function ControlledRibbonArticle({ toc }: { toc?: ReactNode }) {
  return <article className="lesson-article controlled-ribbon-article">
    <header className="lesson-hero">
      <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGL2</LessonLink><span aria-hidden="true">/</span><span>Shader 实战</span></nav>
      <h1 id="lesson-title" tabIndex={-1}>可控光带：亮边与柔光面</h1>
      <p className="lesson-lead">OpenShaders 的光丝好看，但形状只能靠迭代参数间接碰运气。保留它“多层发光细线叠加”的做法，把每一层画在哪交给我们指定：拖动控制点决定走向，一个参数决定亮边有多锐。</p>
      <ul className="lesson-meta" aria-label="课程信息"><li>可拖动控制点</li><li>原生 WebGL2，单遍绘制</li><li>约 15 分钟</li></ul>
    </header>
    {toc}
    <section id="ribbon-lab" className="lesson-section lesson-section--wide">
      <h2>拖动亮边，调出光面</h2>
      <p>预览里的五个圆点就是亮边经过的位置。先拖动它们定下走向，再调“亮边集中度 γ”和“柔和度”。切到“OpenShaders 原版对照”可以比较质感；勾选“白色页面”可以看它放在清华页面上的样子。</p>
      <ControlledRibbonLab />
    </section>

    <section id="borrow-openshaders" className="lesson-section">
      <h2>从 OpenShaders 借来的两件事</h2>
      <p><strong>第一，光斑衰减。</strong>每条细线的亮度是 <code>ε / (d² + ε)</code>，d 是到细线的距离。中心等于 1，越远衰减越慢，拖出很长的尾巴。所以亮芯和柔光来自同一个公式，不需要额外的模糊遍。</p>
      <p><strong>第二，多层叠加。</strong>OpenShaders 每次迭代把坐标稍微折一下，再查一个光斑，96 层叠在一起。相邻层靠得近的地方，光斑重叠成一条亮线；离得远的地方，铺成一片柔光。亮边和光面是同一组层在不同位置的疏密。</p>
      <p>它的形状来自折叠矩阵和正弦扭曲的迭代，改一个参数，整体形态一起变。这里换掉的只有这一部分：第 i 层不再由迭代决定位置，而是直接画在“亮边曲线 + 宽度 × 偏移”上。原版的拆解见 <LessonLink lessonId="openshaders-breakdown">OpenShaders 效果拆解</LessonLink>。</p>
    </section>

    <section id="edge-from-spacing" className="lesson-section lesson-section--wide">
      <h2>亮边来自细线的疏密</h2>
      <p>第 i 层的横向位置是 s = tᵞ，t 从 0 到 1 均匀分布。γ = 1 时细线等距，光面亮度均匀，看不出亮边。γ 变大，t 小的那些细线挤在亮边附近，叠出一条亮线；t 大的细线间距变宽，亮度随之下降，形成从亮边向外渐隐的光面。</p>
      <p>扭转让偏移再乘上 cos(扭转角)。转到 cos 接近 0 的地方，所有细线都回到亮边上，亮度叠成一个亮结；过了这一点 cos 变号，光面翻到亮边的另一侧。亮结的位置由扭转圈数控制，不再靠迭代偶然出现。</p>
      <RibbonTwistDiagram />
      <p>总亮度除以层数。增加层数只会让光面更细腻，整体亮度不变。</p>
      <p>光带很宽、γ 很大时，光面外侧相邻细线的间距会超过发光半径，露出一根根线条。“光面平滑”让每条细线的发光半径至少是本层间距的若干倍：间距 = |宽度 × 扭转| × γ·t^(γ−1) / 层数。半径变大时峰值按比例降低，每条线的总光量不变，光面明暗仍然只由细线疏密决定。亮边附近的间距很小，半径停在原来的柔和度，亮边保持锐利。设为 0 可以找回丝线质感。</p>
    </section>

    <section id="edge-curve" className="lesson-section">
      <h2>用控制点设计走向</h2>
      <p>亮边是 y = C(x) 的曲线，经过五个控制点。每两个点之间用三次 Hermite 插值，切线取前后两点连线的斜率（Catmull-Rom 的取法），所以曲线经过每个点并且平滑连接。两端之外沿端点切线直线延伸，再随长度渐隐。</p>
      <p>控制点的 x 必须从左到右递增，曲线才是 x 的函数；拖动时会被夹在左右两个邻点之间。距离用竖直差除以 √(1 + C′²) 近似为垂直距离，曲线陡的地方光带不会变细。界面上的虚线由同一套插值公式在 JavaScript 里算出。</p>
    </section>

    <section id="drift" className="lesson-section">
      <h2>让控制点飘起来</h2>
      <p>控制点钉死时，光带只能在原地抖动。这里把圆点当作飘动的中心：第 i 个点沿一条椭圆形的李萨如轨迹移动，相位比前一个晚“传播延迟”弧度，幅度按 (i / 4)^0.8 从根部的 0 增大到末端。效果是一个波从根部出发、沿光带传到末端，根部保持不动，末端甩得最开，像丝带在风里飘。</p>
      <p>轨迹由两个频率不成整数比的正弦相加，很长时间才重复一次，看起来是飘而不是摆。点的位置每帧在 JavaScript 中算好，作为 Uniform 上传；x 方向的幅度较小，并强制保持递增，曲线始终是 x 的函数。扭转的亮结用同样的思路：角度减去 时间 × 流速，亮结顺着光带流走。宽度的起伏也带着沿长度的相位，从根部向末端传播。</p>
    </section>

    <section id="parameter-map" className="lesson-section">
      <h2>参数对照</h2>
      <div className="ribbon-style-table ribbon-knobs"><table><thead><tr><th>想要的效果</th><th>做法</th><th>对应参数</th></tr></thead><tbody>{knobs.map(([goal, method, control]) => <tr key={goal}><th scope="row">{goal}</th><td>{method}</td><td>{control}</td></tr>)}</tbody></table></div>
      <p>每个片段的成本约为“层数 × 一次光斑衰减”，40 层与 OpenShaders 的 96 层相比更省。光带是平滑的场，可以按 ¾ 或 ½ 的分辨率绘制，再由浏览器放大。</p>
    </section>

    <LessonPagination current="controlled-ribbon" heading="继续实验">打开副光带，把亮边夹在两片光面之间；或者把 γ 调到 1，确认亮边确实来自细线的疏密。想看很多条光带怎样从一个点生长、衰老和消散，接着读下一篇光带发射器原理。</LessonPagination>
    <footer className="lesson-footer"><p>可控光带为独立教学实现，光斑衰减与配色沿用本站 OpenShaders 研究与清华页面的参数。</p><div className="lesson-footer__links"><a href="https://openshaders.com/explore" target="_blank" rel="noreferrer">OpenShaders</a><a href="https://en.wikipedia.org/wiki/Cubic_Hermite_spline" target="_blank" rel="noreferrer">三次 Hermite 样条</a><a href="https://www.w3.org/TR/css-color-4/#ok-lab" target="_blank" rel="noreferrer">OKLab / OKLCH</a></div></footer>
  </article>;
}
