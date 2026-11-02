// 可控光带与 OpenShaders 对照共用：输入、配色、高光压缩与最终合成。
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_exposure;
uniform float u_lightPage; // 0 = 深色底，光直接相加；1 = 白色页面，按覆盖率叠在页面上

out vec4 outColor;

const float TAU = 6.28318530718;

// 居中并按高度归一化：横纵一个单位等长。控制点也使用这套坐标。
vec2 sceneCoord() {
  return (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
}

// OKLCH → 线性 RGB。亮度与彩度分开控制，换色相时明暗保持稳定。
vec3 oklch(float lightness, float chroma, float hueTurns) {
  float h = hueTurns * TAU;
  float a = chroma * cos(h), b = chroma * sin(h);
  vec3 lms = vec3(
    lightness + 0.3963377774 * a + 0.2158037573 * b,
    lightness - 0.1055613458 * a - 0.0638541728 * b,
    lightness - 0.0894841775 * a - 1.2914855480 * b
  );
  lms *= lms * lms;
  return clamp(mat3(
    4.0767416621, -1.2684380046, -0.0041960863,
    -3.3077115913, 2.6097574011, -0.7034186147,
    0.2309699292, -0.3413193965, 1.7076147010
  ) * lms, 0.0, 1.0);
}

// ACES 风格的高光压缩：几十层叠加远超 1，压缩后高光仍保留颜色。
vec3 compressLight(vec3 c) {
  return clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0);
}

// 累加的光 → 屏幕颜色。深色底直接显示；白色页面按最亮通道作覆盖率，暗处透出页面，与清华页面一致。
void present(vec3 light) {
  vec3 shown = pow(compressLight(light * u_exposure), vec3(0.9));
  float alpha = max(shown.r, max(shown.g, shown.b));
  vec3 color = mix(shown, vec3(1.0) * (1.0 - alpha) + shown, u_lightPage);
  // 抖动：打散 8 位量化在缓变光面上造成的色带。
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  outColor = vec4(color + (dither - 0.5) / 255.0, 1.0);
}
