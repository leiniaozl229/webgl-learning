import { Tabs } from '@base-ui/react/tabs';
import { Dices, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  drawPixelRectangles,
  hexToRgba,
  PIXEL_RECTANGLE_DATA_SOURCE,
  PIXEL_RECTANGLE_FRAGMENT_SHADER,
  PIXEL_RECTANGLE_VERTEX_SHADER,
  type PixelRectangle,
} from '../../core/pixelRectangles';
import { HighlightedCode } from './HighlightedCode';

type SourceTab = 'data' | 'vertex' | 'fragment';

interface RectangleControls {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

const initialRectangle: RectangleControls = {
  x: 48,
  y: 42,
  width: 180,
  height: 116,
  color: '#3c9df2',
};

const tabs: Array<{ id: SourceTab; label: string }> = [
  { id: 'data', label: 'vertex-data.ts' },
  { id: 'vertex', label: 'vertex.glsl' },
  { id: 'fragment', label: 'fragment.glsl' },
];

const sources: Record<SourceTab, { code: string; language: 'typescript' | 'glsl' }> = {
  data: { code: PIXEL_RECTANGLE_DATA_SOURCE, language: 'typescript' },
  vertex: { code: PIXEL_RECTANGLE_VERTEX_SHADER, language: 'glsl' },
  fragment: { code: PIXEL_RECTANGLE_FRAGMENT_SHADER, language: 'glsl' },
};

const palette = ['#3c9df2', '#ff795c', '#68cf9b', '#b58cff', '#f3bd4d', '#4fc4d7'] as const;

function toPixelRectangle(rectangle: RectangleControls): PixelRectangle {
  return { ...rectangle, color: hexToRgba(rectangle.color) };
}

function randomRectangles(width: number, height: number): PixelRectangle[] {
  return Array.from({ length: 20 }, (_, index) => {
    const rectangleWidth = 24 + Math.random() * Math.max(24, width * 0.32);
    const rectangleHeight = 20 + Math.random() * Math.max(20, height * 0.28);
    return {
      x: Math.random() * Math.max(1, width - rectangleWidth),
      y: Math.random() * Math.max(1, height - rectangleHeight),
      width: rectangleWidth,
      height: rectangleHeight,
      color: hexToRgba(palette[index % palette.length]),
    };
  });
}

export function PixelRectanglePlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disposeRef = useRef<(() => void) | null>(null);
  const rectanglesRef = useRef<readonly PixelRectangle[]>([toPixelRectangle(initialRectangle)]);
  const [rectangle, setRectangle] = useState(initialRectangle);
  const [drawCount, setDrawCount] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const render = useCallback((rectangles: readonly PixelRectangle[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    rectanglesRef.current = rectangles;
    disposeRef.current?.();
    try {
      disposeRef.current = drawPixelRectangles(canvas, rectangles);
      setError(null);
      setDrawCount(rectangles.length);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    render(rectanglesRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => render(rectanglesRef.current));
    observer.observe(canvas.parentElement ?? canvas);
    return () => {
      observer.disconnect();
      disposeRef.current?.();
    };
  }, [render]);

  function updateRectangle<Key extends keyof RectangleControls>(key: Key, value: RectangleControls[Key]) {
    const next = { ...rectangle, [key]: value };
    setRectangle(next);
    render([toPixelRectangle(next)]);
  }

  function reset() {
    setRectangle(initialRectangle);
    render([toPixelRectangle(initialRectangle)]);
  }

  function drawMany() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    render(randomRectangles(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight)));
  }

  return (
    <section className="pixel-playground" aria-labelledby="pixel-playground-title">
      <header>
        <div>
          <span className="playground__status-dot" aria-hidden="true" />
          <div><strong id="pixel-playground-title">Pixel Rectangle</strong><small>像素坐标 → 裁剪空间 → Canvas</small></div>
        </div>
        <div>
          <button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> 单个矩形</button>
          <button className="pixel-playground__many" type="button" onClick={drawMany}><Dices aria-hidden="true" /> 随机 20 个</button>
        </div>
      </header>

      <div className="pixel-playground__body">
        <div className="pixel-playground__controls">
          <p>所有数值都使用 CSS 像素。调整任意参数会更新 Buffer，并重新执行一次包含 6 个顶点的绘制。</p>
          <div>
            {(['x', 'y', 'width', 'height'] as const).map((key) => (
              <label key={key}>
                <span>{key}</span>
                <input
                  type="range"
                  min={key === 'width' || key === 'height' ? 10 : 0}
                  max={key === 'x' || key === 'width' ? 300 : 220}
                  value={rectangle[key]}
                  onChange={(event) => updateRectangle(key, Number(event.target.value))}
                />
                <output>{rectangle[key]} px</output>
              </label>
            ))}
            <label>
              <span>u_color</span>
              <input type="color" value={rectangle.color} onInput={(event) => updateRectangle('color', event.currentTarget.value)} aria-label="设置矩形颜色" />
              <output>{rectangle.color}</output>
            </label>
          </div>
          <small><code>(0, 0)</code> 位于 Canvas 左上角；顶点着色器负责归一化坐标并翻转 Y 轴。</small>
        </div>
        <div className="pixel-playground__canvas">
          <canvas ref={canvasRef} role="img" aria-label="使用像素坐标绘制的矩形" />
          <span className="pixel-playground__origin" aria-hidden="true">(0, 0)</span>
          <span className="pixel-playground__axis-x" aria-hidden="true">+X →</span>
          <span className="pixel-playground__axis-y" aria-hidden="true">+Y ↓</span>
        </div>
      </div>

      <Tabs.Root className="pixel-playground__sources" defaultValue="data">
        <Tabs.List className="editor-tabs" aria-label="像素矩形完整源码">
          {tabs.map((tab) => <Tabs.Tab key={tab.id} value={tab.id}>{tab.label}</Tabs.Tab>)}
          <Tabs.Indicator className="editor-tabs__indicator" />
        </Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Panel key={tab.id} className="pixel-playground__code" value={tab.id}>
            <HighlightedCode code={sources[tab.id].code} language={sources[tab.id].language} />
          </Tabs.Panel>
        ))}
      </Tabs.Root>

      <footer className={error ? 'pixel-playground__error' : ''} aria-live="polite">
        {error ?? `${drawCount} draw call${drawCount > 1 ? 's' : ''} · ${drawCount * 6} 个顶点`}
      </footer>
    </section>
  );
}
