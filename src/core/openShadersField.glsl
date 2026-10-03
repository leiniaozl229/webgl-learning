#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform int u_stage;
uniform float u_time;
uniform int u_layers;
uniform float u_warp;
uniform float u_stretch;
uniform float u_exposure;
uniform float u_hue;
uniform float u_spread;
uniform float u_tilt;
uniform vec2 u_centre;
uniform float u_phase;
uniform vec2 u_frequency;
uniform bool u_toneMap;
out vec4 outColor;

vec3 oklch(float lightness, float chroma, float hue) {
  float a = chroma * cos(hue), b = chroma * sin(hue);
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

vec3 compressLight(vec3 c) {
  return clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  // 统一除以高度，让横纵方向的一个单位有相同像素长度。
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  if (u_stage == 0) {
    vec2 grid = abs(fract(p * 8.0 + 0.5) - 0.5);
    vec2 aa = max(fwidth(p * 8.0), vec2(0.00001));
    float line = 1.0 - min(smoothstep(0.0, aa.x, grid.x), smoothstep(0.0, aa.y, grid.y));
    float axes = 1.0 - smoothstep(0.0, 0.004, min(abs(p.x), abs(p.y)));
    float circle = 1.0 - smoothstep(0.002, 0.005, abs(length(p) - 0.25));
    vec3 coordinate = vec3(0.025, 0.04, 0.06) + line * 0.08;
    coordinate = mix(coordinate, vec3(0.15, 0.58, 0.76), max(axes, circle));
    outColor = vec4(coordinate, 1.0);
    return;
  }

  float t = u_time * 0.45 + u_phase;
  float breath = 0.5 + 0.22 * sin(u_time * 0.48);
  vec2 q = p;
  if (u_stage >= 4) {
    q = (p - u_centre) * (1.08 - 0.08 * breath);
    q = mat2(cos(u_tilt), sin(u_tilt), -sin(u_tilt), cos(u_tilt)) * q;
  }
  mat2 fold = mat2(cos(2.13), sin(2.13), -0.964, cos(2.13));
  vec3 light = vec3(0.0);
  int count = u_stage >= 4 ? u_layers : 1;
  for (int i = 0; i < 96; ++i) {
    if (i >= count) break;
    float layer = float(i + 1);
    if (u_stage >= 3) {
      // 纵向扰动读取本层已经更新的横向坐标。
      q.x -= sin(q.y * u_frequency.x + t + layer * 0.007) * 0.13 * u_warp;
      q.y -= sin(q.x * u_frequency.y - t + layer * 0.02) * 0.028 * u_warp;
    }
    if (u_stage >= 4) q = fold * q * 0.953;
    vec2 local = q - (u_stage >= 4 ? vec2(0.35 + breath * 0.1, 0.0) : vec2(0.0));
    vec2 stretched = u_stage >= 2 ? local * vec2(2.1, u_stretch) : local;
    float glow = 0.0021 / (dot(stretched, stretched) + 0.0018);
    if (u_stage >= 4) glow *= 0.45 * exp2(-length(q) * 0.36);
    float k = 0.5 + 0.5 * sin(layer * 0.16 + t * 1.2 + length(q) * 1.8);
    vec3 tint = u_stage >= 5
      ? oklch(0.56 + 0.2 * k, 0.13, 6.28318530718 * (u_hue + u_spread * k))
      : vec3(0.75, 0.82, 0.9);
    light += glow * tint;
  }
  light *= u_exposure;
  if (u_stage < 5) light = light / (1.0 + light);
  else if (u_toneMap) light = pow(compressLight(light), vec3(0.9));
  outColor = vec4(clamp(light, 0.0, 1.0), 1.0);
}
