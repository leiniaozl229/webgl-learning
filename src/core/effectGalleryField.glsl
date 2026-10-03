#version 300 es
precision highp float;
precision highp int;
uniform vec2 u_resolution;
uniform float u_time;
uniform int u_kind;
uniform vec3 u_params;
uniform int u_variant;
uniform bool u_reference;
out vec4 outColor;

float hash21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
    mix(hash21(i + vec2(0, 1)), hash21(i + 1.0), f.x), f.y);
}
float fbm(vec2 p, int layers) {
  float sum = 0.0, weight = 0.0, amplitude = 0.5;
  for (int i = 0; i < 6; ++i) {
    if (i >= layers) break;
    sum += noise(p) * amplitude; weight += amplitude;
    p = p * 2.0 + 7.3; amplitude *= 0.5;
  }
  return sum / max(weight, 0.001);
}
vec3 palette(float t) { return 0.5 + 0.5 * cos(6.2831853 * (t + vec3(0.0, 0.33, 0.67))); }
float sdBox(vec2 p, vec2 b) {
  vec2 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}
float coverage(float d) {
  float aa = max(fwidth(d), 0.0001);
  return 1.0 - smoothstep(-aa, aa, d);
}

// 后处理共用的程序化测试图，提供明暗、轮廓和细纹路。
vec3 testScene(vec2 p, float time, bool bright) {
  vec3 color = vec3(0.025, 0.045, 0.085);
  float disk = coverage(length(p - vec2(-0.24, 0.06)) - 0.18);
  float box = coverage(sdBox(p - vec2(0.22, 0.1), vec2(0.15, 0.2)) - 0.025);
  float ring = coverage(abs(length(p - vec2(0.06, -0.17)) - 0.18) - 0.016);
  vec3 diskColor = palette(0.53 + p.x * 0.7 + 0.025 * time);
  color = mix(color, diskColor * (0.25 + 0.75 * smoothstep(-0.12, 0.22, p.y)), disk);
  float stripes = 0.5 + 0.5 * sin((p.x + p.y) * 110.0);
  color = mix(color, mix(vec3(0.1, 0.21, 0.5), vec3(0.82, 0.89, 1.0), stripes), box);
  color = mix(color, vec3(1.0, 0.42, 0.08) * (bright ? 4.0 : 1.0), ring);
  float line = coverage(abs(p.y + 0.3 + 0.04 * sin(p.x * 9.0 + time)) - 0.004);
  return mix(color, vec3(0.25, 0.8, 1.0) * (bright ? 3.5 : 1.0), line);
}

float sceneDistance(vec3 p) {
  float angle = u_time * 0.35 + 0.9;
  p.yz = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * p.yz;
  if (u_variant == 0) return length(p) - 0.72;
  return length(vec2(length(p.xz) - 0.56, p.y)) - 0.2;
}
vec3 rayScene(vec2 p) {
  vec3 ro = vec3(0.0, 0.0, 3.0);
  vec3 rd = normalize(vec3(p * 2.5, -2.0));
  float travel = 0.0;
  bool hit = false;
  int steps = u_reference ? 96 : int(u_params.x);
  for (int i = 0; i < 128; ++i) {
    if (i >= steps) break;
    float d = sceneDistance(ro + travel * rd);
    if (d < u_params.y) { hit = true; break; }
    travel += d;
    if (travel > u_params.z) break;
  }
  if (!hit) return vec3(0.025, 0.04, 0.07);
  vec3 pos = ro + rd * travel;
  float e = 0.001;
  vec3 normal = normalize(vec3(
    sceneDistance(pos + vec3(e, 0, 0)) - sceneDistance(pos - vec3(e, 0, 0)),
    sceneDistance(pos + vec3(0, e, 0)) - sceneDistance(pos - vec3(0, e, 0)),
    sceneDistance(pos + vec3(0, 0, e)) - sceneDistance(pos - vec3(0, 0, e))));
  vec3 light = normalize(vec3(-0.5, 0.8, 1.0));
  float diffuse = max(dot(normal, light), 0.0);
  float specular = pow(max(dot(reflect(-light, normal), -rd), 0.0), 40.0);
  return vec3(0.1, 0.5, 0.76) * (0.15 + 0.85 * diffuse) + specular * vec3(0.9, 0.95, 1.0);
}

