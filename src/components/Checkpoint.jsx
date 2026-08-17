import { useState } from 'react'
import { judgeAnswer } from '../lib/judge'
import { saveCheckpoint } from '../lib/storage'
import { Stagger, StaggerItem } from './motion'
import { GainFloat, SparkleBurst, SuccessPulse } from './FeedbackEffects'

// 阅读中检查点：情境 → 预测/尝试 → 线索反馈 → 解锁拓学。
// 支持：scenario(情境)、hints(渐进提示数组)、feedback(最终解释)、unlock(答对后拓展)。
export default function Checkpoint({ unitId, type = 'multiple_choice', question, scenario, options = [], answer, hints = [], feedback, unlock, onResult }) {
  const isChoice = Array.isArray(options) && options.length > 0
  const [val, setVal] = useState(isChoice ? null : '')
  const [state, setState] = useState('idle') // idle | correct | wrong
  const [attempts, setAttempts] = useState(0)
  const [hintIndex, setHintIndex] = useState(-1)
  const [revealed, setRevealed] = useState(false)

  const usableHints = Array.isArray(hints) ? hints : hints ? [hints] : []

  function check() {
    if (val === null || val === '') return
    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)

    const ok = isChoice ? judgeAnswer(type, options, answer, val) : judgeAnswer('fill', null, answer, val)
    if (ok) {
      setState('correct')
      saveCheckpoint(unitId, question, 'checkpoint', true, nextAttempts)
      if (onResult) onResult(true)
    } else {
      setState('wrong')
      // 渐进释放提示：第1错给 hint0，第2错给 hint1...
      if (usableHints.length > 0 && hintIndex + 1 < usableHints.length) {
        setHintIndex(Math.min(hintIndex + 1, usableHints.length - 1))
      }
      saveCheckpoint(unitId, question, 'checkpoint', false, nextAttempts)
    }
  }

  function retry() {
    setState('idle')
    setVal(isChoice ? null : '')
    setRevealed(false)
  }

  function reveal() {
    setRevealed(true)
    setHintIndex(usableHints.length - 1)
  }

  const currentHint = hintIndex >= 0 ? usableHints[hintIndex] : null
  const isCorrect = state === 'correct'

  return (
    <Stagger className={`block checkpoint ${state}`} gap={0.12} margin="-12%">
      <div className="block-tag">检查点</div>

      {scenario && (
        <StaggerItem>
          <div className="cp-scenario">
            <span className="cp-scenario-icon">情境</span>
            <p>{scenario}</p>
          </div>
        </StaggerItem>
      )}

      <StaggerItem><p className="q-text">{question}</p></StaggerItem>

      {isChoice ? (
        <StaggerItem>
          <div className="opts">
            {options.map((o, i) => (
              <button
                key={i}
                className={`opt ${val === i ? 'sel' : ''} ${state === 'correct' && i === options.indexOf(answer) ? 'correct-opt' : ''}`}
                onClick={() => setVal(i)}
                disabled={state === 'correct'}
              >
                <span className="opt-idx">{String.fromCharCode(65 + i)}</span>
                <span>{o}</span>
              </button>
            ))}
          </div>
        </StaggerItem>
      ) : (
        <StaggerItem>
          <input
            className="inp"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="输入你的答案"
            disabled={state === 'correct'}
            onKeyDown={(e) => e.key === 'Enter' && check()}
          />
        </StaggerItem>
      )}

      <StaggerItem>
        <div className="cp-actions">
          {state !== 'correct' && (
            <button className="btn small" onClick={check} disabled={val === null || val === ''}>
              {attempts === 0 ? '先猜一下' : '再试一次'}
            </button>
          )}
          {state === 'correct' && (
            <SuccessPulse active={isCorrect}>
              <div className="cp-ok">
                <SparkleBurst active={isCorrect} count={16} />
                <GainFloat active={isCorrect}>+XP</GainFloat>
                <span className="cp-ok-icon">✓</span>
                <span>答对了！解锁一个小发现</span>
              </div>
            </SuccessPulse>
          )}
        </div>
      </StaggerItem>

      {state === 'wrong' && !revealed && (
        <div className="cp-hint-bar">
          <span className="cp-attempts">尝试 {attempts} 次</span>
          {usableHints.length > 0 && hintIndex < usableHints.length - 1 && (
            <button className="btn small ghost" onClick={reveal}>
              给我最后一条线索
            </button>
          )}
        </div>
      )}

      {currentHint && state === 'wrong' && (
        <div className="cp-feedback wrong">
          <p className="cp-feedback-title">线索 {hintIndex + 1}/{usableHints.length}</p>
          <p>{currentHint}</p>
          {!revealed && (
            <button className="btn small ghost" onClick={retry}>
              再试一次
            </button>
          )}
          {revealed && feedback && (
            <div className="cp-reveal">
              <p className="cp-feedback-title">答案揭晓</p>
              <p>{feedback}</p>
              <button className="btn small ghost" onClick={retry}>重试</button>
            </div>
          )}
        </div>
      )}

      {state === 'wrong' && !usableHints.length && feedback && (
        <div className="cp-feedback wrong">
          <p>{feedback}</p>
          <button className="btn small ghost" onClick={retry}>再试一次</button>
        </div>
      )}

      {state === 'correct' && (feedback || unlock) && (
        <div className="cp-feedback ok">
          <p className="cp-feedback-title">为什么是这样？</p>
          {feedback && <p>{feedback}</p>}
          {unlock && (
            <div className="cp-unlock">
              <p className="cp-unlock-title">解锁拓展</p>
              <p>{unlock}</p>
            </div>
          )}
        </div>
      )}
    </Stagger>
  )
}
