import { useState } from 'react'
import { saveCheckpoint } from '../lib/storage'
import { logBehavior } from '../lib/behavior'
import { Stagger, StaggerItem } from './motion'

// 探索分支：可选、引发兴趣、有即时反馈。
// 支持两种模式：
// 1) 开放式思考题：title + body + reflect=true
// 2) 分支选择探索：title + scenario + choices[{text,feedback,insight}]
export default function Explore({ unitId, title = '动手想一想', scenario, body, choices = [], reflect = false }) {
  const [done, setDone] = useState(false)
  const [selected, setSelected] = useState(null)
  const [reflection, setReflection] = useState('')
  const hasChoices = Array.isArray(choices) && choices.length > 0

  function pick(i) {
    setSelected(i)
    setDone(true)
    saveCheckpoint(unitId, title, 'explore', true, 1)
    logBehavior('explore_choice', { unitId, choiceIndex: i, insight: choices[i]?.insight || null })
  }

  return (
    <Stagger className="block explore" gap={0.12} margin="-12%">
      <div className="block-tag">探索</div>
      <StaggerItem><h4>{title}</h4></StaggerItem>

      {scenario && (
        <StaggerItem>
          <div className="cp-scenario">
            <span className="cp-scenario-icon">情境</span>
            <p>{scenario}</p>
          </div>
        </StaggerItem>
      )}

      {body && <StaggerItem><p className="q-text">{body}</p></StaggerItem>}

      {hasChoices ? (
        <StaggerItem>
          <div className="opts">
            {choices.map((c, i) => (
              <button
                key={i}
                className={`opt ${selected === i ? 'sel' : ''}`}
                onClick={() => pick(i)}
                disabled={done && selected !== i}
              >
                <span className="opt-idx">{String.fromCharCode(65 + i)}</span>
                <span>{c.text}</span>
              </button>
            ))}
          </div>
        </StaggerItem>
      ) : reflect ? (
        <StaggerItem>
          <textarea
            className="reflect"
            placeholder="写下你的猜想（不会评分，但会帮你梳理思路）"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
          />
        </StaggerItem>
      ) : null}

      {!hasChoices && reflect && (
        <StaggerItem>
          <button className="btn small" onClick={() => setDone(true)}>
            {done ? '已记录 ✓' : '记录想法'}
          </button>
        </StaggerItem>
      )}

      {done && selected !== null && choices[selected] && (
        <div className="cp-feedback ok">
          <p className="cp-feedback-title">{choices[selected].feedback || '你选择了：' + choices[selected].text}</p>
          {choices[selected].insight && (
            <div className="cp-unlock">
              <p className="cp-unlock-title">一个小发现</p>
              <p>{choices[selected].insight}</p>
            </div>
          )}
        </div>
      )}
    </Stagger>
  )
}
