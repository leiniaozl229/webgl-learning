import { RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { drawInterpolatedTriangle, hexToVertexColor } from '../../core/interpolation';

const initialColors = ['#ff5d73', '#5de0a1', '#55a8ff'] as const;
const vertexLabels = ['左下顶点', '顶部顶点', '右下顶点'] as const;

export function VaryingPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disposeRef = useRef<(() => void) | null>(null);
  const colorsRef = useRef<readonly [string, string, string]>(initialColors);
  const [colors, setColors] = useState<readonly [string, string, string]>(initialColors);
  const [error, setError] = useState<string | null>(null);

  const render = useCallback((nextColors: readonly [string, string, string]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    colorsRef.current = nextColors;
    disposeRef.current?.();
    try {
      disposeRef.current = drawInterpolatedTriangle(canvas, [
        hexToVertexColor(nextColors[0]),
        hexToVertexColor(nextColors[1]),
        hexToVertexColor(nextColors[2]),
      ]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    render(colorsRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => render(colorsRef.current));
    observer.observe(canvas.parentElement ?? canvas);
    return () => {
      observer.disconnect();
      disposeRef.current?.();
    };
  }, [render]);

  function updateColor(index: 0 | 1 | 2, value: string) {
    const next: [string, string, string] = [colors[0], colors[1], colors[2]];
    next[index] = value;
    setColors(next);
    render(next);
  }

  function reset() {
    setColors(initialColors);
    render(initialColors);
  }

  return (
    <section className="varying-playground" aria-labelledby="varying-playground-title">
      <header>
        <div><strong id="varying-playground-title">Varying 插值实验</strong><small>三个顶点颜色 → 每个片段的颜色</small></div>
        <button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="varying-playground__body">
        <div className="varying-playground__controls">
          <p>修改任意顶点的 <code>a_color</code>，GPU 会在三角形内自动插值 <code>v_color</code>。</p>
          <div>
            {colors.map((color, index) => (
              <label key={vertexLabels[index]}>
                <span><i style={{ backgroundColor: color }} aria-hidden="true" />{vertexLabels[index]}</span>
                <input type="color" value={color} onChange={(event) => updateColor(index as 0 | 1 | 2, event.target.value)} aria-label={`${vertexLabels[index]}颜色`} />
                <code>{color}</code>
              </label>
            ))}
          </div>
          <small>顶点着色器只输出 3 个颜色，中间的连续渐变由光栅化阶段生成。</small>
        </div>
        <div className="varying-playground__canvas">
          <canvas ref={canvasRef} role="img" aria-label="三个顶点颜色经插值形成的渐变三角形" />
          <span aria-hidden="true">v_color · smooth interpolation</span>
        </div>
      </div>
      <footer className={error ? 'varying-playground__error' : ''} aria-live="polite">{error ?? '已绘制 3 个顶点 · 片段颜色由 GPU 插值'}</footer>
    </section>
  );
}
