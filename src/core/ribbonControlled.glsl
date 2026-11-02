// 可控光带：一条由控制点决定的亮边曲线，向一侧铺开 N 条发光细线。
// 细线在亮边附近挤在一起，叠成亮边；向外散开，叠成柔光面。每条细线都用 OpenShaders 的光斑衰减。
uniform vec2 u_points[5];  // 亮边曲线的控制点，x 从左到右递增
uniform vec4 u_shape;      // x = 宽度，y = 根部收窄，z = 末端收窄，w = 扭转圈数
uniform vec4 u_layers;     // x = 层数，y = 亮边集中度 gamma，z = 柔和度，w = 层间流动
uniform vec4 u_colors;     // x = 亮边色相，y = 光面色相，z = 根部光点，w = 摆动
uniform vec4 u_motion;     // x = 扭转流速，y = 宽度呼吸，z = 光面平滑，w = 外缘渐隐
uniform float u_mirror;    // 1 = 在亮边另一侧再铺一片副光带

// 亮边曲线 y = C(x)：分段三次 Hermite 插值，切线取相邻两点连线的斜率（Catmull-Rom）。
// 两端之外按端点切线直线延伸。同时返回斜率，用于把竖直差换成垂直距离。
float tangentAt(int i) {
  int a = max(i - 1, 0), b = min(i + 1, 4);
  return (u_points[b].y - u_points[a].y) / (u_points[b].x - u_points[a].x);
}

float edgeCurve(float x, out float slope) {
  if (x <= u_points[0].x) { slope = tangentAt(0); return u_points[0].y + slope * (x - u_points[0].x); }
  if (x >= u_points[4].x) { slope = tangentAt(4); return u_points[4].y + slope * (x - u_points[4].x); }
  for (int i = 0; i < 4; ++i) {
    vec2 p0 = u_points[i], p1 = u_points[i + 1];
    if (x > p1.x) continue;
    float h = p1.x - p0.x, t = (x - p0.x) / h;
    float m0 = tangentAt(i) * h, m1 = tangentAt(i + 1) * h;
    float t2 = t * t, t3 = t2 * t;
    slope = ((6.0 * t2 - 6.0 * t) * p0.y + (3.0 * t2 - 4.0 * t + 1.0) * m0 + (6.0 * t - 6.0 * t2) * p1.y + (3.0 * t2 - 2.0 * t) * m1) / h;
    return (2.0 * t3 - 3.0 * t2 + 1.0) * p0.y + (t3 - 2.0 * t2 + t) * m0 + (-2.0 * t3 + 3.0 * t2) * p1.y + (t3 - t2) * m1;
  }
  slope = 0.0;
  return u_points[4].y;
}

// 宽度沿长度变化：根部收窄、中段展开、末端再收。
float ribbonWidth(float u) {
  return u_shape.x * mix(1.0 - u_shape.y, 1.0, smoothstep(0.0, 0.45, u)) * mix(1.0, 1.0 - u_shape.z, smoothstep(0.55, 1.0, u));
}

// 第 t 层的颜色：t = 0 是亮边（更亮、更白），t = 1 是光面外侧。
vec3 layerColor(float t, float hueShift) {
  return oklch(mix(0.82, 0.6, t), mix(0.09, 0.16, t), mix(u_colors.x, u_colors.y, t) + hueShift);
}

// 一片光带：side = 1 向上铺开，-1 向下。返回累加的光。
vec3 sheet(vec2 p, float centre, float slope, float u, float side, float phase) {
  // 呼吸：宽度的起伏从根部向末端传播。
  float width = ribbonWidth(u) * (1.0 + u_motion.y * sin(u_time * 0.8 - u * 3.0 + phase)) * side;
  // 扭转：横向偏移按 cos 投影。cos 接近 0 处所有细线挤到亮边上，形成一个亮结。
  // 角度减去 时间 × 流速，亮结顺着光带向末端流动。
  float twist = cos(u_shape.w * TAU * u - u_time * u_motion.x + 0.6 * sin(u_time * 0.5 + phase));
  float perpendicular = inversesqrt(1.0 + slope * slope);
  int count = int(u_layers.x);
  vec3 light = vec3(0.0);
  for (int i = 0; i < 64; ++i) {
    if (i >= count) break;
    float t = (float(i) + 0.5) / u_layers.x;
    // gamma > 1：t 小的细线间距很小，挤在亮边附近；t 大的间距变大，铺成柔光面。
    float s = pow(t, u_layers.y);
    // 层间流动：每层带一点独立的波动，光面内部出现丝状明暗，亮边几乎不动。
    s += u_layers.w * 0.15 * t * sin(p.x * 3.3 + u_time * 0.9 + t * 7.0 + phase);
    float d = (p.y - (centre + width * s * twist)) * perpendicular;
    // 本层与下一层的间距 = |宽度 × 扭转| × ds/dt × (1/层数)。光面外侧间距大，发光半径盖不住就会露出一根根细线。
    float spacing = abs(width * twist) * u_layers.y * pow(max(t, 0.5 / u_layers.x), u_layers.y - 1.0) / u_layers.x;
    // 发光半径至少取间距的若干倍，相邻细线一定重叠；亮边附近间距很小，仍用原来的柔和度，保持锐利。
    float glow = max(u_layers.z, u_motion.z * spacing);
    // 半径变大时按比例降低峰值，每条细线的总光量不变，光面明暗仍只由细线疏密决定。
    // OpenShaders 的光斑衰减：中心很亮，外围拖出长尾，亮芯和柔光来自同一个公式。
    // 外缘渐隐：t 接近 1 的外侧细线逐渐变淡，光面在外缘柔和消失，亮边一侧不受影响。
    float fade = 1.0 - smoothstep(1.0 - u_motion.w, 1.0, t);
    light += layerColor(t, phase * 0.02) * fade * (u_layers.z / glow) * glow * glow / (d * d + glow * glow);
  }
  // 按层数归一：增加层数让光面更细腻，整体亮度保持不变。
  return light * 6.0 / u_layers.x;
}

void main() {
  vec2 p = sceneCoord();
  float slope;
  float centre = edgeCurve(p.x, slope);
  float span = u_points[4].x - u_points[0].x;
  float uRaw = (p.x - u_points[0].x) / span;
  float u = clamp(uRaw, 0.0, 1.0);
  // 摆动：沿 x 传播的细小波纹，从根部流向末端；乘以 u 让根部固定。
  centre += u_colors.w * 0.04 * u * sin(p.x * 4.2 - u_time * 1.3);

  vec3 light = sheet(p, centre, slope, u, 1.0, 0.0);
  if (u_mirror > 0.5) light += 0.7 * sheet(p, centre, slope, u, -1.0, 2.3);
  // 根部之前迅速淡入，末端之后渐隐。
  light *= smoothstep(-0.03, 0.06, uRaw) * (1.0 - smoothstep(0.85, 1.1, uRaw));

  // 根部光点：同样的倒数衰减，放在第一个控制点上。
  vec2 r = p - u_points[0];
  light += oklch(0.88, 0.1, u_colors.x) * u_colors.z * 0.002 / (dot(r, r) + 0.002);
  present(light);
}
