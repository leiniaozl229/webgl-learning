import { compileShader, createProgram } from './webgl2';
import fieldSource from './openShadersField.glsl?raw';
import postSource from './openShadersPost.glsl?raw';
import vertexSource from './openShadersVertex.glsl?raw';

export { fieldSource, postSource, vertexSource };

export const shaderStyles = [
  { id: 'none', label: 'Pure field', chinese: '原始光场', principle: '保留配色后的连续光场。' },
  { id: 'grain', label: 'Grain', chinese: '胶片颗粒', principle: '用随机值扰动中间调，颗粒按固定频率更新。' },
  { id: 'ascii', label: 'ASCII', chinese: '字符图案', principle: '单元平均亮度选择字形，字形遮罩承接源颜色。' },
  { id: 'dither', label: 'Dither', chinese: '有序抖动', principle: '量化亮度，用 4×4 有序阈值分配舍入余量。' },
  { id: 'halftone', label: 'Halftone', chinese: '印刷网点', principle: '亮度控制圆点面积，旋转网格避免轴向排列。' },
  { id: 'sparkle', label: 'Sparkle', chinese: '亮区星光', principle: '网格随机位置生成闪光，源场亮度控制可见度。' },
  { id: 'wave', label: 'Liquid', chinese: '液体扭曲', principle: '连续波形偏移 UV，再采样同一张光场纹理。' },
  { id: 'pixel', label: 'Mosaic', chinese: '马赛克', principle: '每格四点平均，单元内的所有片段共享颜色。' },
  { id: 'prism', label: 'Chroma', chinese: '色散涂层', principle: '红蓝通道从不同位置取样，叠加随相位变化的色彩。' },
] as const;

export type ShaderStyle = typeof shaderStyles[number]['id'];

export interface RibbonParameters {
  hue: number;
  spread: number;
  tilt: number;
  centreX: number;
  centreY: number;
  phase: number;
  warpX: number;
  warpY: number;
}

/** 整数种子在 CPU 生成，GPU 只读取可复用的参数。 */
export function ribbonParameters(name: string): RibbonParameters {
  let state = 2166136261;
  for (const letter of name.trim().toLowerCase() || 'webgl') {
    state = Math.imul(state ^ letter.codePointAt(0)!, 16777619) >>> 0;
  }
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const angle = random() * Math.PI * 2;
  return {
    hue: random(), spread: 0.08 + random() * 0.18, tilt: (random() - 0.5) * 4,
    centreX: Math.cos(angle) * 0.45, centreY: Math.sin(angle) * 0.4,
    phase: random() * Math.PI * 2, warpX: 0.3 + random() * 0.3, warpY: 2 + random(),
  };
}

export interface RibbonOptions {
  stage: number;
  layers: number;
  warp: number;
  stretch: number;
  exposure: number;
  hue: number;
  style: ShaderStyle;
  strength: number;
  fieldScale: number;
  compare: boolean;
  toneMap: boolean;
  light: boolean;
  parameters: RibbonParameters;
}

