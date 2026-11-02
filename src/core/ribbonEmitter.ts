import { compileShader, createProgram } from './webgl2';
import commonSource from './ribbonCommon.glsl?raw';
import emitterSource from './ribbonEmitter.glsl?raw';
import vertexSource from './shaderHandbookVertex.glsl?raw';
import type { Point } from './controlledRibbon';

export { commonSource, emitterSource };

/** 与着色器里的 MAX_RIBBONS 一致：同时存在的光带上限。 */
export const MAX_RIBBONS = 8;

export type BackgroundKind = 'solid' | 'linear' | 'radial';

export interface EmitterOptions {
  /** 发射点，场景坐标：原点在画面中心，1 = 画面高度。 */
  source: Point;
  /** 平均发射方向（弧度，0 = 向右，逆时针为正）。 */
  direction: number;
  /** 发射方向的随机范围（弧度，总张角）。 */
  spread: number;
  /** 平均每隔多久放出一条（动画时间单位）。 */
  interval: number;
  /** 平均寿命（动画时间单位）。 */
  life: number;
  /** 寿命中用于从发射点长出来的比例。 */
  growth: number;
  /** 寿命末段尾部回缩的程度：0 = 原地淡出，1 = 尾部一路收到头部。 */
  release: number;
  /** 光带在寿命内沿发射方向飘离发射点的距离。 */
  travel: number;
  length: number;
  width: number;
  /** 长度、扭转、寿命在平均值上下浮动的比例。 */
  variance: number;
  /** 每条光带宽度的差异：0 = 一样宽，1 = 从平均宽度的 0.1 倍到 3 倍。 */
  widthRandom: number;
  /** 宽度沿长度的起伏：光带一段宽、一段窄，并随时间缓慢流动。 */
  widthWave: number;
  /** 控制点之间方向随机转折的幅度（弧度）：越大越弯。 */
  curl: number;
  /** 每个控制点绕自己中心飘动的幅度，根部为 0。 */
  drift: number;
  twist: number;
  twistFlow: number;
  rootPinch: number;
  layers: number;
  gamma: number;
  softness: number;
  smoothing: number;
  outerFade: number;
  /** 亮边上那条锐利细线的强度：0 = 只有柔和的叠加亮边。 */
  edgeCore: number;
  /** 亮线的半宽（场景单位，1 = 画面高度）。 */
  edgeWidth: number;
  /** 各条光带亮线的强弱粗细差异。 */
  edgeRandom: number;
  /** 亮边沿长度的明暗变化：0 = 整条一样亮，1 = 只剩几段高光。 */
  edgeVary: number;
  edgeHue: number;
  faceHue: number;
  /** 每条光带色相的随机偏移（圈）。 */
  hueJitter: number;
  sourceGlow: number;
  exposure: number;
  /** 背景：纯色、线性渐变或径向渐变。颜色用 CSS 的十六进制写法。 */
  background: BackgroundKind;
  backgroundFrom: string;
  backgroundTo: string;
  /** 线性渐变方向（度，0 = 从左到右，90 = 从下到上）。 */
  backgroundAngle: number;
  /** 径向渐变中心，场景坐标。 */
  backgroundCenter: Point;
  backgroundRadius: number;
  scale: number;
  speed: number;
}

export const defaultEmitterOptions: EmitterOptions = {
  source: [-0.72, -0.32], direction: 0.32, spread: 0.9,
  interval: 1.6, life: 9, growth: 0.3, release: 0.6, travel: 0.25,
  length: 1.3, width: 0.22, variance: 0.35, widthRandom: 0.55, widthWave: 0.35, curl: 0.35, drift: 0.1,
  twist: 0.6, twistFlow: 0.6, rootPinch: 0.85,
  layers: 32, gamma: 2.6, softness: 0.005, smoothing: 1.2, outerFade: 0.5, edgeCore: 0.8, edgeWidth: 0.0018, edgeRandom: 0.6, edgeVary: 0.85,
  edgeHue: 0.95, faceHue: 0.78, hueJitter: 0.04, sourceGlow: 0.6,
  background: 'radial', backgroundFrom: '#1a1033', backgroundTo: '#000000', backgroundAngle: 90, backgroundCenter: [-0.5, -0.25], backgroundRadius: 1.2,
  exposure: 1, scale: 0.75, speed: 0.4,
};

