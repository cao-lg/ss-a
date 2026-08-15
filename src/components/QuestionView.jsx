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
}) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)

  if (locked) {
    return (
      <div className="q-block q-locked viz" data-theme="coral">
        <div className="q-head">
          <span className="q-mark">🔒</span>
          <span className="q-title">{title}</span>
          <span className="q-toggle">完成上一问后解锁</span>
        </div>
      </div>
    )
  }

  const parsed = body ? parseDirectives(body) : []

  return (
    <div className={`q-block viz ${open ? 'is-open' : ''}`} data-theme="coral">
      <button
        className="q-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
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
                <div key={i}>{bodyRenderer(b, unitId, bodyRenderer)}</div>
              ))}
              {gate && !done && (
                <button
                  className="q-confirm"
                  onClick={() => {
                    setDone(true)
                    onConfirm && onConfirm()
                  }}
                >
                  ✓ 我明白了，继续
                </button>
              )}
              {gate && done && <div className="q-done">已完成 ✓</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
