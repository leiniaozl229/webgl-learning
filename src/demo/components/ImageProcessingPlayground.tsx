import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createImageProcessingRenderer,
  IMAGE_KERNELS,
  KERNEL_LABELS,
  type KernelName,
} from '../../core/imageProcessing';

type PlaygroundVariant = 'sampling' | 'color' | 'kernel' | 'presets' | 'multipass';

interface ImageProcessingPlaygroundProps {
  variant: PlaygroundVariant;
}

const presetNames: KernelName[] = ['normal', 'boxBlur', 'gaussianBlur', 'sharpen', 'edgeDetect', 'emboss'];
const initialPipeline: KernelName[] = ['gaussianBlur', 'sharpen', 'edgeDetect'];

const descriptions: Record<PlaygroundVariant, string> = {
  sampling: '切换纹理过滤，观察斜线和文字边缘的采样差异',
  color: '片段着色器逐像素调整亮度与灰度混合',
  kernel: '编辑 3×3 数值，实时上传到 u_kernel[0]',
  presets: '比较模糊、锐化、边缘检测与浮雕卷积核',
  multipass: '调整处理顺序，观察两张离屏纹理交替保存结果',
};

export function ImageProcessingPlayground({ variant }: ImageProcessingPlaygroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [filter, setFilter] = useState<'nearest' | 'linear'>('linear');
  const [brightness, setBrightness] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  const [kernelName, setKernelName] = useState<KernelName>(variant === 'kernel' ? 'sharpen' : 'normal');
  const [customKernel, setCustomKernel] = useState<number[]>([...IMAGE_KERNELS.sharpen]);
  const [pipeline, setPipeline] = useState<KernelName[]>(initialPipeline);
  const [enabledPasses, setEnabledPasses] = useState<boolean[]>([true, true, false]);
  const [status, setStatus] = useState('正在创建 WebGL2 图像处理资源…');

  const kernels = useMemo(() => {
    if (variant === 'kernel') return [customKernel];
    if (variant === 'presets') return kernelName === 'normal' ? [] : [IMAGE_KERNELS[kernelName]];
    if (variant === 'multipass') {
      return pipeline.filter((_, index) => enabledPasses[index]).map((name) => IMAGE_KERNELS[name]);
    }
    return [];
  }, [customKernel, enabledPasses, kernelName, pipeline, variant]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ReturnType<typeof createImageProcessingRenderer> | null = null;

    try {
      renderer = createImageProcessingRenderer(canvas);
      const draw = () => {
        try {
          renderer?.draw({ filter, kernels, brightness, grayscale });
          const passText = kernels.length === 0 ? '直接采样原始纹理' : `${kernels.length} 个卷积 Pass`;
          setStatus(`绘制完成 · ${passText} · ${filter === 'linear' ? 'LINEAR' : 'NEAREST'} 过滤`);
        } catch (error) {
          setStatus(error instanceof Error ? error.message : String(error));
        }
      };
      draw();
      const observer = new ResizeObserver(draw);
      observer.observe(canvas);
      return () => {
        observer.disconnect();
        renderer?.dispose();
      };
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      return () => renderer?.dispose();
    }
  }, [brightness, filter, grayscale, kernels]);

  function updateKernel(index: number, value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setCustomKernel((current) => current.map((item, itemIndex) => itemIndex === index ? parsed : item));
  }

  function movePass(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= pipeline.length) return;
    setPipeline((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setEnabledPasses((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function reset() {
    setFilter('linear');
    setBrightness(0);
    setGrayscale(0);
    setKernelName(variant === 'kernel' ? 'sharpen' : 'normal');
    setCustomKernel([...IMAGE_KERNELS.sharpen]);
    setPipeline(initialPipeline);
    setEnabledPasses([true, true, false]);
  }

  return (
    <section className="image-lab" aria-label="WebGL2 图像处理实验">
      <header>
        <div><strong>Image Lab</strong><small>{descriptions[variant]}</small></div>
        <button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="image-lab__body">
        <div className="image-lab__controls">
          {variant === 'sampling' ? (
            <fieldset>
              <legend>纹理过滤</legend>
              <label><input type="radio" name="texture-filter" checked={filter === 'nearest'} onChange={() => setFilter('nearest')} /><span><strong>NEAREST</strong><small>选择距离最近的 Texel</small></span></label>
              <label><input type="radio" name="texture-filter" checked={filter === 'linear'} onChange={() => setFilter('linear')} /><span><strong>LINEAR</strong><small>混合周围 Texel</small></span></label>
            </fieldset>
          ) : null}

          {variant === 'color' ? (
            <fieldset className="image-lab__sliders">
              <legend>颜色运算</legend>
              <label><span>亮度 <code>{brightness.toFixed(2)}</code></span><input type="range" min="-0.5" max="0.5" step="0.01" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} /></label>
              <label><span>灰度混合 <code>{grayscale.toFixed(2)}</code></span><input type="range" min="0" max="1" step="0.01" value={grayscale} onChange={(event) => setGrayscale(Number(event.target.value))} /></label>
            </fieldset>
          ) : null}

          {variant === 'kernel' ? (
            <fieldset>
              <legend>u_kernel[9]</legend>
              <div className="kernel-editor">
                {customKernel.map((value, index) => (
                  <label key={index}><span className="sr-only">卷积核第 {index + 1} 项</span><input type="number" step="0.25" value={value} onChange={(event) => updateKernel(index, event.target.value)} /></label>
                ))}
              </div>
              <small>权重：{Math.max(1, customKernel.reduce((sum, value) => sum + value, 0)).toFixed(2)}</small>
            </fieldset>
          ) : null}

          {variant === 'presets' ? (
            <fieldset>
              <legend>效果预设</legend>
              <div className="effect-grid">
                {presetNames.map((name) => <button type="button" key={name} aria-pressed={kernelName === name} onClick={() => setKernelName(name)}>{KERNEL_LABELS[name]}</button>)}
              </div>
            </fieldset>
          ) : null}

          {variant === 'multipass' ? (
            <fieldset>
              <legend>Pass 顺序</legend>
              <ol className="pass-list">
                {pipeline.map((name, index) => (
                  <li key={`${name}-${index}`}>
                    <label><input type="checkbox" checked={enabledPasses[index]} onChange={() => setEnabledPasses((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))} /><span><strong>{index + 1}. {KERNEL_LABELS[name]}</strong><small>输出 → 纹理 {(index % 2) + 1}</small></span></label>
                    <span>
                      <button type="button" aria-label={`上移${KERNEL_LABELS[name]}`} disabled={index === 0} onClick={() => movePass(index, -1)}><ArrowUp aria-hidden="true" /></button>
                      <button type="button" aria-label={`下移${KERNEL_LABELS[name]}`} disabled={index === pipeline.length - 1} onClick={() => movePass(index, 1)}><ArrowDown aria-hidden="true" /></button>
                    </span>
                  </li>
                ))}
              </ol>
            </fieldset>
          ) : null}
        </div>
        <div className="image-lab__canvas">
          <canvas ref={canvasRef} aria-label="图像处理结果" />
          <span>512 × 336 source texture</span>
        </div>
      </div>
      <footer>{status}</footer>
    </section>
  );
}
