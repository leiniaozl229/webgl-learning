import { RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createScene3DRenderer,
  type Matrix4,
  type Scene3DMode,
  type Scene3DState,
} from '../../core/transforms3d';

const initialState: Scene3DState = {
  rotationX: -18,
  rotationY: 34,
  rotationZ: 0,
  fieldOfView: 60,
  near: 1,
  far: 1200,
  cameraAngle: 28,
  depthTest: true,
  cullFace: true,
};

const descriptions: Record<Scene3DMode, string> = {
  orthographic: '旋转立体 F，观察面剔除与深度缓冲各自解决的问题',
  perspective: '调节视野角与裁剪面，观察透视除法产生的近大远小',
  camera: '让相机围绕七个物体运动，并持续看向世界原点',
  mvp: '同一组 Projection 与 View 复用到多个 Model Matrix',
};

export function Transform3DPlayground({ variant }: { variant: Scene3DMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ReturnType<typeof createScene3DRenderer> | null>(null);
  const [state, setState] = useState(initialState);
  const [matrix, setMatrix] = useState<Matrix4 | null>(null);
  const [status, setStatus] = useState('正在创建 WebGL2 三维资源…');
  const [canvasRevision, setCanvasRevision] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      rendererRef.current = createScene3DRenderer(canvas);
      const observer = new ResizeObserver(() => setCanvasRevision((value) => value + 1));
      observer.observe(canvas);
      return () => {
        observer.disconnect();
        rendererRef.current?.dispose();
        rendererRef.current = null;
      };
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }, []);

  useEffect(() => {
    try {
      const nextMatrix = rendererRef.current?.draw(variant, state);
      if (nextMatrix) setMatrix(nextMatrix);
      setStatus(`绘制完成 · ${variant === 'camera' ? '7' : variant === 'mvp' ? '3' : '1'} 个立体 F · mat4 Uniform`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }, [canvasRevision, state, variant]);

  const cameraPosition = useMemo(() => {
    const radians = state.cameraAngle * Math.PI / 180;
    return [Math.sin(radians) * 430, 150, Math.cos(radians) * 430];
  }, [state.cameraAngle]);

  function update<Key extends keyof Scene3DState>(key: Key, value: Scene3DState[Key]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="transform-3d-lab" aria-label="WebGL2 三维变换实验">
      <header>
        <div><strong>3D Transform Lab</strong><small>{descriptions[variant]}</small></div>
        <button type="button" onClick={() => setState(initialState)}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="transform-3d-lab__body">
        <div className="transform-3d-lab__controls">
          {variant === 'orthographic' || variant === 'perspective' ? (
            <fieldset>
              <legend>Model Rotation</legend>
              <RangeControl label="X" value={state.rotationX} min={-180} max={180} suffix="°" onChange={(value) => update('rotationX', value)} />
              <RangeControl label="Y" value={state.rotationY} min={-180} max={180} suffix="°" onChange={(value) => update('rotationY', value)} />
              <RangeControl label="Z" value={state.rotationZ} min={-180} max={180} suffix="°" onChange={(value) => update('rotationZ', value)} />
            </fieldset>
          ) : null}

          {variant !== 'orthographic' ? (
            <fieldset>
              <legend>Camera / Projection</legend>
              <RangeControl label="视野角" value={state.fieldOfView} min={20} max={120} suffix="°" onChange={(value) => update('fieldOfView', value)} />
              {variant === 'perspective' ? (
                <>
                  <RangeControl label="Near" value={state.near} min={1} max={240} onChange={(value) => update('near', Math.min(value, state.far - 1))} />
                  <RangeControl label="Far" value={state.far} min={241} max={1600} onChange={(value) => update('far', Math.max(value, state.near + 1))} />
                </>
              ) : (
                <RangeControl label="环绕角" value={state.cameraAngle} min={-180} max={180} suffix="°" onChange={(value) => update('cameraAngle', value)} />
              )}
            </fieldset>
          ) : null}

          <fieldset>
            <legend>Raster State</legend>
            <label className="transform-3d-toggle"><input type="checkbox" checked={state.depthTest} onChange={(event) => update('depthTest', event.target.checked)} /><span><strong>DEPTH_TEST</strong><small>让更近的片段通过深度测试</small></span></label>
            <label className="transform-3d-toggle"><input type="checkbox" checked={state.cullFace} onChange={(event) => update('cullFace', event.target.checked)} /><span><strong>CULL_FACE</strong><small>跳过背向观察者的三角形</small></span></label>
          </fieldset>
        </div>
        <div className="transform-3d-lab__stage">
          <canvas ref={canvasRef} aria-label="三维字母 F 场景" />
          <div className="axis-gizmo" aria-hidden="true"><span>X</span><span>Y</span><span>Z</span></div>
          <small>{variant === 'orthographic' ? 'Orthographic' : 'Perspective'} · {state.depthTest ? 'Depth on' : 'Depth off'}</small>
        </div>
      </div>
      {variant === 'camera' || variant === 'mvp' ? (
        <div className="camera-readout">
          <div><strong>Camera Position</strong><code>[{cameraPosition.map((value) => value.toFixed(1)).join(', ')}]</code></div>
          <div><strong>Target</strong><code>[0, 0, 0]</code></div>
          <div><strong>Matrix Chain</strong><code>P × V × M</code></div>
        </div>
      ) : null}
      {matrix ? (
        <div className="matrix4-readout" aria-label="当前上传的四乘四矩阵">
          <div><strong>当前 u_matrix</strong><small>按数学行展示，TypedArray 仍按 column-major 上传</small></div>
          <ol>{[0, 1, 2, 3].flatMap((row) => [0, 1, 2, 3].map((column) => <li key={`${row}-${column}`}>{matrix[column * 4 + row].toFixed(3)}</li>))}</ol>
        </div>
      ) : null}
      <footer>{status}</footer>
    </section>
  );
}

function RangeControl({ label, value, min, max, suffix = '', onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="transform-3d-range">
      <span>{label}<code>{Number(value.toFixed(1))}{suffix}</code></span>
      <input type="range" min={min} max={max} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
