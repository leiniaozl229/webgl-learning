import { Tabs } from '@base-ui/react/tabs';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import rendererSource from '../../core/shaderHandbookLab.ts?raw';
import { createHandbookRenderer, defaultHandbookOptions, fragmentSource, octaveWeight, vertexSource, type HandbookOptions } from '../../core/shaderHandbookLab';
import { shaderHandbookSteps } from '../shaderHandbookSteps';
import { CodeBlock } from './CodeBlock';

function Range({ label, value, min, max, step = 0.01, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void;
}) {
  const id = useId();
  const digits = step >= 1 ? 0 : step < 0.01 ? 3 : 2;
  return <label className="ribbon-range" htmlFor={id}><span>{label}<output htmlFor={id}>{value.toFixed(digits)}</output></span><input id={id} aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

export function ShaderHandbookLab() {
  const [options, setOptions] = useState<HandbookOptions>({ ...defaultHandbookOptions });
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [info, setInfo] = useState<ReturnType<ReturnType<typeof createHandbookRenderer>['draw']>>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef(options);
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const refreshRef = useRef<(() => void) | null>(null);
  const { stage } = options;
  const step = shaderHandbookSteps[stage];
  const referenceLabel = stage === 6 ? '关闭解析发光' : '完成光环';
  const shapeId = useId();

  function change<K extends keyof HandbookOptions>(key: K, value: HandbookOptions[K]) {
    setOptions((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => { optionsRef.current = options; refreshRef.current?.(); }, [options]);
  useEffect(() => {
    playingRef.current = playing;
    if (!playing) setTime(timeRef.current);
    refreshRef.current?.();
  }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ReturnType<typeof createHandbookRenderer> | null = null;
    let raf = 0, previous = performance.now(), drawn = 0, reported = 0;
    let stopped = false, visible = true, lastInfo = '';

    function draw(now: number) {
      if (stopped || document.hidden || !visible || !renderer) return;
      const dt = Math.min(Math.max((now - previous) * 0.001, 0), 0.1);
      previous = now;
      if (playingRef.current) timeRef.current += dt;
      if (playingRef.current && now - reported >= 200) { setTime(timeRef.current); reported = now; }
      if (!playingRef.current || now - drawn >= 1000 / 30) {
        try {
          const frame = renderer.draw(timeRef.current, optionsRef.current);
          if (!frame) return;
          const stamp = JSON.stringify(frame);
          if (stamp !== lastInfo) { setInfo(frame); lastInfo = stamp; }
          drawn = now;
        } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); return; }
      }
      if (playingRef.current) raf = requestAnimationFrame(draw);
    }
    function refresh() {
      cancelAnimationFrame(raf);
      previous = performance.now(); drawn = 0;
      draw(previous);
    }
    function lost(event: Event) {
      event.preventDefault(); cancelAnimationFrame(raf);
      setError('WebGL 上下文已丢失。恢复后会重新创建资源，也可以点击重试。');
    }
    function restored() { setRetry((value) => value + 1); }
    function motionChanged(event: MediaQueryListEvent) { if (event.matches) setPlaying(false); }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let dpr = matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`);
    function dprChanged() {
      dpr.removeEventListener('change', dprChanged);
      dpr = matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`);
      dpr.addEventListener('change', dprChanged); refresh();
    }
    const resize = new ResizeObserver(refresh);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh(); });
    try { renderer = createHandbookRenderer(canvas); setError(null); refreshRef.current = refresh; refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    resize.observe(canvas); intersection.observe(canvas);
    document.addEventListener('visibilitychange', refresh);
    reduced.addEventListener('change', motionChanged);
    dpr.addEventListener('change', dprChanged);
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      stopped = true; refreshRef.current = null; cancelAnimationFrame(raf);
      resize.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', refresh);
      reduced.removeEventListener('change', motionChanged);
      dpr.removeEventListener('change', dprChanged);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      renderer?.dispose();
    };
  }, [retry]);

  function seek(value: number) {
    playingRef.current = false; timeRef.current = value;
    setPlaying(false); setTime(value); refreshRef.current?.();
  }
  function reset() { seek(0); setOptions({ ...defaultHandbookOptions }); }
  const sourceTabs = [
    { id: 'step', label: '当前公式', code: step.code, language: 'glsl' },
    { id: 'data', label: 'vertex-data.ts', code: rendererSource, language: 'ts' },
    { id: 'vertex', label: 'vertex.glsl', code: vertexSource, language: 'glsl' },
    { id: 'fragment', label: 'fragment.glsl', code: fragmentSource, language: 'glsl' },
  ];

  return <div className="ribbon-lab handbook-lab">
    <nav aria-label="Shader 手法实验步骤" className="ribbon-lab__navigation"><ol>{shaderHandbookSteps.map((item, index) => <li key={item.short}><button type="button" aria-current={stage === index ? 'step' : undefined} aria-controls="handbook-step-details" onClick={() => change('stage', index)}><span>{index + 1}</span>{item.short}</button></li>)}</ol></nav>
    <div className="ribbon-lab__toolbar"><span>第 {stage + 1} / 7 步 · {step.title}</span><div><label><input type="checkbox" checked={options.compare} onChange={(event) => change('compare', event.target.checked)} />{referenceLabel}对照</label><button type="button" disabled={!!error} aria-pressed={playing} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{playing ? '暂停时间' : '播放时间'}</button><button type="button" onClick={reset}><RotateCcw aria-hidden="true" />重置</button></div></div>
    <div className="ribbon-lab__workbench">
      <div className="ribbon-lab__preview" data-compare={options.compare}>
        <canvas ref={canvasRef} role="img" aria-label={`${step.title}的 WebGL2 结果${options.compare ? `；右侧为同参数的${referenceLabel}` : ''}`} />
        <div className="ribbon-lab__canvas-labels" aria-hidden="true"><span>{step.short}{stage === 4 && options.inspect ? ' · 位移来源' : '阶段'}</span>{options.compare && <span>{referenceLabel} · 同参数</span>}</div>
        {options.compare && <span className="ribbon-lab__divider" aria-hidden="true" />}
        <span className="ribbon-lab__play-state">{playing ? '时间正在推进' : '时间已冻结 · 可调节参数'}</span>
        {error && <div className="ribbon-lab__error" role="alert"><strong>暂时无法绘制</strong><pre>{error}</pre><button type="button" onClick={() => setRetry((value) => value + 1)}>重新创建 WebGL2 资源</button></div>}
      </div>
      <aside className="ribbon-lab__controls" aria-label="当前手法的参数">
        {stage <= 1 && <Range label="圆环半径" min={0.08} max={0.35} value={options.radius} onChange={(value) => change('radius', value)} />}
        {stage === 0 && <div className="ribbon-lab__coordinate-note"><strong>从像素到查询坐标</strong><p>中心为原点<br />两个方向共享高度尺度</p><small>网格间距为 0.125；对照共享半径。</small></div>}
        {stage === 1 && <><label className="ribbon-select" htmlFor={shapeId}>距离场表达<select id={shapeId} value={options.shape} onChange={(event) => change('shape', Number(event.target.value))}><option value={0}>填充</option><option value={1}>描边</option><option value={2}>有符号距离</option></select></label><Range label="描边半宽" min={0.001} max={0.04} step={0.001} value={options.lineWidth} onChange={(value) => change('lineWidth', value)} /><label className="ribbon-check"><input type="checkbox" checked={options.antialias} onChange={(event) => change('antialias', event.target.checked)} />导数抗锯齿 fwidth</label></>}
        {stage >= 2 && stage <= 4 && <Range label="基础频率" min={1} max={10} step={0.1} value={options.frequency} onChange={(value) => change('frequency', value)} />}
        {stage === 2 && <label className="ribbon-check"><input type="checkbox" checked={options.smooth} onChange={(event) => change('smooth', event.target.checked)} />平滑插值 Value noise</label>}
        {(stage === 3 || stage === 4) && <Range label="噪声层数 octave" min={1} max={6} step={1} value={options.octaves} onChange={(value) => change('octaves', value)} />}
        {stage === 3 && <><Range label="振幅倍率" min={0.25} max={0.75} value={options.gain} onChange={(value) => change('gain', value)} /><small>归一化分母：{octaveWeight(options.octaves, options.gain).toFixed(5)}。每层频率 × 2。</small></>}
        {stage === 4 && <><Range label="扭曲强度" min={0} max={3} value={options.warp} onChange={(value) => change('warp', value)} /><label className="ribbon-check"><input type="checkbox" checked={options.inspect} onChange={(event) => change('inspect', event.target.checked)} />查看位移来源（R/G）</label></>}
        {stage === 5 && <Range label="配色相位" min={0} max={1} value={options.hue} onChange={(value) => change('hue', value)} />}
        {stage === 6 && <><Range label="圆环半径" min={0.08} max={0.35} value={options.radius} onChange={(value) => change('radius', value)} /><Range label="发光强度" min={0} max={3} value={options.glow} onChange={(value) => change('glow', value)} /></>}
        <Range label="时间（秒）" min={0} max={Math.max(30, Math.ceil(time / 30) * 30)} step={0.1} value={time} onChange={seek} />
      </aside>
    </div>
    <div id="handbook-step-details" className="ribbon-lab__explanation"><div aria-live="polite"><h2>{stage + 1}. {step.title}</h2><p>{step.description}</p></div><dl className="ribbon-lab__dataflow"><div><dt>输入</dt><dd>{step.input}</dd></div><div><dt>新增运算</dt><dd>{step.operation}</dd></div><div><dt>输出</dt><dd>{step.output}</dd></div></dl><p className="ribbon-lab__observation"><strong>试着观察</strong>{step.observe}</p><div className="ribbon-lab__step-actions"><button type="button" disabled={stage === 0} onClick={() => change('stage', stage - 1)}><ArrowLeft aria-hidden="true" />上一步</button><span>{stage === 6 ? '七步完成 · 继续查阅下方手法' : `下一步：${shaderHandbookSteps[stage + 1].title}`}</span><button type="button" disabled={stage === 6} onClick={() => change('stage', stage + 1)}>下一步<ArrowRight aria-hidden="true" /></button></div></div>
    <Tabs.Root className="ribbon-lab__sources" defaultValue="step"><Tabs.List className="editor-tabs" aria-label="Shader 手册实验源码">{sourceTabs.map((item) => <Tabs.Tab key={item.id} value={item.id}>{item.label}</Tabs.Tab>)}</Tabs.List>{sourceTabs.map((item) => <Tabs.Panel key={item.id} value={item.id}><CodeBlock label={item.id === 'step' ? `${step.title} · 核心片段` : `${item.label} · 实际运行源码`} language={item.language}>{item.code}</CodeBlock></Tabs.Panel>)}</Tabs.Root>
    <footer className="ribbon-lab__status" aria-live="polite">{info ? <>Canvas {info.width} × {info.height} · 当前分区 {info.paneWidth} × {info.height} · 当前每片段 {info.noiseCost} 次 Value noise{options.compare ? ' · 对照求值另计' : ''}</> : '正在创建 WebGL2 绘制资源…'}</footer>
  </div>;
}
