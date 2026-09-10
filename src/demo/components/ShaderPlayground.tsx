import { Tabs } from '@base-ui/react/tabs';
import { Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import startLessonTwoslashHtml from 'virtual:start-lessons-twoslash';

import {
  DEFAULT_FRAGMENT_SHADER,
  DEFAULT_VERTEX_SHADER,
  drawTriangle,
} from '../../core/webgl2';
import { HighlightedCode } from './HighlightedCode';
import { FullscreenButton } from './FullscreenButton';
import { TwoslashHighlightedCode } from './TwoslashHighlightedCode';

type EditorTab = 'data' | 'vertex' | 'fragment';

const editorTabs: Array<{ id: EditorTab; label: string }> = [
  { id: 'data', label: 'vertex-data.ts' },
  { id: 'vertex', label: 'vertex.glsl' },
  { id: 'fragment', label: 'fragment.glsl' },
];

interface ShaderSourcePanelProps {
  id: 'vertex' | 'fragment';
  source: string;
  onChange: (source: string) => void;
}

function ShaderSourcePanel({ id, source, onChange }: ShaderSourcePanelProps) {
  const highlightedSourceRef = useRef<HTMLPreElement>(null);
  const label = id === 'vertex' ? '顶点着色器源码' : '片段着色器源码';

  return (
    <Tabs.Panel className="shader-source-panel" value={id}>
      <label className="sr-only" htmlFor={`shader-editor-${id}`}>{label}</label>
      <HighlightedCode ref={highlightedSourceRef} className="shader-source-highlight" code={source} language="glsl" ariaHidden />
      <textarea
        id={`shader-editor-${id}`}
        value={source}
        spellCheck={false}
        onScroll={(event) => {
          if (!highlightedSourceRef.current) return;
          highlightedSourceRef.current.scrollTop = event.currentTarget.scrollTop;
          highlightedSourceRef.current.scrollLeft = event.currentTarget.scrollLeft;
        }}
        onChange={(event) => onChange(event.target.value)}
      />
    </Tabs.Panel>
  );
}

export function ShaderPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disposeRef = useRef<(() => void) | null>(null);
  const sourceRef = useRef({ vertex: DEFAULT_VERTEX_SHADER, fragment: DEFAULT_FRAGMENT_SHADER });
  const [vertexSource, setVertexSource] = useState(DEFAULT_VERTEX_SHADER);
  const [fragmentSource, setFragmentSource] = useState(DEFAULT_FRAGMENT_SHADER);
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

  return (
    <section className="code-workbench playground" aria-labelledby="playground-title" data-fullscreen-target>
      <div className="code-workbench__header playground__header">
        <div className="code-workbench__heading"><span className="playground__status-dot" aria-hidden="true" /><strong id="playground-title">Hello Triangle</strong><small>顶点数据 + GLSL</small></div>
        <div className="playground__actions">
          <FullscreenButton />
          <button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> 重置</button>
          <button className="run-button" type="button" onClick={() => renderSources(vertexSource, fragmentSource)}><Play aria-hidden="true" /> 运行</button>
        </div>
      </div>
      <div className="playground__body">
        <Tabs.Root className="editor-panel" defaultValue="data">
          <Tabs.List className="editor-tabs" aria-label="三角形绘制输入">
            {editorTabs.map((tab) => (
              <Tabs.Tab
                key={tab.id}
                value={tab.id}
              >
                {tab.label}
              </Tabs.Tab>
            ))}
            <Tabs.Indicator className="editor-tabs__indicator" />
          </Tabs.List>
          <Tabs.Panel className="vertex-data-panel" value="data">
            <TwoslashHighlightedCode html={startLessonTwoslashHtml['triangle-vertex-data']} />
          </Tabs.Panel>
          <ShaderSourcePanel id="vertex" source={vertexSource} onChange={setVertexSource} />
          <ShaderSourcePanel id="fragment" source={fragmentSource} onChange={setFragmentSource} />
        </Tabs.Root>
        <div className="result-panel">
          <canvas ref={canvasRef} role="img" aria-label="WebGL2 绘制的蓝色三角形" />
          <div className="result-panel__meta" aria-hidden="true"><span>WebGL2</span><span>TRIANGLES · 3 vertices</span></div>
        </div>
      </div>
      <footer className={`playground__footer${error ? ' playground__footer--error' : ''}`} aria-live="polite">
        {error ? <pre>{error}</pre> : <span>{status}</span>}
      </footer>
    </section>
  );
}
