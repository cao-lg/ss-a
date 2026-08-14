import { motion } from './motion'

const reduce =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 默认节奏：放慢，让“滚到后有停顿、再缓缓逐幕浮现”
// revealDelay 进视口后的停顿；stagger 各幕间隔；duration 每幕时长；
// trigger 触发线（数值越大，需滚得越深才出现，避免“一滚到就闪现”）
const DEFAULTS = {
  revealDelay: 0.55,
  stagger: 0.7,
  duration: 0.9,
  trigger: '0px 0px -18% 0px',
}

const ease = [0.16, 1, 0.3, 1]

/**
 * 情境剧式开场：把“旁白 → 导师台词 → 焦点问题 → 主角内心独白”逐段呈现。
 * 每段在进入视口更深的位置才触发，并按 delay 错开，随滚动像剧本一样慢慢展开。
 *
 * 字段（内容）：setup 旁白 / speaker 说话人 / line 台词 /
 *       focus 焦点上下文 / focusQ 焦点问题（放大脉冲） / thought 主角内心独白
 * 参数（节奏，均可由 :::scene{...} 覆盖）：
 *       revealDelay 进视口后停顿 / stagger 各幕间隔 /
 *       duration 每幕时长 / trigger 触发线
 */
export default function Scene({
  setup,
  speaker = 'mentor',
  line,
  focus,
  focusQ,
  thought,
  revealDelay = DEFAULTS.revealDelay,
  stagger = DEFAULTS.stagger,
  duration = DEFAULTS.duration,
  trigger = DEFAULTS.trigger,
}) {
  if (reduce) {
    return (
      <div className="scene">
        {setup && <p className="scene-narration">{setup}</p>}
        {line && (
          <div className="scene-bubble mentor">
            <span className="scene-tag">☕ {speaker}</span>
            <p>{line}</p>
          </div>
        )}
        {(focus || focusQ) && (
          <div className="scene-focus">
            <span className="scene-focus-label">焦点</span>
            {focus && <p className="scene-focus-lead">{focus}</p>}
            {focusQ && <p className="scene-focus-q">{focusQ}</p>}
          </div>
        )}
        {thought && (
          <div className="scene-thought">
            <span className="scene-tag">💭 小北的内心</span>
            <p>{thought}</p>
          </div>
        )}
      </div>
    )
  }

  const vp = { once: true, margin: trigger }
  const at = (i) => ({ duration, delay: revealDelay + i * stagger, ease })

  // 各幕描述：initial 起始态 + 内容
  const segs = []
  let k = 0
  if (setup) {
    segs.push({
      key: 'n',
      initial: { opacity: 0, y: 22 },
      node: <p className="scene-narration">{setup}</p>,
    })
    k++
  }
  if (line) {
    segs.push({
      key: 'b',
      initial: { opacity: 0, scale: 0.94, y: 14 },
      node: (
        <div className="scene-bubble mentor">
          <span className="scene-tag">☕ {speaker}</span>
          <p>{line}</p>
        </div>
      ),
    })
    k++
  }
  if (focus || focusQ) {
    segs.push({
      key: 'f',
      initial: { opacity: 0, y: 20 },
      node: (
        <div className="scene-focus">
          <span className="scene-focus-label">焦点</span>
          {focus && <p className="scene-focus-lead">{focus}</p>}
          {focusQ && <p className="scene-focus-q">{focusQ}</p>}
        </div>
      ),
    })
    k++
  }
  if (thought) {
    segs.push({
      key: 't',
      initial: { opacity: 0, x: 30 },
      node: (
        <div className="scene-thought">
          <span className="scene-tag">💭 小北的内心</span>
          <p>{thought}</p>
        </div>
      ),
    })
    k++
  }

  return (
    <div className="scene">
      {segs.map((s, idx) => (
        <motion.div
          key={s.key}
          initial={s.initial}
          whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          viewport={vp}
          transition={at(idx)}
        >
          {s.node}
        </motion.div>
      ))}
    </div>
  )
}
