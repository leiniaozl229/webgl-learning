import { compileShader, createProgram } from './webgl2';
import commonSource from './ribbonCommon.glsl?raw';
import controlledSource from './ribbonControlled.glsl?raw';
import openShadersSource from './ribbonOpenShaders.glsl?raw';
import vertexSource from './shaderHandbookVertex.glsl?raw';

export { commonSource, controlledSource, openShadersSource, vertexSource };

export type Point = [number, number];

export interface RibbonOptions {
  mode: 'controlled' | 'openshaders';
  /** 亮边曲线的五个控制点，场景坐标：原点在画面中心，1 = 画面高度。 */
  points: Point[];
  width: number;
  rootPinch: number;
  tipPinch: number;
  twist: number;
  layers: number;
  gamma: number;
  softness: number;
  flow: number;
  edgeHue: number;
  faceHue: number;
  hotspot: number;
  sway: number;
  /** 控制点绕中心飘动的幅度（场景单位），根部为 0，越往末端越大。 */
  drift: number;
  /** 相邻控制点的相位延迟：越大，波从根部传到末端越明显。 */
  lag: number;
  /** 扭转亮结沿光带流动的速度。 */
  twistFlow: number;
  /** 宽度随时间起伏的比例。 */
  breathe: number;
  /** 发光半径至少是细线间距的几倍；0 = 保留一根根的丝线，越大光面越平滑。 */
  smoothing: number;
  /** 光面外缘渐隐的范围（按层号比例）：0 = 外缘硬断，1 = 从亮边起一路变淡。 */
  outerFade: number;
  mirror: boolean;
  exposure: number;
  lightPage: boolean;
  scale: number;
  speed: number;
}

export const defaultRibbonOptions: RibbonOptions = {
  mode: 'controlled',
  points: [[-0.85, -0.38], [-0.42, -0.2], [0, -0.06], [0.42, 0.18], [0.85, 0.26]],
  width: 0.26, rootPinch: 0.85, tipPinch: 0.3, twist: 0.6,
  layers: 48, gamma: 2.6, softness: 0.007, flow: 0.6,
  edgeHue: 0.95, faceHue: 0.78, hotspot: 0.6, sway: 0.6,
  drift: 0.1, lag: 0.9, twistFlow: 0.6, breathe: 0.15, smoothing: 1.2, outerFade: 0.5,
  mirror: false, exposure: 1, lightPage: false, scale: 0.75, speed: 0.4,
};

/** 控制点必须按 x 递增，曲线才是 y = C(x) 的函数；拖动时夹在左右邻点之间。 */
export function clampPoint(points: Point[], index: number, next: Point, gap = 0.04): Point[] {
  const min = index > 0 ? points[index - 1][0] + gap : -2;
  const max = index < points.length - 1 ? points[index + 1][0] - gap : 2;
  const copy = points.map((point) => [...point] as Point);
  copy[index] = [Math.min(Math.max(next[0], min), max), Math.min(Math.max(next[1], -0.5), 0.5)];
  return copy;
}

/**
 * 控制点只是飘动的中心：每个点沿一个椭圆形的李萨如轨迹移动，第 i 个点比前一个晚 lag 弧度，
 * 波从根部传到末端。幅度按 (i / 末点)^0.8 增长，根部的点保持不动；x 方向幅度较小，并保持递增。
 */
export function animatePoints(anchors: Point[], time: number, drift: number, lag: number): Point[] {
  const last = anchors.length - 1;
  const moved = anchors.map(([x, y], i): Point => {
    const reach = drift * (i / last) ** 0.8;
    const phase = time * 0.9 - i * lag;
    // 两个频率不成整数比的正弦相加，轨迹不会很快重复，动作更像飘而不是摆。
    return [x + reach * 0.35 * Math.cos(phase * 0.7 + i),
            y + reach * (Math.sin(phase) + 0.35 * Math.sin(phase * 1.73 + i * 1.3))];
  });
  for (let i = 1; i <= last; i++) moved[i][0] = Math.max(moved[i][0], moved[i - 1][0] + 0.02);
  return moved;
}

