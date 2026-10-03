#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_scene;
uniform sampler2D u_glyphs;
uniform sampler2D u_bloom;
uniform vec2 u_resolution;
uniform vec2 u_origin;
uniform float u_ratio;
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
float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 scene(vec2 pixel) { return texture(u_scene, pixel / u_resolution).rgb; }
float heightField(vec2 p) {
  return sin(p.x * 8.0 + u_time * 0.8) * cos(p.y * 7.0 - u_time * 0.6);
}
void main() {
  vec2 pixel = gl_FragCoord.xy - u_origin, uv = pixel / u_resolution;
  vec3 base = scene(pixel), color = base;
  float ratio = max(u_ratio, 0.25);
  if (!u_reference && u_kind == 5) { // params: UV 位移、折射率、F0
    vec2 p = (pixel - 0.5 * u_resolution) / u_resolution.y;
    float e = 0.002;
    vec2 slope = vec2(heightField(p + vec2(e, 0)) - heightField(p - vec2(e, 0)),
      heightField(p + vec2(0, e)) - heightField(p - vec2(0, e))) / (2.0 * e);
    vec3 normal = normalize(vec3(-slope * 0.14, 1.0));
    vec3 incident = vec3(0.0, 0.0, -1.0);
    vec3 ray = refract(incident, normal, 1.0 / u_params.y);
    vec2 shift = ray.xy * u_params.x * vec2(u_resolution.y / u_resolution.x, 1.0);
    vec3 refracted = texture(u_scene, clamp(uv + shift, 0.0, 1.0)).rgb;
    vec3 direction = reflect(incident, normal);
    // 解析环境提供反射颜色；UV 折射使用薄层近似。
    vec3 environment = mix(vec3(0.02, 0.06, 0.1), vec3(0.8, 0.92, 1.0), smoothstep(-0.1, 0.9, direction.y));
    float fresnel = u_params.z + (1.0 - u_params.z) * pow(1.0 - max(normal.z, 0.0), 5.0);
    color = mix(refracted, environment, fresnel);
  } else if (!u_reference && u_kind == 6) { // params: RGB 偏移 CSS px、虹彩强度、配色相位
    vec2 direction = normalize(vec2(1.0, 0.4 * sin(uv.y * 6.0 + u_time)));
    vec2 split = direction * u_params.x * ratio / u_resolution;
    color = vec3(texture(u_scene, uv + split).r, base.g, texture(u_scene, uv - split).b);
    vec3 coat = 0.5 + 0.5 * cos(luminance(base) * 7.0 + u_params.z * 6.28318 + u_time * 0.3 + vec3(0, 2.1, 4.2));
    color = mix(color, coat * luminance(base), u_params.y);
  } else if (!u_reference && u_kind == 7) { // params: 星点网格 CSS px、光斑尺寸、闪烁频率
    float size = u_params.x * ratio;
    vec2 id = floor(pixel / size);
    vec2 random = vec2(hash21(id), hash21(id + 23.1));
    vec2 centre = (id + 0.15 + 0.7 * random) * size;
    vec2 q = (pixel - centre) / max(ratio * u_params.y, 0.1);
    float pulse = pow(0.5 + 0.5 * sin(u_time * u_params.z + random.x * 6.28318), 4.0);
    float gate = smoothstep(0.05, 0.5, luminance(scene(centre)));
    float star = exp(-dot(q, q)) + 0.4 * (exp(-abs(q.x) * 0.6 - abs(q.y) * 3.0) + exp(-abs(q.y) * 0.6 - abs(q.x) * 3.0));
    color += star * pulse * gate;
  } else if (!u_reference && u_kind == 8) { // params: 颗粒尺寸、强度、刷新 Hz
    vec2 id = floor(pixel / (u_params.x * ratio));
    float frame = floor(u_time * u_params.z);
    float grain = hash21(id + frame) + hash21(id + frame + 19.3) - 1.0;
    float y = clamp(luminance(base), 0.0, 1.0);
    color += grain * u_params.y * 4.0 * y * (1.0 - y);
  } else if (!u_reference && u_kind == 9) { // params: 色阶数、像素格 CSS px、混合强度
    const int bayer[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
    vec2 cell = floor(pixel / (u_params.y * ratio));
    ivec2 index = ivec2(mod(cell, 4.0));
    float threshold = (float(bayer[index.y * 4 + index.x]) + 0.5) / 16.0;
    vec3 ink = scene((cell + 0.5) * u_params.y * ratio);
    vec3 quantized = floor(ink * (u_params.x - 1.0) + threshold) / (u_params.x - 1.0);
    color = mix(base, quantized, u_params.z);
  } else if (!u_reference && u_kind == 10) { // params: 间距 CSS px、网格角度 rad、半径倍率
    float size = u_params.x * ratio;
    float angle = u_params.y;
    mat2 turn = mat2(cos(angle), sin(angle), -sin(angle), cos(angle));
    vec2 rotated = turn * pixel;
    vec2 centre = (floor(rotated / size) + 0.5) * size;
    float y = clamp(luminance(scene(transpose(turn) * centre)), 0.0, 1.0);
    // 深色油墨的面积覆盖率近似 1-y；圆面积随半径平方变化。
    float radius = size * sqrt((1.0 - y) / 3.14159265) * u_params.z;
    float d = length(rotated - centre) - radius;
    float aa = max(fwidth(d), 0.001);
    float mask = 1.0 - smoothstep(-aa, aa, d);
    color = mix(vec3(0.95, 0.91, 0.81), vec3(0.08, 0.14, 0.22), mask);
  } else if (!u_reference && u_kind == 11) { // params: 单元 CSS px、字符覆盖率、混合强度
    vec2 size = vec2(u_params.x, u_variant == 0 ? u_params.x * 1.5 : u_params.x) * ratio;
    vec2 centre = (floor(pixel / size) + 0.5) * size;
    vec3 ink = (scene(centre + size * vec2(-0.25, -0.25)) + scene(centre + size * vec2(0.25, -0.25))
      + scene(centre + size * vec2(-0.25, 0.25)) + scene(centre + size * vec2(0.25, 0.25))) * 0.25;
    if (u_variant == 0) {
      float glyph = floor(clamp(luminance(ink) * u_params.y, 0.0, 1.0) * 9.0 + 0.5);
      vec2 local = fract(pixel / size);
      float mask = texture(u_glyphs, vec2((glyph + local.x) / 10.0, 1.0 - local.y)).r;
      color = mix(base, vec3(0.03, 0.05, 0.08) + ink * mask * 1.8, u_params.z);
    } else color = mix(base, ink, u_params.z);
  } else if (u_kind == 12) {
    if (!u_reference) color += texture(u_bloom, uv).rgb * u_params.z;
    color = color / (1.0 + color);
  } else if (u_kind == 13) color = color / (1.0 + color);
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
