import { useState } from 'react'
import { judgeAnswer } from '../lib/judge'
import { saveCheckpoint } from '../lib/storage'
import { runPython } from '../lib/codeRunner'

// 进阶挑战：更难、可选；编程课可用 type="output" 代码题（可插拔 Pyodide 执行）。对应需求 C。
export default function Challenge({ unitId, id, type = 'fill', title = '进阶挑战', scenario, instruction, options, answer, hints = [], feedback, unlock }) {
  const isChoice = Array.isArray(options) && options.length > 0
  const isCode = type === 'output'
  const [val, setVal] = useState(isChoice ? null : '')
  const [code, setCode] = useState('')
  const [state, setState] = useState('idle') // idle | correct | wrong | envfail
  const [runOut, setRunOut] = useState(null)
  const [running, setRunning] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hintIndex, setHintIndex] = useState(-1)
  const [revealed, setRevealed] = useState(false)

  const usableHints = Array.isArray(hints) ? hints : hints ? [hints] : []

  async function check() {
    setAttempts((a) => a + 1)
    if (isCode) {
      setRunning(true)
      setRunOut(null)
      const r = await runPython(code, answer)
      setRunning(false)
      setRunOut(r)
      if (r.online === false) {
        setState('envfail')
        return
      }
      const ok = r.ok
      setState(ok ? 'correct' : 'wrong')
      if (!ok && usableHints.length > 0 && hintIndex + 1 < usableHints.length) {
        setHintIndex(Math.min(hintIndex + 1, usableHints.length - 1))
      }
      saveCheckpoint(unitId, id, 'challenge', ok, attempts + 1)
      return
    }
    const ok = isChoice ? judgeAnswer(type, options, answer, val) : judgeAnswer('fill', null, answer, val)
    setState(ok ? 'correct' : 'wrong')
    if (!ok && usableHints.length > 0 && hintIndex + 1 < usableHints.length) {
      setHintIndex(Math.min(hintIndex + 1, usableHints.length - 1))
    }
    saveCheckpoint(unitId, id, 'challenge', ok, attempts + 1)
  }

  function retry() {
    setState('idle')
    setVal(isChoice ? null : '')
    setRunOut(null)
    setRevealed(false)
  }

  function reveal() {
    setRevealed(true)
    setHintIndex(usableHints.length - 1)
  }

  const currentHint = hintIndex >= 0 ? usableHints[hintIndex] : null

  return (
    <div className={`block challenge ${state}`}>
      <div className="block-tag">挑战</div>
      <h4>{title}</h4>

      {scenario && (
        <div className="cp-scenario">
          <span className="cp-scenario-icon">情境</span>
          <p>{scenario}</p>
        </div>
      )}

      {instruction && <p className="q-text">{instruction}</p>}

      {isCode ? (
        <textarea
          className="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={'# 用 Python 写出答案，print 出结果\nprint(...)'}
        />
      ) : isChoice ? (
        <div className="opts">
          {options.map((o, i) => (
            <button key={i} className={`opt ${val === i ? 'sel' : ''}`} onClick={() => setVal(i)} disabled={state === 'correct'}>
              <span className="opt-idx">{String.fromCharCode(65 + i)}</span>
              <span>{o}</span>
            </button>
          ))}
        </div>
      ) : (
        <input className="inp" value={val} onChange={(e) => setVal(e.target.value)} placeholder="输入答案" disabled={state === 'correct'} onKeyDown={(e) => e.key === 'Enter' && check()} />
      )}

      <div className="cp-actions">
        {state !== 'correct' && (
          <button className="btn small" onClick={check} disabled={running || (!isCode && (val === null || val === ''))}>
            {running ? '运行中…' : isCode ? '运行' : attempts === 0 ? '接受挑战' : '再试一次'}
          </button>
        )}
        {state === 'correct' && (
          <div className="cp-ok">
            <span className="cp-ok-icon">✓</span>
            <span>挑战成功 +XP</span>
          </div>
        )}
      </div>

      {isCode && runOut && (
        <div className={`cp-feedback ${runOut.ok ? 'ok' : 'wrong'}`}>
          {runOut.error ? (
            <p>运行环境：{runOut.error}（需联网加载 Pyodide）</p>
          ) : (
            <>
              <p>你的输出：{runOut.actual || '（无输出）'}</p>
              <p>期望输出：{answer}</p>
            </>
          )}
        </div>
      )}

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

      {state === 'wrong' && !usableHints.length && feedback && !isCode && (
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
    </div>
  )
}