type BackgroundOptions = Pick<EmitterOptions, 'background' | 'backgroundFrom' | 'backgroundTo' | 'backgroundAngle' | 'backgroundCenter' | 'backgroundRadius'>;

/** 几组常用背景，作为调色起点。 */
export const backgroundPresets: { label: string; options: BackgroundOptions }[] = [
  { label: '纯黑', options: { background: 'solid', backgroundFrom: '#000000', backgroundTo: '#000000', backgroundAngle: 90, backgroundCenter: [0, 0], backgroundRadius: 1 } },
  { label: '紫色光晕', options: { background: 'radial', backgroundFrom: '#1a1033', backgroundTo: '#000000', backgroundAngle: 90, backgroundCenter: [-0.5, -0.25], backgroundRadius: 1.2 } },
  { label: '夜空', options: { background: 'linear', backgroundFrom: '#02030a', backgroundTo: '#16204a', backgroundAngle: 90, backgroundCenter: [0, 0], backgroundRadius: 1 } },
  { label: '白色页面', options: { background: 'solid', backgroundFrom: '#ffffff', backgroundTo: '#ffffff', backgroundAngle: 90, backgroundCenter: [0, 0], backgroundRadius: 1 } },
  { label: '晨光', options: { background: 'linear', backgroundFrom: '#ffffff', backgroundTo: '#e8e4ff', backgroundAngle: 90, backgroundCenter: [0, 0], backgroundRadius: 1 } },
];

/** '#rrggbb' → 0..1 的三个分量。 */
export function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255];
}

const backgroundKinds: Record<BackgroundKind, number> = { solid: 0, linear: 1, radial: 2 };

/** 出生时抽好的随机量，之后不再变。用 0..1 的原始随机数存储，滑块改动会立即作用在活着的光带上。 */
interface Ribbon {
  born: number;
  /** 寿命、方向、长度、宽度、扭转、扭转相位、色相各一个随机数。 */
  rolls: { life: number; angle: number; length: number; width: number; twist: number; phase: number; hue: number; edge: number; edgeWidth: number; wave: number };
  side: 1 | -1;
  /** 五个控制点的方向转折与间距抖动，以及各自飘动的两个频率和相位。 */
  bends: number[];
  gaps: number[];
  wobble: { f1: number; f2: number; p1: number }[];
}

export interface RibbonInstance {
  origin: Point;
  /** 发射方向的单位向量。 */
  axis: Point;
  /** 局部坐标中的五个控制点：x 沿发射方向递增。 */
  points: Point[];
  length: number;
  /** 带符号：正值向发射方向左侧铺开，负值向右侧。 */
  width: number;
  twist: number;
  twistPhase: number;
  intensity: number;
  head: number;
  tail: number;
  hueShift: number;
  /** 出生时抽定的相位，光面丝纹和起伏用它错开，不随数组位置变化。 */
  seed: number;
  /** 这条光带亮线的强度倍数与宽度倍数。 */
  edgeGain: number;
  edgeScale: number;
  /** 这条光带宽度沿长度起伏的幅度。 */
  wave: number;
  age: number;
}

/** 可复现的伪随机数：同一个种子得到同一串发射序列。 */
export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/** 在平均值上下 variance 比例内取值：roll = 0.5 时正好等于平均值。 */
const vary = (mean: number, roll: number, variance: number) => mean * (1 + (roll * 2 - 1) * variance);

/** 宽度倍数：roll 先按 1.5 次方偏向 0，再在 [1 − 0.9r, 1 + 2r] 之间插值；r = 1 时最宽可达平均宽度的 3 倍。 */
export function widthFactor(roll: number, randomness: number) {
  return 1 - 0.9 * randomness + roll ** 1.5 * 2.9 * randomness;
}

/** 一条光带当前的寿命比例 0..1；超过 1 表示已经消失。 */
export function ageOf(ribbon: Ribbon, time: number, options: EmitterOptions) {
  return (time - ribbon.born) / vary(options.life, ribbon.rolls.life, options.variance * 0.6);
}

/**
 * 生命周期：出生后在 growth 比例的时间里从根部长到末端；
 * 末段 40% 的时间里整体变暗，同时尾部按 release 从根部向头部回缩。
 */
export function lifecycle(age: number, growth: number, release: number) {
  const head = smoothstep(0, Math.max(growth, 0.01), age);
  const tail = release * smoothstep(0.55, 1, age);
  const intensity = smoothstep(0, 0.08, age) * (1 - smoothstep(0.6, 1, age));
  return { head, tail, intensity };
}

