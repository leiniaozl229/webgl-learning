import { Tabs } from '@base-ui/react/tabs';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import {
  createPolarRenderer,
  defaultPolarOptions,
  POLAR_ANGULAR_SPEED,
  polarClosure,
  polarFragmentSource,
  polarVertexSource,
  type PolarFrame,
  type PolarOptions,
  type PolarRenderer,
} from '../../core/polarLab';
import vertexDataSource from '../../core/polarVertexData.ts?raw';
import { POLAR_RADIUS } from '../../core/polarVertexData';
import { FullscreenButton } from './FullscreenButton';
import { HighlightedCode } from './HighlightedCode';
import { RangeInput, Readout } from './MathLabs';

const TAU = Math.PI * 2;

const presets: Array<{ id: string; label: string; options: Partial<PolarOptions>; phaseDegrees: number }> = [
  { id: 'hexagon', label: '六边形', options: { segments: 6, startDegrees: 0, sweepDegrees: 360, amplitude: 0, showEdges: true }, phaseDegrees: 0 },
  { id: 'circle', label: '圆', options: { segments: 64, startDegrees: 0, sweepDegrees: 360, amplitude: 0, showEdges: false }, phaseDegrees: 0 },
  { id: 'sector', label: '扇形', options: { segments: 16, startDegrees: 30, sweepDegrees: 120, amplitude: 0, showEdges: true }, phaseDegrees: 0 },
  { id: 'petals', label: '五瓣', options: { segments: 96, startDegrees: 90, sweepDegrees: 360, waveCount: 5, amplitude: 0.22, showEdges: false }, phaseDegrees: 90 },
  { id: 'seam', label: '断口', options: { segments: 96, startDegrees: 0, sweepDegrees: 360, waveCount: 2.5, amplitude: 0.22, showEdges: false }, phaseDegrees: 90 },
];

const sourceTabs = [
  { id: 'data', label: 'vertex-data.ts', code: vertexDataSource, language: 'typescript' },
  { id: 'vertex', label: 'vertex.glsl', code: polarVertexSource, language: 'glsl' },
  { id: 'fragment', label: 'fragment.glsl', code: polarFragmentSource, language: 'glsl' },
] as const;

const fixed = (value: number, digits = 3) => (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits);
const toRadians = (degrees: number) => degrees * Math.PI / 180;
const message = (cause: unknown) => cause instanceof Error ? cause.message : String(cause);

function closureText(options: PolarOptions) {
  const closure = polarClosure(options);
  if (closure === 'sector') return `扇形：只覆盖 ${options.sweepDegrees}°，两条半径边从圆心连出`;
  if (options.amplitude === 0) return 'A = 0：半径恒为 R，首尾自然相接';
  if (closure === 'closed') return `k = ${options.waveCount}：转满 2π 后相位增加 ${options.waveCount} × 2π，sin 回到原值，首尾闭合`;
  // 相位比整数圈多出的部分决定首尾差多少；多出半圈时 sin(x + π) = −sin x，两端恰好变号。
  const extraTurns = options.waveCount - Math.floor(options.waveCount);
  const shift = extraTurns === 0.5 ? '多出半圈，sin 变号' : `多出 ${fixed(extraTurns, 2)} 圈`;
  return `k = ${options.waveCount}：转满 2π 后相位增加 ${options.waveCount} × 2π，${shift}，起点处出现断口`;
}

