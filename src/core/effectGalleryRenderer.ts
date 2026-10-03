import fullscreenSource from './shaderHandbookVertex.glsl?raw';
import fieldSource from './effectGalleryField.glsl?raw';
import postSource from './effectGalleryPost.glsl?raw';
import blurSource from './effectGalleryBlur.glsl?raw';
import feedbackSource from './effectGalleryFeedback.glsl?raw';
import meshVertexSource from './effectGalleryMeshVertex.glsl?raw';
import meshFragmentSource from './effectGalleryMeshFragment.glsl?raw';
import { createEffectMesh, diffusionWeight, type EffectOptions } from './effectGallery';
import { inverse4, lookAt4, multiply4, perspective4 } from './transforms3d';

export const effectSources = { fullscreenSource, fieldSource, postSource, blurSource, feedbackSource, meshVertexSource, meshFragmentSource };

export interface EffectFrameInfo {
  width: number; height: number; paneWidth: number; passes: number;
  format: string; historyFrames: number; read: string; write: string;
  vertices: number; triangles: number; dt: number;
}

export function createEffectRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: true });
  if (!gl) throw new Error('浏览器未能创建 WebGL2 上下文。请检查浏览器与 GPU 设置后重试。');
  const programs: WebGLProgram[] = [], textures: WebGLTexture[] = [], framebuffers: WebGLFramebuffer[] = [];
  const vaos: WebGLVertexArrayObject[] = [], buffers: WebGLBuffer[] = [], renderbuffers: WebGLRenderbuffer[] = [];
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    programs.forEach((item) => gl!.deleteProgram(item)); textures.forEach((item) => gl!.deleteTexture(item));
    framebuffers.forEach((item) => gl!.deleteFramebuffer(item)); vaos.forEach((item) => gl!.deleteVertexArray(item));
    buffers.forEach((item) => gl!.deleteBuffer(item)); renderbuffers.forEach((item) => gl!.deleteRenderbuffer(item));
  }
  function compile(type: number, source: string, name: string) {
    const shader = gl!.createShader(type);
    if (!shader) throw new Error(`无法创建 ${name}。`);
    gl!.shaderSource(shader, source); gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      const log = gl!.getShaderInfoLog(shader) ?? '驱动未返回编译日志';
      gl!.deleteShader(shader); throw new Error(`${name} 编译失败：\n${log}`);
    }
    return shader;
  }
  function program(vertex: string, fragment: string, name: string) {
    const shaders: WebGLShader[] = [];
    try {
      shaders.push(compile(gl!.VERTEX_SHADER, vertex, `${name} vertex.glsl`));
      shaders.push(compile(gl!.FRAGMENT_SHADER, fragment, `${name} fragment.glsl`));
      const value = gl!.createProgram();
      if (!value) throw new Error(`无法创建 ${name} Program。`);
      programs.push(value);
      shaders.forEach((shader) => gl!.attachShader(value, shader)); gl!.linkProgram(value);
      if (!gl!.getProgramParameter(value, gl!.LINK_STATUS)) throw new Error(`${name} 链接失败：\n${gl!.getProgramInfoLog(value) ?? '驱动未返回链接日志'}`);
      return value;
    } finally { shaders.forEach((shader) => gl!.deleteShader(shader)); }
  }
  function locations(value: WebGLProgram, names: string[]) {
    return Object.fromEntries(names.map((name) => {
      const location = gl!.getUniformLocation(value, `u_${name}`);
      if (location === null) throw new Error(`缺少 Uniform：u_${name}`);
      return [name, location];
    }));
  }
  function texture() {
    const value = gl!.createTexture();
    if (!value) throw new Error('无法创建 Texture。');
    textures.push(value); gl!.bindTexture(gl!.TEXTURE_2D, value);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, 1, 1, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return value;
  }
  function target() {
    const color = texture(), fbo = gl!.createFramebuffer();
    if (!fbo) throw new Error('无法创建 Framebuffer。');
    framebuffers.push(fbo); gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, color, 0);
    return { color, fbo, width: 0, height: 0 };
  }
  type Target = ReturnType<typeof target>;
  let floating = !!gl.getExtension('EXT_color_buffer_float');
  function resize(target: Target, width: number, height: number) {
    if (target.width === width && target.height === height) return false;
    gl!.activeTexture(gl!.TEXTURE0); gl!.bindTexture(gl!.TEXTURE_2D, target.color);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, floating ? gl!.RGBA16F : gl!.RGBA8, width, height, 0, gl!.RGBA, floating ? gl!.HALF_FLOAT : gl!.UNSIGNED_BYTE, null);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, target.fbo);
    const status = gl!.checkFramebufferStatus(gl!.FRAMEBUFFER);
    if (status !== gl!.FRAMEBUFFER_COMPLETE) throw new Error(`Framebuffer 不完整：0x${status.toString(16)}，${width} × ${height}`);
    target.width = width; target.height = height;
    gl!.viewport(0, 0, width, height); gl!.clearColor(0, 0, 0, 1); gl!.clear(gl!.COLOR_BUFFER_BIT);
    return true;
  }
  function bindInput(unit: number, texture: WebGLTexture) {
    gl!.activeTexture(gl!.TEXTURE0 + unit); gl!.bindTexture(gl!.TEXTURE_2D, texture);
  }

  try {
    const field = program(fullscreenSource, fieldSource, '图案'), post = program(fullscreenSource, postSource, '后处理');
    const blur = program(fullscreenSource, blurSource, 'Bloom'), feedback = program(fullscreenSource, feedbackSource, '帧间状态');
    const mesh = program(meshVertexSource, meshFragmentSource, '顶点位移');
    const fieldU = locations(field, ['resolution', 'time', 'kind', 'params', 'variant', 'reference']);
    const postU = locations(post, ['scene', 'glyphs', 'bloom', 'resolution', 'origin', 'ratio', 'time', 'kind', 'params', 'variant', 'reference']);
    const blurU = locations(blur, ['input', 'texel', 'direction', 'radius', 'threshold', 'extract']);
    const historyU = locations(feedback, ['previous', 'resolution', 'time', 'dt', 'decay', 'emission', 'diffusion']);
    const meshU = locations(mesh, ['matrix', 'time', 'amplitude', 'variant', 'camera', 'wire', 'divisions']);
    const fullscreenVao = gl.createVertexArray(), meshVao = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer(), indexBuffer = gl.createBuffer(), depth = gl.createRenderbuffer();
    if (!fullscreenVao || !meshVao || !vertexBuffer || !indexBuffer || !depth) {
      if (fullscreenVao) vaos.push(fullscreenVao); if (meshVao) vaos.push(meshVao);
      if (vertexBuffer) buffers.push(vertexBuffer); if (indexBuffer) buffers.push(indexBuffer);
      if (depth) renderbuffers.push(depth);
      throw new Error('无法创建网格的 VAO、Buffer 或深度附件。');
    }
    vaos.push(fullscreenVao, meshVao); buffers.push(vertexBuffer, indexBuffer); renderbuffers.push(depth);
    gl.bindVertexArray(meshVao); gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.bindVertexArray(fullscreenVao);
    const scene = target(), bloomA = target(), bloomB = target(), history = [target(), target()];
    // 检查实际浮点附件能力；不可用时退回 RGBA8，并在页面报告存储格式。
    try { resize(bloomA, 2, 2); } catch (cause) {
      if (!floating) throw cause;
      floating = false; bloomA.width = 0; resize(bloomA, 2, 2);
    }
    const glyphs = texture();
    const atlas = document.createElement('canvas'); atlas.width = 320; atlas.height = 48;
    const ctx = atlas.getContext('2d');
    if (!ctx) throw new Error('无法创建 ASCII 字形图集。');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 320, 48);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 35px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ' .:;+*oO8@'.split('').forEach((char, i) => ctx.fillText(char, i * 32 + 16, 24));
    gl.bindTexture(gl.TEXTURE_2D, glyphs); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    let depthWidth = 0, depthHeight = 0, divisions = 0, vertices = 0, indices = 0;
    let historyIndex = 0, historyFrames = 0, historyKey = '', clearRequested = true;
    let lastRead = 'A', lastWrite = 'B', lastDt = 0;

    function renderScene(time: number, options: EffectOptions, width: number, height: number, reference: boolean) {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, scene.fbo);
      gl!.framebufferRenderbuffer(gl!.FRAMEBUFFER, gl!.DEPTH_ATTACHMENT, gl!.RENDERBUFFER, null);
      resize(scene, width, height);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, scene.fbo); gl!.viewport(0, 0, width, height);
      gl!.disable(gl!.DEPTH_TEST); gl!.bindVertexArray(fullscreenVao);
      if (options.kind === 15) {
        if (divisions !== Math.round(options.params[1])) {
          const data = createEffectMesh(options.params[1]); divisions = data.divisions;
          vertices = data.vertices.length / 5; indices = data.indices.length;
          gl!.bindVertexArray(meshVao); gl!.bindBuffer(gl!.ARRAY_BUFFER, vertexBuffer);
          gl!.bufferData(gl!.ARRAY_BUFFER, data.vertices, gl!.STATIC_DRAW);
          gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, indexBuffer); gl!.bufferData(gl!.ELEMENT_ARRAY_BUFFER, data.indices, gl!.STATIC_DRAW);
        }
        if (depthWidth !== width || depthHeight !== height) {
          gl!.bindRenderbuffer(gl!.RENDERBUFFER, depth); gl!.renderbufferStorage(gl!.RENDERBUFFER, gl!.DEPTH_COMPONENT16, width, height);
          depthWidth = width; depthHeight = height;
        }
        gl!.framebufferRenderbuffer(gl!.FRAMEBUFFER, gl!.DEPTH_ATTACHMENT, gl!.RENDERBUFFER, depth);
        const status = gl!.checkFramebufferStatus(gl!.FRAMEBUFFER);
        if (status !== gl!.FRAMEBUFFER_COMPLETE) throw new Error(`网格深度附件不完整：0x${status.toString(16)}`);
        gl!.clearColor(0.025, 0.04, 0.07, 1); gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);
        gl!.enable(gl!.DEPTH_TEST); gl!.bindVertexArray(meshVao); gl!.useProgram(mesh);
        const aspect = width / height, distance = Math.max(1, 0.75 / aspect);
        const camera: [number, number, number] = options.variant === 0 ? [0, 1.8 * distance, 2.4 * distance] : [0.6 * distance, 0.45 * distance, 2.6 * distance];
        const matrix = multiply4(perspective4(Math.PI / 3, aspect, 0.1, 30), inverse4(lookAt4(camera, [0, 0, 0], [0, 1, 0])));
        gl!.uniformMatrix4fv(meshU.matrix, false, new Float32Array(matrix)); gl!.uniform3fv(meshU.camera, camera);
        gl!.uniform1f(meshU.time, time); gl!.uniform1f(meshU.amplitude, reference ? 0 : options.params[0]);
        gl!.uniform1i(meshU.variant, options.variant); gl!.uniform1i(meshU.wire, options.params[2] > 0 ? 1 : 0); gl!.uniform1f(meshU.divisions, divisions);
        gl!.drawElements(gl!.TRIANGLES, indices, gl!.UNSIGNED_SHORT, 0);
        gl!.disable(gl!.DEPTH_TEST); gl!.bindVertexArray(fullscreenVao);
      } else {
        // 恢复纯颜色目标，避免换效果或改变尺寸后残留旧深度附件。
        gl!.framebufferRenderbuffer(gl!.FRAMEBUFFER, gl!.DEPTH_ATTACHMENT, gl!.RENDERBUFFER, null);
        gl!.useProgram(field); gl!.uniform2f(fieldU.resolution, width, height);
        gl!.uniform1f(fieldU.time, time); gl!.uniform1i(fieldU.kind, options.kind);
        gl!.uniform3f(fieldU.params, ...options.params); gl!.uniform1i(fieldU.variant, options.variant); gl!.uniform1i(fieldU.reference, reference ? 1 : 0);
        gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      }
      return scene.color;
    }
    function bloomPass(input: WebGLTexture, output: Target, width: number, height: number, direction: [number, number], extract: boolean, options: EffectOptions) {
      resize(output, width, height); gl!.bindFramebuffer(gl!.FRAMEBUFFER, output.fbo); gl!.viewport(0, 0, width, height);
      gl!.useProgram(blur); bindInput(0, input); gl!.uniform1i(blurU.input, 0);
      gl!.uniform2f(blurU.texel, 1 / width, 1 / height); gl!.uniform2fv(blurU.direction, direction);
      gl!.uniform1f(blurU.radius, options.params[1]); gl!.uniform1f(blurU.threshold, options.params[0]); gl!.uniform1i(blurU.extract, extract ? 1 : 0);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }
    function updateHistory(time: number, dt: number, options: EffectOptions, width: number, height: number) {
      const key = JSON.stringify([options.params, options.variant, width, height]);
      if (key !== historyKey || clearRequested) {
        for (const target of history) {
          resize(target, width, height); gl!.bindFramebuffer(gl!.FRAMEBUFFER, target.fbo);
          gl!.clearColor(0, 0, 0, 1); gl!.clear(gl!.COLOR_BUFFER_BIT);
        }
        historyIndex = 0; historyFrames = 0; historyKey = key; clearRequested = false;
      }
      if (dt > 0 || historyFrames === 0) {
        const delta = historyFrames === 0 ? 1 / 30 : Math.min(Math.max(dt, 0), 1 / 30);
        const input = history[historyIndex], output = history[1 - historyIndex];
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, output.fbo); gl!.viewport(0, 0, width, height);
        gl!.useProgram(feedback); bindInput(0, input.color); gl!.uniform1i(historyU.previous, 0);
        gl!.uniform2f(historyU.resolution, width, height); gl!.uniform1f(historyU.time, time); gl!.uniform1f(historyU.dt, delta);
        gl!.uniform1f(historyU.decay, options.params[0]); gl!.uniform1f(historyU.emission, options.params[1]);
        gl!.uniform1f(historyU.diffusion, options.variant === 1 ? diffusionWeight(options.params[2], delta) : 0);
        gl!.drawArrays(gl!.TRIANGLES, 0, 3);
        lastRead = historyIndex === 0 ? 'A' : 'B'; lastWrite = historyIndex === 0 ? 'B' : 'A'; lastDt = delta;
        historyIndex = 1 - historyIndex; historyFrames++;
        return true;
      }
      return false;
    }
    function present(input: WebGLTexture, time: number, options: EffectOptions, x: number, width: number, height: number, ratio: number, reference: boolean) {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null); gl!.viewport(x, 0, width, height); gl!.useProgram(post);
      bindInput(0, input); bindInput(1, glyphs); bindInput(2, bloomA.color);
      gl!.uniform1i(postU.scene, 0); gl!.uniform1i(postU.glyphs, 1); gl!.uniform1i(postU.bloom, 2);
      gl!.uniform2f(postU.resolution, width, height); gl!.uniform2f(postU.origin, x, 0); gl!.uniform1f(postU.ratio, ratio);
      gl!.uniform1f(postU.time, time); gl!.uniform1i(postU.kind, options.kind); gl!.uniform3f(postU.params, ...options.params);
      gl!.uniform1i(postU.variant, options.variant); gl!.uniform1i(postU.reference, reference ? 1 : 0);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }
    return {
      dispose,
      clearHistory() { clearRequested = true; },
      draw(time: number, dt: number, options: EffectOptions): EffectFrameInfo | null {
        if (disposed || gl.isContextLost()) return null;
        const rect = canvas.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return null;
        const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(450_000 / (rect.width * rect.height)));
        const width = Math.max(options.compare ? 2 : 1, Math.round(rect.width * ratio)), height = Math.max(1, Math.round(rect.height * ratio));
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; clearRequested = true; }
        gl.disable(gl.BLEND); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.DEPTH_TEST); gl.bindVertexArray(fullscreenVao);
        const paneWidth = options.compare ? Math.floor(width / 2) : width;
        let input: WebGLTexture, passes = 2;
        if (options.kind === 13) {
          const updated = updateHistory(time, dt, options, paneWidth, height);
          input = history[historyIndex].color; passes = updated ? 2 : 1;
        } else {
          input = renderScene(time, options, paneWidth, height, false);
          if (options.kind === 12) {
            const smallWidth = Math.max(1, Math.floor(paneWidth / 2)), smallHeight = Math.max(1, Math.floor(height / 2));
            bloomPass(input, bloomA, smallWidth, smallHeight, [0, 0], true, options);
            bloomPass(bloomA.color, bloomB, smallWidth, smallHeight, [1, 0], false, options);
            bloomPass(bloomB.color, bloomA, smallWidth, smallHeight, [0, 1], false, options);
            passes = 5;
          }
        }
        present(input, time, options, 0, paneWidth, height, ratio, false);
        if (options.compare) {
          const reference = renderScene(time, options, width - paneWidth, height, true);
          present(reference, time, options, paneWidth, width - paneWidth, height, ratio, true);
        }
        return { width, height, paneWidth, passes, format: floating ? 'RGBA16F' : 'RGBA8（浮点附件不可用）',
          historyFrames: options.kind === 13 ? historyFrames : 0, read: lastRead, write: lastWrite, dt: lastDt,
          vertices: options.kind === 15 ? vertices : 3, triangles: options.kind === 15 ? indices / 3 : 1 };
      },
    };
  } catch (cause) { dispose(); throw cause; }
}