export function fieldDimensions(width: number, height: number, scale: number) {
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export interface RibbonFrameInfo {
  width: number;
  height: number;
  fieldWidth: number;
  fieldHeight: number;
  pixelRatio: number;
}

export function createRibbonRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!context) throw new Error('当前浏览器没有可用的 WebGL2 上下文。请换用支持 WebGL2 的浏览器。');
  const gl = context;
  const programs: WebGLProgram[] = [];
  const textures: WebGLTexture[] = [];
  const framebuffers: WebGLFramebuffer[] = [];
  let vao: WebGLVertexArrayObject | null = null;
  let disposed = false;

  function dispose() {
    if (disposed) return;
    disposed = true;
    textures.forEach((texture) => gl.deleteTexture(texture));
    framebuffers.forEach((framebuffer) => gl.deleteFramebuffer(framebuffer));
    programs.forEach((program) => gl.deleteProgram(program));
    gl.deleteVertexArray(vao);
  }

  function makeProgram(fragment: string) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    let fs: WebGLShader | null = null;
    try {
      fs = compileShader(gl, gl.FRAGMENT_SHADER, fragment);
      const program = createProgram(gl, vs, fs);
      programs.push(program);
      return program;
    } finally {
      gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
    }
  }

  function texture() {
    const item = gl.createTexture();
    if (!item) throw new Error('无法创建光场纹理。');
    textures.push(item);
    gl.bindTexture(gl.TEXTURE_2D, item);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return item;
  }

  function target() {
    const color = texture();
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) throw new Error('无法创建离屏 Framebuffer。');
    framebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color, 0);
    return { color, framebuffer, width: 0, height: 0 };
  }

  function locations(program: WebGLProgram, names: string[]) {
    return Object.fromEntries(names.map((name) => {
      const location = gl.getUniformLocation(program, name);
      if (location === null) throw new Error(`缺少 Shader 输入 ${name}。`);
      return [name, location];
    })) as Record<string, WebGLUniformLocation>;
  }

  try {
    const field = makeProgram(fieldSource);
    const post = makeProgram(postSource);
    vao = gl.createVertexArray();
    if (!vao) throw new Error('无法创建全屏三角形的 VAO。');
    const current = target(), reference = target();
    const atlas = texture();
    const glyphCanvas = document.createElement('canvas');
    glyphCanvas.width = 320;
    glyphCanvas.height = 48;
    const glyphContext = glyphCanvas.getContext('2d');
    if (!glyphContext) throw new Error('无法创建 ASCII 字形图集。');
    glyphContext.fillStyle = '#000';
    glyphContext.fillRect(0, 0, 320, 48);
    glyphContext.font = '32px monospace';
    glyphContext.textAlign = 'center';
    glyphContext.textBaseline = 'middle';
    glyphContext.fillStyle = '#fff';
    Array.from(' .:;+*oO8@').forEach((glyph, index) => glyphContext.fillText(glyph, index * 32 + 16, 24));
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glyphCanvas);
    const f = locations(field, ['u_resolution', 'u_stage', 'u_time', 'u_layers', 'u_warp', 'u_stretch', 'u_exposure', 'u_hue', 'u_spread', 'u_tilt', 'u_centre', 'u_phase', 'u_frequency', 'u_toneMap']);
    const p = locations(post, ['u_scene', 'u_glyphs', 'u_resolution', 'u_origin', 'u_time', 'u_effect', 'u_strength', 'u_ratio', 'u_light']);

    function resizeTarget(item: typeof current, width: number, height: number) {
      if (item.width === width && item.height === height) return;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, item.color);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, item.framebuffer);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('光场 Framebuffer 不完整，无法写入颜色纹理。');
      item.width = width;
      item.height = height;
    }

    function renderPane(item: typeof current, origin: number, width: number, height: number, stage: number, scale: number, time: number, options: RibbonOptions, ratio: number) {
      const dimensions = fieldDimensions(width, height, scale);
      resizeTarget(item, dimensions.width, dimensions.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, item.framebuffer);
      gl.viewport(0, 0, dimensions.width, dimensions.height);
      gl.useProgram(field);
      gl.uniform2f(f.u_resolution, dimensions.width, dimensions.height);
      gl.uniform1i(f.u_stage, Math.min(stage, 5));
      gl.uniform1f(f.u_time, time);
      gl.uniform1i(f.u_layers, options.layers);
      gl.uniform1f(f.u_warp, options.warp);
      gl.uniform1f(f.u_stretch, options.stretch);
      gl.uniform1f(f.u_exposure, options.exposure);
      gl.uniform1f(f.u_hue, options.hue);
      gl.uniform1f(f.u_spread, options.parameters.spread);
      gl.uniform1f(f.u_tilt, options.parameters.tilt);
      gl.uniform2f(f.u_centre, options.parameters.centreX, options.parameters.centreY);
      gl.uniform1f(f.u_phase, options.parameters.phase);
      gl.uniform2f(f.u_frequency, options.parameters.warpX, options.parameters.warpY);
      gl.uniform1i(f.u_toneMap, options.toneMap ? 1 : 0);
      // 本次输出纹理与最终显示的输入纹理严格分离。
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(origin, 0, width, height);
      gl.useProgram(post);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, item.color);
      gl.uniform1i(p.u_scene, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, atlas);
      gl.uniform1i(p.u_glyphs, 1);
      gl.uniform2f(p.u_resolution, width, height);
      gl.uniform2f(p.u_origin, origin, 0);
      gl.uniform1f(p.u_time, time);
      gl.uniform1i(p.u_effect, stage >= 6 ? shaderStyles.findIndex((style) => style.id === options.style) : 0);
      gl.uniform1f(p.u_strength, options.strength);
      gl.uniform1f(p.u_ratio, ratio);
      gl.uniform1i(p.u_light, stage >= 5 && options.light ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return dimensions;
    }

    return {
      draw(time: number, options: RibbonOptions): RibbonFrameInfo {
        if (disposed) throw new Error('渲染器已经清理，请重新初始化。');
        const rect = canvas.getBoundingClientRect();
        const desiredRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        const pixelBudget = 700_000;
        const ratio = Math.min(desiredRatio, Math.sqrt(pixelBudget / Math.max(1, rect.width * rect.height)));
        const width = Math.max(2, Math.round(rect.width * ratio)), height = Math.max(1, Math.round(rect.height * ratio));
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        gl.bindVertexArray(vao);
        gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.CULL_FACE);
        gl.colorMask(true, true, true, true);
        const paneWidth = options.compare ? Math.floor(width / 2) : width;
        const scale = options.stage === 7 ? options.fieldScale : 1;
        const info = renderPane(current, 0, paneWidth, height, options.stage, scale, time, options, ratio);
        // 后处理步骤对照原始光场，分辨率步骤对照相同风格的全尺寸场。
        if (options.compare) renderPane(reference, paneWidth, width - paneWidth, height, options.stage === 6 ? 5 : 6, 1, time, options, ratio);
        return { width: paneWidth, height, fieldWidth: info.width, fieldHeight: info.height, pixelRatio: ratio };
      },
      dispose,
    };
  } catch (cause) {
    dispose();
    throw cause;
  }
}