void main() {
  vec2 pixel = gl_FragCoord.xy;
  vec2 p = (pixel - 0.5 * u_resolution) / u_resolution.y;
  // 居中形状在窄对照视口中使用相同的等比缩放，保持圆形并容纳轮廓。
  vec2 q = p / min(1.0, u_resolution.x / u_resolution.y);
  vec3 color;
  if (u_kind == 0) { // params: 频率、振幅、传播速度
    float amplitude = u_reference ? 0.0 : u_params.y;
    float phase = length(q) * u_params.x - u_time * u_params.z;
    float field = 0.5 + 0.5 * amplitude * sin(phase);
    if (u_variant == 1) {
      float radius = 0.22 + amplitude * 0.06 * sin(u_time * u_params.z);
      float d = length(q) - radius;
      float mask = coverage(d);
      color = mix(vec3(0.025, 0.06, 0.1), vec3(0.15, 0.7, 0.9) * (0.55 + 0.45 * field), mask);
    } else color = mix(vec3(0.03, 0.09, 0.19), vec3(0.25, 0.8, 0.93), field);
  } else if (u_kind == 1) { // params: 扭曲量、层数、外围衰减
    float warp = u_reference ? 0.0 : u_params.x;
    vec2 v = q;
    float t = u_time * 0.45 + 1.7;
    mat2 fold = mat2(cos(2.13), sin(2.13), -0.964, cos(2.13));
    color = vec3(0.0);
    for (int i = 0; i < 80; ++i) {
      if (i >= int(u_params.y)) break;
      float layer = float(i);
      v.x -= 0.13 * warp * sin(v.y * 5.8 + t + layer * 0.007);
      v.y -= 0.028 * warp * sin(v.x * 8.4 - t + layer * 0.02);
      v = fold * v * 0.953;
      // 偏离原点的细长光斑让各层形成独立的曲线；剪切打破纯旋转的对称性。
      vec2 local = (v - vec2(0.4, 0.0)) * vec2(2.1, 0.17);
      float glow = 0.0021 / (dot(local, local) + 0.0018);
      color += palette(layer * 0.015 + 0.04 * u_time) * glow * 0.45;
    }
    color *= exp(-length(q) * u_params.z);
    color = color / (1.0 + color);
  } else if (u_kind == 2) { // params: 频率、octave、扭曲量
    vec2 drift = vec2(u_time * 0.07, -u_time * 0.045);
    vec2 v = p * u_params.x + drift;
    float warp = u_reference ? 0.0 : u_params.z;
    v += warp * (vec2(fbm(v + 7.1, int(u_params.y)), fbm(v + 23.4, int(u_params.y))) - 0.5);
    float cloud = fbm(v, int(u_params.y));
    color = mix(vec3(0.06, 0.1, 0.2), vec3(0.83, 0.9, 0.95), smoothstep(0.25, 0.75, cloud));
  } else if (u_kind == 3) { // params: 圆角半径、描边半宽、软边宽度
    float d = sdBox(q, vec2(0.25, 0.19) - u_params.x) - u_params.x;
    if (u_variant == 1) d = max(d, -(length(q - vec2(0.12, 0.02)) - 0.09));
    d = abs(d) - u_params.y;
    float aa = max(fwidth(d), u_reference ? 0.0 : u_params.z);
    float mask = 1.0 - smoothstep(-aa, aa, d);
    color = mix(vec3(0.035, 0.06, 0.1), vec3(0.23, 0.78, 0.96), mask);
  } else if (u_kind == 4) { // params: 配色相位、亮度、彩度
    float field = fbm(p * 3.0 + vec2(u_time * 0.12, 0.0), 4);
    vec3 mapped = palette(field + u_params.x);
    float y = dot(mapped, vec3(0.2126, 0.7152, 0.0722));
    color = u_reference ? vec3(field) : mix(vec3(y), mapped, u_params.z) * u_params.y;
  } else if (u_kind == 13) { // 即时光源，反馈对照不保存历史
    vec2 centre = 0.29 * vec2(cos(u_time * 0.8), sin(u_time * 1.1));
    float emitter = exp(-dot(q - centre, q - centre) / 0.0008);
    color = emitter * palette(u_time * 0.03) * u_params.y;
  } else if (u_kind == 14) color = rayScene(q);
  else color = testScene(q, u_time, u_kind == 12);
  outColor = vec4(color, 1.0);
}
