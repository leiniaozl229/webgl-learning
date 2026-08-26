import { Pause, Play, RotateCcw } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const flowSteps = [
  {
    title: 'JavaScript 准备资源',
    shortLabel: 'JS 准备',
    actor: 'JavaScript · CPU',
    description: 'CPU 上的 JavaScript 创建 positions、顶点着色器源码和片段着色器源码。',
    code: 'positions + vertexSource + fragmentSource',
  },
  {
    title: '上传数据并链接程序',
    shortLabel: '上传 GPU',
    actor: 'WebGL API · CPU → GPU',
    description: 'bufferData 把顶点复制到 GPU Buffer；compileShader 和 linkProgram 则准备好 GPU 可执行的 Program。',
    code: 'bufferData() + linkProgram()',
  },
  {
    title: '发出绘制命令',
    shortLabel: 'drawArrays',
    actor: 'JavaScript · CPU',
    description: 'JavaScript 设置当前 Program、VAO 和 Uniform，然后用 drawArrays 告诉 GPU 读取三个顶点。',
    code: 'drawArrays(TRIANGLES, 0, 3)',
  },
  {
    title: '执行顶点着色器',
    shortLabel: 'Vertex Shader',
    actor: 'GPU · 每个顶点一次',
    description: 'GPU 并行执行同一段顶点着色器三次，分别读取三组坐标，并把每个结果写入 gl_Position。',
    code: 'a_position → gl_Position × 3',
  },
  {
    title: '组装并光栅化',
    shortLabel: 'Rasterizer',
    actor: 'GPU · 固定功能',
    description: 'GPU 按 TRIANGLES 连接三个位置，再找出三角形覆盖的所有候选像素，这些候选数据叫作片段。',
    code: '3 vertices → many fragments',
  },
  {
    title: '着色并写入 Canvas',
    shortLabel: 'Fragment Shader',
    actor: 'GPU · 每个片段一次',
    description: '片段着色器为每个片段计算 outColor。结果通过深度、混合等测试后写入颜色缓冲区，最终显示在 Canvas 上。',
    code: 'outColor → framebuffer → Canvas',
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

function getCpuState(activeStep: number) {
  if (activeStep === 0) return 'positions + GLSL 源码';
  if (activeStep === 1) return '调用 WebGL 上传接口';
  if (activeStep === 2) return 'gl.drawArrays(...)';
  return '等待 GPU 完成绘制';
}

function getGpuState(activeStep: number) {
  if (activeStep === 0) return '等待资源';
  if (activeStep === 1) return 'Buffer + Program';
  if (activeStep === 2) return '等待绘制命令';
  if (activeStep === 3) return 'Vertex Shader × 3';
  if (activeStep === 4) return 'Rasterizer';
  return 'Fragment Shader → Canvas';
}

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
    const timer = window.setTimeout(() => setActiveStep((step) => step + 1), 1650);
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
  const signalAtGpu = activeStep === 1 || activeStep >= 3;

  return (
    <MotionConfig reducedMotion="user">
      <div className="execution-flow">
        <header className="execution-flow__header">
          <div>
            <strong>JavaScript → WebGL API → GPU → Canvas</strong>
            <small>一次绘制 · CPU 到 GPU 的六个阶段</small>
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

        <ol className="execution-flow__steps" aria-label="JavaScript 与 GPU 完成一次 WebGL2 绘制的六个阶段">
          {flowSteps.map((item, index) => (
            <li key={item.title}>
              <button type="button" aria-current={activeStep === index ? 'step' : undefined} onClick={() => selectStep(index)}>
                <span>{index + 1}</span>
                <strong>{item.shortLabel}</strong>
              </button>
            </li>
          ))}
        </ol>

        <div className="execution-flow__system" role="group" aria-label="CPU 与 GPU 的当前状态">
          <motion.div className="execution-flow__processor" data-active={activeStep <= 2} animate={{ opacity: activeStep <= 2 ? 1 : 0.64 }} transition={transition}>
            <span>CPU</span>
            <strong>JavaScript</strong>
            <AnimatePresence mode="wait" initial={false}>
              <motion.small key={getCpuState(activeStep)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {getCpuState(activeStep)}
              </motion.small>
            </AnimatePresence>
          </motion.div>

          <div className="execution-flow__bridge" aria-hidden="true">
            <span>WebGL API</span>
            <div><motion.i animate={{ x: signalAtGpu ? 64 : 0 }} transition={transition} /></div>
          </div>

          <motion.div className="execution-flow__processor" data-active={activeStep === 1 || activeStep >= 3} animate={{ opacity: activeStep === 1 || activeStep >= 3 ? 1 : 0.64 }} transition={transition}>
            <span>GPU</span>
            <strong>渲染流水线</strong>
            <AnimatePresence mode="wait" initial={false}>
              <motion.small key={getGpuState(activeStep)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {getGpuState(activeStep)}
              </motion.small>
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="execution-flow__body">
          <div className="execution-flow__visual">
            <div className="execution-flow__visual-labels" aria-hidden="true"><span>顶点 / 片段预览</span><span>裁剪空间 −1 → 1</span></div>
            <svg viewBox="0 0 320 220" role="img" aria-labelledby="flow-visual-title flow-visual-description">
              <title id="flow-visual-title">三个顶点生成蓝色三角形的过程</title>
              <desc id="flow-visual-description">顶点数据上传到 GPU 后，依次经过顶点着色器、光栅化和片段着色器。</desc>
              <defs>
                <pattern id="flow-fragments" width="12" height="12" patternUnits="userSpaceOnUse">
                  <circle cx="6" cy="6" r="2.4" fill="var(--color-accent)" />
                </pattern>
              </defs>
              <g className="execution-flow__axes" aria-hidden="true">
                <line x1="24" y1="108" x2="296" y2="108" />
                <line x1="160" y1="18" x2="160" y2="202" />
              </g>
              <motion.polygon points={trianglePoints} fill="transparent" stroke="var(--color-accent)" strokeWidth="2" animate={{ opacity: activeStep >= 3 ? 1 : 0, pathLength: activeStep >= 3 ? 1 : 0 }} transition={transition} />
              <motion.polygon points={trianglePoints} fill="url(#flow-fragments)" animate={{ opacity: activeStep === 4 ? 1 : 0 }} transition={transition} />
              <motion.polygon points={trianglePoints} fill="var(--color-accent)" animate={{ opacity: activeStep >= 5 ? 0.92 : 0 }} transition={transition} />
              {pointTargets.map((target, index) => {
                const position = activeStep >= 3 ? target : pointStarts[index];
                return (
                  <motion.circle key={`${target.cx}-${target.cy}`} r="7" fill="var(--color-surface-code)" stroke="var(--color-accent-strong)" strokeWidth="4" animate={{ cx: position.cx, cy: position.cy, scale: activeStep === 3 ? 1.15 : 1 }} transition={{ ...transition, delay: reducedMotion ? 0 : index * 0.07 }} />
                );
              })}
            </svg>
          </div>

          <div className="execution-flow__explanation">
            <div className="execution-flow__step-meta"><span>步骤 {activeStep + 1} / {flowSteps.length}</span><small>{step.actor}</small></div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step.title} initial={{ opacity: 0, x: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : -8 }} transition={{ duration: reducedMotion ? 0.01 : 0.24, ease: [0.16, 1, 0.3, 1] }}>
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