/** 把出生时抽好的随机量和当前时间组合成这一帧要上传的光带。 */
export function instanceOf(ribbon: Ribbon, time: number, options: EmitterOptions): RibbonInstance {
  const { rolls } = ribbon;
  const age = ageOf(ribbon, time, options);
  const angle = options.direction + (rolls.angle - 0.5) * options.spread;
  const axis: Point = [Math.cos(angle), Math.sin(angle)];
  const length = vary(options.length, rolls.length, options.variance);
  // 飘离：根部沿发射方向移动，越到晚年越快，像被放开后被风带走。
  const travel = options.travel * age * age;
  const origin: Point = [options.source[0] + axis[0] * travel, options.source[1] + axis[1] * travel];

  // 控制点：每段方向在上一段基础上随机转一点（随机游走），弯曲只在局部坐标里发生。
  // 方向限制在 ±0.55 弧度（约 30°）内：曲线保持平缓，按竖直距离近似垂直距离的误差很小，不会扭成钩子。
  let heading = 0, x = 0, y = 0;
  const points: Point[] = [[0, 0]];
  for (let i = 1; i < 5; i++) {
    heading = Math.min(Math.max(heading + (ribbon.bends[i] - 0.5) * 2 * options.curl, -0.55), 0.55);
    const step = (length / 4) * (0.8 + 0.4 * ribbon.gaps[i]);
    x += step * Math.cos(heading);
    y += step * Math.sin(heading);
    // 飘动：每个点有自己的两组频率与相位，幅度从根部的 0 增长到末端。
    // 只在垂直于发射方向上摆，x 间距保持不变，相邻点不会挤到一起。
    const { f1, f2, p1 } = ribbon.wobble[i];
    const reach = options.drift * (i / 4) ** 0.8;
    points.push([x, y + reach * (Math.sin(time * f1 + p1) + 0.4 * Math.sin(time * f2 * 1.7 + p1 * 2))]);
  }
  for (let i = 1; i < 5; i++) points[i][0] = Math.max(points[i][0], points[i - 1][0] + 0.02);

  const { head, tail, intensity } = lifecycle(age, options.growth, options.release);
  return {
    origin, axis, points, length,
    // 宽度的随机偏向细的一端：多数光带细而锐利，偶尔一条很宽，画面有主次。
    width: options.width * widthFactor(rolls.width, options.widthRandom) * ribbon.side,
    twist: vary(options.twist, rolls.twist, options.variance),
    twistPhase: rolls.phase * Math.PI * 2 + time * options.twistFlow,
    intensity, head, tail,
    hueShift: (rolls.hue - 0.5) * 2 * options.hueJitter,
    seed: rolls.phase * 37,
    edgeGain: Math.max(1 + (rolls.edge * 2 - 1) * options.edgeRandom * 1.2, 0),
    edgeScale: 1 + (rolls.edgeWidth * 2 - 1) * options.edgeRandom * 0.7,
    wave: options.widthWave * (0.3 + 1.4 * rolls.wave),
    age,
  };
}

/**
 * 发射器：随时间推进，按随机间隔放出新光带，移除寿命已尽的光带。
 * 第一次更新时从“一个寿命之前”开始补放，画面一打开就处在稳定状态，而不是从空白开始。
 */
export function createEmitter(seed = 1) {
  let random = mulberry32(seed);
  let ribbons: Ribbon[] = [];
  let nextSpawn: number | null = null;
  let last = -Infinity;

  function spawn(born: number): Ribbon {
    const r = random;
    return {
      born,
      rolls: { life: r(), angle: r(), length: r(), width: r(), twist: r(), phase: r(), hue: r(), edge: r(), edgeWidth: r(), wave: r() },
      side: r() < 0.5 ? 1 : -1,
      bends: Array.from({ length: 5 }, r),
      gaps: Array.from({ length: 5 }, r),
      wobble: Array.from({ length: 5 }, () => ({ f1: 0.5 + r() * 0.6, f2: 0.3 + r() * 0.5, p1: r() * Math.PI * 2 })),
    };
  }

  function update(time: number, options: EmitterOptions): RibbonInstance[] {
    // 时间倒退（重置）时从头开始。
    if (time < last) reset(seed);
    last = time;
    if (nextSpawn === null) nextSpawn = time - options.life;
    while (nextSpawn <= time) {
      const alive = ribbons.filter((ribbon) => ageOf(ribbon, nextSpawn!, options) < 1);
      if (alive.length < MAX_RIBBONS) alive.push(spawn(nextSpawn));
      ribbons = alive;
      nextSpawn += options.interval * (0.5 + random());
    }
    ribbons = ribbons.filter((ribbon) => ageOf(ribbon, time, options) < 1);
    return ribbons.map((ribbon) => instanceOf(ribbon, time, options));
  }

  function reset(nextSeed: number) {
    seed = nextSeed;
    random = mulberry32(seed);
    ribbons = [];
    nextSpawn = null;
    last = -Infinity;
  }

  return { update, reset };
}

