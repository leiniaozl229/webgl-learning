import { Copy, Dices, Eye, Maximize, Minimize, Pause, Play, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Point } from '../core/controlledRibbon';
import {
  backgroundPresets, createEmitter, createEmitterRenderer, defaultEmitterOptions,
  type BackgroundKind, type EmitterFrameInfo, type EmitterOptions,
} from '../core/ribbonEmitter';

const storageKey = 'ribbon-emitter-options';

// 全屏时像素多，默认按 ½ 分辨率绘制；光带是平滑的光场，放大后几乎看不出差别。
const pageDefaults: EmitterOptions = { ...defaultEmitterOptions, scale: 0.5 };

// 发射点和渐变中心按 16:9 画面设计。窗口比例不同时，x 按宽度等比缩放，竖屏也不会把发射点挤出画面。
const designAspect = 16 / 9;
function fitToView(options: EmitterOptions, aspect: number): EmitterOptions {
  const k = aspect / designAspect;
  return { ...options, source: [options.source[0] * k, options.source[1]], backgroundCenter: [options.backgroundCenter[0] * k, options.backgroundCenter[1]] };
}

// 上次调好的参数留在本机浏览器里，刷新后接着用；读不到时退回默认值。
function loadOptions(): EmitterOptions {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Partial<EmitterOptions> | null;
    return { ...pageDefaults, ...saved };
  } catch {
    return { ...pageDefaults };
  }
}

function Range({ label, value, min, max, step = 0.01, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void;
}) {
  const id = useId();
  const digits = step >= 1 ? 0 : step < 0.01 ? 3 : 2;
  return <label className="emitter-range" htmlFor={id}>
    <span>{label}<output htmlFor={id}>{value.toFixed(digits)}</output></span>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>;
}

const backgroundKinds: { value: BackgroundKind; label: string }[] = [{ value: 'solid', label: '纯色' }, { value: 'linear', label: '线性' }, { value: 'radial', label: '径向' }];
const scales = [{ value: 1, label: '1×' }, { value: 0.75, label: '¾×' }, { value: 0.5, label: '½×' }];

