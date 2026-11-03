import { BookOpen, ChevronRight, Copy, Dices, Eye, Maximize, Minimize, Pause, Play, RotateCcw, SlidersHorizontal, Undo2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Point } from '../core/controlledRibbon';
import {
  backgroundPresets, createEmitter, createEmitterRenderer, defaultEmitterOptions,
  type BackgroundKind, type EmitterFrameInfo, type EmitterOptions,
} from '../core/ribbonEmitter';

// 参数含义或默认值有变化时换一个版本号，旧版本存下的值不再覆盖新默认值。
const storageKey = 'ribbon-emitter-options-v6';

// 教程站点里讲解单条光带画法的课程；直接拼 URL，避免把整套课程导航打进这个页面。
const anatomyHref = `${import.meta.env.BASE_URL}?lesson=ribbon-anatomy#lesson-title`;

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

// 界面偏好（当前标签页、是否显示发射点）只是本机的便利设置，读写失败时用默认值。
function readPreference<T>(key: string, fallback: T): T {
  try { return (JSON.parse(localStorage.getItem(key) ?? 'null') as T | null) ?? fallback; } catch { return fallback; }
}
function writePreference(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 隐私模式下无法保存 */ }
}

/** 改过的参数在标签前标一个点，并给出单独恢复默认值的按钮。 */
function Range({ label, hint, value, min, max, step = 0.01, changed = false, onChange, onReset }: {
  label: string; hint?: string; value: number; min: number; max: number; step?: number; changed?: boolean;
  onChange: (value: number) => void; onReset?: () => void;
}) {
  const id = useId();
  const digits = step >= 1 ? 0 : step < 0.01 ? 3 : 2;
  return <div className="emitter-range" data-changed={changed}>
    <span>
      <label htmlFor={id} title={hint}>{label}</label>
      {changed && onReset && <button type="button" className="emitter-range__reset" onClick={onReset} title="恢复默认值" aria-label={`${label}恢复默认值`}><Undo2 /></button>}
      <output htmlFor={id}>{value.toFixed(digits)}</output>
    </span>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </div>;
}

type NumericKey = { [K in keyof EmitterOptions]: EmitterOptions[K] extends number ? K : never }[keyof EmitterOptions];
interface ParamSpec { key: NumericKey; label: string; min: number; max: number; step?: number; hint?: string }
type TabId = 'emit' | 'shape' | 'light' | 'color' | 'scene';

// 速度单独成组：整体速度是总倍率，下面三项分别控制生命、形态和光纹各自的快慢。
const speedParams: ParamSpec[] = [
  { key: 'speed', label: '整体速度', min: 0, max: 1.5, hint: '下面三项的总倍率' },
  { key: 'lifeSpeed', label: '生命节奏', min: 0, max: 3, hint: '发射新光带、生长、变老、消散的快慢' },
  { key: 'motionSpeed', label: '形态运动', min: 0, max: 3, hint: '弯曲、摆动、亮结流动的快慢' },
  { key: 'shimmerSpeed', label: '光纹流动', min: 0, max: 3, hint: '亮边明暗、宽度起伏、光面丝纹流动的快慢' },
];

