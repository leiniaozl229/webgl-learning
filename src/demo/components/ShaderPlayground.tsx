import { Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import {
  DEFAULT_FRAGMENT_SHADER,
  DEFAULT_VERTEX_SHADER,
  TRIANGLE_POINTS,
  TRIANGLE_VERTEX_DATA_SOURCE,
  drawTriangle,
} from '../../core/webgl2';

type EditorTab = 'data' | 'vertex' | 'fragment';

const editorTabs: Array<{ id: EditorTab; label: string }> = [
  { id: 'data', label: 'vertex-data.ts' },
  { id: 'vertex', label: 'vertex.glsl' },
  { id: 'fragment', label: 'fragment.glsl' },
];

export function ShaderPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disposeRef = useRef<(() => void) | null>(null);
  const sourceRef = useRef({ vertex: DEFAULT_VERTEX_SHADER, fragment: DEFAULT_FRAGMENT_SHADER });
  const [vertexSource, setVertexSource] = useState(DEFAULT_VERTEX_SHADER);
  const [fragmentSource, setFragmentSource] = useState(DEFAULT_FRAGMENT_SHADER);
  const [activeTab, setActiveTab] = useState<EditorTab>('data');
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

  function switchTab(event: KeyboardEvent<HTMLButtonElement>, current: EditorTab) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = editorTabs.findIndex((tab) => tab.id === current);
    let targetIndex = currentIndex;
    if (event.key === 'Home') targetIndex = 0;
    if (event.key === 'End') targetIndex = editorTabs.length - 1;
    if (event.key === 'ArrowLeft') targetIndex = (currentIndex - 1 + editorTabs.length) % editorTabs.length;
    if (event.key === 'ArrowRight') targetIndex = (currentIndex + 1) % editorTabs.length;
    const target = editorTabs[targetIndex].id;
    setActiveTab(target);
    document.getElementById(`shader-tab-${target}`)?.focus();
  }

  const source = activeTab === 'vertex' ? vertexSource : fragmentSource;

  return (
    <section className="playground" aria-labelledby="playground-title">
      <div className="playground__header">
        <div><span className="playground__status-dot" aria-hidden="true" /><strong id="playground-title">Hello Triangle</strong><small>顶点数据 + GLSL</small></div>
        <div className="playground__actions">
          <button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> 重置</button>
          <button className="run-button" type="button" onClick={() => renderSources(vertexSource, fragmentSource)}><Play aria-hidden="true" /> 运行</button>
        </div>
      </div>
      <div className="playground__body">
        <div className="editor-panel">
          <div className="editor-tabs" role="tablist" aria-label="三角形绘制输入">
            {editorTabs.map((tab) => (
              <button
                id={`shader-tab-${tab.id}`}
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`editor-panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => switchTab(event, tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === 'data' ? (
            <div id="editor-panel-data" className="vertex-data-panel" role="tabpanel" aria-labelledby="shader-tab-data">
              <pre><code>{TRIANGLE_VERTEX_DATA_SOURCE}</code></pre>
              <ol aria-label="三角形顶点坐标">
                {TRIANGLE_POINTS.map((point, index) => (
                  <li key={`${point.x}-${point.y}`}>
                    <span>{index + 1}</span>
                    <code>({point.x.toFixed(2)}, {point.y.toFixed(2)})</code>
                    <small>{point.position}</small>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div id={`editor-panel-${activeTab}`} className="shader-source-panel" role="tabpanel" aria-labelledby={`shader-tab-${activeTab}`}>
              <label className="sr-only" htmlFor="shader-editor">{activeTab === 'vertex' ? '顶点着色器源码' : '片段着色器源码'}</label>
              <textarea
                id="shader-editor"
                value={source}
                spellCheck={false}
                onChange={(event) => activeTab === 'vertex' ? setVertexSource(event.target.value) : setFragmentSource(event.target.value)}
              />
            </div>
          )}
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
