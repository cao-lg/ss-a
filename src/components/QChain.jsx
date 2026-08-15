import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseDirectives } from '../lib/mdParser'
import QuestionView from './QuestionView'

// 问题链容器：把内容组织成一串「问题 → 揭示 → 确认 → 下一问」的引导序列。
// 默认顺序解锁：只有已解锁的提问可交互；学生点开并确认「我明白了」后，下一问才解锁。
// 既满足「每个地方都有选择与确认」，又实现一步步引导学生学下去。
export default function QChain({ title, body, unitId, bodyRenderer }) {
  const childBlocks = body ? parseDirectives(body) : []
  // 仅把问题卡(question/q)作为互动节点；容器体里相邻的空行会被解析成无 attrs 的 md 块，
  // 直接读 b.attrs.title 会抛「Cannot read properties of undefined」。
  const questions = childBlocks.filter(
    (b) => b.kind === 'question' || b.kind === 'q'
  )
  const [unlocked, setUnlocked] = useState(1) // 已解锁到第几个（1-based）

  const confirm = (idx) => setUnlocked((u) => Math.max(u, idx + 2))

  return (
    <div className="q-chain viz" data-theme="coral">
      {title && <div className="q-chain-title">{title}</div>}
      <div className="q-chain-list">
        {childBlocks.map((b, i) => {
          if (b.kind === 'question' || b.kind === 'q') {
            const qi = questions.indexOf(b)
            return (
              <QuestionView
                key={i}
                title={b.attrs?.title}
                hint={b.attrs?.hint}
                body={b.body}
                unitId={unitId}
                bodyRenderer={bodyRenderer}
                gate
                locked={qi + 1 > unlocked}
                onConfirm={() => confirm(qi)}
              />
            )
          }
          // 兼容：保留问题链内可能夹杂的引导性文字（非空才渲染）
          if (b.type === 'md' && b.content && b.content.trim()) {
            return (
              <div key={i} className="q-chain-intro">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {b.content}
                </ReactMarkdown>
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