/** OKLCH → 线性 RGB，与 ribbonCommon.glsl 里的 oklch() 相同。 */
export function oklch(lightness: number, chroma: number, hueTurns: number): [number, number, number] {
  const h = hueTurns * Math.PI * 2;
  const a = chroma * Math.cos(h), b = chroma * Math.sin(h);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const clamp = (value: number) => Math.min(Math.max(value, 0), 1);
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ];
}

/** 着色器里细线层数的上限，也是调色板纹理的层数列数；第 MAX_LAYERS 列放亮线颜色。 */
export const MAX_LAYERS = 48;

/**
 * 每层只和层号有关的量：(tᵞ, 细线间距系数, 0.08t·cos 7t, 0.08t·sin 7t)。
 * 原本每个像素对每层都要算两次 pow 和一次 sin，现在每帧在这里算一次。
 */
export function fillLayerShape(target: Float32Array, options: Pick<EmitterOptions, 'layers' | 'gamma'>) {
  const { layers, gamma } = options;
  for (let i = 0; i < Math.min(layers, MAX_LAYERS); i++) {
    const t = (i + 0.5) / layers;
    target[i * 4] = t ** gamma;
    target[i * 4 + 1] = (gamma * Math.max(t, 0.5 / layers) ** (gamma - 1)) / layers;
    target[i * 4 + 2] = 0.08 * t * Math.cos(7 * t);
    target[i * 4 + 3] = 0.08 * t * Math.sin(7 * t);
  }
}

/** 第 row 行：一条光带每层的颜色（已乘外缘渐隐与柔和度），a = 亮边权重 (1 − t)²；最后一列是亮线颜色。 */
export function fillPaletteRow(target: Float32Array, row: number, hueShift: number, options: Pick<EmitterOptions, 'layers' | 'softness' | 'outerFade' | 'edgeHue' | 'faceHue'>) {
  const { layers, softness, outerFade, edgeHue, faceHue } = options;
  const base = row * (MAX_LAYERS + 1) * 4;
  for (let i = 0; i < Math.min(layers, MAX_LAYERS); i++) {
    const t = (i + 0.5) / layers;
    const mix = (a: number, b: number) => a + (b - a) * t;
    const fade = (1 - smoothstep(1 - outerFade, 1, t)) * softness;
    const [r, g, b] = oklch(mix(0.82, 0.6), mix(0.09, 0.16), mix(edgeHue, faceHue) + hueShift);
    target.set([r * fade, g * fade, b * fade, (1 - t) ** 2], base + i * 4);
  }
  target.set([...oklch(0.96, 0.05, edgeHue + hueShift), 1], base + MAX_LAYERS * 4);
}

const header = '#version 300 es\nprecision highp float;\n';
export const emitterFragmentSource = `${header}${commonSource}\n${emitterSource}`;

export interface EmitterFrameInfo { width: number; height: number; count: number; gpuMs: number | null; timerSupported: boolean }
interface TimerExtension { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }

