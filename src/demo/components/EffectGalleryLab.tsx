import { Tabs } from '@base-ui/react/tabs';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { effectIds, type EffectId, type EffectOptions } from '../../core/effectGallery';
import vertexDataSource from '../../core/effectGallery.ts?raw';
import rendererSource from '../../core/effectGalleryRenderer.ts?raw';
import { createEffectRenderer, effectSources, type EffectFrameInfo } from '../../core/effectGalleryRenderer';
import { effectDefaults, effectRecipes } from '../effectRecipes';
import { CodeBlock } from './CodeBlock';

function Parameter({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void;
}) {
  const id = useId(), digits = step >= 1 ? 0 : step < 0.001 ? 4 : step < 0.01 ? 3 : 2;
  return <label className="ribbon-range" htmlFor={id}><span>{label}<output htmlFor={id}>{value.toFixed(digits)}</output></span><input id={id} aria-label={label} type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export function EffectGalleryLab({ effect, onSelect, effects = effectIds }: {
  effect: EffectId; onSelect: (value: EffectId) => void; effects?: readonly EffectId[];
}) {
  const [options, setOptions] = useState<EffectOptions>(() => effectDefaults(effect));
  const [playing, setPlaying] = useState(false), [time, setTime] = useState(0);
  const [info, setInfo] = useState<EffectFrameInfo | null>(null), [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null), rendererRef = useRef<ReturnType<typeof createEffectRenderer> | null>(null);
  const optionsRef = useRef(options), timeRef = useRef(0), playingRef = useRef(false);
  const refreshRef = useRef<((dt?: number) => void) | null>(null);
  const effectId = useId(), variantId = useId();
  const recipe = effectRecipes.find((item) => item.id === effect)!;
  const effectIndex = effectIds.indexOf(effect);
  const selectionIndex = effects.indexOf(effect);
  const isFeedback = effect === 'feedback', isMesh = effect === 'geometry';

  useEffect(() => {
    const next = effectDefaults(effect);
    optionsRef.current = next; timeRef.current = 0; playingRef.current = false;
    setOptions(next); setTime(0); setPlaying(false); setInfo(null);
    rendererRef.current?.clearHistory(); refreshRef.current?.();
  }, [effect]);
  useEffect(() => { optionsRef.current = options; refreshRef.current?.(); }, [options]);
  useEffect(() => {
    playingRef.current = playing;
    if (!playing) setTime(timeRef.current);
    refreshRef.current?.();
  }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ReturnType<typeof createEffectRenderer> | null = null;
    let raf = 0, previous = performance.now(), drawn = 0, reported = 0;
    let stopped = false, visible = true;
    function draw(now: number, forcedDt = 0) {
      if (stopped || !renderer) return;
      // 参数变化必须生成新的静态帧；可见性只控制持续推进的动画。
      if (playingRef.current && (document.hidden || !visible)) return;
      if (playingRef.current && now - drawn < 1000 / 30 && forcedDt === 0) {
        raf = requestAnimationFrame((stamp) => draw(stamp)); return;
      }
      const dt = forcedDt || (playingRef.current ? Math.min(Math.max((now - previous) * 0.001, 0), optionsRef.current.kind === 13 ? 1 / 30 : 0.1) : 0);
      previous = now;
      if (playingRef.current) timeRef.current += dt;
      try {
        const frame = renderer.draw(timeRef.current, dt, optionsRef.current);
        if (frame && (!playingRef.current || now - reported >= 200)) {
          setInfo(frame); setTime(timeRef.current); reported = now;
        }
        drawn = now;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause)); playingRef.current = false; setPlaying(false); return;
      }
      if (playingRef.current) raf = requestAnimationFrame((stamp) => draw(stamp));
    }
    function refresh(dt = 0) {
      cancelAnimationFrame(raf); previous = performance.now(); drawn = 0; draw(previous, dt);
    }
    function lost(event: Event) {
      event.preventDefault(); cancelAnimationFrame(raf); playingRef.current = false; setPlaying(false);
      setError('WebGL 上下文已丢失。恢复后会重新创建资源；帧间历史会重置。');
    }
    function restored() { setRetry((value) => value + 1); }
    function visibilityChanged() { refresh(); }
    function motionChanged(event: MediaQueryListEvent) { if (event.matches) setPlaying(false); }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let dpr = matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`);
    function dprChanged() {
      dpr.removeEventListener('change', dprChanged); dpr = matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`);
      dpr.addEventListener('change', dprChanged); refresh();
    }
    const resize = new ResizeObserver(() => refresh());
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh(); });
    try { renderer = createEffectRenderer(canvas); rendererRef.current = renderer; setError(null); refreshRef.current = refresh; refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    resize.observe(canvas); intersection.observe(canvas);
    document.addEventListener('visibilitychange', visibilityChanged);
    reduced.addEventListener('change', motionChanged); dpr.addEventListener('change', dprChanged);
    canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      stopped = true; cancelAnimationFrame(raf); refreshRef.current = null; rendererRef.current = null;
      resize.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', visibilityChanged);
      reduced.removeEventListener('change', motionChanged); dpr.removeEventListener('change', dprChanged);
      canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', restored); renderer?.dispose();
    };
  }, [retry]);

  function setParameter(index: number, value: number) {
    setOptions((current) => ({ ...current, params: current.params.map((item, i) => i === index ? value : item) as [number, number, number] }));
  }
  function seek(value: number) {
    playingRef.current = false; timeRef.current = value; setPlaying(false); setTime(value);
    rendererRef.current?.clearHistory(); refreshRef.current?.();
  }
  function reset() { seek(0); setOptions(effectDefaults(effect)); }
  function advance() {
    playingRef.current = false; setPlaying(false); timeRef.current += 1 / 30;
    setTime(timeRef.current); refreshRef.current?.(1 / 30);
  }
  const selectedFragment = isMesh ? effectSources.meshFragmentSource : isFeedback ? effectSources.feedbackSource
    : effect === 'bloom' ? effectSources.blurSource : effectIndex >= 5 && effectIndex <= 11 ? effectSources.postSource : effectSources.fieldSource;
  const sourceTabs = [
    { id: 'fragment', label: 'fragment.glsl', code: selectedFragment, language: 'glsl' },
    { id: 'vertex', label: 'vertex.glsl', code: isMesh ? effectSources.meshVertexSource : effectSources.fullscreenSource, language: 'glsl' },
    { id: 'data', label: 'vertex-data.ts', code: vertexDataSource, language: 'ts' },
    { id: 'renderer', label: 'renderer.ts', code: rendererSource, language: 'ts' },
    { id: 'scene', label: 'scene.glsl', code: effectSources.fieldSource, language: 'glsl' },
    { id: 'post', label: 'post.glsl', code: effectSources.postSource, language: 'glsl' },
  ];
  const variantControls = recipe.controls.filter((_, index) => !(effect === 'cells' && options.variant === 1 && index === 1) && !(isFeedback && options.variant === 0 && index === 2));

  return <div className="ribbon-lab effect-gallery-lab">
    {effects.length > 1 ? <div className="ribbon-lab__toolbar effect-gallery__toolbar">
      <label className="ribbon-select" htmlFor={effectId}>本页案例<select id={effectId} value={effect} onChange={(event) => onSelect(event.target.value as EffectId)}>{effects.map((id) => <option key={id} value={id}>{effectRecipes.find((item) => item.id === id)!.name}</option>)}</select></label>
      <div><button type="button" aria-label="上一个案例" disabled={selectionIndex === 0} onClick={() => onSelect(effects[selectionIndex - 1])}><ArrowLeft aria-hidden="true" /></button><span>{selectionIndex + 1} / {effects.length}</span><button type="button" aria-label="下一个案例" disabled={selectionIndex === effects.length - 1} onClick={() => onSelect(effects[selectionIndex + 1])}><ArrowRight aria-hidden="true" /></button></div>
    </div> : <div className="ribbon-lab__toolbar effect-gallery__single"><strong>{recipe.name}</strong></div>}
    <div className="ribbon-lab__toolbar"><label><input type="checkbox" checked={options.compare} onChange={(event) => setOptions((current) => ({ ...current, compare: event.target.checked }))} /><span><span className="effect-gallery__long-label">显示</span>基础对照</span></label><div><button type="button" disabled={!!error} aria-pressed={playing} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}<span>{playing ? '暂停' : '播放'}<span className="effect-gallery__long-label">效果</span></span></button>{isFeedback && <button type="button" disabled={!!error} onClick={advance}><StepForward aria-hidden="true" /><span><span className="effect-gallery__long-label">前进</span>一帧</span></button>}<button type="button" onClick={reset}><RotateCcw aria-hidden="true" /><span>重置<span className="effect-gallery__long-label">效果</span></span></button></div></div>
    <div className="ribbon-lab__workbench">
      <div className="ribbon-lab__preview" data-compare={options.compare}>
        <canvas ref={canvasRef} role="img" aria-label={`${recipe.name}实时 WebGL2 演示${options.compare ? `，右侧${recipe.baseline}` : ''}`} />
        <div className="ribbon-lab__canvas-labels" aria-hidden="true"><span>{recipe.variants?.[options.variant] ?? recipe.name}</span>{options.compare && <span>{recipe.baseline}</span>}</div>
        {options.compare && <span className="ribbon-lab__divider" aria-hidden="true" />}
        <span className="ribbon-lab__play-state">{playing ? '效果正在播放' : '效果已暂停 · 调参数查看变化'}</span>
        {error && <div className="ribbon-lab__error" role="alert"><strong>暂时无法绘制</strong><pre>{error}</pre><button type="button" onClick={() => setRetry((value) => value + 1)}>重新创建绘制资源</button></div>}
      </div>
      <aside className="ribbon-lab__controls" aria-label={`${recipe.name}参数`}>
        {recipe.variants && <label className="ribbon-select" htmlFor={variantId}>表达方式<select id={variantId} value={options.variant} onChange={(event) => setOptions((current) => ({ ...current, variant: Number(event.target.value) }))}>{recipe.variants.map((value, index) => <option key={value} value={index}>{value}</option>)}</select></label>}
        {variantControls.map((item) => {
          const index = recipe.controls.indexOf(item);
          return isMesh && index === 2 ? <label className="ribbon-check" key={item.label}><input type="checkbox" checked={options.params[2] > 0} onChange={(event) => setParameter(2, event.target.checked ? 1 : 0)} />显示网格线</label>
            : <Parameter key={item.label} {...item} value={options.params[index]} onChange={(value) => setParameter(index, value)} />;
        })}
        {isFeedback ? <small className="effect-gallery__clock">模拟时间 {time.toFixed(2)} 秒<br />每帧 dt ≤ 1/30 秒<br />改参数会清空帧间历史。</small>
          : <Parameter label="效果时间（秒）" min={0} max={Math.max(30, Math.ceil(time / 30) * 30)} step={0.1} value={time} onChange={seek} />}
        <a className="effect-gallery__principle" href={`#${recipe.anchor}`}>阅读这项手法的原理<ArrowRight aria-hidden="true" /></a>
      </aside>
    </div>
    <div className="ribbon-lab__explanation">
      <div aria-live="polite"><h3>{recipe.name}怎样产生</h3><p>{recipe.explanation}</p></div>
      <ol className="effect-gallery__pipeline" aria-label={`${recipe.name}实际渲染流程`}>{recipe.pipeline.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}</ol>
      {isFeedback && info && <p className="effect-gallery__history" aria-live="polite">已更新 {info.historyFrames} 帧 · 最近一次读取 Texture {info.read}，写入 Texture {info.write} · 下一次读写交换</p>}
      <p className="ribbon-lab__observation"><strong>试着观察</strong>{recipe.observe}</p>
    </div>
    <Tabs.Root className="ribbon-lab__sources" defaultValue="fragment"><Tabs.List className="editor-tabs" aria-label="效果实验运行源码">{sourceTabs.map((item) => <Tabs.Tab key={item.id} value={item.id}>{item.label}</Tabs.Tab>)}</Tabs.List>{sourceTabs.map((item) => <Tabs.Panel key={item.id} value={item.id}><CodeBlock label={`${item.label} · 实际运行源码`} language={item.language}>{item.code}</CodeBlock></Tabs.Panel>)}</Tabs.Root>
    <footer className="ribbon-lab__status" aria-live="polite">{info ? <>Canvas {info.width} × {info.height} · 当前分区 {info.paneWidth} × {info.height} · 当前显示 {info.passes} 遍绘制{options.compare ? ' · 对照另计' : ''} · 附件 {info.format}{isMesh ? ` · ${info.vertices} 顶点 / ${info.triangles} 三角形` : ''}{isFeedback ? ` · 最近 dt ${info.dt.toFixed(4)} 秒` : ''}</> : '正在创建效果的 WebGL2 资源…'}</footer>
  </div>;
}
