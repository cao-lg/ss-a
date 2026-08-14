import { useState } from 'react'
import { ModalPop } from './motion'

// 评测弹窗：课前测（可跳过）/ 课后测。提交后由父级调用 submitAssessment 评分。
export default function AssessmentModal({ title, items, allowSkip, onClose, onSubmit }) {
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  function setAns(id, v) {
    setAnswers((a) => ({ ...a, [id]: v }))
  }

  async function submit() {
    setBusy(true)
    try {
      const rec = await onSubmit(answers)
      setResult(rec)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalPop onClose={onClose} allowSkip={allowSkip}>
      <div className="modal assess-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          {allowSkip && (
            <button className="btn small ghost" onClick={onClose}>
              跳过
            </button>
          )}
        </div>
        {!result ? (
          <div className="modal-body">
            {items.map((it, idx) => {
              const opts = it.options ?? it.testConfig?.options ?? []
              return (
                <div key={it.id} className="q">
                  <div className="q-title">
                    {idx + 1}. {it.question || it.title}
                  </div>
                  {it.instruction && <div className="q-inst">{it.instruction}</div>}
                  {it.type === 'fill' ? (
                    <input
                      className="inp"
                      value={answers[it.id] || ''}
                      onChange={(e) => setAns(it.id, e.target.value)}
                      placeholder="输入答案"
                    />
                  ) : (
                    <div className="opts">
                      {opts.map((o, oi) => (
                        <label key={oi} className={`opt ${answers[it.id] === oi ? 'sel' : ''}`}>
                          <input
                            type="radio"
                            name={it.id}
                            checked={answers[it.id] === oi}
                            onChange={() => setAns(it.id, oi)}
                          />
                          {o}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {items.length === 0 && <div className="state">本任务暂未配置题目</div>}
          </div>
        ) : (
          <div className="modal-body result">
            <div className="score-big">
              {result.score}
              <span>/{result.total}</span>
            </div>
            <ul className="graded">
              {result.graded.map((g) => (
                <li key={g.id} className={g.correct ? 'ok' : 'no'}>
                  {g.correct ? '✓ 正确' : '✗ 需加强'}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="modal-foot">
          {!result ? (
            <button className="btn primary" disabled={busy} onClick={submit}>
              {busy ? '提交中…' : '提交'}
            </button>
          ) : (
            <button className="btn primary" onClick={onClose}>
              完成
            </button>
          )}
        </div>
      </div>
    </ModalPop>
  )
}
