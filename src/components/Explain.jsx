import { useState } from 'react'

// 「看解析」折叠块：默认收起，学生先思考，点开才揭示正确答案 / 讲解。
// 首次展开触发 onOpen —— 用于放行问题体内的 checkpoint 验证门（先看懂再答题）。
export default function Explain({ title = '看解析', children, onOpen }) {
  const [open, setOpen] = useState(false)
  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && onOpen) onOpen()
  }
  return (
    <div className={`reveal viz ${open ? 'is-open' : ''}`} data-theme="mint">
      <button
        type="button"
        className="reveal-toggle"
        onClick={toggle}
        aria-expanded={open}
      >
        <span className="reveal-caret">{open ? '▾' : '▸'}</span>
        <span className="reveal-title">{open ? '收起解析' : title}</span>
      </button>
      {open && <div className="reveal-body">{children}</div>}
    </div>
  )
}
