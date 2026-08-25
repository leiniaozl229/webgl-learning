import { Pause, Play, RotateCcw } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const flowSteps = [
  {
    title: '读取顶点',
    shortLabel: '顶点数据',
    description: 'drawArrays 请求三个顶点。GPU 从 ARRAY_BUFFER 中依次取出三组 x、y 坐标。',
    code: 'Float32Array → ARRAY_BUFFER',
  },
  {
    title: '执行顶点着色器',
    shortLabel: 'Vertex Shader',
    description: '同一段顶点着色器处理三个坐标，每次都把结果写入 gl_Position。',
    code: 'a_position → gl_Position',
  },
  {
    title: '组装并光栅化',
    shortLabel: 'Rasterizer',
    description: 'GPU 按 TRIANGLES 连接三个位置，并找出三角形覆盖的所有片段。',
    code: '3 vertices → fragments',
  },
  {
    title: '运行片段着色器',
    shortLabel: 'Fragment Shader',
    description: '片段着色器为每个片段输出颜色，最终结果写入画布颜色缓冲区。',
    code: 'outColor → canvas pixels',
  },
] as const;

const pointStarts = [
  { cx: 104, cy: 108 },
  { cx: 160, cy: 108 },
  { cx: 216, cy: 108 },
];

const pointTargets = [
  { cx: 52, cy: 180 },
  { cx: 160, cy: 36 },
  { cx: 268, cy: 180 },
];

const trianglePoints = pointTargets.map(({ cx, cy }) => `${cx},${cy}`).join(' ');

export function ExecutionFlow() {
  const reducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (reducedMotion) setIsPlaying(false);
  }, [reducedMotion]);

  useEffect(() => {
    if (!isPlaying) return;
    if (activeStep === flowSteps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setActiveStep((step) => step + 1), 1400);
    return () => window.clearTimeout(timer);
  }, [activeStep, isPlaying]);

  function selectStep(index: number) {
    setIsPlaying(false);
    setActiveStep(index);
  }

  function togglePlayback() {
    if (reducedMotion) {
      setActiveStep((step) => (step + 1) % flowSteps.length);
      return;
    }
    if (activeStep === flowSteps.length - 1 && !isPlaying) setActiveStep(0);
    setIsPlaying((playing) => !playing);
  }

  function replay() {
    setActiveStep(0);
    setIsPlaying(!reducedMotion);
  }

  const step = flowSteps[activeStep];
  const transition = { duration: reducedMotion ? 0.01 : 0.52, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <MotionConfig reducedMotion="user">
      <div className="execution-flow">
        <header className="execution-flow__header">
          <div>
            <strong>drawArrays(gl.TRIANGLES, 0, 3)</strong>
            <small>一次绘制 · 四个阶段</small>
          </div>
          <div className="execution-flow__controls">
            <button type="button" onClick={replay} aria-label="重新播放执行流程" title="重新播放">
              <RotateCcw aria-hidden="true" />
            </button>
            <button className="execution-flow__play" type="button" onClick={togglePlayback} aria-label={reducedMotion ? '显示下一步' : isPlaying ? '暂停执行流程' : '播放执行流程'}>
              {isPlaying && !reducedMotion ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              <span>{reducedMotion ? '下一步' : isPlaying ? '暂停' : '播放'}</span>
            </button>
          </div>
        </header>

        <ol className="execution-flow__steps" aria-label="WebGL2 一次绘制的四个阶段">
          {flowSteps.map((item, index) => (
            <li key={item.title}>
              <button type="button" aria-current={activeStep === index ? 'step' : undefined} onClick={() => selectStep(index)}>
                <span>{index + 1}</span>
                <strong>{item.shortLabel}</strong>
              </button>
            </li>
          ))}
        </ol>

        <div className="execution-flow__body">
          <div className="execution-flow__visual">
            <div className="execution-flow__visual-labels" aria-hidden="true"><span>裁剪空间</span><span>−1 → 1</span></div>
            <svg viewBox="0 0 320 220" role="img" aria-labelledby="flow-visual-title flow-visual-description">
              <title id="flow-visual-title">三个顶点生成蓝色三角形的过程</title>
              <desc id="flow-visual-description">三个顶点先由顶点着色器定位，再经过三角形组装、光栅化和片段着色。</desc>
              <defs>
                <pattern id="flow-fragments" width="12" height="12" patternUnits="userSpaceOnUse">
                  <circle cx="6" cy="6" r="2.4" fill="var(--color-accent)" />
                </pattern>
              </defs>
              <g className="execution-flow__axes" aria-hidden="true">
                <line x1="24" y1="108" x2="296" y2="108" />
                <line x1="160" y1="18" x2="160" y2="202" />
              </g>
              <motion.polygon
                points={trianglePoints}
                fill="transparent"
                stroke="var(--color-accent)"
                strokeWidth="2"
                animate={{ opacity: activeStep >= 1 ? 1 : 0, pathLength: activeStep >= 1 ? 1 : 0 }}
                transition={transition}
              />
              <motion.polygon
                points={trianglePoints}
                fill="url(#flow-fragments)"
                animate={{ opacity: activeStep === 2 ? 1 : 0 }}
                transition={transition}
              />
              <motion.polygon
                points={trianglePoints}
                fill="var(--color-accent)"
                animate={{ opacity: activeStep >= 3 ? 0.92 : 0 }}
                transition={transition}
              />
              {pointTargets.map((target, index) => {
                const position = activeStep >= 1 ? target : pointStarts[index];
                return (
                  <motion.circle
                    key={`${target.cx}-${target.cy}`}
                    r="7"
                    fill="var(--color-surface-code)"
                    stroke="var(--color-accent-strong)"
                    strokeWidth="4"
                    animate={{ cx: position.cx, cy: position.cy, scale: activeStep === 1 ? 1.15 : 1 }}
                    transition={{ ...transition, delay: reducedMotion ? 0 : index * 0.07 }}
                  />
                );
              })}
            </svg>
          </div>

          <div className="execution-flow__explanation">
            <span>步骤 {activeStep + 1} / {flowSteps.length}</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: reducedMotion ? 0 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reducedMotion ? 0 : -8 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <code>{step.code}</code>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
