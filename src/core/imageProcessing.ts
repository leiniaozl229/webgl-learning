import { compileShader, createProgram, resizeCanvasToDisplaySize } from './webgl2';

export type KernelName = 'normal' | 'boxBlur' | 'gaussianBlur' | 'sharpen' | 'edgeDetect' | 'emboss';

export const IMAGE_KERNELS: Record<KernelName, readonly number[]> = {
  normal: [
    0, 0, 0,
    0, 1, 0,
    0, 0, 0,
  ],
  boxBlur: [
    1, 1, 1,
    1, 1, 1,
    1, 1, 1,
  ],
  gaussianBlur: [
    1, 2, 1,
    2, 4, 2,
    1, 2, 1,
  ],
  sharpen: [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0,
  ],
  edgeDetect: [
    -1, -1, -1,
    -1,  8, -1,
    -1, -1, -1,
  ],
  emboss: [
    -2, -1, 0,
    -1,  1, 1,
     0,  1, 2,
  ],
};

export const KERNEL_LABELS: Record<KernelName, string> = {
  normal: '原图',
  boxBlur: '均值模糊',
  gaussianBlur: '高斯模糊',
  sharpen: '锐化',
  edgeDetect: '边缘检测',
  emboss: '浮雕',
};

export function computeKernelWeight(kernel: readonly number[]): number {
  if (kernel.length !== 9 || kernel.some((value) => !Number.isFinite(value))) {
    throw new Error('卷积核必须包含 9 个有限数值。');
  }
  const weight = kernel.reduce((sum, value) => sum + value, 0);
  return weight <= 0 ? 1 : weight;
}

export const IMAGE_VERTEX_SHADER = `#version 300 es

in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`;

export const IMAGE_FRAGMENT_SHADER = `#version 300 es

precision highp float;

uniform sampler2D u_image;
uniform float u_kernel[9];
uniform float u_divisor;
uniform float u_offset;
uniform vec4 u_channelMask;
uniform int u_borderMode;
uniform float u_brightness;
uniform float u_grayscale;

in vec2 v_texCoord;
out vec4 outColor;

void main() {
  vec2 onePixel = 1.0 / vec2(textureSize(u_image, 0));
  vec4 centerSample = texture(u_image, v_texCoord);

  if (u_borderMode == 2 && (
    v_texCoord.x < onePixel.x || v_texCoord.x > 1.0 - onePixel.x ||
    v_texCoord.y < onePixel.y || v_texCoord.y > 1.0 - onePixel.y
  )) {
    outColor = centerSample;
    return;
  }

  vec4 colorSum =
      texture(u_image, v_texCoord + onePixel * vec2(-1, -1)) * u_kernel[0] +
      texture(u_image, v_texCoord + onePixel * vec2( 0, -1)) * u_kernel[1] +
      texture(u_image, v_texCoord + onePixel * vec2( 1, -1)) * u_kernel[2] +
      texture(u_image, v_texCoord + onePixel * vec2(-1,  0)) * u_kernel[3] +
      texture(u_image, v_texCoord)                            * u_kernel[4] +
      texture(u_image, v_texCoord + onePixel * vec2( 1,  0)) * u_kernel[5] +
      texture(u_image, v_texCoord + onePixel * vec2(-1,  1)) * u_kernel[6] +
      texture(u_image, v_texCoord + onePixel * vec2( 0,  1)) * u_kernel[7] +
      texture(u_image, v_texCoord + onePixel * vec2( 1,  1)) * u_kernel[8];

  vec4 convolved = colorSum / u_divisor + vec4(u_offset);
  vec4 selected = mix(centerSample, convolved, u_channelMask);
  vec3 color = selected.rgb + u_brightness;
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(color, vec3(luminance), u_grayscale);
  outColor = vec4(color, selected.a);
}`;

export interface ImageProcessingOptions {
  filter: 'nearest' | 'linear';
  kernels: readonly (readonly number[])[];
  brightness: number;
  grayscale: number;
  divisor?: number;
  offset?: number;
  channelMask?: readonly [number, number, number, number];
  border?: 'extend' | 'wrap' | 'crop';
}

export interface ImageProcessingRenderer {
  draw(options: ImageProcessingOptions): void;
  dispose(): void;
}

function createSourceCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 336;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建用于生成示例图像的 2D Canvas。');

  context.fillStyle = '#e8f7fc';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const cell = 24;
  for (let y = 0; y < canvas.height; y += cell) {
    for (let x = 0; x < canvas.width; x += cell) {
      if ((x / cell + y / cell) % 2 === 0) {
        context.fillStyle = '#d4eef7';
        context.fillRect(x, y, cell, cell);
      }
    }
  }

  context.fillStyle = '#087ea4';
  context.fillRect(42, 44, 174, 116);
  context.fillStyle = '#ffd166';
  context.beginPath();
  context.arc(352, 105, 61, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#23272f';
  context.lineWidth = 12;
  context.beginPath();
  context.moveTo(72, 260);
  context.lineTo(206, 194);
  context.lineTo(278, 276);
  context.lineTo(432, 190);
  context.stroke();
  context.fillStyle = '#ffffff';
  context.font = '700 34px system-ui, sans-serif';
  context.fillText('RGB', 91, 112);
  context.fillStyle = '#23272f';
  context.font = '700 22px system-ui, sans-serif';
  context.fillText('纹理像素', 334, 272);
  return canvas;
}

function requireUniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string) {
  const location = gl.getUniformLocation(program, name);
  if (location === null) throw new Error(`没有找到 ${name} Uniform。`);
  return location;
}

export function createImageProcessingRenderer(canvas: HTMLCanvasElement): ImageProcessingRenderer {
  const context = canvas.getContext('webgl2', { alpha: true, antialias: false });
  if (!context) throw new Error('当前浏览器或设备无法创建 WebGL2 上下文。');
  const gl: WebGL2RenderingContext = context;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, IMAGE_VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, IMAGE_FRAGMENT_SHADER);
  const program = createProgram(gl, vertexShader, fragmentShader);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  const vertexArray = gl.createVertexArray();
  const positionBuffer = gl.createBuffer();
  const texCoordBuffer = gl.createBuffer();
  const sourceTexture = gl.createTexture();
  const pingTextures = [gl.createTexture(), gl.createTexture()];
  const framebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];
  if (!vertexArray || !positionBuffer || !texCoordBuffer || !sourceTexture || pingTextures.some((value) => !value) || framebuffers.some((value) => !value)) {
    throw new Error('无法创建图像处理需要的 WebGL2 资源。');
  }

  const source = createSourceCanvas();
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
  if (positionLocation < 0 || texCoordLocation < 0) throw new Error('图像着色器缺少顶点输入。');

  gl.bindVertexArray(vertexArray);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1,  1, 1, -1,  1, 1,
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 0, 1, 0, 0, 1,
    0, 1, 1, 0, 1, 1,
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

  gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  for (let index = 0; index < 2; index += 1) {
    const texture = pingTextures[index];
    const framebuffer = framebuffers[index];
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sourceWidth, sourceHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`离屏 Framebuffer ${index + 1} 不完整。`);
    }
  }

  const imageLocation = requireUniform(gl, program, 'u_image');
  const kernelLocation = requireUniform(gl, program, 'u_kernel[0]');
  const divisorLocation = requireUniform(gl, program, 'u_divisor');
  const offsetLocation = requireUniform(gl, program, 'u_offset');
  const channelMaskLocation = requireUniform(gl, program, 'u_channelMask');
  const borderModeLocation = requireUniform(gl, program, 'u_borderMode');
  const brightnessLocation = requireUniform(gl, program, 'u_brightness');
  const grayscaleLocation = requireUniform(gl, program, 'u_grayscale');

  function configureTexture(texture: WebGLTexture, filter: ImageProcessingOptions['filter'], border: ImageProcessingOptions['border']) {
    const glFilter = filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
    const glWrap = border === 'wrap' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, glWrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, glWrap);
  }

  function drawPass(
    texture: WebGLTexture,
    framebuffer: WebGLFramebuffer | null,
    kernel: readonly number[],
    width: number,
    height: number,
    brightness = 0,
    grayscale = 0,
    divisor = computeKernelWeight(kernel),
    offset = 0,
    channelMask: readonly [number, number, number, number] = [1, 1, 1, 0],
    borderMode = 0,
  ) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, width, height);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1fv(kernelLocation, kernel);
    gl.uniform1f(divisorLocation, Math.abs(divisor) < Number.EPSILON ? 1 : divisor);
    gl.uniform1f(offsetLocation, offset);
    gl.uniform4fv(channelMaskLocation, channelMask);
    gl.uniform1i(borderModeLocation, borderMode);
    gl.uniform1f(brightnessLocation, brightness);
    gl.uniform1f(grayscaleLocation, grayscale);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return {
    draw(options) {
      resizeCanvasToDisplaySize(canvas);
      configureTexture(sourceTexture, options.filter, options.border);
      gl.useProgram(program);
      gl.bindVertexArray(vertexArray);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(imageLocation, 0);

      let inputTexture = sourceTexture;
      options.kernels.forEach((kernel, index) => {
        const outputIndex = index % 2;
        drawPass(
          inputTexture,
          framebuffers[outputIndex],
          kernel,
          sourceWidth,
          sourceHeight,
          0,
          0,
          options.divisor ?? computeKernelWeight(kernel),
          options.offset ?? 0,
          options.channelMask ?? [1, 1, 1, 0],
          options.border === 'crop' ? 2 : 0,
        );
        inputTexture = pingTextures[outputIndex];
      });

      drawPass(
        inputTexture,
        null,
        IMAGE_KERNELS.normal,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
        options.brightness,
        options.grayscale,
      );
    },
    dispose() {
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(texCoordBuffer);
      gl.deleteVertexArray(vertexArray);
      gl.deleteTexture(sourceTexture);
      pingTextures.forEach((texture) => gl.deleteTexture(texture));
      framebuffers.forEach((framebuffer) => gl.deleteFramebuffer(framebuffer));
      gl.deleteProgram(program);
    },
  };
}
