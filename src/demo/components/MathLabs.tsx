import { RotateCcw } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { transformPoint4, translation4 } from '../../core/transforms3d';

import {
  add2,
  cross2,
  determinant2,
  dot2,
  inverse2,
  length2,
  normalize2,
  polarToCartesian,
  project2,
  radiansToDegrees,
  scale2,
  signedAngle2,
  subtract2,
  transformVector2,
  type Matrix2,
  type Vector2,
} from '../../core/mathBasics';

type Tone = 'a' | 'b' | 'result' | 'muted' | 'good' | 'bad';
type Point = readonly [number, number];

const PLANE_SIZE = 360;

function format(value: number, digits = 2) {
  const normalized = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
  return normalized.toFixed(digits);
}

function formatVector(v: Vector2) {
  return `(${format(v[0])}, ${format(v[1])})`;
}

/* ---------- 坐标平面：Y 轴向上，与裁剪空间一致 ---------- */

interface PlaneHandle {
  id: string;
  label: string;
  value: Vector2;
  tone: Tone;
  onChange: (value: Vector2) => void;
  /** 拖动时的吸附步长；0 表示连续取值（例如约束在单位圆上的点）。 */
  snap?: number;
}

interface PlaneProps {
  range: number;
  label: string;
  handles: PlaneHandle[];
  children: (toSvg: (v: Vector2) => Point, unit: number) => ReactNode;
}

function Plane({ range, label, handles, children }: PlaneProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const unit = PLANE_SIZE / (range * 2);
  const center = PLANE_SIZE / 2;
  const toSvg = (v: Vector2): Point => [center + v[0] * unit, center - v[1] * unit];
  const clamp = (value: number) => Math.max(-range, Math.min(range, value));
  const grid = Array.from({ length: range * 2 + 1 }, (_, index) => index - range);

  function applySnap(value: Vector2, snap: number): Vector2 {
    if (snap <= 0) return value;
    return [clamp(Math.round(value[0] / snap) * snap), clamp(Math.round(value[1] / snap) * snap)];
  }

  function moveFromPointer(event: PointerEvent<SVGGElement>, handle: PlaneHandle) {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    handle.onChange(applySnap([(point.x - center) / unit, (center - point.y) / unit], handle.snap ?? 0.25));
  }

  function moveFromKeyboard(event: KeyboardEvent<SVGGElement>, handle: PlaneHandle) {
    const step = event.shiftKey ? 1 : 0.25;
    const delta: Record<string, Vector2> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const offset = delta[event.key];
    if (!offset) return;
    event.preventDefault();
    handle.onChange([clamp(handle.value[0] + offset[0]), clamp(handle.value[1] + offset[1])]);
  }

  return (
    <svg ref={svgRef} className="math-plane" viewBox={`0 0 ${PLANE_SIZE} ${PLANE_SIZE}`} role="group" aria-label={label}>
      <g className="math-plane__grid" aria-hidden="true">
        {grid.map((value) => <line key={`v${value}`} x1={toSvg([value, -range])[0]} y1={0} x2={toSvg([value, range])[0]} y2={PLANE_SIZE} data-axis={value === 0 ? 'true' : undefined} />)}
        {grid.map((value) => <line key={`h${value}`} x1={0} y1={toSvg([-range, value])[1]} x2={PLANE_SIZE} y2={toSvg([range, value])[1]} data-axis={value === 0 ? 'true' : undefined} />)}
        <text x={PLANE_SIZE - 14} y={center - 6}>x</text>
        <text x={center + 6} y={14}>y</text>
      </g>
      {children(toSvg, unit)}
      {handles.map((handle) => {
        const [x, y] = toSvg(handle.value);
        return (
          <g
            key={handle.id}
            className={`math-handle math-tone--${handle.tone}`}
            tabIndex={0}
            role="button"
            aria-label={`${handle.label}，当前 ${formatVector(handle.value)}。拖动或使用方向键移动，按住 Shift 移动 1 个单位`}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); moveFromPointer(event, handle); }}
            onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) moveFromPointer(event, handle); }}
            onKeyDown={(event) => moveFromKeyboard(event, handle)}
          >
            <circle className="math-handle__hit" cx={x} cy={y} r="18" />
            <circle className="math-handle__dot" cx={x} cy={y} r="7" />
          </g>
        );
      })}
    </svg>
  );
}

function Arrow({ from, to, tone, dashed = false, width = 3 }: { from: Point; to: Point; tone: Tone; dashed?: boolean; width?: number }) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  if (length < 2) return null;
  const ux = dx / length;
  const uy = dy / length;
  const head = Math.min(11, length * 0.45);
  const baseX = to[0] - ux * head;
  const baseY = to[1] - uy * head;
  const sideX = -uy * head * 0.5;
  const sideY = ux * head * 0.5;
  return (
    <g className={`math-arrow math-tone--${tone}`} aria-hidden="true">
      <line x1={from[0]} y1={from[1]} x2={baseX} y2={baseY} strokeWidth={width} strokeDasharray={dashed ? '6 5' : undefined} />
      <polygon points={`${to[0]},${to[1]} ${baseX + sideX},${baseY + sideY} ${baseX - sideX},${baseY - sideY}`} />
    </g>
  );
}

function Label({ at, tone, children, dx = 10, dy = -10 }: { at: Point; tone: Tone; children: ReactNode; dx?: number; dy?: number }) {
  // 夹在画布内侧，靠近边缘的向量终点也能看到标签。
  const x = Math.min(Math.max(at[0] + dx, 4), PLANE_SIZE - 44);
  const y = Math.min(Math.max(at[1] + dy, 14), PLANE_SIZE - 6);
  return <text className={`math-label math-tone--${tone}`} x={x} y={y} aria-hidden="true">{children}</text>;
}

