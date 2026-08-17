import { motion } from './motion'

const reduce =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 品牌庆祝色：复用珊瑚/薄荷/琥珀/紫，不引入新色系
const BRAND_COLORS = ['#ff8a5b', '#ffb15c', '#7fe1c4', '#ffcf6b', '#b79cff']

/**
 * 浮出提示：如 "+XP"、"+1 闯关"
 * active 触发一次上浮消失动画；reduced-motion 下仅淡入淡出。
 */
export function GainFloat({ children, active, className = '' }) {
  if (!active) return null
  return (
    <motion.span
      className={`gain-float ${className}`}
      initial={reduce ? { opacity: 0, x: '-50%' } : { opacity: 0, y: 10, scale: 0.85, x: '-50%' }}
      animate={{ opacity: [0, 1, 1, 0], y: reduce ? 0 : [10, -26, -34], scale: [0.85, 1.05, 1], x: '-50%' }}
      transition={{ duration: reduce ? 0.25 : 1.1, ease: 'easeOut' }}
    >
      {children}
    </motion.span>
  )
}

/**
 * 小型星光/粒子爆发：用于检查点、挑战答对、问题链确认。
 * 尊重 reduced-motion：直接不渲染动画粒子。
 */
export function SparkleBurst({ active, count = 14, colors = BRAND_COLORS }) {
  if (!active || reduce) return null
  const pieces = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35
    const dist = 22 + Math.random() * 30
    return {
      i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      delay: Math.random() * 0.12,
      dur: 0.5 + Math.random() * 0.45,
      color: colors[i % colors.length],
      size: 3 + Math.random() * 4,
    }
  })

  return (
    <span className="sparkle-burst" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.i}
          className="sparkle-piece"
          style={{ background: p.color, width: p.size, height: p.size }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], x: p.x, y: p.y, scale: [0, 1, 0] }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </span>
  )
}

/**
 * 成功脉冲包装器：在子元素外罩一层缩放脉冲光环。
 */
export function SuccessPulse({ active, children }) {
  return <span className={`success-pulse ${active ? 'is-active' : ''}`}>{children}</span>
}
