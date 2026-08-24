import { Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { DEFAULT_FRAGMENT_SHADER, DEFAULT_VERTEX_SHADER, drawTriangle } from '../../core/webgl2';

type EditorTab = 'vertex' | 'fragment';

export function ShaderPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disposeRef = useRef<(() => void) | null>(null);
  const sourceRef = useRef({ vertex: DEFAULT_VERTEX_SHADER, fragment: DEFAULT_FRAGMENT_SHADER });
  const [vertexSource, setVertexSource] = useState(DEFAULT_VERTEX_SHADER);
  const [fragmentSource, setFragmentSource] = useState(DEFAULT_FRAGMENT_SHADER);
  const [activeTab, setActiveTab] = useState<EditorTab>('vertex');
  const [status, setStatus] = useState('准备编译');
  const [error, setError] = useState<string | null>(null);

  const renderSources = useCallback((vertex: string, fragment: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    sourceRef.current = { vertex, fragment };
    disposeRef.current?.();
    disposeRef.current = null;
    try {
      disposeRef.current = drawTriangle(canvas, vertex, fragment);
      setError(null);
      setStatus('编译成功 · 已绘制 3 个顶点');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus('编译失败');
    }
  }, []);

  useEffect(() => {
    renderSources(DEFAULT_VERTEX_SHADER, DEFAULT_FRAGMENT_SHADER);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => renderSources(sourceRef.current.vertex, sourceRef.current.fragment));
    observer.observe(canvas.parentElement ?? canvas);
    return () => {
      observer.disconnect();
      disposeRef.current?.();
    };
  }, [renderSources]);

  function reset() {
    setVertexSource(DEFAULT_VERTEX_SHADER);
    setFragmentSource(DEFAULT_FRAGMENT_SHADER);
    renderSources(DEFAULT_VERTEX_SHADER, DEFAULT_FRAGMENT_SHADER);
  }

  function switchTab(event: KeyboardEvent<HTMLButtonElement>, next: EditorTab) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const target = next === 'vertex' ? 'fragment' : 'vertex';
    setActiveTab(target);
    document.getElementById(`shader-tab-${target}`)?.focus();
  }

  const source = activeTab === 'vertex' ? vertexSource : fragmentSource;

  return (
    <section className="playground" aria-labelledby="playground-title">
      <div className="playground__header">
        <div><span className="playground__status-dot" aria-hidden="true" /><strong id="playground-title">Hello Triangle</strong><small>浏览器内直接编译</small></div>
        <div className="playground__actions">
          <button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> 重置</button>
          <button className="run-button" type="button" onClick={() => renderSources(vertexSource, fragmentSource)}><Play aria-hidden="true" /> 运行</button>
        </div>
      </div>
      <div className="playground__body">
        <div className="editor-panel">
          <div className="editor-tabs" role="tablist" aria-label="着色器源码">
            <button id="shader-tab-vertex" type="button" role="tab" aria-selected={activeTab === 'vertex'} aria-controls="shader-editor" tabIndex={activeTab === 'vertex' ? 0 : -1} onClick={() => setActiveTab('vertex')} onKeyDown={(event) => switchTab(event, 'vertex')}>vertex.glsl</button>
            <button id="shader-tab-fragment" type="button" role="tab" aria-selected={activeTab === 'fragment'} aria-controls="shader-editor" tabIndex={activeTab === 'fragment' ? 0 : -1} onClick={() => setActiveTab('fragment')} onKeyDown={(event) => switchTab(event, 'fragment')}>fragment.glsl</button>
          </div>
          <label className="sr-only" htmlFor="shader-editor">{activeTab === 'vertex' ? '顶点着色器源码' : '片段着色器源码'}</label>
          <textarea id="shader-editor" value={source} spellCheck={false} onChange={(event) => activeTab === 'vertex' ? setVertexSource(event.target.value) : setFragmentSource(event.target.value)} />
        </div>
        <div className="result-panel">
          <canvas ref={canvasRef} role="img" aria-label="WebGL2 绘制的青色三角形" />
          <div className="result-panel__meta" aria-hidden="true"><span>WebGL2</span><span>TRIANGLES · 3 vertices</span></div>
        </div>
      </div>
      <footer className={`playground__footer${error ? ' playground__footer--error' : ''}`} aria-live="polite">
        {error ? <pre>{error}</pre> : <span>{status}</span>}
      </footer>
    </section>
  );
}
