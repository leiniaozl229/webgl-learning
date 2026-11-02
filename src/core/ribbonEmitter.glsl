// 光带发射器：同一个发射点陆续放出多条光带，每条有自己的走向、宽度、扭转和生命周期。
// 单条光带的画法与可控光带相同：亮边曲线 + N 条发光细线，细线间距 tᵞ。
// 每条光带的控制点在它自己的局部坐标里：原点在根部，x 沿发射方向，所以 x 递增的要求只在局部成立，方向可以任意。
#define MAX_RIBBONS 8

uniform int u_count;
uniform vec2 u_points[MAX_RIBBONS * 5]; // 第 k 条光带的五个控制点位于 [k*5, k*5+4]，局部坐标
uniform vec4 u_frame[MAX_RIBBONS];      // xy = 根部位置（场景坐标），zw = 发射方向 (cos, sin)
uniform vec4 u_form[MAX_RIBBONS];       // x = 长度，y = 宽度（带符号：向哪一侧铺开），z = 扭转圈数，w = 扭转相位
uniform vec4 u_life[MAX_RIBBONS];       // x = 亮度，y = 生长到的位置（头），z = 回缩到的位置（尾），w = 色相偏移
uniform vec4 u_traits[MAX_RIBBONS];     // 出生时抽定、跟着光带走的特征（不能用数组下标，老光带消失后下标会整体前移）：
                                        // x = 相位，y = 亮线强度倍数，z = 亮线宽度倍数，w = 宽度起伏幅度
uniform vec4 u_layers;                  // x = 层数，y = 亮边集中度 gamma，z = 柔和度，w = 光面平滑
uniform vec4 u_look;                    // x = 亮边色相，y = 光面色相，z = 外缘渐隐，w = 根部收窄
uniform vec3 u_source;                  // xy = 发射点，z = 发射点光晕
uniform vec3 u_bgFrom;                  // 背景渐变起点颜色（显示空间，与 CSS 颜色相同）
uniform vec3 u_bgTo;                    // 背景渐变终点颜色
uniform vec4 u_bgShape;                 // x = 类型（0 纯色，1 线性，2 径向），y = 线性角度（弧度），zw = 径向中心
uniform float u_bgRadius;               // 径向渐变半径（场景单位）
uniform vec4 u_edge;                    // x = 亮线强度，y = 亮线半宽（场景单位），z = 各条亮线的强弱差异，w = 亮边沿长度的明暗变化
// 逐层只和层号有关的量由 CPU 每帧算好一次，像素里不再重复算 pow、sin 和 OKLCH：
// u_layerShape[i] = (tᵞ, 细线间距系数, 丝纹 0.08t·cos 7t, 丝纹 0.08t·sin 7t)；
// u_palette 第 k 行第 i 列 = 第 k 条光带第 i 层的颜色（已乘外缘渐隐与柔和度），a = 亮边权重 (1 − t)²；第 48 列是亮线颜色。
uniform vec4 u_layerShape[48];
uniform highp sampler2D u_palette;

// 切线斜率限制在 ±1.5 以内：相邻点靠得很近时 Catmull-Rom 切线会变得很陡，曲线在两点之间甩出钩子。
float tangentAt(int base, int i) {
  int a = max(i - 1, 0), b = min(i + 1, 4);
  return clamp((u_points[base + b].y - u_points[base + a].y) / (u_points[base + b].x - u_points[base + a].x), -1.5, 1.5);
}

// 与可控光带相同的 Hermite 插值，只是从数组的第 base 个元素开始读五个点。
float edgeCurve(int base, float x, out float slope) {
  vec2 first = u_points[base], last = u_points[base + 4];
  if (x <= first.x) { slope = tangentAt(base, 0); return first.y + slope * (x - first.x); }
  if (x >= last.x) { slope = tangentAt(base, 4); return last.y + slope * (x - last.x); }
  for (int i = 0; i < 4; ++i) {
    vec2 p0 = u_points[base + i], p1 = u_points[base + i + 1];
    if (x > p1.x) continue;
    float h = p1.x - p0.x, t = (x - p0.x) / h;
    float m0 = tangentAt(base, i) * h, m1 = tangentAt(base, i + 1) * h;
    float t2 = t * t, t3 = t2 * t;
    slope = ((6.0 * t2 - 6.0 * t) * p0.y + (3.0 * t2 - 4.0 * t + 1.0) * m0 + (6.0 * t - 6.0 * t2) * p1.y + (3.0 * t2 - 2.0 * t) * m1) / h;
    return (2.0 * t3 - 3.0 * t2 + 1.0) * p0.y + (t3 - 2.0 * t2 + t) * m0 + (-2.0 * t3 + 3.0 * t2) * p1.y + (t3 - t2) * m1;
  }
  slope = 0.0;
  return last.y;
}