// 每个标签页先放最常调的几项，其余收进“更多参数”。
const paramTabs: { id: TabId; label: string; basic: ParamSpec[]; more: ParamSpec[] }[] = [
  {
    id: 'emit', label: '发射',
    basic: [
      { key: 'interval', label: '发射间隔', min: 0.3, max: 5, hint: '平均每隔多久放出一条光带' },
      { key: 'spread', label: '扩散角（弧度）', min: 0, max: Math.PI * 2 },
      { key: 'life', label: '寿命', min: 2, max: 20, step: 0.1 },
    ],
    more: [
      { key: 'direction', label: '发射方向（弧度）', min: -Math.PI, max: Math.PI, hint: '也可以直接在画面上看扇形示意线' },
      { key: 'growth', label: '生长时长（占寿命）', min: 0.05, max: 0.6 },
      { key: 'release', label: '尾部回缩', min: 0, max: 1 },
      { key: 'travel', label: '飘离距离', min: 0, max: 1 },
      { key: 'defocus', label: '晚年失焦', min: 0, max: 2, hint: '后半生光带变宽、边缘变软' },
      { key: 'dissolve', label: '晚年散成丝缕', min: 0, max: 1.5, hint: '后半生各层从末端开始先后消失' },
    ],
  },
  {
    id: 'shape', label: '形态',
    basic: [
      { key: 'length', label: '长度', min: 0.4, max: 2.2 },
      { key: 'width', label: '宽度', min: 0.05, max: 1 },
      { key: 'curl', label: '固定弯曲', min: 0, max: 1.2 },
      { key: 'drift', label: '摆动幅度', min: 0, max: 1.2 },
      { key: 'twist', label: '扭转圈数', min: 0, max: 2 },
    ],
    more: [
      { key: 'widthRandom', label: '宽度差异', min: 0, max: 1, hint: '各条光带之间的宽度差别' },
      { key: 'widthWave', label: '宽度起伏', min: 0, max: 0.9, hint: '同一条光带沿长度一段宽一段窄' },
      { key: 'variance', label: '长度与扭转浮动', min: 0, max: 0.8 },
      { key: 'twistFlow', label: '亮结流速', min: -2, max: 2, hint: '亮结沿光带移动的快慢；扭转圈数接近 0 时几乎不动' },
      { key: 'rootPinch', label: '根部收窄', min: 0, max: 1 },
    ],
  },
  {
    id: 'light', label: '光效',
    basic: [
      { key: 'edgeCore', label: '亮线强度', min: 0, max: 2 },
      { key: 'foldGlow', label: '翻折增亮', min: 0, max: 2, hint: '薄膜侧对画面时变亮' },
      { key: 'bloom', label: '泛光', min: 0, max: 2 },
      { key: 'exposure', label: '曝光', min: 0.2, max: 3 },
    ],
    more: [
      { key: 'layers', label: '层数', min: 4, max: 48, step: 1 },
      { key: 'gamma', label: '亮边集中度 γ', min: 1, max: 6, hint: '越大，光越集中在亮边一侧' },
      { key: 'edgeWidth', label: '亮线宽度', min: 0.0005, max: 0.006, step: 0.0001 },
      { key: 'edgeVary', label: '亮边明暗变化', min: 0, max: 1 },
      { key: 'edgeRandom', label: '各条亮线差异', min: 0, max: 1 },
      { key: 'softness', label: '柔和度', min: 0.001, max: 0.03, step: 0.001 },
      { key: 'smoothing', label: '光面平滑', min: 0, max: 2.5 },
      { key: 'outerFade', label: '外缘渐隐', min: 0, max: 1 },
      { key: 'sourceGlow', label: '发射点光晕', min: 0, max: 2 },
    ],
  },
  {
    id: 'color', label: '颜色',
    basic: [
      { key: 'faceHue', label: '冷色色相（圈）', min: 0, max: 1, step: 0.005, hint: '光面与暗处的颜色' },
      { key: 'warmHue', label: '暖色色相（圈）', min: 0, max: 1, step: 0.005, hint: '最亮处的颜色' },
      { key: 'heat', label: '按能量上色', min: 0, max: 1, hint: '越亮越偏暖色' },
    ],
    more: [
      { key: 'heatPoint', label: '变暖阈值', min: 0.05, max: 4, hint: '亮度到这个值时冷暖各半' },
      { key: 'edgeHue', label: '亮边色相（圈）', min: 0, max: 1, step: 0.005 },
      { key: 'hueJitter', label: '色相随机（圈）', min: 0, max: 0.2, step: 0.005 },
    ],
  },
  { id: 'scene', label: '画面', basic: [], more: [] },
];
const allParams = [...paramTabs.flatMap((tab) => [...tab.basic, ...tab.more]), ...speedParams];

const backgroundKinds: { value: BackgroundKind; label: string }[] = [{ value: 'solid', label: '纯色' }, { value: 'linear', label: '线性' }, { value: 'radial', label: '径向' }];
const scales = [{ value: 1, label: '1×' }, { value: 0.75, label: '¾×' }, { value: 0.5, label: '½×' }];

