import { Tabs } from '@base-ui/react/tabs';
import { RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  drawUniformTriangle,
  UNIFORM_DATA_SOURCE,
  UNIFORM_FRAGMENT_SHADER,
  UNIFORM_VERTEX_SHADER,
} from '../../core/uniforms';
import { HighlightedCode } from './HighlightedCode';

type SourceTab = 'data' | 'vertex' | 'fragment';

const initialTint = '#73b7ff';
const tabs: Array<{ id: SourceTab; label: string }> = [
  { id: 'data', label: 'uniform-data.ts' },
  { id: 'vertex', label: 'vertex.glsl' },
  { id: 'fragment', label: 'fragment.glsl' },
];
const sources: Record<SourceTab, { code: string; language: 'typescript' | 'glsl' }> = {
  data: { code: UNIFORM_DATA_SOURCE, language: 'typescript' },
  vertex: { code: UNIFORM_VERTEX_SHADER, language: 'glsl' },
  fragment: { code: UNIFORM_FRAGMENT_SHADER, language: 'glsl' },
};

export function UniformPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disposeRef = useRef<(() => void) | null>(null);
  const tintRef = useRef(initialTint);
  const [tint, setTint] = useState(initialTint);
  const [error, setError] = useState<string | null>(null);

  const render = useCallback((nextTint: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    tintRef.current = nextTint;
    disposeRef.current?.();
    try {
      disposeRef.current = drawUniformTriangle(canvas, nextTint);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  useEffect(() => {
    render(tintRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => render(tintRef.current));
    observer.observe(canvas.parentElement ?? canvas);
    return () => {
      observer.disconnect();
      disposeRef.current?.();
    };
  }, [render]);

  function updateTint(value: string) {
    setTint(value);
    render(value);
  }

  function reset() {
    setTint(initialTint);
    render(initialTint);
  }

  return (
    <section className="uniform-lab" aria-labelledby="uniform-lab-title">
      <header>
        <div>
          <span className="playground__status-dot" aria-hidden="true" />
          <div><strong id="uniform-lab-title">Uniform 调色实验</strong><small>JavaScript → u_tint → Fragment Shader</small></div>
        </div>
        <button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="uniform-lab__preview">
        <div className="uniform-lab__control">
          <p>这一个颜色会在绘制前通过 <code>uniform3fv</code> 写入当前 Program。</p>
          <label>
            <span>u_tint</span>
            <input type="color" value={tint} onInput={(event) => updateTint(event.currentTarget.value)} aria-label="设置 u_tint 颜色" />
            <code>{tint}</code>
          </label>
          <small>同一次 draw call 中，每个顶点和片段读取到的值都一致。</small>
        </div>
        <div className="uniform-lab__canvas">
          <canvas ref={canvasRef} role="img" aria-label="由 u_tint 控制整体色调的渐变三角形" />
          <span aria-hidden="true">v_color × u_tint</span>
        </div>
      </div>
      <Tabs.Root className="uniform-lab__sources" defaultValue="data">
        <Tabs.List className="editor-tabs" aria-label="Uniform 实验源码">
          {tabs.map((tab) => <Tabs.Tab key={tab.id} value={tab.id}>{tab.label}</Tabs.Tab>)}
          <Tabs.Indicator className="editor-tabs__indicator" />
        </Tabs.List>
        {tabs.map((tab) => (
          <Tabs.Panel key={tab.id} className="uniform-lab__code" value={tab.id}>
            <HighlightedCode code={sources[tab.id].code} language={sources[tab.id].language} />
          </Tabs.Panel>
        ))}
      </Tabs.Root>
      <footer className={error ? 'uniform-lab__error' : ''} aria-live="polite">
        {error ?? `u_tint = ${tint} · 已重新绘制`}
      </footer>
    </section>
  );
}