/** 与片段着色器相同的 Hermite 插值，供界面画辅助线和测试使用。 */
export function edgeCurve(points: Point[], x: number): number {
  const tangent = (i: number) => {
    const a = Math.max(i - 1, 0), b = Math.min(i + 1, points.length - 1);
    return (points[b][1] - points[a][1]) / (points[b][0] - points[a][0]);
  };
  const last = points.length - 1;
  if (x <= points[0][0]) return points[0][1] + tangent(0) * (x - points[0][0]);
  if (x >= points[last][0]) return points[last][1] + tangent(last) * (x - points[last][0]);
  const i = points.findIndex((_, index) => index < last && x <= points[index + 1][0]);
  const [x0, y0] = points[i], [x1, y1] = points[i + 1];
  const h = x1 - x0, t = (x - x0) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * tangent(i) * h + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * tangent(i + 1) * h;
}

const header = '#version 300 es\nprecision highp float;\n';

export function fragmentSourceFor(mode: RibbonOptions['mode']) {
  return `${header}${commonSource}\n${mode === 'controlled' ? controlledSource : openShadersSource}`;
}

export interface RibbonFrameInfo { width: number; height: number; gpuMs: number | null; timerSupported: boolean }
interface TimerExtension { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }
type ProgramEntry = { program: WebGLProgram; uniforms: Map<string, WebGLUniformLocation | null> };

export function createRibbonRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!context) throw new Error('当前浏览器没有可用的 WebGL2 上下文。请换用支持 WebGL2 的浏览器。');
  const gl = context;
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null;
  const queries: WebGLQuery[] = [];
  let gpuMs: number | null = null;
  let disposed = false;
  const programs = new Map<string, ProgramEntry>();
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('无法创建全屏绘制所需的 VAO。');

  function build(mode: RibbonOptions['mode']): ProgramEntry {
    const cached = programs.get(mode);
    if (cached) return cached;
    const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    let fs: WebGLShader | null = null;
    try {
      fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSourceFor(mode));
      const entry = { program: createProgram(gl, vs, fs), uniforms: new Map<string, WebGLUniformLocation | null>() };
      programs.set(mode, entry);
      return entry;
    } finally {
      gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
    }
  }

  // 未使用的 Uniform 会被编译器移除，位置为 null 时 uniform* 调用不产生效果。
  function location(entry: ProgramEntry, name: string) {
    if (!entry.uniforms.has(name)) entry.uniforms.set(name, gl.getUniformLocation(entry.program, name));
    return entry.uniforms.get(name)!;
  }

  function collectTimings() {
    if (!timer) return;
    while (queries.length) {
      const query = queries[0];
      if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) break;
      if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) {
        const ms = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
        gpuMs = gpuMs === null ? ms : gpuMs * 0.85 + ms * 0.15;
      }
      gl.deleteQuery(query);
      queries.shift();
    }
  }

  function draw(time: number, options: RibbonOptions): RibbonFrameInfo | null {
    if (disposed || !canvas.clientWidth || !canvas.clientHeight) return null;
    // 光带是平滑的场，按比例缩小绘制缓冲，由浏览器放大到 CSS 尺寸。
    const dpr = Math.min(devicePixelRatio || 1, 2) * options.scale;
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    collectTimings();
    const query = timer && queries.length < 4 ? gl.createQuery() : null;
    if (query && timer) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);

    const entry = build(options.mode);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(entry.program);
    gl.bindVertexArray(vao);
    gl.uniform2f(location(entry, 'u_resolution'), width, height);
    gl.uniform1f(location(entry, 'u_time'), time);
    gl.uniform1f(location(entry, 'u_exposure'), options.exposure);
    gl.uniform1f(location(entry, 'u_lightPage'), options.lightPage ? 1 : 0);
    gl.uniform2fv(location(entry, 'u_points'), animatePoints(options.points, time, options.drift, options.lag).flat());
    gl.uniform4f(location(entry, 'u_motion'), options.twistFlow, options.breathe, options.smoothing, options.outerFade);
    gl.uniform4f(location(entry, 'u_shape'), options.width, options.rootPinch, options.tipPinch, options.twist);
    gl.uniform4f(location(entry, 'u_layers'), options.layers, options.gamma, options.softness, options.flow);
    gl.uniform4f(location(entry, 'u_colors'), options.edgeHue, options.faceHue, options.hotspot, options.sway);
    gl.uniform1f(location(entry, 'u_mirror'), options.mirror ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (query && timer) { gl.endQuery(timer.TIME_ELAPSED_EXT); queries.push(query); }
    return { width, height, gpuMs, timerSupported: !!timer };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    queries.forEach((query) => gl.deleteQuery(query));
    programs.forEach((entry) => gl.deleteProgram(entry.program));
    gl.deleteVertexArray(vao);
  }

  return { draw, dispose };
}