export function EmitterPage() {
  const [options, setOptions] = useState<EmitterOptions>(loadOptions);
  const [seed, setSeed] = useState(1);
  const [playing, setPlaying] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [panel, setPanel] = useState(true);
  const [tab, setTab] = useState<TabId>(() => readPreference<TabId>('ribbon-emitter-tab', 'emit'));
  const [showHandles, setShowHandles] = useState(() => readPreference('ribbon-emitter-handles', true));
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
  useEffect(() => writePreference('ribbon-emitter-tab', tab), [tab]);
  useEffect(() => writePreference('ribbon-emitter-handles', showHandles), [showHandles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ReturnType<typeof createEmitterRenderer> | null = null;
    const emitter = createEmitter(seedRef.current);
    // 三个时钟各自累加：调某一个速度时只改它以后的增量，画面不会跳。
    const clock = { life: 0, motion: 0, shimmer: 0 };
    let raf = 0, previous = performance.now(), reported = 0, frames = 0;
    let stopped = false, seeded = seedRef.current;

    function draw(now: number) {
      if (stopped || document.hidden || !renderer) { raf = 0; return; }
      const dt = Math.min(Math.max((now - previous) * 0.001, 0), 0.1);
      previous = now;
      // 换种子：从头开始一段新的发射序列，时间也归零。
      if (seeded !== seedRef.current) { seeded = seedRef.current; emitter.reset(seeded); clock.life = clock.motion = clock.shimmer = 0; }
      if (playingRef.current) {
        const { speed, lifeSpeed, motionSpeed, shimmerSpeed } = optionsRef.current;
        const step = dt * speed * 2.5;
        clock.life += step * lifeSpeed;
        clock.motion += step * motionSpeed;
        clock.shimmer += step * shimmerSpeed;
        frames += 1;
      }
      try {
        const fitted = fitToView(optionsRef.current, canvas!.clientWidth / Math.max(canvas!.clientHeight, 1));
        const ribbons = emitter.update(clock.life, fitted, clock.motion);
        const frame = renderer.draw(clock.shimmer, ribbons, fitted);
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
  const handles = chrome && panel && showHandles && size.height > 0;
  const isChanged = (key: NumericKey) => options[key] !== pageDefaults[key];
  const param = (spec: ParamSpec) => <Range key={spec.key} label={spec.label} hint={spec.hint} min={spec.min} max={spec.max} step={spec.step}
    value={options[spec.key]} changed={isChanged(spec.key)} onChange={(value) => change(spec.key, value)} onReset={() => change(spec.key, pageDefaults[spec.key])} />;
  const backgroundChanged = (['background', 'backgroundFrom', 'backgroundTo', 'backgroundAngle', 'backgroundRadius', 'scale'] as const).some((key) => options[key] !== pageDefaults[key])
    || options.backgroundCenter.some((value, i) => value !== pageDefaults.backgroundCenter[i]);
  const tabChanged = (id: TabId) => id === 'scene' ? backgroundChanged
    : paramTabs.some((item) => item.id === id && [...item.basic, ...item.more, ...(id === 'emit' ? speedParams : [])].some((spec) => isChanged(spec.key)));
  const changedCount = allParams.filter((spec) => isChanged(spec.key)).length;
  const current = paramTabs.find((item) => item.id === tab)!;
  const moreChanged = current.more.filter((spec) => isChanged(spec.key)).length;

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
      <a href={anatomyHref} title="光带发射器原理讲解"><BookOpen /><span>原理</span></a>
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
      <div className="emitter-page__tabs" role="tablist" aria-label="参数分组">
        {paramTabs.map((item) => <button key={item.id} type="button" role="tab" id={`emitter-tab-${item.id}`} aria-selected={tab === item.id} aria-controls="emitter-tabpanel"
          data-changed={tabChanged(item.id)} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </div>
      <div className="emitter-page__scroll" role="tabpanel" id="emitter-tabpanel" aria-labelledby={`emitter-tab-${tab}`}>
        {tab === 'scene' ? <>
          <fieldset><legend>背景</legend>
            <div className="emitter-page__chips">{backgroundPresets.map((preset) => <button key={preset.label} type="button" onClick={() => setOptions((value) => ({ ...value, ...preset.options }))}>{preset.label}</button>)}</div>
            <div className="emitter-page__radios" role="radiogroup" aria-label="背景类型">{backgroundKinds.map((item) => <label key={item.value}><input type="radio" name="background" checked={options.background === item.value} onChange={() => change('background', item.value)} />{item.label}</label>)}</div>
            <div className="emitter-page__colors">
              <label><input type="color" value={options.backgroundFrom} onChange={(event) => change('backgroundFrom', event.target.value)} />{options.background === 'radial' ? '中心色' : options.background === 'linear' ? '起点色' : '颜色'}</label>
              {options.background !== 'solid' && <label><input type="color" value={options.backgroundTo} onChange={(event) => change('backgroundTo', event.target.value)} />{options.background === 'radial' ? '外圈色' : '终点色'}</label>}
            </div>
            {options.background === 'linear' && param({ key: 'backgroundAngle', label: '渐变方向（度）', min: 0, max: 360, step: 1 })}
            {options.background === 'radial' && <>
              <Range label="中心 x" min={-1} max={1} value={options.backgroundCenter[0]} onChange={(value) => change('backgroundCenter', [value, options.backgroundCenter[1]])} />
              <Range label="中心 y" min={-0.5} max={0.5} value={options.backgroundCenter[1]} onChange={(value) => change('backgroundCenter', [options.backgroundCenter[0], value])} />
              {param({ key: 'backgroundRadius', label: '半径', min: 0.1, max: 2.5 })}
            </>}
          </fieldset>
          <fieldset><legend>渲染分辨率</legend>
            <div className="emitter-page__radios" role="radiogroup" aria-label="渲染分辨率">{scales.map((item) => <label key={item.value}><input type="radio" name="scale" checked={options.scale === item.value} onChange={() => change('scale', item.value)} />{item.label}</label>)}</div>
          </fieldset>
        </> : <>
          {tab === 'emit' && <label className="emitter-page__switch">
            <input type="checkbox" role="switch" checked={showHandles} onChange={(event) => setShowHandles(event.target.checked)} />
            <span>显示发射点<small>拖动圆点移动发射位置，虚线示意方向与扩散角</small></span>
          </label>}
          <div className="emitter-page__group">{current.basic.map(param)}</div>
          {tab === 'emit' && <fieldset className="emitter-page__speeds"><legend>速度</legend>{speedParams.map(param)}</fieldset>}
          <details className="emitter-page__more">
            <summary><ChevronRight />更多参数<small>{current.more.length} 项{moreChanged ? ` · 已改 ${moreChanged}` : ''}</small></summary>
            <div className="emitter-page__group">{current.more.map(param)}</div>
          </details>
        </>}
      </div>
      <footer>
        <div className="emitter-page__actions">
          <button type="button" onClick={copyOptions}><Copy />{copied ? '已复制' : '复制参数'}</button>
          <button type="button" onClick={() => setOptions({ ...pageDefaults })} disabled={!changedCount && !backgroundChanged}><RotateCcw />全部恢复默认{changedCount ? `（${changedCount}）` : ''}</button>
        </div>
        <p aria-live="polite">{info
          ? <>种子 {seed} · {info.count} 条光带 · {info.width}×{info.height}{info.gpuMs !== null ? ` · GPU ${info.gpuMs.toFixed(1)} ms` : ''}{info.fps !== null ? ` · ${info.fps.toFixed(0)} fps` : ''}</>
          : '正在创建 WebGL2 绘制资源…'}</p>
      </footer>
    </aside>}

    {error && <div className="emitter-page__error" role="alert"><strong>暂时无法绘制</strong><pre>{error}</pre><button type="button" onClick={() => setRetry((value) => value + 1)}>重新创建 WebGL2 资源</button></div>}
  </main>;
}
