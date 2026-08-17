import { useEffect, useRef, useState } from 'react'
import { parseDirectives } from '../lib/mdParser'
import { motion, AnimatePresence } from './motion'
import { GainFloat, SparkleBurst } from './FeedbackEffects'

const reduce =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 单个「问题卡」：先抛问题，学生点击后才揭示课程内容（点击展开）。
// 在问题链(qchain)内以 gate 模式使用：需先「确认已懂」才会解锁下一问（onConfirm）。
// locked 时仅显示占位，提示先完成上一问。
export default function QuestionView({
  title,
  hint,
  body,
  unitId,
  bodyRenderer,
  gate = false,
  locked = false,
  onConfirm,
  index,
  total,
}) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [passed, setPassed] = useState(false)
  const [confirmBurst, setConfirmBurst] = useState(false)
  const [unlockPop, setUnlockPop] = useState(false)
  const wasLocked = useRef(false)
  const parsed = body ? parseDirectives(body) : []

  // 若问题体内嵌 checkpoint / challenge，则需答对才能解锁下一问（验证门）。
  const needsVerify = parsed.some(
    (b) => b.kind === 'checkpoint' || b.kind === 'challenge'
  )
  // 若问题含「看解析」折叠块，则 checkpoint 须等学生看完解析才放行（先想后看）。
  const hasReveal = parsed.some((b) => b.kind === 'reveal')
  const [seenReveal, setSeenReveal] = useState(!hasReveal)

  // 下一问解锁时播放一次 pop 高亮
  useEffect(() => {
    if (wasLocked.current && !locked) {
      setUnlockPop(true)
      const t = setTimeout(() => setUnlockPop(false), reduce ? 0 : 820)
      return () => clearTimeout(t)
    }
    wasLocked.current = locked
  }, [locked])

  if (locked) {
    wasLocked.current = true
    return (
      <div className="q-block q-locked viz" data-theme="coral">
        <div className="q-head">
          {index != null && <span className="q-num">{index}/{total}</span>}
          <span className="q-mark">🔒</span>
          <span className="q-title">{title}</span>
          <span className="q-toggle">完成上一问后解锁</span>
        </div>
      </div>
    )
  }

  function handleConfirm() {
    setConfirmBurst(true)
    setDone(true)
    onConfirm && onConfirm()
    setTimeout(() => setConfirmBurst(false), reduce ? 0 : 1100)
  }

  return (
    <div
      className={`q-block viz ${open ? 'is-open' : ''} ${unlockPop ? 'is-unlocked' : ''}`}
      data-theme="coral"
    >
      <button
        className="q-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {index != null && <span className="q-num">{index}/{total}</span>}
        <span className="q-mark">?</span>
        <span className="q-title">{title}</span>
        <span className="q-toggle">{open ? '收起 ▲' : gate ? '点击回答 ▼' : '点击展开 ▼'}</span>
      </button>

      {hint && !open && <div className="q-hint">{hint}</div>}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="q-body"
            key="body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="q-body-inner">
              {parsed.map((b, i) => {
                const isVerify = b.kind === 'checkpoint' || b.kind === 'challenge'
                // 验证门：学生先看解析（seenReveal）才出现，避免「没看懂就答题」。
                if (isVerify && !seenReveal) return null
                return (
                  <div key={i}>
                    {bodyRenderer(b, unitId, bodyRenderer, {
                      onRevealOpen: () => setSeenReveal(true),
                      onCheckpointResult: (c) => { if (c) setPassed(true) },
                    })}
                  </div>
                )
              })}
              {gate && needsVerify && !seenReveal && (
                <div className="q-need-reveal-hint">先打开上方「解析」看懂正确答案，再答题确认你理解了 →</div>
              )}
              {gate && !done && (
                <button
                  className="q-confirm"
                  disabled={needsVerify && !passed}
                  onClick={handleConfirm}
                >
                  <SparkleBurst active={confirmBurst} count={16} />
                  <GainFloat active={confirmBurst}>+1 闯关</GainFloat>
                  <span className="q-confirm-text">
                    {!needsVerify
                      ? '✓ 我明白了，继续'
                      : !seenReveal
                        ? '先看解析并答题，才能继续 →'
                        : !passed
                          ? '先答对上方的自测，再继续 →'
                          : '✓ 我明白了，继续'}
                  </span>
                </button>
              )}
              {gate && needsVerify && seenReveal && !passed && (
                <div className="q-verify-hint">答对上方自测才能解锁下一问，可多次尝试。</div>
              )}
              {gate && done && (
                <div className="q-done">
                  <span className="q-done-icon">✓</span>
                  <span>已完成</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
