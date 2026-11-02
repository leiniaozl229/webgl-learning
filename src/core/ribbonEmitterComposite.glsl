// 合成：线性光 + 泛光，叠在背景上，压缩高光后输出。
uniform float u_encoded;          // 1 = 离屏纹理是 8 位，存的是 x / (1 + x)
uniform sampler2D u_scene;
uniform sampler2D u_bloomTexture;
uniform float u_bloom;
uniform vec3 u_bgFrom;            // 背景渐变起点颜色（显示空间，与 CSS 颜色相同）
uniform vec3 u_bgTo;              // 背景渐变终点颜色
uniform vec4 u_bgShape;           // x = 类型（0 纯色，1 线性，2 径向），y = 线性角度（弧度），zw = 径向中心
uniform float u_bgRadius;         // 径向渐变半径（场景单位）

vec3 decode(vec3 stored) {
  return u_encoded > 0.5 ? stored / max(1.0 - stored, 1e-3) : stored;
}

// 背景：线性渐变沿角度方向从画面一边铺到另一边；径向渐变从中心向外到半径处结束。
vec3 background(vec2 p) {
  float t = 0.0;
  if (u_bgShape.x > 1.5) {
    t = length(p - u_bgShape.zw) / u_bgRadius;
  } else if (u_bgShape.x > 0.5) {
    vec2 dir = vec2(cos(u_bgShape.y), sin(u_bgShape.y));
    // 画面沿 dir 方向的半跨度：场景 x 范围是 ±宽高比/2，y 范围是 ±0.5。
    float extent = 0.5 * (abs(dir.x) * u_resolution.x / u_resolution.y + abs(dir.y));
    t = dot(p, dir) / (2.0 * extent) + 0.5;
  }
  return mix(u_bgFrom, u_bgTo, smoothstep(0.0, 1.0, clamp(t, 0.0, 1.0)));
}

void main() {
  vec2 p = sceneCoord();
  vec3 light = decode(texelFetch(u_scene, ivec2(gl_FragCoord.xy), 0).rgb);
  light += decode(texture(u_bloomTexture, gl_FragCoord.xy / u_resolution).rgb) * u_bloom;
  vec3 bg = background(p);
  // 底色越亮，越按覆盖率合成；深色处仍直接相加，光带在暗底上保持通透。
  presentOver(light, bg, smoothstep(0.25, 0.75, dot(bg, vec3(0.2126, 0.7152, 0.0722))));
}
