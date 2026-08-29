import { CheckCircle2, CircleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CapabilityInfo {
  supported: boolean;
  version?: string;
  shadingLanguage?: string;
  maxTextureSize?: number;
  maxVertexAttributes?: number;
  extensions?: number;
  alpha?: boolean;
  antialias?: boolean;
}

export function WebglCapabilityCheck() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [info, setInfo] = useState<CapabilityInfo | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      setInfo({ supported: false });
      return;
    }

    const attributes = gl.getContextAttributes();
    setInfo({
      supported: true,
      version: String(gl.getParameter(gl.VERSION)),
      shadingLanguage: String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION)),
      maxTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)),
      maxVertexAttributes: Number(gl.getParameter(gl.MAX_VERTEX_ATTRIBS)),
      extensions: gl.getSupportedExtensions()?.length ?? 0,
      alpha: attributes?.alpha,
      antialias: attributes?.antialias,
    });
  }, []);

  return (
    <section className="capability-check" aria-labelledby="capability-title">
      <canvas ref={canvasRef} aria-hidden="true" />
      <header>
        <span className={info?.supported ? 'capability-check__ok' : 'capability-check__waiting'}>
          {info?.supported ? <CheckCircle2 aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
        </span>
        <div>
          <strong id="capability-title">当前设备检测</strong>
          <small>{info === null ? '正在创建 WebGL2 上下文…' : info.supported ? 'WebGL2 上下文创建成功' : 'WebGL2 上下文创建失败'}</small>
        </div>
      </header>
      {info?.supported ? (
        <dl>
          <div><dt>WebGL</dt><dd>{info.version}</dd></div>
          <div><dt>GLSL</dt><dd>{info.shadingLanguage}</dd></div>
          <div><dt>最大纹理</dt><dd>{info.maxTextureSize} × {info.maxTextureSize}</dd></div>
          <div><dt>顶点属性槽</dt><dd>{info.maxVertexAttributes}</dd></div>
          <div><dt>扩展数量</dt><dd>{info.extensions}</dd></div>
          <div><dt>默认缓冲</dt><dd>alpha {info.alpha ? 'on' : 'off'} · antialias {info.antialias ? 'on' : 'off'}</dd></div>
        </dl>
      ) : info && (
        <p>请确认浏览器已启用硬件加速，设备驱动可用，并检查页面是否处于允许 WebGL 的环境。</p>
      )}
    </section>
  );
}
