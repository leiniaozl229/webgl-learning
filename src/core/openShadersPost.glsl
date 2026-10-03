#version 300 es
precision highp float;
precision highp int;

uniform sampler2D u_scene;
uniform sampler2D u_glyphs;
uniform vec2 u_resolution;
uniform vec2 u_origin;
uniform float u_time;
uniform int u_effect;
uniform float u_strength;
uniform float u_ratio;
uniform bool u_light;
out vec4 outColor;

float hash(vec2 p) {
  vec3 v = fract(vec3(p.xyx) * 0.1031);
  v += dot(v, v.yzx + 33.33);
  return fract((v.x + v.y) * v.z);
}
float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 scene(vec2 pixel) { return texture(u_scene, pixel / u_resolution).rgb; }

void main() {
  vec2 pixel = gl_FragCoord.xy - u_origin;
  vec2 uv = pixel / u_resolution;
  vec3 base = scene(pixel), color = base;
  float ratio = max(u_ratio, 0.5);
  if (u_effect == 1) {
    vec2 cell = floor(pixel / (1.6 * ratio));
    float frame = floor(u_time * 24.0);
    float grain = hash(cell + frame) + hash(cell + frame + 19.3) - 1.0;
    float y = clamp(luminance(base), 0.0, 1.0);
    color += grain * 0.16 * u_strength * 4.0 * y * (1.0 - y);
  } else if (u_effect == 2) {
    vec2 size = vec2(8.0, 12.0) * ratio;
    vec2 cell = floor(pixel / size), centre = (cell + 0.5) * size;
    vec3 ink = scene(centre) * 2.0;
    ink += scene(centre + size * vec2(0.3, 0.3));
    ink += scene(centre + size * vec2(-0.3, 0.3));
    ink += scene(centre + size * vec2(0.3, -0.3));
    ink += scene(centre + size * vec2(-0.3, -0.3));
    ink /= 6.0;
    float glyph = floor(clamp(luminance(ink) * 1.4, 0.0, 1.0) * 9.0 + 0.5);
    vec2 local = fract(pixel / size);
    float mask = texture(u_glyphs, vec2((glyph + local.x) / 10.0, 1.0 - local.y)).r;
    color = mix(base, base * 0.3 + ink * mask * 1.4, u_strength);
  } else if (u_effect == 3) {
    const int bayer[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
    float size = max(2.0, 2.5 * ratio);
    vec2 cell = floor(pixel / size);
    vec3 ink = scene((cell + 0.5) * size);
    float y = luminance(ink);
    ivec2 index = ivec2(mod(cell, 4.0));
    float threshold = (float(bayer[index.y * 4 + index.x]) + 0.5) / 16.0;
    float level = floor(y * 8.0 + threshold) / 8.0;
    color = mix(base, ink * level / max(y, 0.001), 0.65 * u_strength);
  } else if (u_effect == 4) {
    float size = 5.0 * ratio;
    mat2 turn = mat2(cos(0.4), sin(0.4), -sin(0.4), cos(0.4));
    vec2 rotated = turn * pixel;
    vec2 centre = (floor(rotated / size) + 0.5) * size;
    vec3 ink = scene(transpose(turn) * centre);
    float y = clamp(luminance(ink), 0.0, 1.0);
    float radius = size * sqrt(y / 3.14159265);
    float d = length(rotated - centre) - radius;
    float aa = max(0.5 * fwidth(d), 0.001);
    float mask = 1.0 - smoothstep(-aa, aa, d);
    color = mix(base, ink * mask * min(1.0 / max(y, 0.01), 3.0), 0.65 * u_strength);
  } else if (u_effect == 5) {
    for (int i = 0; i < 2; ++i) {
      float size = (30.0 - 10.0 * float(i)) * ratio;
      vec2 cell = floor(pixel / size);
      vec2 offset = vec2(hash(cell + float(i)), hash(cell + 23.1 + float(i)));
      vec2 centre = (cell + 0.2 + 0.6 * offset) * size;
      vec2 q = (pixel - centre) / ratio;
      float twinkle = pow(max(sin(u_time * 1.3 + offset.x * 6.28318), 0.0), 8.0);
      float presence = smoothstep(0.12, 0.5, luminance(scene(centre)));
      float star = exp(-dot(q, q)) + 0.2 * (exp(-abs(q.x) * 1.8 - abs(q.y) * 0.4) + exp(-abs(q.y) * 1.8 - abs(q.x) * 0.4));
      color += vec3(star * twinkle * presence * u_strength);
    }
  } else if (u_effect == 6) {
    vec2 p = (pixel - 0.5 * u_resolution) / u_resolution.y;
    vec2 drift = p + 0.2 * sin(p.yx * vec2(3.1, 2.7) + u_time * vec2(0.21, -0.17));
    vec2 shift = 0.38 * cos(dot(drift, vec2(0.94, 0.342)) * 10.0 - u_time * 0.65) * vec2(0.94, 0.342);
    shift += 0.24 * cos(dot(drift, vec2(-0.6, 0.8)) * 16.0 - u_time * 0.83) * vec2(-0.6, 0.8);
    color = texture(u_scene, uv + shift * 0.08 * u_strength * vec2(u_resolution.y / u_resolution.x, 1.0)).rgb;
  } else if (u_effect == 7) {
    float size = 9.0 * ratio;
    vec2 centre = (floor(pixel / size) + 0.5) * size;
    vec3 mosaic = (scene(centre + size * vec2(-0.25, -0.25)) + scene(centre + size * vec2(0.25, -0.25))
      + scene(centre + size * vec2(-0.25, 0.25)) + scene(centre + size * vec2(0.25, 0.25))) * 0.25;
    color = mix(base, mosaic, u_strength);
  } else if (u_effect == 8) {
    vec2 direction = vec2(cos(u_time * 0.2 + uv.y), sin(u_time * 0.2 + uv.y));
    vec2 split = direction * 0.01 * u_strength * vec2(u_resolution.y / u_resolution.x, 1.0);
    color = vec3(texture(u_scene, uv + split).r, base.g, texture(u_scene, uv - split).b);
    float y = luminance(base);
    vec3 coat = 0.5 + 0.5 * cos(y * 8.0 + u_time * 0.2 + vec3(0.0, 2.1, 4.2));
    color = mix(color, color * 0.8 + coat * y * 0.5, smoothstep(0.04, 0.4, y) * u_strength);
  }
  color = clamp(color, 0.0, 1.0);
  if (u_light) {
    float peak = max(color.r, max(color.g, color.b));
    color = vec3(0.97, 0.97, 0.98) * (1.0 - peak) + color * 0.96;
  }
  outColor = vec4(color, 1.0);
}