vec3 ribbon(int k, vec2 p) {
  vec4 frame = u_frame[k], form = u_form[k], life = u_life[k], traits = u_traits[k];
  // 转到这条光带的局部坐标：x 沿发射方向，y 垂直于它。
  vec2 q = p - frame.xy;
  vec2 local = vec2(dot(q, frame.zw), dot(q, vec2(-frame.w, frame.z)));
  float u = local.x / form.x;
  // 头尾之外没有光、或者刚出生 / 将消失时整条为零，直接跳过，省下整组细线的循环。
  if (life.x <= 0.0 || u < life.z - 0.1 || u > life.y + 0.05) return vec3(0.0);

  float slope;
  float centre = edgeCurve(k * 5, local.x, slope);
  // 宽度：根部收窄；生长中的头部也收成尖，像从发射点被拉出来。
  float width = form.y * mix(1.0 - u_look.w, 1.0, smoothstep(0.0, 0.4, u)) * mix(0.25, 1.0, smoothstep(0.0, 0.3, life.y - u));
  // 宽度起伏：两段不同波长的正弦相加，沿光带一段宽一段窄，并缓慢向末端流动。根部不参与，发射点保持收拢。
  float swell = 0.6 * sin(u * 5.0 - u_time * 0.5 + traits.x) + 0.4 * sin(u * 11.0 - u_time * 0.7 - traits.x * 2.0);
  width *= max(1.0 + traits.w * swell * smoothstep(0.0, 0.25, u), 0.15);
  float offset = local.y - centre;
  // 细线沿竖直方向偏移，曲线倾斜时垂直宽度会变成 宽度 × cos。按 √(1 + 斜率²) 放大竖直偏移，
  // 光带在陡的地方保持同样粗细，不会被压扁。
  float perpendicular = inversesqrt(1.0 + slope * slope);
  float lift = width / perpendicular;
  // 离光带太远的像素贡献很小，用平滑窗口收掉，避免硬切出一条线。
  float window = 1.0 - smoothstep(abs(lift) + 0.15, abs(lift) + 0.3, abs(offset));
  if (window <= 0.0) return vec3(0.0);

  float twist = cos(form.z * TAU * u - form.w);
  // 亮边沿长度的明暗：三段波长不同的正弦叠加，按场景长度取频率，长短光带的亮段一样密。
  // smoothstep 把大部分区段压暗，只留下几段高光，高光顺着光带缓慢滑动。
  float wave = 0.55 * sin(local.x * 4.1 - u_time * 0.9 + traits.x)
             + 0.3 * sin(local.x * 9.3 + u_time * 0.6 + traits.x * 2.1)
             + 0.15 * sin(local.x * 1.7 - u_time * 0.3 + traits.x * 0.7);
  float highlight = smoothstep(-0.5, 0.85, wave);
  highlight = 0.15 + 1.7 * highlight * highlight;
  // 明暗只作用在亮边附近的层上，越往光面外侧越弱：光面保持连贯，亮边一段亮一段暗。
  float vary = (highlight - 1.0) * u_edge.w;
  // 丝纹 0.08t·sin(A + 7t) 拆成 sin A·cos 7t + cos A·sin 7t，每个像素只算一次 sin A 与 cos A。
  float silk = local.x * 3.3 + u_time * 0.9 + traits.x;
  float silkSin = sin(silk), silkCos = cos(silk);
  float liftTwist = lift * twist;
  float glowScale = u_layers.w * abs(width * twist);
  vec3 light = vec3(0.0);
  for (int i = 0; i < 48; ++i) {
    if (float(i) >= u_layers.x) break;
    vec4 shape = u_layerShape[i];
    vec4 tint = texelFetch(u_palette, ivec2(i, k), 0);
    float d = (offset - liftTwist * (shape.x + shape.z * silkSin + shape.w * silkCos)) * perpendicular;
    float glow = max(u_layers.z, glowScale * shape.y);
    light += tint.rgb * (1.0 + vary * tint.a) * glow / (d * d + glow * glow);
  }
  // 亮线：沿亮边再叠一条高斯衰减的细线。倒数衰减尾巴很长，亮边总带着一圈晕；
  // 高斯在半宽之外迅速归零，给出锐利的高光边。半宽至少 0.8 像素，降分辨率时也不会闪烁。
  float d0 = offset * perpendicular;
  float sigma = max(u_edge.y * traits.z, 0.8 / u_resolution.y);
  // 亮线跟随同一组明暗：高光段又亮又锐，暗段几乎只剩柔和的光面。
  float gain = u_edge.x * traits.y * mix(1.0, highlight, u_edge.w);
  vec3 core = texelFetch(u_palette, ivec2(48, k), 0).rgb * gain * exp(-d0 * d0 / (sigma * sigma));
  // 头部：生长的前沿柔和地淡出；尾部：回缩时从根部开始消失；根部之前不发光。
  float along = smoothstep(life.z - 0.06, life.z + 0.12, u) * (1.0 - smoothstep(life.y - 0.15, life.y + 0.02, u)) * smoothstep(-0.03, 0.05, u);
  return (light * 6.0 / u_layers.x + core) * along * window * life.x;
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

// 底色越亮，越按覆盖率合成；深色处仍直接相加，光带在暗底上保持通透。
float backgroundCover(vec2 p) {
  return smoothstep(0.25, 0.75, dot(background(p), vec3(0.2126, 0.7152, 0.0722)));
}

void main() {
  vec2 p = sceneCoord();
  vec3 light = vec3(0.0);
  for (int k = 0; k < MAX_RIBBONS; ++k) {
    if (k >= u_count) break;
    light += ribbon(k, p);
  }
  // 发射点光晕：所有光带共享的根。
  vec2 r = p - u_source.xy;
  light += oklch(0.88, 0.1, u_look.x) * u_source.z * 0.002 / (dot(r, r) + 0.002);
  presentOver(light, background(p), backgroundCover(p));
}
