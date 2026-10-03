#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_origin;
uniform float u_time;
uniform int u_stage;
uniform float u_frequency;
uniform int u_octaves;
uniform float u_gain;
uniform float u_warp;
uniform float u_radius;
uniform float u_lineWidth;
uniform float u_hue;
uniform float u_glow;
uniform int u_antialias;
uniform int u_smooth;
uniform int u_shape;
uniform int u_inspect;
out vec4 outColor;

float hash21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float sum = 0.0, amplitude = 0.5, weight = 0.0;
  mat2 turn = mat2(0.87758256, 0.47942554, -0.47942554, 0.87758256);
  for (int i = 0; i < 6; ++i) {
    if (i >= u_octaves) break;
    sum += amplitude * valueNoise(p);
    weight += amplitude;
    p = turn * p * 2.0 + vec2(7.1, 3.7);
    amplitude *= u_gain;
  }
  // 层数和振幅倍率可调，分母始终使用实际振幅之和。
  return sum / max(weight, 0.00001);
}

vec3 palette(float t) {
  return vec3(0.5) + vec3(0.45) * cos(
    6.28318530718 * (vec3(t) + vec3(0.0, 0.18, 0.35))
  );
}

float coverage(float d) {
  // 导数先计算；抗锯齿开关只选择阈值的表达方式。
  float w = max(0.5 * fwidth(d), 0.000001);
  return u_antialias == 1 ? 1.0 - smoothstep(-w, w, d) : 1.0 - step(0.0, d);
}

void main() {
  // 分区 viewport 的 gl_FragCoord 仍位于整张 Canvas 内，因此先减分区原点。
  vec2 p = (gl_FragCoord.xy - u_origin - 0.5 * u_resolution) / u_resolution.y;
  vec3 background = vec3(0.015, 0.025, 0.045);
  if (u_stage == 0) {
    vec2 grid = abs(fract(p * 8.0 + 0.5) - 0.5);
    vec2 aa = max(fwidth(p * 8.0), vec2(0.00001));
    float lines = 1.0 - min(smoothstep(0.0, aa.x, grid.x), smoothstep(0.0, aa.y, grid.y));
    float axes = 1.0 - smoothstep(0.0, 0.004, min(abs(p.x), abs(p.y)));
    float circle = coverage(abs(length(p) - u_radius) - 0.002);
    vec3 color = background + lines * 0.065;
    color = mix(color, vec3(0.15, 0.58, 0.76), max(axes, circle));
    outColor = vec4(color, 1.0);
    return;
  }
  if (u_stage == 1) {
    float d = length(p) - u_radius;
    float fill = coverage(d);
    float stroke = coverage(abs(d) - u_lineWidth);
    vec3 color = mix(background, vec3(0.72, 0.84, 0.91), u_shape == 0 ? fill : stroke);
    if (u_shape == 2) {
      vec3 signColor = d < 0.0 ? vec3(0.1, 0.45, 0.68) : vec3(0.62, 0.3, 0.1);
      color = mix(signColor * (0.3 + 0.7 * exp(-abs(d) * 5.0)), vec3(0.9), stroke);
    }
    outColor = vec4(color, 1.0);
    return;
  }
  vec2 drift = vec2(u_time * 0.12, -u_time * 0.08);
  vec2 q = p * u_frequency;
  float field;
  if (u_stage == 2) {
    field = u_smooth == 1 ? valueNoise(q + drift) : hash21(floor(q + drift));
  } else {
    if (u_stage >= 4) {
      vec2 warp = vec2(fbm(p * 2.0 + drift), fbm(p * 2.0 + drift + 13.7));
      q += u_warp * (warp - 0.5);
      if (u_stage == 4 && u_inspect == 1) {
        outColor = vec4(warp, 0.22, 1.0);
        return;
      }
    }
    field = fbm(q);
  }
  vec3 color = vec3(0.06 + 0.88 * field);
  if (u_stage >= 5) color = palette(field + u_hue + u_time * 0.03);
  if (u_stage == 6) {
    float d = abs(length(p) - (u_radius + 0.08 * (field - 0.5))) - u_lineWidth;
    float ring = coverage(d);
    float glow = u_glow * 0.0015 / (d * d + 0.002);
    color = background + color * (0.12 * field + ring + glow);
    color = color / (1.0 + color);
  }
  outColor = vec4(color, 1.0);
}
