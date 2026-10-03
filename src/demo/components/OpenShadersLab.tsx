import { Tabs } from '@base-ui/react/tabs';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import rendererSource from '../../core/openShadersLab.ts?raw';
import {
  createRibbonRenderer, fieldSource, postSource, ribbonParameters, shaderStyles, vertexSource,
  type RibbonFrameInfo, type RibbonOptions, type ShaderStyle,
} from '../../core/openShadersLab';
import { openShadersSteps } from '../openShadersSteps';
import { CodeBlock } from './CodeBlock';

function Range({ label, value, min, max, step = 0.01, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void;
}) {
  const id = useId();
  return <label className="ribbon-range" htmlFor={id}><span>{label}<output htmlFor={id}>{Number.isInteger(step) ? value : value.toFixed(2)}</output></span><input id={id} aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export function OpenShadersLab({ light }: { light: boolean }) {
  const [stage, setStage] = useState(0);
  const [name, setName] = useState('shader');
  const [draftName, setDraftName] = useState('shader');
  const parameters = useMemo(() => ribbonParameters(name), [name]);
  const [hue, setHue] = useState(parameters.hue);
  const [layers, setLayers] = useState(80);
  const [stretch, setStretch] = useState(0.17);
  const [warp, setWarp] = useState(1);
  const [exposure, setExposure] = useState(1);
  const [style, setStyle] = useState<ShaderStyle>('none');
  const [strength, setStrength] = useState(1);
  const [fieldScale, setFieldScale] = useState(0.5);
  const [compare, setCompare] = useState(true);
  const [toneMap, setToneMap] = useState(true);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [info, setInfo] = useState<RibbonFrameInfo | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const refreshRef = useRef<(() => void) | null>(null);
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const options = useMemo<RibbonOptions>(() => ({ stage, parameters, layers, stretch, warp, exposure, hue, style, strength, fieldScale, compare, toneMap, light }), [stage, parameters, layers, stretch, warp, exposure, hue, style, strength, fieldScale, compare, toneMap, light]);
  const optionsRef = useRef(options);
  const step = openShadersSteps[stage];
  const referenceLabel = stage === 6 ? '原始光场' : stage === 7 ? '全分辨率' : '完成效果';

  useEffect(() => { optionsRef.current = options; refreshRef.current?.(); }, [options]);
  useEffect(() => {
    playingRef.current = playing;
    if (!playing) setTime(timeRef.current);
    refreshRef.current?.();
  }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ReturnType<typeof createRibbonRenderer> | null = null;
    let raf = 0, previous = performance.now(), drawn = 0, reported = 0, visible = true;
    let lastInfo = '';
    let stopped = false;

    function draw(now: number) {
      if (stopped || document.hidden || !visible || canvas!.getContext('webgl2')?.isContextLost()) return;
      const dt = Math.min(Math.max(0, (now - previous) * 0.001), 0.1);
      previous = now;
      if (playingRef.current) timeRef.current += dt;
      // 时间读数以 5 Hz 同步，绘制仍读取逐帧推进的时间，避免整个源码面板逐帧更新。
      if (playingRef.current && optionsRef.current.stage >= 3 && now - reported >= 200) {
        setTime(timeRef.current);
        reported = now;
      }
      if (now - drawn >= 1000 / 30 || !playingRef.current) {
        try {
          const frame = renderer?.draw(timeRef.current, optionsRef.current);
          if (frame && JSON.stringify(frame) !== lastInfo) { lastInfo = JSON.stringify(frame); setInfo(frame); }
          drawn = now;
        } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); return; }
      }
      if (playingRef.current) raf = requestAnimationFrame(draw);
    }
    function refresh() {
      cancelAnimationFrame(raf);
      previous = performance.now();
      drawn = 0;
      draw(previous);
    }
    function lost(event: Event) {
      event.preventDefault();
      cancelAnimationFrame(raf);
      setError('WebGL 上下文已丢失。浏览器恢复后会重建资源，也可以点击重试。');
    }
    function restored() { setRetry((value) => value + 1); }
    function motionChanged(event: MediaQueryListEvent) { if (event.matches) setPlaying(false); }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let dpr = matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`);
    function dprChanged() {
      dpr.removeEventListener('change', dprChanged);
      dpr = matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`);
      dpr.addEventListener('change', dprChanged);
      refresh();
    }
    const resize = new ResizeObserver(refresh);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh(); });

    try { renderer = createRibbonRenderer(canvas); setError(null); refreshRef.current = refresh; refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    resize.observe(canvas);
    intersection.observe(canvas);
    document.addEventListener('visibilitychange', refresh);
    reduced.addEventListener('change', motionChanged);
    dpr.addEventListener('change', dprChanged);
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      stopped = true;
      refreshRef.current = null;
      cancelAnimationFrame(raf);
      resize.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', refresh);
      reduced.removeEventListener('change', motionChanged);
      dpr.removeEventListener('change', dprChanged);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      renderer?.dispose();
    };
  }, [retry]);

  function togglePlayback() {
    if (playing) setTime(timeRef.current);
    setPlaying(!playing);
  }
  function seekTime(value: number) {
    playingRef.current = false;
    timeRef.current = value;
    setPlaying(false); setTime(value);
    refreshRef.current?.();
  }
  function reset() {
    playingRef.current = false; timeRef.current = 0;
    setPlaying(false); setTime(0); setStage(0); setName('shader'); setDraftName('shader');
    setHue(ribbonParameters('shader').hue); setLayers(80); setStretch(0.17); setWarp(1);
    setExposure(1); setStyle('none'); setStrength(1); setFieldScale(0.5); setToneMap(true); setCompare(true);
  }
  function applyName(event: FormEvent) {
    event.preventDefault();
    const next = draftName.trim() || 'webgl';
    setName(next); setHue(ribbonParameters(next).hue);
  }
  const sourceTabs = [
    { id: 'step', label: '当前公式', code: step.code, language: 'glsl' },
    { id: 'data', label: 'vertex-data.ts', code: rendererSource, language: 'ts' },
    { id: 'vertex', label: 'vertex.glsl', code: vertexSource, language: 'glsl' },
    { id: 'field', label: 'fragment.glsl', code: fieldSource, language: 'glsl' },
    { id: 'post', label: 'post.glsl', code: postSource, language: 'glsl' },
  ];

  return <div className="ribbon-lab">
    <nav aria-label="效果拆解步骤" className="ribbon-lab__navigation">
      <ol>{openShadersSteps.map((item, index) => <li key={item.short}><button type="button" aria-current={stage === index ? 'step' : undefined} aria-controls="ribbon-step-details" onClick={() => setStage(index)}><span>{index + 1}</span>{item.short}</button></li>)}</ol>
    </nav>
    <div className="ribbon-lab__toolbar">
      <span>第 {stage + 1} / 8 步 · {step.title}</span>
      <div><label><input type="checkbox" checked={compare} onChange={(event) => setCompare(event.target.checked)} />{referenceLabel}对照</label><button type="button" onClick={togglePlayback} disabled={!!error} aria-pressed={playing}>{playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{playing ? '暂停流动' : '播放流动'}</button><button type="button" onClick={reset}><RotateCcw aria-hidden="true" /><span>重置</span></button></div>
    </div>
    <div className="ribbon-lab__workbench">
      <div className="ribbon-lab__preview" data-compare={compare}>
        <canvas ref={canvasRef} role="img" aria-label={`${step.title}的 WebGL2 结果${compare ? `，右侧为同参数的${referenceLabel}` : ''}`} />
        <div className="ribbon-lab__canvas-labels" aria-hidden="true"><span>{step.short}阶段</span>{compare && <span>{referenceLabel} · 同参数</span>}</div>
        {compare && <span className="ribbon-lab__divider" aria-hidden="true" />}
        <span className="ribbon-lab__play-state">{playing ? '时间正在推进' : '时间已冻结 · 可调节参数'}</span>
        {error && <div className="ribbon-lab__error" role="alert"><strong>暂时无法绘制</strong><pre>{error}</pre><button type="button" onClick={() => setRetry((value) => value + 1)}>重新创建 WebGL2 资源</button></div>}
      </div>
      <aside className="ribbon-lab__controls" aria-label="当前步骤参数">
        <form onSubmit={applyName}><label htmlFor="ribbon-name">参数种子</label><div><input id="ribbon-name" maxLength={40} value={draftName} onChange={(event) => setDraftName(event.target.value)} /><button type="submit">生成</button></div><small>输入名字，在本地生成可复现参数。</small></form>
        {stage === 0 && <div className="ribbon-lab__coordinate-note"><strong>左下角原点</strong><p>像素坐标 → 居中坐标<br /><code>p = (frag − R / 2) / R.y</code></p><small>圆环标出半径 0.25。</small></div>}
        {(stage === 1 || stage === 5) && <Range label="曝光" min={0.25} max={3} value={exposure} onChange={setExposure} />}
        {stage === 2 && <Range label="纵轴尺度" min={0.05} max={1} value={stretch} onChange={setStretch} />}
        {stage === 3 && <Range label="扭曲强度" min={0} max={2} value={warp} onChange={setWarp} />}
        {stage === 4 && <Range label="累加层数" min={1} max={96} step={1} value={layers} onChange={setLayers} />}
        {stage === 5 && <><Range label="色相" min={0} max={1} value={hue} onChange={setHue} /><label className="ribbon-check"><input type="checkbox" checked={toneMap} onChange={(event) => setToneMap(event.target.checked)} />压缩高光 Tone mapping</label></>}
        {stage >= 6 && <><label className="ribbon-select" htmlFor="ribbon-style">表面风格<select id="ribbon-style" aria-label="表面风格" value={style} onChange={(event) => setStyle(event.target.value as ShaderStyle)}>{shaderStyles.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.chinese}</option>)}</select></label>{style !== 'none' && <Range label="效果强度" min={0} max={1.3} value={strength} onChange={setStrength} />}<p className="ribbon-lab__style-note">{shaderStyles.find((item) => item.id === style)!.principle}</p></>}
        {stage === 7 && <fieldset className="ribbon-lab__resolution"><legend>基础场分辨率</legend>{[{ value: 1, label: '1×' }, { value: 0.5, label: '½×' }, { value: 0.25, label: '¼×' }].map((item) => <label key={item.value}><input type="radio" name="field-resolution" value={item.value} checked={fieldScale === item.value} onChange={() => setFieldScale(item.value)} />{item.label}</label>)}</fieldset>}
        {stage >= 3 && <Range label="时间相位（秒）" min={0} max={Math.max(30, Math.ceil(time / 30) * 30)} step={0.1} value={time} onChange={seekTime} />}
      </aside>
    </div>
    <div id="ribbon-step-details" className="ribbon-lab__explanation">
      <div aria-live="polite"><h2>{stage + 1}. {step.title}</h2><p>{step.description}</p></div>
      <dl className="ribbon-lab__dataflow"><div><dt>输入</dt><dd>{step.input}</dd></div><div><dt>新增运算</dt><dd>{step.operation}</dd></div><div><dt>输出</dt><dd>{step.output}</dd></div></dl>
      <p className="ribbon-lab__observation"><strong>试着观察</strong>{step.observe}</p>
      <div className="ribbon-lab__step-actions"><button type="button" onClick={() => setStage(stage - 1)} disabled={stage === 0}><ArrowLeft aria-hidden="true" />上一步</button><span>{stage === 7 ? '八步完成 · 可以回到任意步骤实验' : `下一步：${openShadersSteps[stage + 1].title}`}</span><button type="button" onClick={() => setStage(stage + 1)} disabled={stage === 7}>下一步<ArrowRight aria-hidden="true" /></button></div>
    </div>
    <Tabs.Root className="ribbon-lab__sources" defaultValue="step">
      <Tabs.List className="editor-tabs" aria-label="OpenShaders 教学实验源码">{sourceTabs.map((item) => <Tabs.Tab key={item.id} value={item.id}>{item.label}</Tabs.Tab>)}</Tabs.List>
      {sourceTabs.map((item) => <Tabs.Panel key={item.id} value={item.id}><CodeBlock label={item.id === 'step' ? `${step.title} · 核心片段` : `${item.label} · 实际运行源码`} language={item.language}>{item.code}</CodeBlock></Tabs.Panel>)}
    </Tabs.Root>
    <footer className="ribbon-lab__status" aria-live="polite">{info ? <>当前画面 {info.width} × {info.height} · 基础场 {info.fieldWidth} × {info.fieldHeight} · 基础场片段约 {Math.round(info.fieldWidth * info.fieldHeight / (info.width * info.height) * 100)}%{compare ? ' · 对照独立使用全尺寸场' : ''}</> : '正在准备 WebGL2 绘制资源…'}</footer>
  </div>;
}
