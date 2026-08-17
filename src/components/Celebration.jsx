import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from './motion'

const reduce =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 庆祝调色板：复用品牌色（珊瑚/薄荷/琥珀/紫），不引入新色系
const COLORS = ['#ff8a5b', '#ffb15c', '#7fe1c4', '#ffcf6b', '#b79cff']

function Confetti({ count = 36 }) {
  if (reduce) return null
  const pieces = Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100
    const delay = Math.random() * 0.35
    const dur = 1.4 + Math.random() * 1.1
    const rot = Math.random() * 360
    const color = COLORS[i % COLORS.length]
    const size = 7 + Math.random() * 7
    return { left, delay, dur, rot, color, size, i }
  })
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.i}
          className="confetti-piece"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.5, background: p.color }}
          initial={{ y: -40, opacity: 0, rotate: p.rot }}
          animate={{ y: '110vh', opacity: [0, 1, 1, 0], rotate: p.rot + 320 }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}

// 升级 / 成就演出覆盖层
// data: { leveledUp, fromLevel, toLevel, tierTitle, badges:[{title,desc,icon}] }
export default function Celebration({ data, onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!data) return
    const t = setTimeout(() => {
      setVisible(false)
      onDone && onDone()
    }, 3600)
    return () => clearTimeout(t)
  }, [data, onDone])

  if (!data) return null

  const showLevel = data.leveledUp
  const showBadges = data.badges && data.badges.length > 0
  const headline = showLevel ? '升级啦！' : showBadges ? '解锁新成就' : '太棒了！'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="celebrate-backdrop"
          onClick={() => { setVisible(false); onDone && onDone() }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Confetti />
          <motion.div
            className="celebrate-card"
            role="status"
            aria-live="polite"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 24 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="celebrate-emoji" aria-hidden="true">{showLevel ? '🎉' : '🏅'}</div>
            <h2 className="celebrate-head">{headline}</h2>

            {showLevel && (
              <div className="celebrate-level">
                <span className="lv-from">Lv.{data.fromLevel}</span>
                <span className="lv-arrow">→</span>
                <span className="lv-to">Lv.{data.toLevel}</span>
                <div className="celebrate-tier">{data.tierTitle}</div>
              </div>
            )}

            {showBadges && (
              <div className="celebrate-badges">
                {data.badges.map((b, i) => (
                  <motion.div
                    key={b.id}
                    className="celebrate-badge"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.8 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.25 + i * 0.15, type: 'spring', stiffness: 260, damping: 16 }}
                  >
                    <span className="cb-icon" aria-hidden="true">{b.icon}</span>
                    <span className="cb-title">{b.title}</span>
                    <span className="cb-desc">{b.desc}</span>
                  </motion.div>
                ))}
              </div>
            )}

            <button className="btn ghost celebrate-close" onClick={() => { setVisible(false); onDone && onDone() }}>
              收下 →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
