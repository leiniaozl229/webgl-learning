// 示意图：一条亮边曲线加 14 条细线，偏移 = 宽度 × cos(扭转) × tᵞ，可以直接看到翻折点和亮边的疏密。
const diagram = (() => {
  const width = 640, layers = 14, gamma = 1.8, turns = 1.25, ribbonWidth = 72;
  const spine = (x: number) => 118 + 26 * Math.sin(x / 110);
  const twist = (u: number) => Math.cos(turns * 2 * Math.PI * u - 0.4);
  const xs = Array.from({ length: 97 }, (_, i) => 24 + (i / 96) * (width - 48));
  const path = (offset: (u: number) => number) => xs.map((x, i) => {
    const u = i / 96;
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${(spine(x) - offset(u)).toFixed(1)}`;
  }).join(' ');
  const lines = Array.from({ length: layers }, (_, i) => {
    const t = (i + 0.5) / layers;
    return { t, d: path((u) => ribbonWidth * twist(u) * t ** gamma) };
  });
  // 翻折点：twist 过零的位置。
  const folds = [0, 1, 2].map((n) => ((n + 0.5) * Math.PI + 0.4) / (2 * Math.PI * turns)).filter((u) => u < 1)
    .map((u) => { const x = 24 + u * (width - 48); return { x, y: spine(x) }; });
  return { lines, spine: path(() => 0), folds };
})();

export function RibbonTwistDiagram() {
  return <figure className="ribbon-twist-figure">
    <svg viewBox="0 0 640 230" role="img" aria-label="亮边曲线与沿扭转铺开的细线：扭转过零处所有细线收拢到亮边上，过零后翻到另一侧">
      {diagram.lines.map((line) => <path key={line.t} d={line.d} className="ribbon-twist-figure__layer" style={{ opacity: 0.85 - 0.6 * line.t }} />)}
      <path d={diagram.spine} className="ribbon-twist-figure__spine" />
      {diagram.folds.map((fold) => <g key={fold.x}>
        <circle cx={fold.x} cy={fold.y} r={5} className="ribbon-twist-figure__fold" />
        <text x={fold.x} y={fold.y + 34} textAnchor="middle">翻折点</text>
      </g>)}
      <text x={24} y={222}>根部</text>
      <text x={616} y={222} textAnchor="end">末端</text>
    </svg>
    <figcaption>粗线是亮边曲线，细线是 14 层偏移 = 宽度 × cos(扭转角) × tᵞ（γ = 1.8）。前几层贴着亮边，越往外越稀；cos 过零时全部收拢成亮结，之后翻到亮边另一侧。</figcaption>
  </figure>;
}
