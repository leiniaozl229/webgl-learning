// 对照：OpenShaders 式折叠光丝，参数取自清华页面。光带形状由坐标迭代产生，无法直接指定。
const float SPREAD = 0.12, TILT = 1.978, PHASE = 3.538, SCALE = 0.54;
const vec2 CENTRE = vec2(0.89, -0.97), FREQUENCY = vec2(0.533, 2.258);

void main() {
  vec2 p = sceneCoord() / SCALE;
  float t = u_time * 0.45 + PHASE;
  float breath = 0.5 + 0.22 * sin(u_time * 0.48);
  vec2 q = (p - CENTRE) * (1.08 - 0.08 * breath);
  q = mat2(cos(TILT), sin(TILT), -sin(TILT), cos(TILT)) * q;
  mat2 fold = mat2(cos(2.13), sin(2.13), -0.964, cos(2.13));
  vec3 light = vec3(0.0);
  for (int i = 0; i < 96; ++i) {
    float layer = float(i + 1);
    q.x -= sin(q.y * FREQUENCY.x + t + layer * 0.007) * 0.13 * 1.12;
    q.y -= sin(q.x * FREQUENCY.y - t + layer * 0.02) * 0.028 * 1.12;
    q = fold * q * 0.953;
    vec2 local = q - vec2(0.35 + breath * 0.1, 0.0);
    vec2 stretched = local * vec2(2.1, 0.31);
    float glow = 0.0021 / (dot(stretched, stretched) + 0.0018);
    glow *= 0.45 * exp2(-length(q) * 0.36);
    float k = 0.5 + 0.5 * sin(layer * 0.16 + t * 1.2 + length(q) * 1.8);
    light += glow * oklch(0.56 + 0.2 * k, 0.13, 0.764 + SPREAD * k);
  }
  present(light * 3.0);
}
