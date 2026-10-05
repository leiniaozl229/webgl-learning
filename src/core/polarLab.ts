import {
  createPolarVertexInput,
  drawPolar,
  POLAR_STRIDE,
  uploadPolarVertices,
  type PolarDrawState,
  type PolarUniforms,
  type PolarVertexInput,
} from './polarVertexData';
import fragmentSource from './polarFragment.glsl?raw';
import vertexSource from './polarVertex.glsl?raw';
import { compileShader, createProgram, resizeCanvasToDisplaySize } from './webgl2';

export { fragmentSource as polarFragmentSource, vertexSource as polarVertexSource };

/** 实验面板的全部输入；相位单独保存，播放时由动画循环推进。 */
export interface PolarOptions extends Omit<PolarDrawState, 'phase'> {
  segments: number;
}

export const defaultPolarOptions: PolarOptions = {
  segments: 24,
  startDegrees: 0,
  sweepDegrees: 360,
  waveCount: 3,
  amplitude: 0.12,
  showEdges: true,
};

/** ω：相位每秒增加 π 弧度，即每 2 秒走完一个周期。 */
export const POLAR_ANGULAR_SPEED = Math.PI;

export type PolarClosure = 'closed' | 'seam' | 'sector';

/** 判断圆周首尾能否相接：整圈时，终点比起点多出 k × 2π 的相位，k 为整数才回到同一个 sin 值。 */
export function polarClosure({ sweepDegrees, waveCount, amplitude }: Pick<PolarOptions, 'sweepDegrees' | 'waveCount' | 'amplitude'>): PolarClosure {
  if (sweepDegrees < 360) return 'sector';
  return amplitude === 0 || Number.isInteger(waveCount) ? 'closed' : 'seam';
}

export interface PolarFrame {
  width: number;
  height: number;
  vertexCount: number;
  byteLength: number;
  uploads: number;
}

export interface PolarRenderer {
  draw(options: PolarOptions, phase: number): PolarFrame | null;
  dispose(): void;
}

const uniformNames = ['startAngle', 'sweep', 'radius', 'amplitude', 'waveCount', 'phase', 'aspectScale', 'centerColor', 'rimColor', 'lineColor', 'drawLines'] as const;

export function createPolarRenderer(canvas: HTMLCanvasElement): PolarRenderer {
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!context) throw new Error('当前浏览器或设备没有可用的 WebGL2 上下文。');
  const gl: WebGL2RenderingContext = context;
  let program: WebGLProgram | null = null;
  let input: PolarVertexInput | null = null;
  let disposed = false;

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (input) {
      gl.deleteBuffer(input.buffer);
      gl.deleteVertexArray(input.vao);
    }
    if (program) gl.deleteProgram(program);
  }

  try {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    let fragmentShader: WebGLShader | null = null;
    try {
      fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
      program = createProgram(gl, vertexShader, fragmentShader);
    } finally {
      // Program 链接后保留可执行代码，Shader 对象可以立即删除。
      gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
    }

    const linked = program;
    const uniforms = Object.fromEntries(uniformNames.map((name) => {
      const location = gl.getUniformLocation(linked, `u_${name}`);
      if (location === null) throw new Error(`没有找到 u_${name} Uniform。`);
      return [name, location];
    })) as unknown as PolarUniforms;

    input = createPolarVertexInput(gl, defaultPolarOptions.segments);
    const vertexInput = input;
    let segments = Math.max(3, Math.floor(defaultPolarOptions.segments));
    let uploads = 1;

    return {
      draw(options, phase) {
        if (disposed || gl.isContextLost()) return null;
        const nextSegments = Math.max(3, Math.floor(options.segments));
        if (nextSegments !== segments) {
          vertexInput.vertexCount = uploadPolarVertices(gl, vertexInput.buffer, nextSegments);
          segments = nextSegments;
          uploads += 1;
        }
        resizeCanvasToDisplaySize(canvas);
        drawPolar(gl, linked, uniforms, vertexInput, { ...options, phase });
        return {
          width: gl.drawingBufferWidth,
          height: gl.drawingBufferHeight,
          vertexCount: vertexInput.vertexCount,
          byteLength: vertexInput.vertexCount * POLAR_STRIDE,
          uploads,
        };
      },
      dispose,
    };
  } catch (cause) {
    dispose();
    throw cause;
  }
}
