import { useState } from 'react'
import { parseDirectives } from '../lib/mdParser'
import { motion, AnimatePresence } from './motion'

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

  if (locked) {
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

  const parsed = body ? parseDirectives(body) : []
  // 若问题体内嵌有 checkpoint / challenge，则必须答对才能解锁下一问（验证门）。
  const needsVerify = parsed.some(
    (b) => b.kind === 'checkpoint' || b.kind === 'challenge'
  )

  return (
    <div className={`q-block viz ${open ? 'is-open' : ''}`} data-theme="coral">
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
              {parsed.map((b, i) => (
                <div key={i}>
                  {bodyRenderer(b, unitId, bodyRenderer, {
                    onCheckpointResult: (c) => { if (c) setPassed(true) },
                  })}
                </div>
              ))}
              {gate && !done && (
                <button
                  className="q-confirm"
                  disabled={needsVerify && !passed}
                  onClick={() => {
                    setDone(true)
                    onConfirm && onConfirm()
                  }}
                >
                  {needsVerify && !passed ? '先答对上方的自测，再继续 →' : '✓ 我明白了，继续'}
                </button>
              )}
              {gate && needsVerify && !passed && (
                <div className="q-verify-hint">答对上方自测才能解锁下一问，可多次尝试。</div>
              )}
              {gate && done && <div className="q-done">已完成 ✓</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
