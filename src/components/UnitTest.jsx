import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCourse, getUnitTest, startUnitTest, submitUnitTest, getUnitTestResult } from '../lib/api'
import { ModalPop, Reveal } from './motion'

export default function UnitTest() {
  const { courseId, unitId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [unitTitle, setUnitTitle] = useState('')
  const [meta, setMeta] = useState(null)
  const [result, setResult] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | noexam | intro | taking | result
  const [variant, setVariant] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [review, setReview] = useState(null)

  useEffect(() => {
    ;(async () => {
      const c = await getCourse(courseId)
      setCourse(c)
      const u = c.chapters.flatMap((ch) => ch.units).find((x) => x.id === unitId)
      setUnitTitle(u?.title?.replace(/^任务：/, '') || unitId)
      const t = await getUnitTest(unitId)
      if (!t.pool || !t.pool.length) { setPhase('noexam'); return }
      setMeta({
        title: t.title,
        description: t.description,
        passScore: t.passScore ?? 60,
        total: t.pool.length
      })
      setResult(await getUnitTestResult(unitId))
      setPhase('intro')
    })()
  }, [courseId, unitId])

  function setAns(id, v) {
    setAnswers((a) => ({ ...a, [id]: v }))
  }

  async function handleStart() {
    const v = await startUnitTest(unitId)
    if (!v) return
    setVariant(v)
    setAnswers({})
    setPhase('taking')
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const rec = await submitUnitTest(unitId, answers, variant.variantId)
      setReview(rec)
      setResult(await getUnitTestResult(unitId))
      setPhase('result')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRetry() {
    setReview(null)
    const v = await startUnitTest(unitId)
    if (!v) return
    setVariant(v)
    setAnswers({})
    setPhase('taking')
  }

  if (phase === 'loading') return <div className="state">加载中…</div>
  if (phase === 'noexam') {
    return (
      <div className="stage">
        <Link to={`/learn/${courseId}/${unitId}`} className="back">← 返回任务</Link>
        <div className="state">本任务暂未配置单元测试题目</div>
      </div>
    )
  }

  if (phase === 'intro') {
    const best = result?.bestScore ?? 0
    const passed = !!result?.passed
    return (
      <Reveal className="stage">
        <Link to={`/learn/${courseId}/${unitId}`} className="back">← 返回任务</Link>
        <div className="exam-intro">
          <span className="growth-kicker">🧪 单元测试</span>
          <h1>{unitTitle}</h1>
          <p className="desc">{meta.description}</p>
          <ul className="exam-meta">
            <li>共 <b>{meta.total}</b> 题，覆盖本任务关键概念</li>
            <li>每题选项顺序随机生成（多版本卷，防作弊）</li>
            <li>合格线：得分率 <b>{meta.passScore}%</b></li>
          </ul>
          {passed && <div className="exam-badge passed">✓ 已通关 · 最佳 {best}%</div>}
          <div className="exam-actions">
            <button className="btn primary" onClick={handleStart}>开始测验 →</button>
            <Link className="btn ghost" to={`/learn/${courseId}/${unitId}`}>返回任务学习</Link>
          </div>
        </div>
      </Reveal>
    )
  }

  if (phase === 'result' && review) {
    const items = review.graded.map((g) => {
      const it = variant.items.find((x) => x.id === g.id) || {}
      let yourAns = answers[g.id]
      let correctText = it.answer
      if (it.type !== 'fill' && it.options) {
        yourAns = typeof yourAns === 'number' ? it.options[yourAns] : '(未作答)'
      } else {
        yourAns = yourAns || '(未作答)'
      }
      return { ...g, it, yourAns, correctText }
    })
    return (
      <Reveal className="stage">
        <Link to={`/learn/${courseId}/${unitId}`} className="back">← 返回任务</Link>
        <div className={`exam-result ${review.passed ? 'pass' : 'fail'}`}>
          <span className="growth-kicker">🧪 单元测试结果</span>
          <div className={`exam-score ${review.passed ? 'up' : 'down'}`}>
            {review.pct}<span>%</span>
          </div>
          <p className="exam-verdict">
            {review.passed
              ? `通关！${review.score}/${review.total} 题正确，已达合格线 ${meta.passScore}%。`
              : `未达合格线 ${meta.passScore}%。${review.score}/${review.total} 题正确，回到任务再巩固一下。`}
          </p>
          <div className="exam-paper">试卷编号 #{review.variantId}</div>

          <div className="exam-review">
            <h3>逐题复盘</h3>
            {items.map((i, idx) => (
              <div key={i.id} className={`rv ${i.correct ? 'ok' : 'no'}`}>
                <div className="rv-title">
                  <span className="rv-idx">{idx + 1}</span>
                  <span>{i.it.question}</span>
                  <span className="rv-tag">{i.correct ? '✓ 正确' : '✗ 需加强'}</span>
                </div>
                <div className="rv-detail">
                  <span>你的答案：{i.yourAns}</span>
                  {!i.correct && <span className="rv-correct">正确答案：{i.correctText}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="exam-actions">
            <button className="btn primary" onClick={handleRetry}>换一卷重考 →</button>
            <Link className="btn ghost" to={`/learn/${courseId}/${unitId}`}>回到任务复习</Link>
            <Link className="btn ghost" to={`/tests/${courseId}`}>测试中心</Link>
          </div>
        </div>
      </Reveal>
    )
  }

  // taking
  return (
    <div className="stage">
      <Link to={`/learn/${courseId}/${unitId}`} className="back">← 返回任务</Link>
      <ModalPop onClose={() => {}} allowSkip={false}>
        <div className="modal exam-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h2>单元测试 · {unitTitle}</h2>
            <span className="exam-paper">试卷 #{variant?.variantId}</span>
          </div>
          <div className="modal-body">
            {variant?.items?.map((it, idx) => {
              const opts = it.options ?? []
              return (
                <div key={it.id} className="q">
                  <div className="q-title">{idx + 1}. {it.question}</div>
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
          </div>
          <div className="modal-foot">
            <button className="btn primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? '提交中…' : '提交试卷'}
            </button>
          </div>
        </div>
      </ModalPop>
    </div>
  )
}
