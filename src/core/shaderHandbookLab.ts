import { compileShader, createProgram } from './webgl2';
import vertexSource from './shaderHandbookVertex.glsl?raw';
import fragmentSource from './shaderHandbookFragment.glsl?raw';

export { vertexSource, fragmentSource };

export interface HandbookOptions {
  stage: number;
  frequency: number;
  octaves: number;
  gain: number;
  warp: number;
  radius: number;
  lineWidth: number;
  hue: number;
  glow: number;
  antialias: boolean;
  smooth: boolean;
  shape: number;
  inspect: boolean;
  compare: boolean;
}

export const defaultHandbookOptions: HandbookOptions = {
  stage: 0, frequency: 3, octaves: 4, gain: 0.5, warp: 1.4,
  radius: 0.25, lineWidth: 0.006, hue: 0, glow: 1,
  antialias: true, smooth: true, shape: 1, inspect: false, compare: true,
};

/** 分母跟随实际 octave，避免加层时仅因权重增加而整体变亮。 */
export function octaveWeight(count: number, gain: number) {
  let weight = 0, amplitude = 0.5;
  for (let i = 0; i < count; i++) { weight += amplitude; amplitude *= gain; }
  return weight;
}

export function handbookNoiseCost(options: HandbookOptions) {
  if (options.stage < 2) return 0;
  if (options.stage === 2) return options.smooth ? 1 : 0;
  if (options.stage === 4 && options.inspect) return options.octaves * 2;
  return options.octaves * (options.stage >= 4 ? 3 : 1);
}

export function createHandbookRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!context) throw new Error('当前设备没有可用的 WebGL2 上下文。请使用支持 WebGL2 的浏览器。');
  const gl = context;
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let disposed = false;

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (vao) gl.deleteVertexArray(vao);
    if (program) gl.deleteProgram(program);
  }

  try {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    let fs: WebGLShader | null = null;
    try { fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource); program = createProgram(gl, vs, fs); }
    finally { gl.deleteShader(vs); if (fs) gl.deleteShader(fs); }
    vao = gl.createVertexArray();
    if (!vao) throw new Error('无法创建全屏绘制所需的 VAO。');

    const names = ['resolution', 'origin', 'time', 'stage', 'frequency', 'octaves', 'gain', 'warp', 'radius', 'lineWidth', 'hue', 'glow', 'antialias', 'smooth', 'shape', 'inspect'] as const;
    const uniforms = Object.fromEntries(names.map((name) => {
      const location = gl.getUniformLocation(program!, `u_${name}`);
      if (location === null) throw new Error(`缺少 Uniform：u_${name}`);
      return [name, location];
    })) as Record<typeof names[number], WebGLUniformLocation>;

    function drawPane(origin: number, width: number, height: number, time: number, options: HandbookOptions) {
      gl.viewport(origin, 0, width, height);
      gl.uniform2f(uniforms.resolution, width, height);
      gl.uniform2f(uniforms.origin, origin, 0);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1i(uniforms.stage, options.stage);
      gl.uniform1i(uniforms.octaves, options.octaves);
      for (const key of ['frequency', 'gain', 'warp', 'radius', 'lineWidth', 'hue', 'glow'] as const) gl.uniform1f(uniforms[key], options[key]);
      gl.uniform1i(uniforms.antialias, Number(options.antialias));
      gl.uniform1i(uniforms.smooth, Number(options.smooth));
      gl.uniform1i(uniforms.shape, options.shape);
      gl.uniform1i(uniforms.inspect, Number(options.inspect));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    return {
      draw(time: number, options: HandbookOptions) {
        if (disposed || gl.isContextLost()) return null;
        // 片段成本有上限；两张分区共用一个 Context、Program 与 VAO。
        const cssWidth = Math.max(1, canvas.clientWidth), cssHeight = Math.max(1, canvas.clientHeight);
        const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(600_000 / (cssWidth * cssHeight)));
        const width = Math.max(options.compare ? 2 : 1, Math.round(cssWidth * ratio));
        const height = Math.max(1, Math.round(cssHeight * ratio));
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.SCISSOR_TEST);
        gl.colorMask(true, true, true, true);
        gl.useProgram(program); gl.bindVertexArray(vao);
        const paneWidth = options.compare ? Math.floor(width / 2) : width;
        drawPane(0, paneWidth, height, time, options);
        if (options.compare) {
          const reference = { ...options, stage: 6, inspect: false, glow: options.stage === 6 ? 0 : options.glow };
          drawPane(paneWidth, width - paneWidth, height, time, reference);
        }
        return { width, height, paneWidth, noiseCost: handbookNoiseCost(options) };
      },
      dispose,
    };
  } catch (cause) { dispose(); throw cause; }
}