export function EmitterPage() {
  const [options, setOptions] = useState<EmitterOptions>(loadOptions);
  const [seed, setSeed] = useState(1);
  const [playing, setPlaying] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [panel, setPanel] = useState(true);
  const [chrome, setChrome] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [info, setInfo] = useState<(EmitterFrameInfo & { fps: number | null }) | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef(options);
  const playingRef = useRef(playing);
  const seedRef = useRef(seed);
  const refreshRef = useRef<(() => void) | null>(null);
  const dragRef = useRef<'source' | 'center' | null>(null);

  useEffect(() => {
    optionsRef.current = options;
    refreshRef.current?.();
    try { localStorage.setItem(storageKey, JSON.stringify(options)); } catch { /* 隐私模式下无法保存，不影响展示 */ }
  }, [options]);
  useEffect(() => { playingRef.current = playing; refreshRef.current?.(); }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ReturnType<typeof createEmitterRenderer> | null = null;
    const emitter = createEmitter(seedRef.current);
    let raf = 0, previous = performance.now(), time = 0, reported = 0, frames = 0;
    let stopped = false, seeded = seedRef.current;

    function draw(now: number) {
      if (stopped || document.hidden || !renderer) { raf = 0; return; }
      const dt = Math.min(Math.max((now - previous) * 0.001, 0), 0.1);
      previous = now;
      // 换种子：从头开始一段新的发射序列，时间也归零。
      if (seeded !== seedRef.current) { seeded = seedRef.current; emitter.reset(seeded); time = 0; }
      if (playingRef.current) { time += dt * optionsRef.current.speed * 2.5; frames += 1; }
      try {
        const fitted = fitToView(optionsRef.current, canvas!.clientWidth / Math.max(canvas!.clientHeight, 1));
        const ribbons = emitter.update(time, fitted);
        const frame = renderer.draw(time, ribbons, fitted);
        if (frame && (!playingRef.current || now - reported >= 500)) {
          const fps = playingRef.current && reported ? frames / ((now - reported) / 1000) : null;
          setInfo({ ...frame, fps });
          reported = now; frames = 0;
        }
      } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); return; }
      raf = playingRef.current ? requestAnimationFrame(draw) : 0;
    }
    // 播放中循环每帧都会读最新参数，不打断它；打断会把时钟重置，拖动滑块时动画就会顿住。
    function refresh() {
      if (playingRef.current && raf && !stopped && !document.hidden) return;
      cancelAnimationFrame(raf);
      previous = performance.now(); reported = 0; frames = 0;
      draw(previous);
    }
    function lost(event: Event) {
      event.preventDefault(); cancelAnimationFrame(raf); raf = 0;
      setError('WebGL 上下文已丢失。恢复后会重新创建资源，也可以点击重试。');
    }
    function restored() { setRetry((value) => value + 1); }
    const resize = new ResizeObserver(() => { setSize({ width: canvas.clientWidth, height: canvas.clientHeight }); refresh(); });
    try { renderer = createEmitterRenderer(canvas); setError(null); refreshRef.current = refresh; refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    resize.observe(canvas);
    document.addEventListener('visibilitychange', refresh);
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      stopped = true; refreshRef.current = null; cancelAnimationFrame(raf);
      resize.disconnect();
      document.removeEventListener('visibilitychange', refresh);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      renderer?.dispose();
    };
  }, [retry]);

  // 快捷键：H 隐藏全部界面，空格播放 / 暂停，F 全屏。在输入框里时不响应。
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'h' || event.key === 'H') setChrome((value) => !value);
      else if (event.key === 'f' || event.key === 'F') toggleFullscreen();
      else if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); setPlaying((value) => !value); }
    }
    function onFullscreen() { setFullscreen(!!document.fullscreenElement); }
    addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => { removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFullscreen); };
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }
  function change<K extends keyof EmitterOptions>(key: K, value: EmitterOptions[K]) {
    setOptions((current) => ({ ...current, [key]: value }));
  }
  function reseed() {
    seedRef.current = seed + 1;
    setSeed(seed + 1);
    refreshRef.current?.();
  }
  async function copyOptions() {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ ...options, seed }, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* 剪贴板不可用时保持原样 */ }
  }

  // 场景坐标 ↔ 屏幕像素：原点在画面中心，1 个单位 = 画面高度，y 向上。
  const toScreen = ([x, y]: Point) => [size.width / 2 + x * size.height, size.height / 2 - y * size.height];
  // 拖动得到的是当前窗口里的场景坐标，存回 16:9 设计坐标。
  function toDesign(event: ReactPointerEvent<SVGSVGElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    const k = rect.width / rect.height / designAspect;
    const x = (event.clientX - rect.left - rect.width / 2) / rect.height / k;
    const y = (rect.height / 2 - (event.clientY - rect.top)) / rect.height;
    return [Math.min(Math.max(x, -designAspect / 2), designAspect / 2), Math.min(Math.max(y, -0.5), 0.5)];
  }
  const view = fitToView(options, size.width / Math.max(size.height, 1));
  const [sx, sy] = toScreen(view.source);
  const [cx, cy] = toScreen(view.backgroundCenter);
  // 发射扇面：平均方向两侧各张开 spread / 2，长度取平均光带长度的一半，只作示意。
  const fan = [-0.5, 0, 0.5].map((side) => {
    const angle = options.direction + side * options.spread;
    return toScreen([view.source[0] + Math.cos(angle) * options.length * 0.5, view.source[1] + Math.sin(angle) * options.length * 0.5]);
  });
  const handles = chrome && panel && size.height > 0;

  return <main className="emitter-page" data-chrome={chrome}>
    <canvas ref={canvasRef} className="emitter-page__canvas" role="img" aria-label="从一个发射点陆续放出、生长、飘离并消失的多条光带" />

    {handles && <svg className="emitter-page__handles" viewBox={`0 0 ${size.width} ${size.height}`}
      onPointerMove={(event) => { if (dragRef.current) change(dragRef.current === 'source' ? 'source' : 'backgroundCenter', toDesign(event)); }}
      onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
      <polyline points={`${fan[0].join(',')} ${sx},${sy} ${fan[2].join(',')}`} />
      <polyline points={`${sx},${sy} ${fan[1].join(',')}`} />
      {options.background === 'radial' && <circle className="emitter-page__center" cx={cx} cy={cy} r={8} aria-label="径向渐变中心"
        onPointerDown={(event) => { dragRef.current = 'center'; event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId); }} />}
      <circle className="emitter-page__source" cx={sx} cy={sy} r={9} aria-label="发射点"
        onPointerDown={(event) => { dragRef.current = 'source'; event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId); }} />
    </svg>}

    {chrome && <div className="emitter-page__bar">
      <button type="button" aria-pressed={playing} onClick={() => setPlaying((value) => !value)} title="播放 / 暂停（空格）">{playing ? <Pause /> : <Play />}<span>{playing ? '暂停' : '播放'}</span></button>
      <button type="button" onClick={reseed} title="换一组随机"><Dices /><span>换一组随机</span></button>
      <button type="button" onClick={() => setChrome(false)} title="隐藏界面（H）"><Eye /><span>纯净画面</span></button>
      <button type="button" onClick={toggleFullscreen} title="全屏（F）">{fullscreen ? <Minimize /> : <Maximize />}<span>{fullscreen ? '退出全屏' : '全屏'}</span></button>
      <button type="button" aria-pressed={panel} onClick={() => setPanel((value) => !value)} title="参数面板"><SlidersHorizontal /><span>参数</span></button>
    </div>}
    {!chrome && <button type="button" className="emitter-page__reveal" onClick={() => setChrome(true)}>按 H 或点这里显示界面</button>}

    {chrome && panel && <aside className="emitter-page__panel" aria-label="发射器参数">
      <header>
        <h1>光带发射器</h1>
        <button type="button" className="emitter-page__icon" onClick={() => setPanel(false)} aria-label="收起参数面板"><X /></button>
      </header>
      <div className="emitter-page__scroll">
        <fieldset><legend>背景</legend>
          <div className="emitter-page__chips">{backgroundPresets.map((preset) => <button key={preset.label} type="button" onClick={() => setOptions((current) => ({ ...current, ...preset.options }))}>{preset.label}</button>)}</div>
          <div className="emitter-page__radios" role="radiogroup" aria-label="背景类型">{backgroundKinds.map((item) => <label key={item.value}><input type="radio" name="background" checked={options.background === item.value} onChange={() => change('background', item.value)} />{item.label}</label>)}</div>
          <div className="emitter-page__colors">
            <label><input type="color" value={options.backgroundFrom} onChange={(event) => change('backgroundFrom', event.target.value)} />{options.background === 'radial' ? '中心色' : options.background === 'linear' ? '起点色' : '颜色'}</label>
            {options.background !== 'solid' && <label><input type="color" value={options.backgroundTo} onChange={(event) => change('backgroundTo', event.target.value)} />{options.background === 'radial' ? '外圈色' : '终点色'}</label>}
          </div>
          {options.background === 'linear' && <Range label="渐变方向（度）" min={0} max={360} step={1} value={options.backgroundAngle} onChange={(value) => change('backgroundAngle', value)} />}
          {options.background === 'radial' && <>
            <Range label="中心 x" min={-1} max={1} value={options.backgroundCenter[0]} onChange={(value) => change('backgroundCenter', [value, options.backgroundCenter[1]])} />
            <Range label="中心 y" min={-0.5} max={0.5} value={options.backgroundCenter[1]} onChange={(value) => change('backgroundCenter', [options.backgroundCenter[0], value])} />
            <Range label="半径" min={0.1} max={2.5} value={options.backgroundRadius} onChange={(value) => change('backgroundRadius', value)} />
          </>}
        </fieldset>
        <fieldset><legend>发射</legend>
          <Range label="发射间隔" min={0.3} max={5} value={options.interval} onChange={(value) => change('interval', value)} />
          <Range label="发射方向（弧度）" min={-Math.PI} max={Math.PI} value={options.direction} onChange={(value) => change('direction', value)} />
          <Range label="扩散角（弧度）" min={0} max={Math.PI * 2} value={options.spread} onChange={(value) => change('spread', value)} />
          <Range label="速度" min={0} max={1.5} value={options.speed} onChange={(value) => change('speed', value)} />
        </fieldset>
        <fieldset><legend>生命周期</legend>
          <Range label="寿命" min={2} max={20} step={0.1} value={options.life} onChange={(value) => change('life', value)} />
          <Range label="生长时长（占寿命）" min={0.05} max={0.6} value={options.growth} onChange={(value) => change('growth', value)} />
          <Range label="尾部回缩" min={0} max={1} value={options.release} onChange={(value) => change('release', value)} />
          <Range label="飘离距离" min={0} max={1} value={options.travel} onChange={(value) => change('travel', value)} />
        </fieldset>
        <fieldset><legend>每条光带的随机形态</legend>
          <Range label="长度" min={0.4} max={2.2} value={options.length} onChange={(value) => change('length', value)} />
          <Range label="宽度" min={0.05} max={0.5} value={options.width} onChange={(value) => change('width', value)} />
          <Range label="随机浮动" min={0} max={0.8} value={options.variance} onChange={(value) => change('variance', value)} />
          <Range label="弯曲随机度" min={0} max={1.2} value={options.curl} onChange={(value) => change('curl', value)} />
          <Range label="飘动幅度" min={0} max={0.4} step={0.005} value={options.drift} onChange={(value) => change('drift', value)} />
          <Range label="扭转圈数" min={0} max={2} value={options.twist} onChange={(value) => change('twist', value)} />
          <Range label="亮结流速" min={-2} max={2} value={options.twistFlow} onChange={(value) => change('twistFlow', value)} />
          <Range label="根部收窄" min={0} max={1} value={options.rootPinch} onChange={(value) => change('rootPinch', value)} />
        </fieldset>
        <fieldset><legend>亮边与光面</legend>
          <Range label="层数" min={4} max={48} step={1} value={options.layers} onChange={(value) => change('layers', value)} />
          <Range label="亮边集中度 γ" min={1} max={6} value={options.gamma} onChange={(value) => change('gamma', value)} />
          <Range label="柔和度" min={0.001} max={0.03} step={0.001} value={options.softness} onChange={(value) => change('softness', value)} />
          <Range label="光面平滑" min={0} max={2.5} value={options.smoothing} onChange={(value) => change('smoothing', value)} />
          <Range label="外缘渐隐" min={0} max={1} value={options.outerFade} onChange={(value) => change('outerFade', value)} />
        </fieldset>
        <fieldset><legend>颜色与画质</legend>
          <Range label="亮边色相（圈）" min={0} max={1} step={0.005} value={options.edgeHue} onChange={(value) => change('edgeHue', value)} />
          <Range label="光面色相（圈）" min={0} max={1} step={0.005} value={options.faceHue} onChange={(value) => change('faceHue', value)} />
          <Range label="色相随机（圈）" min={0} max={0.2} step={0.005} value={options.hueJitter} onChange={(value) => change('hueJitter', value)} />
          <Range label="发射点光晕" min={0} max={2} value={options.sourceGlow} onChange={(value) => change('sourceGlow', value)} />
          <Range label="曝光" min={0.2} max={3} value={options.exposure} onChange={(value) => change('exposure', value)} />
          <div className="emitter-page__radios" role="radiogroup" aria-label="渲染分辨率">{scales.map((item) => <label key={item.value}><input type="radio" name="scale" checked={options.scale === item.value} onChange={() => change('scale', item.value)} />{item.label}</label>)}</div>
        </fieldset>
      </div>
      <footer>
        <div className="emitter-page__actions">
          <button type="button" onClick={copyOptions}><Copy />{copied ? '已复制' : '复制参数'}</button>
          <button type="button" onClick={() => setOptions({ ...pageDefaults })}><RotateCcw />恢复默认</button>
        </div>
        <p aria-live="polite">{info
          ? <>种子 {seed} · {info.count} 条光带 · {info.width}×{info.height}{info.gpuMs !== null ? ` · GPU ${info.gpuMs.toFixed(1)} ms` : ''}{info.fps !== null ? ` · ${info.fps.toFixed(0)} fps` : ''}</>
          : '正在创建 WebGL2 绘制资源…'}</p>
      </footer>
    </aside>}

    {error && <div className="emitter-page__error" role="alert"><strong>暂时无法绘制</strong><pre>{error}</pre><button type="button" onClick={() => setRetry((value) => value + 1)}>重新创建 WebGL2 资源</button></div>}
  </main>;
}
