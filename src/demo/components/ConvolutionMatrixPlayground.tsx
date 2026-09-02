import { RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createImageProcessingRenderer,
  IMAGE_KERNELS,
  type KernelName,
} from '../../core/imageProcessing';

type BorderMode = 'extend' | 'wrap' | 'crop';
type PresetName = KernelName | 'shiftDown';

const presets: Record<PresetName, readonly number[]> = {
  ...IMAGE_KERNELS,
  shiftDown: [
    0, 1, 0,
    0, 0, 0,
    0, 0, 0,
  ],
};

const labels: Record<PresetName, string> = {
  normal: '原图',
  boxBlur: '均值模糊',
  gaussianBlur: '高斯模糊',
  sharpen: '锐化',
  edgeDetect: '边缘检测',
  emboss: '浮雕',
  shiftDown: '下移一像素',
};

const presetNames: PresetName[] = ['normal', 'boxBlur', 'sharpen', 'edgeDetect', 'emboss', 'shiftDown'];

function normalizationFor(kernel: readonly number[]) {
  const sum = kernel.reduce((total, value) => total + value, 0);
  if (sum > 0) return { divisor: sum, offset: 0 };
  if (sum === 0) return { divisor: 1, offset: 128 };
  return { divisor: Math.abs(sum), offset: 255 };
}

export function ConvolutionMatrixPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [kernel, setKernel] = useState<number[]>([...IMAGE_KERNELS.sharpen]);
  const [activePreset, setActivePreset] = useState<PresetName | 'custom'>('sharpen');
  const [divisor, setDivisor] = useState(1);
  const [offset, setOffset] = useState(0);
  const [normalize, setNormalize] = useState(false);
  const [border, setBorder] = useState<BorderMode>('extend');
  const [channels, setChannels] = useState([true, true, true, false]);
  const [status, setStatus] = useState('正在创建卷积矩阵资源…');

  const effective = useMemo(
    () => normalize ? normalizationFor(kernel) : { divisor: divisor === 0 ? 1 : divisor, offset },
    [divisor, kernel, normalize, offset],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ReturnType<typeof createImageProcessingRenderer> | null = null;
    try {
      renderer = createImageProcessingRenderer(canvas);
      const draw = () => renderer?.draw({
        filter: 'linear',
        kernels: [kernel],
        brightness: 0,
        grayscale: 0,
        divisor: effective.divisor,
        offset: effective.offset / 255,
        channelMask: channels.map((enabled) => enabled ? 1 : 0) as [number, number, number, number],
        border,
      });
      draw();
      const observer = new ResizeObserver(draw);
      observer.observe(canvas);
      setStatus(`绘制完成 · Divisor ${effective.divisor.toFixed(2)} · Offset ${effective.offset}`);
      return () => {
        observer.disconnect();
        renderer?.dispose();
      };
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      return () => renderer?.dispose();
    }
  }, [border, channels, effective, kernel]);

  function choosePreset(name: PresetName) {
    const next = [...presets[name]];
    setKernel(next);
    setActivePreset(name);
    const settings = normalizationFor(next);
    setDivisor(settings.divisor);
    setOffset(name === 'edgeDetect' || name === 'emboss' ? 128 : 0);
  }

  function updateKernel(index: number, rawValue: string) {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    setKernel((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
    setActivePreset('custom');
  }

  function reset() {
    setKernel([...IMAGE_KERNELS.sharpen]);
    setActivePreset('sharpen');
    setDivisor(1);
    setOffset(0);
    setNormalize(false);
    setBorder('extend');
    setChannels([true, true, true, false]);
  }

  return (
    <section className="convolution-matrix-lab" aria-label="卷积矩阵高级实验">
      <header>
        <div><strong>Convolution Matrix Lab</strong><small>3×3 Kernel · Divisor · Offset · Border · Channels</small></div>
        <button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="convolution-matrix-lab__body">
        <div className="convolution-matrix-lab__controls">
          <fieldset>
            <legend>预设</legend>
            <div className="convolution-presets">
              {presetNames.map((name) => <button type="button" key={name} aria-pressed={activePreset === name} onClick={() => choosePreset(name)}>{labels[name]}</button>)}
            </div>
          </fieldset>

          <fieldset>
            <legend>3×3 Matrix</legend>
            <div className="kernel-editor">
              {kernel.map((value, index) => <label key={index}><span className="sr-only">矩阵第 {index + 1} 项</span><input type="number" step="0.25" value={value} onChange={(event) => updateKernel(index, event.target.value)} /></label>)}
            </div>
          </fieldset>

          <fieldset className="convolution-settings">
            <legend>结果调整</legend>
            <label><span>Divisor</span><input type="number" step="0.25" value={effective.divisor} disabled={normalize} onChange={(event) => setDivisor(Number(event.target.value))} /></label>
            <label><span>Offset</span><input type="range" min="-255" max="255" step="1" value={effective.offset} disabled={normalize} onChange={(event) => setOffset(Number(event.target.value))} /><code>{effective.offset}</code></label>
            <label className="convolution-checkbox"><input type="checkbox" checked={normalize} onChange={(event) => setNormalize(event.target.checked)} /><span>自动 Normalize</span></label>
          </fieldset>

          <fieldset className="convolution-settings">
            <legend>边缘与通道</legend>
            <label><span>Border</span><select value={border} onChange={(event) => setBorder(event.target.value as BorderMode)}><option value="extend">Extend</option><option value="wrap">Wrap</option><option value="crop">Crop</option></select></label>
            <div className="channel-switches" aria-label="参与卷积的颜色通道">
              {['R', 'G', 'B', 'A'].map((label, index) => <label key={label}><input type="checkbox" checked={channels[index]} onChange={() => setChannels((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))} /><span>{label}</span></label>)}
            </div>
          </fieldset>
        </div>
        <div className="convolution-matrix-lab__canvas">
          <canvas ref={canvasRef} aria-label="卷积矩阵处理结果" />
          <span>{border.toUpperCase()} · RGBA {channels.map((value) => value ? '1' : '0').join('')}</span>
        </div>
      </div>
      <footer>{status}</footer>
    </section>
  );
}