export function PolarLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [options, setOptions] = useState<PolarOptions>({ ...defaultPolarOptions });
  const [phaseDegrees, setPhaseDegrees] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState<PolarFrame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const optionsRef = useRef(options);
  // 相位以弧度保存在 ref 中：播放时每帧都会变化，界面只按较低频率同步显示。
  const phaseRef = useRef(0);
  const playingRef = useRef(false);
  const requestDrawRef = useRef<(() => void) | null>(null);

  useEffect(() => { optionsRef.current = options; requestDrawRef.current?.(); }, [options]);
  useEffect(() => { playingRef.current = playing; requestDrawRef.current?.(); }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let renderer: PolarRenderer | null = null;
    let raf = 0;
    let previous = performance.now();
    let reported = 0;
    let visible = true;
    let stopped = false;
    let lastStamp = '';

    function render(now: number) {
      raf = 0;
      if (stopped || !renderer || !visible || document.hidden) return;
      // 切回标签页时 Δt 可能很大，限制在 0.1 秒内，避免相位突然跳变。
      const deltaSeconds = Math.min(Math.max((now - previous) / 1000, 0), 0.1);
      previous = now;
      if (playingRef.current) {
        // 对 2π 取模：相位一直保持在一圈之内，长时间播放也不会损失精度。
        phaseRef.current = (phaseRef.current + POLAR_ANGULAR_SPEED * deltaSeconds) % TAU;
        if (now - reported >= 100) {
          setPhaseDegrees(Math.round(phaseRef.current * 180 / Math.PI) % 360);
          reported = now;
        }
      }
      try {
        const info = renderer.draw(optionsRef.current, phaseRef.current);
        if (info) {
          const stamp = `${info.width}×${info.height}:${info.vertexCount}:${info.uploads}`;
          if (stamp !== lastStamp) {
            lastStamp = stamp;
            setFrame(info);
          }
        }
      } catch (cause) {
        setError(message(cause));
        return;
      }
      if (playingRef.current) raf = requestAnimationFrame(render);
    }

    function requestDraw() {
      if (raf || stopped) return;
      previous = performance.now();
      raf = requestAnimationFrame(render);
    }

    function contextLost(event: Event) {
      event.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      setError('WebGL 上下文已丢失。浏览器恢复上下文后会重新创建资源，也可以点击下方按钮重试。');
    }
    function contextRestored() { setRetry((value) => value + 1); }
    function motionChanged(event: MediaQueryListEvent) { if (event.matches) setPlaying(false); }
    function visibilityChanged() { if (!document.hidden) requestDraw(); }

    // 设备像素比变化（例如窗口移到另一块屏幕）时 CSS 尺寸不变，需要单独监听再重绘。
    let pixelRatioQuery = matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`);
    function pixelRatioChanged() {
      pixelRatioQuery.removeEventListener('change', pixelRatioChanged);
      pixelRatioQuery = matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`);
      pixelRatioQuery.addEventListener('change', pixelRatioChanged);
      requestDraw();
    }

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const resizeObserver = new ResizeObserver(requestDraw);
    // 同一次回调可能积累多条记录，只有最后一条代表 Canvas 当前是否可见。
    const intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) requestDraw();
    });

    try {
      renderer = createPolarRenderer(canvas);
      setError(null);
      requestDrawRef.current = requestDraw;
      requestDraw();
    } catch (cause) {
      setError(message(cause));
    }

    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    document.addEventListener('visibilitychange', visibilityChanged);
    reducedMotion.addEventListener('change', motionChanged);
    pixelRatioQuery.addEventListener('change', pixelRatioChanged);
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);

    return () => {
      stopped = true;
      requestDrawRef.current = null;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      reducedMotion.removeEventListener('change', motionChanged);
      pixelRatioQuery.removeEventListener('change', pixelRatioChanged);
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
      // 删除 Buffer、VAO 与 Program，重新创建或离开页面时不留下失效的 GPU 资源。
      renderer?.dispose();
    };
  }, [retry]);

  function change<Key extends keyof PolarOptions>(key: Key, value: PolarOptions[Key]) {
    setOptions((current) => ({ ...current, [key]: value }));
  }

  function setPhase(degrees: number) {
    phaseRef.current = toRadians(degrees);
    setPhaseDegrees(degrees);
    requestDrawRef.current?.();
  }

  function applyPreset(preset: typeof presets[number]) {
    setOptions((current) => ({ ...current, ...preset.options }));
    setPhase(preset.phaseDegrees);
  }

  function reset() {
    setPlaying(false);
    setOptions({ ...defaultPolarOptions });
    setPhase(0);
  }

  const segments = Math.max(3, Math.floor(options.segments));
  const vertexCount = frame?.vertexCount ?? segments * 3;
  const stepDegrees = options.sweepDegrees / segments;
  const closure = polarClosure(options);
  const activePreset = presets.find((preset) => Object.entries(preset.options).every(([key, value]) => options[key as keyof PolarOptions] === value) && preset.phaseDegrees === phaseDegrees);

  return (
    <div className="math-lab polar-lab">
      <header>
        <div><strong>Polar Lab · WebGL2</strong><small>Buffer 只存 (t, ring)；角度与波形由 Uniform 在顶点着色器中计算</small></div>
        <div className="polar-lab__actions">
          <button type="button" aria-pressed={playing} disabled={!!error} onClick={() => setPlaying((value) => !value)}>
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{playing ? '暂停相位' : '播放相位'}
          </button>
          <button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> 重置</button>
        </div>
      </header>
      <div className="math-lab__body">
        <div className="math-lab__controls">
          <div className="math-lab__chips math-lab__chips--grid" style={{ '--chip-columns': 5 } as CSSProperties} role="group" aria-label="参数预设">
            {presets.map((preset) => <button type="button" key={preset.id} aria-pressed={activePreset?.id === preset.id} onClick={() => applyPreset(preset)}>{preset.label}</button>)}
          </div>
          <p className="math-lab__formula"><code>θ = θ₀ + t · sweep</code><code>r = R · (1 + A · sin(k·t·sweep + φ))</code><code>position = r · (cos θ, sin θ)</code></p>
          <fieldset className="polar-lab__group">
            <legend>几何：角度与顶点数量</legend>
            <RangeInput label="分段数 N（重新上传 Buffer）" value={options.segments} min={3} max={96} step={1} display={String(segments)} onChange={(value) => change('segments', value)} />
            <RangeInput label="起始角 θ₀（整体旋转）" value={options.startDegrees} min={0} max={360} step={1} display={`${options.startDegrees}°`} onChange={(value) => change('startDegrees', value)} />
            <RangeInput label="扫掠角 sweep" value={options.sweepDegrees} min={10} max={360} step={1} display={`${options.sweepDegrees}°`} onChange={(value) => change('sweepDegrees', value)} />
          </fieldset>
          <fieldset className="polar-lab__group">
            <legend>波形：半径随角度起伏</legend>
            <RangeInput label="波峰数 k" value={options.waveCount} min={0} max={8} step={0.5} display={String(options.waveCount)} onChange={(value) => change('waveCount', value)} />
            <RangeInput label="振幅 A" value={options.amplitude} min={0} max={0.3} step={0.01} display={options.amplitude.toFixed(2)} onChange={(value) => change('amplitude', value)} />
            <RangeInput label="相位 φ" value={phaseDegrees} min={0} max={359} step={1} display={`${phaseDegrees}°`} onChange={setPhase} />
          </fieldset>
          <label className="math-lab__toggle">
            <input type="checkbox" checked={options.showEdges} onChange={(event) => change('showEdges', event.target.checked)} />
            <span><strong>LINE_STRIP 线框</strong><small>同一个 VAO 再画一次，显示每个三角形的边</small></span>
          </label>
          <p className="math-lab__hint">先选“六边形”看清 N 个三角形，再拖大 N；分段很密时可关闭线框。“断口”中 k = 2.5，转满一圈后相位多出半圈，sin 变号。播放时 φ 每秒增加 π 弧度，波峰沿圆周移动，三角形本身保持不动。</p>
        </div>
        <div className="math-lab__visual polar-lab__stage">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`WebGL2 极坐标图形：${segments} 个扇形，起始角 ${options.startDegrees}°，扫掠角 ${options.sweepDegrees}°，k = ${options.waveCount}，A = ${options.amplitude.toFixed(2)}`}
          />
          {error ? (
            <div className="polar-lab__error" role="alert">
              <strong>暂时无法绘制</strong>
              <pre>{error}</pre>
              <button type="button" onClick={() => setRetry((value) => value + 1)}>重新创建 WebGL2 资源</button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="math-lab__readout">
        <Readout rows={[
          { label: 'θ₀ 与 sweep → 弧度 Uniform', value: `u_startAngle = ${fixed(toRadians(options.startDegrees))} · u_sweep = ${fixed(toRadians(options.sweepDegrees))}`, tone: 'result' },
          { label: '相邻圆周点的角度差', value: `${fixed(stepDegrees, 2)}° = ${fixed(toRadians(stepDegrees))} rad` },
          { label: 'Buffer 数据', value: `${vertexCount} 个顶点 × 8 字节 = ${vertexCount * 8} 字节 · bufferData ${frame?.uploads ?? 1} 次` },
          { label: '波形 Uniform', value: `R = ${POLAR_RADIUS} · A = ${options.amplitude.toFixed(2)} · k = ${options.waveCount} · φ = ${fixed(toRadians(phaseDegrees), 2)} rad` },
          { label: '首尾是否相接', value: closureText(options), tone: closure === 'seam' ? 'bad' : 'good' },
          { label: '播放时的相位变化', value: options.waveCount > 0 ? `φ 每秒增加 π 弧度 · 波峰沿圆周每秒移动 ω / k = ${fixed(180 / options.waveCount, 1)}°（顺时针）` : 'φ 每秒增加 π 弧度 · k = 0 时整圈半径一起起伏' },
        ]} />
      </div>
      <Tabs.Root className="complete-source__tabs polar-lab__sources" defaultValue="data" data-fullscreen-target>
        <div className="complete-source__toolbar">
          <Tabs.List className="editor-tabs" aria-label="极坐标实验实际运行源码">
            {sourceTabs.map((tab) => <Tabs.Tab key={tab.id} value={tab.id}>{tab.label}</Tabs.Tab>)}
            <Tabs.Indicator className="editor-tabs__indicator" />
          </Tabs.List>
          <FullscreenButton />
        </div>
        {sourceTabs.map((tab) => (
          <Tabs.Panel key={tab.id} className="complete-source__panel" value={tab.id} keepMounted>
            <HighlightedCode code={tab.code} language={tab.language} />
          </Tabs.Panel>
        ))}
      </Tabs.Root>
      <footer className="polar-lab__status" aria-live="polite">
        {error ? '绘制已停止' : frame
          ? `Canvas ${frame.width} × ${frame.height} · drawArrays(TRIANGLES, 0, ${frame.vertexCount})${options.showEdges ? ` + drawArrays(LINE_STRIP, 0, ${frame.vertexCount})` : ''}`
          : '正在创建 WebGL2 资源…'}
      </footer>
    </div>
  );
}