/** 从 start 方向转到 end 方向的圆弧，用来标记夹角。 */
function AngleArc({ center, radius, start, sweep, tone }: { center: Point; radius: number; start: number; sweep: number; tone: Tone }) {
  if (Math.abs(sweep) < 0.01) return null;
  const from: Point = [center[0] + Math.cos(start) * radius, center[1] - Math.sin(start) * radius];
  const to: Point = [center[0] + Math.cos(start + sweep) * radius, center[1] - Math.sin(start + sweep) * radius];
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFlag = sweep > 0 ? 0 : 1;
  return <path className={`math-arc math-tone--${tone}`} d={`M${from[0]} ${from[1]}A${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${to[0]} ${to[1]}`} aria-hidden="true" />;
}

function LabShell({ title, hint, onReset, controls, visual, readout }: { title: string; hint: string; onReset: () => void; controls: ReactNode; visual: ReactNode; readout: ReactNode }) {
  return (
    <div className="math-lab">
      <header>
        <div><strong>{title}</strong><small>{hint}</small></div>
        <button type="button" onClick={onReset}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="math-lab__body">
        <div className="math-lab__controls">{controls}</div>
        <div className="math-lab__visual">{visual}</div>
      </div>
      <div className="math-lab__readout" aria-live="polite">{readout}</div>
    </div>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div className="math-lab__segmented" role="group" aria-label={label}>
      {options.map((option) => <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
    </div>
  );
}

function RangeInput({ label, value, min, max, step, display, onChange }: { label: string; value: number; min: number; max: number; step: number; display?: string; onChange: (value: number) => void }) {
  return (
    <label className="math-lab__range">
      <span>{label}<code>{display ?? format(value)}</code></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Readout({ rows }: { rows: Array<{ label: ReactNode; value: ReactNode; tone?: Tone }> }) {
  return <dl className="math-readout">{rows.map((row, index) => <div key={index} className={row.tone ? `math-tone--${row.tone}` : undefined}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>;
}

/* ---------- 1. 向量运算 ---------- */

type VectorOperation = 'add' | 'subtract' | 'scale' | 'normalize';

const operationFormula: Record<VectorOperation, string> = {
  add: 'a + b = (aₓ + bₓ, aᵧ + bᵧ)',
  subtract: 'a − b = (aₓ − bₓ, aᵧ − bᵧ)',
  scale: 'k · a = (k·aₓ, k·aᵧ)',
  normalize: 'normalize(a) = a / |a|',
};

const operationHint: Record<VectorOperation, string> = {
  add: '把 b 的起点接到 a 的终点，结果从原点指向最终到达的位置。',
  subtract: 'a − b 从 b 的终点指向 a 的终点，和“终点减起点”的规则一致。',
  scale: 'k 大于 1 拉长，介于 0 与 1 之间缩短，小于 0 时方向反转。',
  normalize: '结果落在单位圆上：方向与 a 相同，长度固定为 1。',
};

export function VectorLab() {
  const initialA: Vector2 = [2, 1];
  const initialB: Vector2 = [-1, 2];
  const [a, setA] = useState<Vector2>(initialA);
  const [b, setB] = useState<Vector2>(initialB);
  const [operation, setOperation] = useState<VectorOperation>('add');
  const [k, setK] = useState(1.5);

  const result: Vector2 | null = operation === 'add' ? add2(a, b)
    : operation === 'subtract' ? subtract2(a, b)
      : operation === 'scale' ? scale2(a, k)
        : normalize2(a);
  const usesB = operation === 'add' || operation === 'subtract';

  const handles: PlaneHandle[] = [{ id: 'a', label: '向量 a 的终点', value: a, tone: 'a', onChange: setA }];
  if (usesB) handles.push({ id: 'b', label: '向量 b 的终点', value: b, tone: 'b', onChange: setB });

  return (
    <LabShell
      title="Vector Lab"
      hint="拖动彩色圆点改变向量终点，切换运算观察几何含义"
      onReset={() => { setA(initialA); setB(initialB); setK(1.5); }}
      controls={(
        <>
          <Segmented label="向量运算" value={operation} onChange={setOperation} options={[{ value: 'add', label: 'a + b' }, { value: 'subtract', label: 'a − b' }, { value: 'scale', label: 'k · a' }, { value: 'normalize', label: '单位化' }]} />
          {operation === 'scale' ? <RangeInput label="标量 k" value={k} min={-2} max={2} step={0.25} onChange={setK} /> : null}
          <p className="math-lab__formula"><code>{operationFormula[operation]}</code></p>
          <p className="math-lab__hint">{operationHint[operation]}</p>
        </>
      )}
      visual={(
        <Plane range={4} label="向量运算坐标平面" handles={handles}>
          {(toSvg, unit) => {
            const origin = toSvg([0, 0]);
            return (
              <>
                {operation === 'normalize' ? <circle className="math-unit-circle" cx={origin[0]} cy={origin[1]} r={unit} /> : null}
                {operation === 'add' ? <><Arrow from={origin} to={toSvg(b)} tone="muted" dashed width={2} /><Arrow from={toSvg(a)} to={toSvg(add2(a, b))} tone="b" /></> : null}
                {operation === 'subtract' ? <><Arrow from={origin} to={toSvg(result ?? [0, 0])} tone="muted" dashed width={2} /><Arrow from={toSvg(b)} to={toSvg(a)} tone="result" /></> : null}
                <Arrow from={origin} to={toSvg(a)} tone="a" />
                {operation === 'subtract' ? <Arrow from={origin} to={toSvg(b)} tone="b" /> : null}
                {(operation === 'add' || operation === 'scale' || operation === 'normalize') && result ? <Arrow from={origin} to={toSvg(result)} tone="result" /> : null}
                <Label at={toSvg(a)} tone="a">a</Label>
                {usesB ? <Label at={toSvg(b)} tone="b">b</Label> : null}
                {result && operation !== 'subtract' ? <Label at={toSvg(result)} tone="result" dy={18}>{operation === 'add' ? 'a+b' : operation === 'scale' ? 'k·a' : 'â'}</Label> : null}
                {operation === 'subtract' ? <Label at={toSvg(result ?? [0, 0])} tone="muted" dy={18}>a−b</Label> : null}
              </>
            );
          }}
        </Plane>
      )}
      readout={(
        <Readout rows={[
          { label: 'a', value: `${formatVector(a)} · |a| = ${format(length2(a))}`, tone: 'a' },
          ...(usesB ? [{ label: 'b', value: `${formatVector(b)} · |b| = ${format(length2(b))}`, tone: 'b' as Tone }] : []),
          { label: '结果', value: result ? `${formatVector(result)} · 长度 ${format(length2(result))}` : '零向量没有方向，无法单位化', tone: result ? 'result' : 'bad' },
        ]} />
      )}
    />
  );
}

/* ---------- 齐次分量与平移 ---------- */

export function HomogeneousWLab() {
  const [translation, setTranslation] = useState<Vector2>([3, 2]);
  const matrix = translation4(translation[0], translation[1], 0);
  // 使用同一矩阵和相同 xyz，让第四个分量成为唯一差别。
  const point = transformPoint4(matrix, [2, 1, 0, 1]);
  const direction = transformPoint4(matrix, [2, 1, 0, 0]);
  const pointXY: Vector2 = [point[0], point[1]];
  const directionXY: Vector2 = [direction[0], direction[1]];
  const unchanged = translation[0] === 0 && translation[1] === 0;
  const format4 = (value: readonly number[]) => '(' + value.map((item) => format(item)).join(', ') + ')';

  return (
    <LabShell
      title="w 与平移"
      hint="一份平移矩阵，同时作用于 w = 1 的位置和 w = 0 的方向"
      onReset={() => setTranslation([3, 2])}
      controls={(
        <>
          <RangeInput label="X 平移量 tx" value={translation[0]} min={-3} max={3} step={0.25} onChange={(x) => setTranslation([x, translation[1]])} />
          <RangeInput label="Y 平移量 ty" value={translation[1]} min={-3} max={3} step={0.25} onChange={(y) => setTranslation([translation[0], y])} />
          <p className="math-lab__formula"><code>x′ = 2 + tx × w</code><code>y′ = 1 + ty × w</code></p>
          <p className="math-lab__hint">P′ 是平移后的圆点；d′ 是从原点出发的箭头。平移量变化时，P′ 移动，d′ 的方向和长度保持不变。</p>
        </>
      )}
      visual={(
        <Plane range={6} label="w 平移对照：位置圆点 P′ 随平移移动，方向箭头 d′ 保持不变" handles={[]}>
          {(toSvg) => (
            <>
              <Arrow from={toSvg([2, 1])} to={toSvg(pointXY)} tone="result" dashed width={2} />
              <Arrow from={toSvg([0, 0])} to={toSvg(directionXY)} tone="b" />
              <circle className="math-point math-tone--a" cx={toSvg([2, 1])[0]} cy={toSvg([2, 1])[1]} r="5" />
              <circle className="math-point math-tone--result" cx={toSvg(pointXY)[0]} cy={toSvg(pointXY)[1]} r="7" />
              {!unchanged && <Label at={toSvg([2, 1])} tone="a" dy={24}>P</Label>}
              <Label at={toSvg(pointXY)} tone="result" dy={24}>{unchanged ? 'P′ = P' : 'P′'}</Label>
              <Label at={toSvg(directionXY)} tone="b" dy={-14}>d′ = d</Label>
            </>
          )}
        </Plane>
      )}
      readout={(
        <Readout rows={[
          { label: '位置输入 P · w = 1', value: '(2, 1, 0, 1)', tone: 'a' },
          { label: '位置输出 P′ · 加上平移', value: format4(point), tone: 'result' },
          { label: '方向输入 d · w = 0', value: '(2, 1, 0, 0)', tone: 'b' },
          { label: '方向输出 d′ · 平移贡献为 0', value: format4(direction), tone: 'b' },
        ]} />
      )}
    />
  );
}

/* ---------- 2. 单位圆与三角函数 ---------- */

function radiansLabel(degrees: number) {
  const ratio = degrees / 180;
  if (Math.abs(ratio) < 1e-9) return '0';
  const known: Record<string, string> = { '30': 'π/6', '45': 'π/4', '60': 'π/3', '90': 'π/2', '120': '2π/3', '135': '3π/4', '150': '5π/6', '180': 'π', '210': '7π/6', '225': '5π/4', '240': '4π/3', '270': '3π/2', '300': '5π/3', '315': '7π/4', '330': '11π/6', '360': '2π' };
  return known[String(degrees)] ?? `${format(ratio, 3)}π`;
}

export function TrigLab() {
  const [degrees, setDegrees] = useState(30);
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const tangentDefined = Math.abs(cosine) > 1e-6;
  const point: Vector2 = [cosine, sine];

  function setFromDirection(value: Vector2) {
    if (length2(value) < 0.05) return;
    const angle = Math.round(radiansToDegrees(Math.atan2(value[1], value[0])));
    setDegrees((angle + 360) % 360);
  }

  const waveWidth = 320;
  const waveHeight = 150;
  const waveX = (angle: number) => 20 + angle / (Math.PI * 2) * (waveWidth - 40);
  const waveY = (value: number) => waveHeight / 2 - value * (waveHeight / 2 - 18);
  const samples = Array.from({ length: 73 }, (_, index) => index / 72 * Math.PI * 2);
  const sinePath = samples.map((angle, index) => `${index ? 'L' : 'M'}${waveX(angle)} ${waveY(Math.sin(angle))}`).join('');
  const cosinePath = samples.map((angle, index) => `${index ? 'L' : 'M'}${waveX(angle)} ${waveY(Math.cos(angle))}`).join('');

  return (
    <LabShell
      title="Unit Circle Lab"
      hint="拖动圆上的点或滑块，观察同一个角度在圆和波形上的位置"
      onReset={() => setDegrees(30)}
      controls={(
        <>
          <RangeInput label="角度 θ" value={degrees} min={0} max={360} step={1} display={`${degrees}°`} onChange={setDegrees} />
          <div className="math-lab__chips" role="group" aria-label="常用角度">
            {[0, 30, 45, 90, 135, 180, 270].map((value) => <button type="button" key={value} aria-pressed={degrees === value} onClick={() => setDegrees(value)}>{value}°</button>)}
          </div>
          <svg className="math-wave" viewBox={`0 0 ${waveWidth} ${waveHeight}`} role="img" aria-label={`sin 与 cos 在 0 到 2π 之间的波形，当前角度 ${degrees}°`}>
            <line className="math-wave__axis" x1="20" y1={waveY(0)} x2={waveWidth - 20} y2={waveY(0)} />
            <path className="math-wave__curve math-tone--a" d={cosinePath} />
            <path className="math-wave__curve math-tone--b" d={sinePath} />
            <line className="math-wave__marker" x1={waveX(radians)} y1="8" x2={waveX(radians)} y2={waveHeight - 8} />
            <circle className="math-tone--a math-wave__dot" cx={waveX(radians)} cy={waveY(cosine)} r="4.5" />
            <circle className="math-tone--b math-wave__dot" cx={waveX(radians)} cy={waveY(sine)} r="4.5" />
            <text x="22" y={waveHeight - 4}>0</text><text x={waveX(Math.PI) - 4} y={waveHeight - 4}>π</text><text x={waveWidth - 32} y={waveHeight - 4}>2π</text>
          </svg>
          <p className="math-lab__hint"><b className="math-tone--a">cos</b> 是圆上点的 X 分量，<b className="math-tone--b">sin</b> 是 Y 分量。把角度展开成横轴，就得到两条相差 90° 的波形。</p>
        </>
      )}
      visual={(
        <Plane range={1.5} label="单位圆" handles={[{ id: 'p', label: '单位圆上的点', value: point, tone: 'result', onChange: setFromDirection, snap: 0 }]}>
          {(toSvg, unit) => {
            const origin = toSvg([0, 0]);
            const foot = toSvg([cosine, 0]);
            const tip = toSvg(point);
            return (
              <>
                <circle className="math-unit-circle" cx={origin[0]} cy={origin[1]} r={unit} />
                <AngleArc center={origin} radius={unit * 0.28} start={0} sweep={radians} tone="result" />
                <line className="math-segment math-tone--a" x1={origin[0]} y1={origin[1]} x2={foot[0]} y2={foot[1]} />
                <line className="math-segment math-tone--b" x1={foot[0]} y1={foot[1]} x2={tip[0]} y2={tip[1]} />
                <Arrow from={origin} to={tip} tone="result" />
                <Label at={[(origin[0] + foot[0]) / 2, foot[1]]} tone="a" dx={-12} dy={cosine * sine >= 0 ? 18 : -8}>cos</Label>
                <Label at={[foot[0], (foot[1] + tip[1]) / 2]} tone="b" dx={cosine >= 0 ? 8 : -30} dy={4}>sin</Label>
                <Label at={origin} tone="result" dx={Math.cos(radians / 2) * unit * 0.42 - 4} dy={-Math.sin(radians / 2) * unit * 0.42 + 5}>θ</Label>
              </>
            );
          }}
        </Plane>
      )}
      readout={(
        <Readout rows={[
          { label: '角度 → 弧度', value: `${degrees}° = ${radiansLabel(degrees)} ≈ ${format(radians, 3)} rad`, tone: 'result' },
          { label: 'cos θ', value: format(cosine, 3), tone: 'a' },
          { label: 'sin θ', value: format(sine, 3), tone: 'b' },
          { label: 'tan θ = sin / cos', value: tangentDefined ? format(sine / cosine, 3) : '未定义（cos = 0）' },
          { label: 'sin² + cos²', value: format(sine * sine + cosine * cosine, 3) },
        ]} />
      )}
    />
  );
}

/* ---------- 3. 点积与投影 ---------- */

export function DotLab() {
  const initialA: Vector2 = [3, 0.5];
  const initialB: Vector2 = [1.5, 2.25];
  const [a, setA] = useState<Vector2>(initialA);
  const [b, setB] = useState<Vector2>(initialB);
  const dot = dot2(a, b);
  const lengthA = length2(a);
  const lengthB = length2(b);
  const valid = lengthA > 1e-6 && lengthB > 1e-6;
  const cosine = valid ? dot / (lengthA * lengthB) : 0;
  const angle = valid ? radiansToDegrees(Math.acos(Math.max(-1, Math.min(1, cosine)))) : 0;
  const projection = project2(b, a);
  const relation = !valid ? '零向量没有方向' : Math.abs(cosine) < 0.02 ? '接近垂直：点积 ≈ 0' : dot > 0 ? '夹角小于 90°：点积为正' : '夹角大于 90°：点积为负';
  const diffuse = Math.max(cosine, 0);

  return (
    <LabShell
      title="Dot Product Lab"
      hint="拖动 a、b，观察投影长度、夹角和点积符号"
      onReset={() => { setA(initialA); setB(initialB); }}
      controls={(
        <>
          <p className="math-lab__formula"><code>a · b = aₓbₓ + aᵧbᵧ</code><code>= |a| |b| cos θ</code></p>
          <p className="math-lab__hint">浅色区域是与 a 方向“同侧”的半平面：b 的终点落在这里时点积为正，落在分界线上时为 0。</p>
          <div className="math-lab__lighting">
            <span className="math-lab__swatch" style={{ '--brightness': diffuse } as CSSProperties} aria-hidden="true" />
            <p>把 <b className="math-tone--a">a</b> 看作表面法线 N、<b className="math-tone--b">b</b> 看作指向光源的方向 L：漫反射强度 <code>max(cos θ, 0) = {format(diffuse)}</code></p>
          </div>
        </>
      )}
      visual={(
        <Plane range={4} label="点积坐标平面" handles={[{ id: 'a', label: '向量 a 的终点', value: a, tone: 'a', onChange: setA }, { id: 'b', label: '向量 b 的终点', value: b, tone: 'b', onChange: setB }]}>
          {(toSvg, unit) => {
            const origin = toSvg([0, 0]);
            const direction = normalize2(a);
            const halfPlane = direction ? (() => {
              const big = 20;
              const perpendicular: Vector2 = [-direction[1] * big, direction[0] * big];
              const along = scale2(direction, big);
              return [perpendicular, add2(perpendicular, along), add2(scale2(perpendicular, -1), along), scale2(perpendicular, -1)].map((v) => toSvg(v).join(',')).join(' ');
            })() : null;
            const angleA = Math.atan2(a[1], a[0]);
            return (
              <>
                {halfPlane ? <polygon className="math-half-plane" points={halfPlane} /> : null}
                {direction ? <line className="math-divider" x1={toSvg([-direction[1] * 20, direction[0] * 20])[0]} y1={toSvg([-direction[1] * 20, direction[0] * 20])[1]} x2={toSvg([direction[1] * 20, -direction[0] * 20])[0]} y2={toSvg([direction[1] * 20, -direction[0] * 20])[1]} /> : null}
                {valid ? <AngleArc center={origin} radius={unit * 0.6} start={angleA} sweep={signedAngle2(a, b)} tone="muted" /> : null}
                {projection ? <line className="math-dashed" x1={toSvg(b)[0]} y1={toSvg(b)[1]} x2={toSvg(projection)[0]} y2={toSvg(projection)[1]} /> : null}
                <Arrow from={origin} to={toSvg(a)} tone="a" />
                <Arrow from={origin} to={toSvg(b)} tone="b" />
                {projection ? <Arrow from={origin} to={toSvg(projection)} tone="result" width={5} /> : null}
                <Label at={toSvg(a)} tone="a">a</Label>
                <Label at={toSvg(b)} tone="b">b</Label>
                {projection && length2(projection) > 0.4 ? <Label at={toSvg(projection)} tone="result" dx={-10} dy={22}>投影</Label> : null}
              </>
            );
          }}
        </Plane>
      )}
      readout={(
        <Readout rows={[
          { label: 'a · b', value: `${format(a[0])}×${format(b[0])} + ${format(a[1])}×${format(b[1])} = ${format(dot)}`, tone: 'result' },
          { label: '|a| |b| cos θ', value: `${format(lengthA)} × ${format(lengthB)} × ${format(cosine, 3)} = ${format(lengthA * lengthB * cosine)}` },
          { label: '夹角 θ', value: `${format(angle, 1)}°` },
          { label: '关系', value: relation, tone: !valid ? 'bad' : dot >= 0 ? 'good' : 'bad' },
        ]} />
      )}
    />
  );
}

/* ---------- 4. 叉积与三角形绕序 ---------- */

export function WindingLab() {
  const initial: [Vector2, Vector2, Vector2] = [[-2.5, -1.75], [2.5, -1.25], [0, 2.5]];
  const [vertices, setVertices] = useState<[Vector2, Vector2, Vector2]>(initial);
  const [cullEnabled, setCullEnabled] = useState(true);
  const edge1 = subtract2(vertices[1], vertices[0]);
  const edge2 = subtract2(vertices[2], vertices[0]);
  const cross = cross2(edge1, edge2);
  const winding = Math.abs(cross) < 1e-6 ? 'degenerate' : cross > 0 ? 'ccw' : 'cw';
  const culled = winding === 'degenerate' || (cullEnabled && winding === 'cw');

  function update(index: 0 | 1 | 2, value: Vector2) {
    setVertices((current) => {
      const next: [Vector2, Vector2, Vector2] = [...current];
      next[index] = value;
      return next;
    });
  }

  const status = winding === 'degenerate' ? '三个点共线：面积为 0，不产生片段'
    : winding === 'ccw' ? '逆时针 CCW → 正面（frontFace 默认 CCW）'
      : cullEnabled ? '顺时针 CW → 背面，被 CULL_FACE 丢弃' : '顺时针 CW → 背面，未启用剔除，仍会绘制';

  return (
    <LabShell
      title="Winding Lab"
      hint="拖动三个顶点，观察二维叉积的符号怎样决定正面与背面"
      onReset={() => { setVertices(initial); setCullEnabled(true); }}
      controls={(
        <>
          <p className="math-lab__formula"><code>e₁ = v₁ − v₀，e₂ = v₂ − v₀</code><code>cross(e₁, e₂) = e₁ₓe₂ᵧ − e₁ᵧe₂ₓ</code></p>
          <label className="math-lab__toggle">
            <input type="checkbox" checked={cullEnabled} onChange={(event) => setCullEnabled(event.target.checked)} />
            <span><strong>gl.enable(gl.CULL_FACE)</strong><small>cullFace 保持默认 BACK</small></span>
          </label>
          <button type="button" className="math-lab__action" onClick={() => setVertices(([v0, v1, v2]) => [v0, v2, v1])}>交换 v₁ 与 v₂（翻转绕序）</button>
          <p className="math-lab__hint">叉积为正表示从 v₀ 看去，v₂ 在 e₁ 的逆时针一侧。它的一半就是三角形的有向面积。</p>
        </>
      )}
      visual={(
        <Plane range={4} label="三角形绕序坐标平面" handles={vertices.map((vertex, index) => ({ id: `v${index}`, label: `顶点 v${index}`, value: vertex, tone: 'result' as Tone, onChange: (value: Vector2) => update(index as 0 | 1 | 2, value) }))}>
          {(toSvg) => {
            const points = vertices.map(toSvg);
            const centroid: Point = [(points[0][0] + points[1][0] + points[2][0]) / 3, (points[0][1] + points[1][1] + points[2][1]) / 3];
            return (
              <>
                <polygon className="math-triangle" data-state={culled ? 'culled' : 'front'} data-winding={winding} points={points.map((p) => p.join(',')).join(' ')} />
                {points.map((point, index) => {
                  const next = points[(index + 1) % 3];
                  const start: Point = [point[0] + (next[0] - point[0]) * 0.3, point[1] + (next[1] - point[1]) * 0.3];
                  const end: Point = [point[0] + (next[0] - point[0]) * 0.7, point[1] + (next[1] - point[1]) * 0.7];
                  return <Arrow key={index} from={start} to={end} tone={winding === 'cw' ? 'bad' : 'good'} width={2.5} />;
                })}
                {points.map((point, index) => {
                  const dx = point[0] - centroid[0];
                  const dy = point[1] - centroid[1];
                  const len = Math.hypot(dx, dy) || 1;
                  return <text key={index} className="math-label math-tone--result" x={point[0] + dx / len * 20 - 7} y={point[1] + dy / len * 20 + 5} aria-hidden="true">v{index}</text>;
                })}
                <text className="math-label math-tone--muted" x={centroid[0] - 18} y={centroid[1] + 5} aria-hidden="true">{winding === 'ccw' ? '↺ CCW' : winding === 'cw' ? '↻ CW' : '—'}</text>
              </>
            );
          }}
        </Plane>
      )}
      readout={(
        <Readout rows={[
          { label: 'cross(e₁, e₂)', value: `${format(edge1[0])}×${format(edge2[1])} − ${format(edge1[1])}×${format(edge2[0])} = ${format(cross)}`, tone: 'result' },
          { label: '有向面积', value: format(cross / 2) },
          { label: '光栅化结果', value: status, tone: culled ? 'bad' : 'good' },
        ]} />
      )}
    />
  );
}

/* ---------- 5. 行列式与逆矩阵 ---------- */

type DeterminantPreset = 'identity' | 'rotate' | 'scale' | 'shear' | 'mirror' | 'collapse';

const determinantPresets: Record<DeterminantPreset, { label: string; x: Vector2; y: Vector2 }> = {
  identity: { label: '单位', x: [1, 0], y: [0, 1] },
  rotate: { label: '旋转', x: [0.75, 0.75], y: [-0.75, 0.75] },
  scale: { label: '缩放', x: [2, 0], y: [0, 0.75] },
  shear: { label: '错切', x: [1, 0], y: [1, 1] },
  mirror: { label: '镜像', x: [-1.25, 0], y: [0, 1] },
  collapse: { label: '压扁', x: [1, 0.5], y: [2, 1] },
};

export function DeterminantLab() {
  const [xAxis, setXAxis] = useState<Vector2>(determinantPresets.shear.x);
  const [yAxis, setYAxis] = useState<Vector2>(determinantPresets.shear.y);
  const matrix: Matrix2 = [xAxis[0], xAxis[1], yAxis[0], yAxis[1]];
  const det = determinant2(matrix);
  const inverse = inverse2(matrix);
  const state = Math.abs(det) < 1e-6 ? 'singular' : det < 0 ? 'mirrored' : 'normal';
  const status = state === 'singular' ? '平面被压成一条线，信息丢失，不存在逆矩阵'
    : state === 'mirrored' ? '面积为负：图形被镜像，三角形绕序也会翻转'
      : `面积变为原来的 ${format(det)} 倍，可以撤销`;

  function applyPreset(preset: DeterminantPreset) {
    setXAxis(determinantPresets[preset].x);
    setYAxis(determinantPresets[preset].y);
  }

  return (
    <LabShell
      title="Determinant Lab"
      hint="拖动两列（新 X 轴、新 Y 轴），观察单位正方形的面积"
      onReset={() => applyPreset('shear')}
      controls={(
        <>
          <div className="math-lab__chips" role="group" aria-label="矩阵预设">
            {(Object.keys(determinantPresets) as DeterminantPreset[]).map((preset) => <button type="button" key={preset} onClick={() => applyPreset(preset)}>{determinantPresets[preset].label}</button>)}
          </div>
          <MatrixGrid label="M" values={[[matrix[0], matrix[2]], [matrix[1], matrix[3]]]} tones={['a', 'b']} />
          <p className="math-lab__formula"><code>det(M) = a·d − c·b</code></p>
          {inverse ? <MatrixGrid label="M⁻¹" values={[[inverse[0], inverse[2]], [inverse[1], inverse[3]]]} /> : <p className="math-lab__hint math-tone--bad">det = 0，M⁻¹ 不存在。</p>}
        </>
      )}
      visual={(
        <Plane range={3} label="行列式坐标平面" handles={[{ id: 'x', label: '第 1 列（新 X 轴）', value: xAxis, tone: 'a', onChange: setXAxis }, { id: 'y', label: '第 2 列（新 Y 轴）', value: yAxis, tone: 'b', onChange: setYAxis }]}>
          {(toSvg) => {
            const origin = toSvg([0, 0]);
            const square = [[0, 0], [1, 0], [1, 1], [0, 1]] as Vector2[];
            return (
              <>
                <polygon className="math-unit-square" points={square.map((v) => toSvg(v).join(',')).join(' ')} />
                <polygon className="math-parallelogram" data-state={state} points={square.map((v) => toSvg(transformVector2(matrix, v)).join(',')).join(' ')} />
                <Arrow from={origin} to={toSvg(xAxis)} tone="a" />
                <Arrow from={origin} to={toSvg(yAxis)} tone="b" />
                <Label at={toSvg(xAxis)} tone="a">X′</Label>
                <Label at={toSvg(yAxis)} tone="b">Y′</Label>
              </>
            );
          }}
        </Plane>
      )}
      readout={(
        <Readout rows={[
          { label: 'det(M)', value: `${format(matrix[0])}×${format(matrix[3])} − ${format(matrix[2])}×${format(matrix[1])} = ${format(det)}`, tone: 'result' },
          { label: '含义', value: status, tone: state === 'normal' ? 'good' : 'bad' },
        ]} />
      )}
    />
  );
}

function MatrixGrid({ label, values, tones }: { label: string; values: number[][]; tones?: Tone[] }) {
  return (
    <div className="math-matrix" aria-label={`${label} = ${values.map((row) => row.map((value) => format(value)).join('、')).join('；')}`}>
      <span>{label} =</span>
      <div style={{ gridTemplateColumns: `repeat(${values[0].length}, minmax(0, 1fr))` }}>
        {values.flatMap((row, rowIndex) => row.map((value, columnIndex) => <code key={`${rowIndex}-${columnIndex}`} className={tones ? `math-tone--${tones[columnIndex]}` : undefined}>{format(value)}</code>))}
      </div>
    </div>
  );
}

/* ---------- 6. 法线矩阵 ---------- */

export function NormalMatrixLab() {
  const [scaleX, setScaleX] = useState(2.25);
  const [scaleY, setScaleY] = useState(0.75);
  const [showWrong, setShowWrong] = useState(true);
  const [showCorrect, setShowCorrect] = useState(true);
  const model: Matrix2 = [scaleX, 0, 0, scaleY];
  // (M⁻¹)ᵀ：先撤销缩放，再交换行列。纯缩放矩阵的转置等于自身，这里保留完整写法对应三维公式。
  const inverse = inverse2(model);
  const normalMatrix: Matrix2 | null = inverse ? [inverse[0], inverse[2], inverse[1], inverse[3]] : null;

  const samples = Array.from({ length: 10 }, (_, index) => index / 10 * Math.PI * 2 + Math.PI / 10);
  const rows = samples.map((angle) => {
    const point = polarToCartesian(1, angle);
    const tangent: Vector2 = [-Math.sin(angle), Math.cos(angle)];
    const surfacePoint = transformVector2(model, point);
    const surfaceTangent = transformVector2(model, tangent);
    const wrong = normalize2(transformVector2(model, point));
    const correct = normalMatrix ? normalize2(transformVector2(normalMatrix, point)) : null;
    const tangentDirection = normalize2(surfaceTangent);
    const angleTo = (normal: Vector2 | null) => normal && tangentDirection ? radiansToDegrees(Math.acos(Math.min(1, Math.abs(dot2(normal, tangentDirection))))) : 90;
    return { surfacePoint, tangentDirection, wrong, correct, wrongAngle: angleTo(wrong), correctAngle: angleTo(correct) };
  });
  const worstWrong = Math.min(...rows.map((row) => row.wrongAngle));
  const worstCorrect = Math.min(...rows.map((row) => row.correctAngle));
  const ellipse = Array.from({ length: 65 }, (_, index) => transformVector2(model, polarToCartesian(1, index / 64 * Math.PI * 2)));

  return (
    <LabShell
      title="Normal Matrix Lab"
      hint="对单位圆做非均匀缩放，比较两种法线变换方式"
      onReset={() => { setScaleX(2.25); setScaleY(0.75); setShowWrong(true); setShowCorrect(true); }}
      controls={(
        <>
          <RangeInput label="scale X" value={scaleX} min={0.25} max={2.5} step={0.05} onChange={setScaleX} />
          <RangeInput label="scale Y" value={scaleY} min={0.25} max={2.5} step={0.05} onChange={setScaleY} />
          <label className="math-lab__toggle math-tone--bad"><input type="checkbox" checked={showWrong} onChange={(event) => setShowWrong(event.target.checked)} /><span><strong>M × n</strong><small>把法线当作普通方向变换</small></span></label>
          <label className="math-lab__toggle math-tone--good"><input type="checkbox" checked={showCorrect} onChange={(event) => setShowCorrect(event.target.checked)} /><span><strong>(M⁻¹)ᵀ × n</strong><small>使用法线矩阵</small></span></label>
          <button type="button" className="math-lab__action" onClick={() => setScaleY(scaleX)}>改为均匀缩放（Y = X）</button>
        </>
      )}
      visual={(
        <Plane range={3} label="法线矩阵对比平面" handles={[]}>
          {(toSvg, unit) => {
            const origin = toSvg([0, 0]);
            return (
              <>
                <circle className="math-unit-circle" cx={origin[0]} cy={origin[1]} r={unit} />
                <path className="math-surface" d={ellipse.map((v, index) => `${index ? 'L' : 'M'}${toSvg(v).join(' ')}`).join('') + 'Z'} />
                {rows.map((row, index) => {
                  const base = toSvg(row.surfacePoint);
                  const tangent = row.tangentDirection;
                  return (
                    <g key={index}>
                      {tangent ? <line className="math-tangent" x1={toSvg(add2(row.surfacePoint, scale2(tangent, -0.35)))[0]} y1={toSvg(add2(row.surfacePoint, scale2(tangent, -0.35)))[1]} x2={toSvg(add2(row.surfacePoint, scale2(tangent, 0.35)))[0]} y2={toSvg(add2(row.surfacePoint, scale2(tangent, 0.35)))[1]} /> : null}
                      {showWrong && row.wrong ? <Arrow from={base} to={toSvg(add2(row.surfacePoint, scale2(row.wrong, 0.75)))} tone="bad" width={2.5} /> : null}
                      {showCorrect && row.correct ? <Arrow from={base} to={toSvg(add2(row.surfacePoint, scale2(row.correct, 0.75)))} tone="good" width={2.5} /> : null}
                    </g>
                  );
                })}
              </>
            );
          }}
        </Plane>
      )}
      readout={(
        <Readout rows={[
          { label: 'M', value: `scale(${format(scaleX)}, ${format(scaleY)})` },
          { label: '(M⁻¹)ᵀ', value: `scale(${format(1 / scaleX)}, ${format(1 / scaleY)})` },
          { label: 'M × n 与表面的最小夹角', value: `${format(worstWrong, 1)}°${Math.abs(worstWrong - 90) > 0.5 ? '（偏离垂直）' : ''}`, tone: Math.abs(worstWrong - 90) > 0.5 ? 'bad' : 'good' },
          { label: '(M⁻¹)ᵀ × n 与表面的最小夹角', value: `${format(worstCorrect, 1)}°`, tone: 'good' },
        ]} />
      )}
    />
  );
}

/* ---------- 静态示意：点与向量 ---------- */

export function PointVectorDiagram() {
  const id = useId();
  const toSvg = (v: Vector2): Point => [60 + v[0] * 50, 190 - v[1] * 50];
  const pointA: Vector2 = [1, 1];
  const pointB: Vector2 = [5, 2.5];
  const offset: Vector2 = [-0.2, 1.2];
  return (
    <figure className="math-figure" aria-labelledby={`${id}-caption`}>
      <svg viewBox="0 0 420 220" role="img" aria-label="点 A、点 B 与向量 B − A；同一向量平移到其他位置仍然相同">
        <g className="math-plane__grid">
          {Array.from({ length: 8 }, (_, i) => <line key={`v${i}`} x1={toSvg([i, 0])[0]} y1="10" x2={toSvg([i, 0])[0]} y2="210" data-axis={i === 0 ? 'true' : undefined} />)}
          {Array.from({ length: 4 }, (_, i) => <line key={`h${i}`} x1="10" y1={toSvg([0, i])[1]} x2="410" y2={toSvg([0, i])[1]} data-axis={i === 0 ? 'true' : undefined} />)}
        </g>
        <Arrow from={toSvg(add2(pointA, offset))} to={toSvg(add2(pointB, offset))} tone="muted" dashed width={2} />
        <Arrow from={toSvg(pointA)} to={toSvg(pointB)} tone="result" />
        <circle className="math-point math-tone--a" cx={toSvg(pointA)[0]} cy={toSvg(pointA)[1]} r="6" />
        <circle className="math-point math-tone--b" cx={toSvg(pointB)[0]} cy={toSvg(pointB)[1]} r="6" />
        <Label at={toSvg(pointA)} tone="a" dx={-14} dy={22}>A (1, 1)</Label>
        <Label at={toSvg(pointB)} tone="b" dx={-30} dy={24}>B (5, 2.5)</Label>
        <Label at={toSvg([3, 1.75])} tone="result" dx={4} dy={24}>B − A = (4, 1.5)</Label>
        <Label at={toSvg(add2([3, 1.75], offset))} tone="muted" dx={-60} dy={-6}>同一个向量</Label>
      </svg>
      <figcaption id={`${id}-caption`}>点固定在某个位置；向量只记录“方向 + 长度”，平移到任何起点都表示同一个位移。</figcaption>
    </figure>
  );
}