export function createEmitterRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!context) throw new Error('当前浏览器没有可用的 WebGL2 上下文。请换用支持 WebGL2 的浏览器。');
  const gl = context;
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null;
  const queries: WebGLQuery[] = [];
  let gpuMs: number | null = null;
  let disposed = false;

  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  let fs: WebGLShader | null = null;
  let program: WebGLProgram;
  try {
    fs = compileShader(gl, gl.FRAGMENT_SHADER, emitterFragmentSource);
    program = createProgram(gl, vs, fs);
  } finally {
    gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
  }
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('无法创建全屏绘制所需的 VAO。');
  const names = ['u_resolution', 'u_time', 'u_exposure', 'u_count', 'u_points', 'u_frame', 'u_form', 'u_life', 'u_traits', 'u_layers', 'u_look', 'u_source', 'u_bgFrom', 'u_bgTo', 'u_bgShape', 'u_bgRadius', 'u_edge', 'u_layerShape', 'u_palette'] as const;
  const at = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)])) as Record<typeof names[number], WebGLUniformLocation | null>;

  // 每帧复用同一组 TypedArray，按光带顺序填好再一次上传。
  const points = new Float32Array(MAX_RIBBONS * 10);
  const frame = new Float32Array(MAX_RIBBONS * 4);
  const form = new Float32Array(MAX_RIBBONS * 4);
  const life = new Float32Array(MAX_RIBBONS * 4);
  const traits = new Float32Array(MAX_RIBBONS * 4);
  const layerShape = new Float32Array(MAX_LAYERS * 4);
  const palette = new Float32Array((MAX_LAYERS + 1) * MAX_RIBBONS * 4);
  const paletteTexture = gl.createTexture();
  if (!paletteTexture) throw new Error('无法创建光带调色板纹理。');
  gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, MAX_LAYERS + 1, MAX_RIBBONS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

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

  function draw(time: number, ribbons: RibbonInstance[], options: EmitterOptions): EmitterFrameInfo | null {
    if (disposed || !canvas.clientWidth || !canvas.clientHeight) return null;
    const dpr = Math.min(devicePixelRatio || 1, 2) * options.scale;
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    collectTimings();
    const query = timer && queries.length < 4 ? gl.createQuery() : null;
    if (query && timer) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);

    const count = Math.min(ribbons.length, MAX_RIBBONS);
    for (let k = 0; k < count; k++) {
      const ribbon = ribbons[k];
      ribbon.points.forEach(([x, y], i) => { points[k * 10 + i * 2] = x; points[k * 10 + i * 2 + 1] = y; });
      frame.set([...ribbon.origin, ...ribbon.axis], k * 4);
      form.set([ribbon.length, ribbon.width, ribbon.twist, ribbon.twistPhase], k * 4);
      life.set([ribbon.intensity, ribbon.head, ribbon.tail, ribbon.hueShift], k * 4);
      traits.set([ribbon.seed, ribbon.edgeGain, ribbon.edgeScale, ribbon.wave], k * 4);
      fillPaletteRow(palette, k, ribbon.hueShift, options);
    }
    fillLayerShape(layerShape, options);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniform2f(at.u_resolution, width, height);
    gl.uniform1f(at.u_time, time);
    gl.uniform1f(at.u_exposure, options.exposure);
    gl.uniform1i(at.u_count, count);
    gl.uniform2fv(at.u_points, points);
    gl.uniform4fv(at.u_frame, frame);
    gl.uniform4fv(at.u_form, form);
    gl.uniform4fv(at.u_life, life);
    gl.uniform4fv(at.u_traits, traits);
    gl.uniform4f(at.u_layers, options.layers, options.gamma, options.softness, options.smoothing);
    gl.uniform4f(at.u_look, options.edgeHue, options.faceHue, options.outerFade, options.rootPinch);
    gl.uniform3f(at.u_source, options.source[0], options.source[1], options.sourceGlow);
    gl.uniform3f(at.u_bgFrom, ...hexToRgb(options.backgroundFrom));
    gl.uniform3f(at.u_bgTo, ...hexToRgb(options.background === 'solid' ? options.backgroundFrom : options.backgroundTo));
    gl.uniform4f(at.u_bgShape, backgroundKinds[options.background], (options.backgroundAngle * Math.PI) / 180, ...options.backgroundCenter);
    gl.uniform1f(at.u_bgRadius, Math.max(options.backgroundRadius, 0.01));
    gl.uniform4f(at.u_edge, options.edgeCore, options.edgeWidth, options.edgeRandom, options.edgeVary);
    gl.uniform4fv(at.u_layerShape, layerShape);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
    if (count) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, MAX_LAYERS + 1, count, gl.RGBA, gl.FLOAT, palette);
    gl.uniform1i(at.u_palette, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (query && timer) { gl.endQuery(timer.TIME_ELAPSED_EXT); queries.push(query); }
    return { width, height, count, gpuMs, timerSupported: !!timer };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    queries.forEach((query) => gl.deleteQuery(query));
    gl.deleteProgram(program);
    gl.deleteVertexArray(vao);
    gl.deleteTexture(paletteTexture);
  }

  return { draw, dispose };
}
