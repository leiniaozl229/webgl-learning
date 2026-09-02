import { RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  composeTransformMatrix,
  createTransformRenderer,
  type Transform2D,
  type TransformOrder,
} from '../../core/transforms2d';

type TransformVariant = 'translation' | 'rotation' | 'scale' | 'matrix' | 'unified';

const initialTransforms: Record<TransformVariant, Transform2D> = {
  translation: { x: 112, y: 74, angleDegrees: 0, scaleX: 1, scaleY: 1 },
  rotation: { x: 168, y: 112, angleDegrees: 32, scaleX: 1, scaleY: 1 },
  scale: { x: 154, y: 105, angleDegrees: 0, scaleX: 1.25, scaleY: 0.8 },
  matrix: { x: 158, y: 112, angleDegrees: 24, scaleX: 1.2, scaleY: 0.85 },
  unified: { x: 118, y: 76, angleDegrees: 28, scaleX: 1.35, scaleY: 0.75 },
};

const descriptions: Record<TransformVariant, string> = {
  translation: '改变 u_translation，Buffer 中的 18 个顶点保持不动',
  rotation: '角度先转换为弧度，再计算 sin 与 cos',
  scale: '缩放围绕几何体局部原点发生，负值会翻转方向',
  matrix: '一个 mat3 同时完成投影、平移、旋转与缩放',
  unified: '切换矩阵乘法顺序，观察同一组参数产生的不同结果',
};

export function Transform2DPlayground({ variant }: { variant: TransformVariant }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createTransformRenderer> | null>(null);
  const [transform, setTransform] = useState<Transform2D>(() => initialTransforms[variant]);
  const [order, setOrder] = useState<TransformOrder>('scale-rotate-translate');
  const [canvasSize, setCanvasSize] = useState({ width: 520, height: 390 });
  const [status, setStatus] = useState('正在创建 WebGL2 变换资源…');

  const mode = variant === 'matrix' || variant === 'unified' ? 'matrix' : 'direct';
  const matrix = useMemo(
    () => composeTransformMatrix(canvasSize.width, canvasSize.height, transform, order),
    [canvasSize, order, transform],
  );
  const origin = mode === 'matrix'
    ? {
        x: (matrix[6] + 1) * canvasSize.width / 2,
        y: (1 - matrix[7]) * canvasSize.height / 2,
      }
    : { x: transform.x, y: transform.y };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      rendererRef.current = createTransformRenderer(canvas);
      const observer = new ResizeObserver(() => {
        setCanvasSize({ width: Math.max(1, canvas.clientWidth), height: Math.max(1, canvas.clientHeight) });
      });
      observer.observe(canvas);
      setCanvasSize({ width: Math.max(1, canvas.clientWidth), height: Math.max(1, canvas.clientHeight) });
      return () => {
        observer.disconnect();
        rendererRef.current?.dispose();
        rendererRef.current = null;
      };
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }, []);

  useEffect(() => {
    try {
      rendererRef.current?.draw(transform, mode, order);
      const transformMode = mode === 'matrix' ? 'u_matrix' : '独立 Uniform';
      setStatus(`绘制完成 · 18 个顶点 · ${transformMode}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }, [canvasSize, mode, order, transform]);

  function update<Key extends keyof Transform2D>(key: Key, value: Transform2D[Key]) {
    setTransform((current) => ({ ...current, [key]: value }));
  }

  const radians = transform.angleDegrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return (
    <section className="transform-lab" aria-label="WebGL2 二维变换实验">
      <header>
        <div><strong>Transform Lab</strong><small>{descriptions[variant]}</small></div>
        <button type="button" onClick={() => { setTransform(initialTransforms[variant]); setOrder('scale-rotate-translate'); }}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="transform-lab__body">
        <div className="transform-lab__controls">
          <fieldset>
            <legend>平移 · CSS px</legend>
            <RangeControl label="X" value={transform.x} min={-120} max={420} step={1} onChange={(value) => update('x', value)} />
            <RangeControl label="Y" value={transform.y} min={-120} max={300} step={1} onChange={(value) => update('y', value)} />
          </fieldset>

          {variant !== 'translation' ? (
            <fieldset>
              <legend>旋转 · degree</legend>
              <RangeControl label="角度" value={transform.angleDegrees} min={-180} max={180} step={1} suffix="°" onChange={(value) => update('angleDegrees', value)} />
              {variant === 'rotation' ? (
                <div className="unit-circle" role="img" aria-label={`单位圆：sin ${sine.toFixed(2)}，cos ${cosine.toFixed(2)}`}>
                  <svg viewBox="0 0 120 120" aria-hidden="true">
                    <circle cx="60" cy="60" r="44" />
                    <line x1="16" y1="60" x2="104" y2="60" />
                    <line x1="60" y1="16" x2="60" y2="104" />
                    <line x1="60" y1="60" x2={60 + cosine * 44} y2={60 + sine * 44} />
                    <circle className="unit-circle__handle" cx={60 + cosine * 44} cy={60 + sine * 44} r="5" />
                  </svg>
                  <span><code>sin {sine.toFixed(2)}</code><code>cos {cosine.toFixed(2)}</code></span>
                </div>
              ) : null}
            </fieldset>
          ) : null}

          {variant === 'scale' || variant === 'matrix' || variant === 'unified' ? (
            <fieldset>
              <legend>缩放 · ratio</legend>
              <RangeControl label="X" value={transform.scaleX} min={-2} max={2} step={0.05} onChange={(value) => update('scaleX', value)} />
              <RangeControl label="Y" value={transform.scaleY} min={-2} max={2} step={0.05} onChange={(value) => update('scaleY', value)} />
            </fieldset>
          ) : null}

          {variant === 'unified' ? (
            <fieldset>
              <legend>实际执行顺序</legend>
              <div className="transform-order">
                <button type="button" aria-pressed={order === 'scale-rotate-translate'} onClick={() => setOrder('scale-rotate-translate')}>缩放 → 旋转 → 平移</button>
                <button type="button" aria-pressed={order === 'translate-rotate-scale'} onClick={() => setOrder('translate-rotate-scale')}>平移 → 旋转 → 缩放</button>
              </div>
            </fieldset>
          ) : null}
        </div>
        <div className="transform-lab__stage">
          <canvas ref={canvasRef} aria-label="二维字母 F 变换结果" />
          <span className="transform-origin" style={{ left: `${origin.x}px`, top: `${origin.y}px` }} aria-hidden="true" />
          <small>局部原点 · ({Math.round(origin.x)}, {Math.round(origin.y)})</small>
        </div>
      </div>
      {variant === 'matrix' || variant === 'unified' ? (
        <div className="matrix-readout" aria-label="当前上传的三乘三矩阵">
          <div><strong>当前 u_matrix</strong><small>按数学行展示，上传时使用 column-major 数组</small></div>
          <ol>
            {[0, 1, 2].flatMap((row) => [0, 1, 2].map((column) => (
              <li key={`${row}-${column}`}>{matrix[column * 3 + row].toFixed(3)}</li>
            )))}
          </ol>
        </div>
      ) : null}
      <footer>{status}</footer>
    </section>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="transform-range">
      <span>{label}<code>{Number(value.toFixed(2))}{suffix}</code></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
