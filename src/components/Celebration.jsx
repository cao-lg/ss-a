import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from './motion'

const reduce =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 庆祝调色板：复用品牌色（珊瑚/薄荷/琥珀/紫），不引入新色系
const COLORS = ['#ff8a5b', '#ffb15c', '#7fe1c4', '#ffcf6b', '#b79cff']

function Confetti({ count = 44 }) {
  if (reduce) return null
  const pieces = Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100
    const delay = Math.random() * 0.45
    const dur = 1.5 + Math.random() * 1.2
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

function StepDots({ total, current }) {
  return (
    <div className="celebrate-dots" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`celebrate-dot ${i === current ? 'active' : i < current ? 'done' : ''}`} />
      ))}
    </div>
  )
}

function XpChip({ value }) {
  return (
    <motion.div
      className="celebrate-xp"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 16 }}
    >
      +{value} XP
    </motion.div>
  )
}

// 升级 / 成就多步演出覆盖层
// data: { leveledUp, fromLevel, toLevel, tierTitle, badges:[{id,title,desc,icon}], xpGain }
export default function Celebration({ data, onDone }) {
  const [visible, setVisible] = useState(true)
  const [step, setStep] = useState(0)

  const hasLevel = data?.leveledUp
  const hasBadges = data?.badges && data.badges.length > 0
  const xpGain = data?.xpGain || 0

  // 根据实际成就动态生成演出步骤
  const steps = useMemo(() => {
    const list = [{ key: 'entry' }]
    if (xpGain > 0) list.push({ key: 'xp' })
    if (hasLevel) list.push({ key: 'level' })
    if (hasBadges) list.push({ key: 'badges' })
    list.push({ key: 'finale' })
    return list
  }, [hasLevel, hasBadges, xpGain])

  useEffect(() => {
    if (!data) return
    setVisible(true)
    setStep(0)
    if (reduce) return // 无自动轮播：reduced-motion 用户手动关闭

    const timers = []
    let delay = 900
    for (let i = 1; i < steps.length; i++) {
      timers.push(setTimeout(() => setStep(i), delay))
      // 徽章较多时多留一点时间让每个徽章被看清
      delay += steps[i].key === 'badges' && data.badges.length > 1 ? 900 + data.badges.length * 160 : 900
    }
    // 最终页停留后自动关闭
    timers.push(setTimeout(() => {
      setVisible(false)
      onDone && onDone()
    }, delay + 2200))

    return () => timers.forEach(clearTimeout)
  }, [data, onDone, steps])

  if (!data) return null

  const current = steps[step] || steps[steps.length - 1]
  const isLast = step >= steps.length - 1

  const close = () => {
    setVisible(false)
    onDone && onDone()
  }

  const headline = hasLevel ? '升级啦！' : hasBadges ? '解锁新成就' : '太棒了！'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="celebrate-backdrop"
          onClick={close}
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
            <StepDots total={steps.length} current={step} />

            <AnimatePresence mode="wait">
              <motion.div
                key={current.key}
                className="celebrate-step"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                {current.key === 'entry' && (
                  <>
                    <div className="celebrate-emoji" aria-hidden="true">🎉</div>
                    <h2 className="celebrate-head">{headline}</h2>
                    <p className="celebrate-sub">
                      {hasLevel ? '你刚刚完成了一次成长跃迁' : hasBadges ? '新的成就正在解锁' : '学习节奏保持得很好'}
                    </p>
                  </>
                )}

                {current.key === 'xp' && (
                  <>
                    <div className="celebrate-emoji" aria-hidden="true">✨</div>
                    <h2 className="celebrate-head">经验到账</h2>
                    <XpChip value={xpGain} />
                  </>
                )}

                {current.key === 'level' && (
                  <>
                    <div className="celebrate-emoji" aria-hidden="true">🚀</div>
                    <h2 className="celebrate-head">升级啦！</h2>
                    <div className="celebrate-level">
                      <span className="lv-from">Lv.{data.fromLevel}</span>
                      <motion.span
                        className="lv-arrow"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                      >
                        →
                      </motion.span>
                      <motion.span
                        className="lv-to"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 14 }}
                      >
                        Lv.{data.toLevel}
                      </motion.span>
                    </div>
                    <motion.div
                      className="celebrate-tier"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      {data.tierTitle}
                    </motion.div>
                  </>
                )}

                {current.key === 'badges' && (
                  <>
                    <div className="celebrate-emoji" aria-hidden="true">🏅</div>
                    <h2 className="celebrate-head">解锁新成就</h2>
                    <div className="celebrate-badges">
                      {data.badges.map((b, i) => (
                        <motion.div
                          key={b.id}
                          className="celebrate-badge"
                          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            delay: reduce ? 0 : 0.18 + i * 0.14,
                            type: 'spring',
                            stiffness: 260,
                            damping: 16,
                          }}
                        >
                          <span className="cb-icon" aria-hidden="true">{b.icon}</span>
                          <span className="cb-title">{b.title}</span>
                          <span className="cb-desc">{b.desc}</span>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}

                {current.key === 'finale' && (
                  <>
                    <div className="celebrate-emoji" aria-hidden="true">🌟</div>
                    <h2 className="celebrate-head">{data.tierTitle || '继续加油'}</h2>
                    <p className="celebrate-sub">
                      {hasBadges
                        ? '带着新成就，继续下一程吧'
                        : hasLevel
                          ? '等级提升只是开始，更多挑战在等你'
                          : '保持这个节奏，下一个等级不远了'}
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <button className="btn ghost celebrate-close" onClick={close}>
              {isLast ? '收下 →' : '跳过 →'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
