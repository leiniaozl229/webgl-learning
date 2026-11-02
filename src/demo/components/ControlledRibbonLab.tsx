import { Tabs } from '@base-ui/react/tabs';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { memo, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import rendererSource from '../../core/controlledRibbon.ts?raw';
import {
  clampPoint, commonSource, controlledSource, createRibbonRenderer, defaultRibbonOptions, edgeCurve, openShadersSource,
  type Point, type RibbonFrameInfo, type RibbonOptions,
} from '../../core/controlledRibbon';
import { CodeBlock } from './CodeBlock';

function Range({ label, value, min, max, step = 0.01, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void;
}) {
  const id = useId();
  const digits = step >= 1 ? 0 : step < 0.01 ? 3 : 2;
  return <label className="ribbon-range" htmlFor={id}><span>{label}<output htmlFor={id}>{value.toFixed(digits)}</output></span><input id={id} aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

const sourceTabs = [
  { id: 'controlled', label: 'ribbon.glsl', code: controlledSource, language: 'glsl' },
  { id: 'common', label: 'common.glsl', code: commonSource, language: 'glsl' },
  { id: 'openshaders', label: 'openshaders.glsl', code: openShadersSource, language: 'glsl' },
  { id: 'renderer', label: 'renderer.ts', code: rendererSource, language: 'ts' },
];

// 高亮后的源码有上千个节点。单独 memo：滑块变化和每 0.5 秒的状态刷新都不再重新渲染它，否则每次要花十几毫秒，动画会掉帧。
const Sources = memo(function Sources() {
  return <Tabs.Root className="ribbon-lab__sources" defaultValue="controlled"><Tabs.List className="editor-tabs" aria-label="可控光带源码">{sourceTabs.map((item) => <Tabs.Tab key={item.id} value={item.id}>{item.label}</Tabs.Tab>)}</Tabs.List>{sourceTabs.map((item) => <Tabs.Panel key={item.id} value={item.id}><CodeBlock label={`${item.label} · 实际运行源码`} language={item.language}>{item.code}</CodeBlock></Tabs.Panel>)}</Tabs.Root>;
});

const scales = [{ value: 1, label: '1×' }, { value: 0.75, label: '¾×' }, { value: 0.5, label: '½×' }];

export function ControlledRibbonLab() {
  const [options, setOptions] = useState<RibbonOptions>({ ...defaultRibbonOptions });
  const [playing, setPlaying] = useState(() => typeof matchMedia === 'undefined' || !matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [handles, setHandles] = useState(true);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [info, setInfo] = useState<(RibbonFrameInfo & { fps: number | null }) | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef(options);
  const playingRef = useRef(playing);
  const refreshRef = useRef<(() => void) | null>(null);
  const dragRef = useRef<number | null>(null);
  const controlled = options.mode === 'controlled';

  useEffect(() => { optionsRef.current = options; refreshRef.current?.(); }, [options]);
  useEffect(() => { playingRef.current = playing; refreshRef.current?.(); }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ReturnType<typeof createRibbonRenderer> | null = null;
    let raf = 0, previous = performance.now(), time = 2, reported = 0, frames = 0;
    let stopped = false, visible = true;

    function draw(now: number) {
      if (stopped || document.hidden || !visible || !renderer) { raf = 0; return; }
      const dt = Math.min(Math.max((now - previous) * 0.001, 0), 0.1);
      previous = now;
      if (playingRef.current) { time += dt * optionsRef.current.speed * 2.5; frames += 1; }
      try {
        const frame = renderer.draw(time, optionsRef.current);
        if (frame && (!playingRef.current || now - reported >= 500)) {
          const fps = playingRef.current && reported ? frames / ((now - reported) / 1000) : null;
          setInfo({ ...frame, fps });
          reported = now; frames = 0;
        }
      } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); return; }
      raf = playingRef.current ? requestAnimationFrame(draw) : 0;
    }
    // 播放中循环每帧都会读最新参数，不打断它；打断会把时钟重置，拖动滑块时动画就会顿住。
    // 只有暂停、或循环因隐藏而停下时，才立即补画一帧。
    function refresh() {
      if (playingRef.current && raf && !stopped && !document.hidden && visible) return;
      cancelAnimationFrame(raf);
      previous = performance.now(); reported = 0; frames = 0;
      draw(previous);
    }
    function lost(event: Event) {
      event.preventDefault(); cancelAnimationFrame(raf);
      setError('WebGL 上下文已丢失。恢复后会重新创建资源，也可以点击重试。');
    }
    function restored() { setRetry((value) => value + 1); }
    function motionChanged(event: MediaQueryListEvent) { if (event.matches) setPlaying(false); }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const resize = new ResizeObserver(() => { setSize({ width: canvas.clientWidth, height: canvas.clientHeight }); refresh(); });
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh(); });
    try { renderer = createRibbonRenderer(canvas); setError(null); refreshRef.current = refresh; refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    resize.observe(canvas); intersection.observe(canvas);
    document.addEventListener('visibilitychange', refresh);
    reduced.addEventListener('change', motionChanged);
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      stopped = true; refreshRef.current = null; cancelAnimationFrame(raf);
      resize.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', refresh);
      reduced.removeEventListener('change', motionChanged);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      renderer?.dispose();
    };
  }, [retry]);

  function change<K extends keyof RibbonOptions>(key: K, value: RibbonOptions[K]) {
    setOptions((current) => ({ ...current, [key]: value }));
  }

  // 场景坐标 ↔ 预览区像素：原点在中心，1 个单位 = 预览高度，y 向上。
  const toScreen = ([x, y]: Point) => [size.width / 2 + x * size.height, size.height / 2 - y * size.height];
  function toScene(event: ReactPointerEvent<SVGSVGElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return [(event.clientX - rect.left - rect.width / 2) / rect.height, (rect.height / 2 - (event.clientY - rect.top)) / rect.height];
  }
  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (dragRef.current === null) return;
    const index = dragRef.current;
    const next = toScene(event);
    setOptions((current) => ({ ...current, points: clampPoint(current.points, index, next) }));
  }
  const curve = size.height ? Array.from({ length: 49 }, (_, i) => {
    const [x0] = options.points[0], [x1] = options.points[options.points.length - 1];
    const x = x0 + ((x1 - x0) * i) / 48;
    return toScreen([x, edgeCurve(options.points, x)]).join(',');
  }).join(' ') : '';

  return <div className="ribbon-lab controlled-ribbon-lab">
    <div className="ribbon-lab__toolbar"><div role="radiogroup" aria-label="画面" className="controlled-ribbon-lab__modes">
      <label><input type="radio" name="ribbon-mode" checked={controlled} onChange={() => change('mode', 'controlled')} />可控光带</label>
      <label><input type="radio" name="ribbon-mode" checked={!controlled} onChange={() => change('mode', 'openshaders')} />OpenShaders 原版对照</label>
    </div><div>
      <label><input type="checkbox" checked={options.lightPage} onChange={(event) => change('lightPage', event.target.checked)} />白色页面</label>
      {controlled && <label><input type="checkbox" checked={handles} onChange={(event) => setHandles(event.target.checked)} />显示控制点</label>}
      <button type="button" disabled={!!error} aria-pressed={playing} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{playing ? '暂停' : '播放'}</button>
      <button type="button" onClick={() => setOptions({ ...defaultRibbonOptions, mode: options.mode, lightPage: options.lightPage })}><RotateCcw aria-hidden="true" />重置</button>
    </div></div>
    <div className="ribbon-lab__workbench">
      <div className="ribbon-lab__preview controlled-ribbon-lab__preview" data-light={options.lightPage}>
        <canvas ref={canvasRef} role="img" aria-label={controlled ? '由五个控制点决定走向的可控光带' : 'OpenShaders 式折叠光丝对照'} />
        {controlled && handles && size.height > 0 && <svg className="controlled-ribbon-lab__handles" viewBox={`0 0 ${size.width} ${size.height}`} onPointerMove={onPointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
          <polyline points={curve} />
          {options.points.map((point, index) => { const [cx, cy] = toScreen(point); return <circle key={index} cx={cx} cy={cy} r={8} tabIndex={0} role="slider" aria-label={`控制点 ${index + 1}`} aria-valuetext={`x ${point[0].toFixed(2)}，y ${point[1].toFixed(2)}`}
            onPointerDown={(event) => { dragRef.current = index; event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId); }}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 0.05 : 0.01;
              const delta: Record<string, Point> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
              if (!delta[event.key]) return;
              event.preventDefault();
              change('points', clampPoint(options.points, index, [point[0] + delta[event.key][0], point[1] + delta[event.key][1]]));
            }} />; })}
        </svg>}
        <span className="ribbon-lab__play-state">{controlled ? (handles ? '圆点是飘动的中心 · 拖动或用方向键调整' : '可控光带') : 'OpenShaders 原版 · 形状由迭代产生'}</span>
        {error && <div className="ribbon-lab__error" role="alert"><strong>暂时无法绘制</strong><pre>{error}</pre><button type="button" onClick={() => setRetry((value) => value + 1)}>重新创建 WebGL2 资源</button></div>}
      </div>
      <aside className="ribbon-lab__controls" aria-label="光带参数" data-disabled={!controlled}>
        <fieldset><legend>形状</legend>
          <Range label="宽度" min={0.05} max={0.6} value={options.width} onChange={(value) => change('width', value)} />
          <Range label="根部收窄" min={0} max={1} value={options.rootPinch} onChange={(value) => change('rootPinch', value)} />
          <Range label="末端收窄" min={0} max={1} value={options.tipPinch} onChange={(value) => change('tipPinch', value)} />
          <Range label="扭转圈数" min={0} max={2} value={options.twist} onChange={(value) => change('twist', value)} />
          <label className="ribbon-check"><input type="checkbox" checked={options.mirror} onChange={(event) => change('mirror', event.target.checked)} />亮边另一侧加副光带</label>
        </fieldset>
        <fieldset><legend>飘动</legend>
          <Range label="飘动幅度" min={0} max={0.3} step={0.005} value={options.drift} onChange={(value) => change('drift', value)} />
          <Range label="传播延迟" min={0} max={2} value={options.lag} onChange={(value) => change('lag', value)} />
          <Range label="亮结流速" min={-2} max={2} value={options.twistFlow} onChange={(value) => change('twistFlow', value)} />
          <Range label="宽度呼吸" min={0} max={0.5} value={options.breathe} onChange={(value) => change('breathe', value)} />
          <Range label="细小波纹" min={0} max={2} value={options.sway} onChange={(value) => change('sway', value)} />
          <Range label="速度" min={0} max={1.5} value={options.speed} onChange={(value) => change('speed', value)} />
        </fieldset>
        <fieldset><legend>亮边与光面</legend>
          <Range label="层数" min={4} max={64} step={1} value={options.layers} onChange={(value) => change('layers', value)} />
          <Range label="亮边集中度 γ" min={1} max={6} value={options.gamma} onChange={(value) => change('gamma', value)} />
          <Range label="柔和度" min={0.001} max={0.03} step={0.001} value={options.softness} onChange={(value) => change('softness', value)} />
          <Range label="光面平滑" min={0} max={2.5} value={options.smoothing} onChange={(value) => change('smoothing', value)} />
          <Range label="外缘渐隐" min={0} max={1} value={options.outerFade} onChange={(value) => change('outerFade', value)} />
          <Range label="层间流动" min={0} max={2} value={options.flow} onChange={(value) => change('flow', value)} />
          <Range label="根部光点" min={0} max={2} value={options.hotspot} onChange={(value) => change('hotspot', value)} />
        </fieldset>
        <fieldset><legend>颜色与画面</legend>
          <Range label="亮边色相（圈）" min={0} max={1} step={0.005} value={options.edgeHue} onChange={(value) => change('edgeHue', value)} />
          <Range label="光面色相（圈）" min={0} max={1} step={0.005} value={options.faceHue} onChange={(value) => change('faceHue', value)} />
          <Range label="曝光" min={0.2} max={3} value={options.exposure} onChange={(value) => change('exposure', value)} />
          <div className="ribbon-lab__resolution" role="radiogroup" aria-label="渲染分辨率">{scales.map((item) => <label key={item.value}><input type="radio" name="ribbon-scale" checked={options.scale === item.value} onChange={() => change('scale', item.value)} />{item.label}</label>)}</div>
        </fieldset>
      </aside>
    </div>
    <Sources />
    <footer className="ribbon-lab__status" aria-live="polite">{info
      ? <>Canvas {info.width} × {info.height} · {controlled ? `每片段 ${options.layers * (options.mirror ? 2 : 1)} 层细线` : '每片段 96 层光斑'} · {info.timerSupported ? (info.gpuMs === null ? 'GPU 计时等待结果' : `GPU 约 ${info.gpuMs.toFixed(2)} ms`) : '此浏览器不开放 GPU 计时'}{info.fps !== null ? ` · ${info.fps.toFixed(0)} fps` : ''}</>
      : '正在创建 WebGL2 绘制资源…'}</footer>
  </div>;
}
