import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCourse, getExam, startExam, submitExam, getExamResult } from '../lib/api'
import { getStoredAssessment } from '../lib/storage'
import { ModalPop, Reveal } from './motion'

export default function StageExam() {
  const { courseId, chapterId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [chapter, setChapter] = useState(null)
  const [examMeta, setExamMeta] = useState(null)
  const [result, setResult] = useState(null)
  const [chapterDone, setChapterDone] = useState(false)
  const [phase, setPhase] = useState('loading') // loading | noexam | intro | taking | result
  const [variant, setVariant] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [review, setReview] = useState(null)

  useEffect(() => {
    ;(async () => {
      const c = await getCourse(courseId)
      const ch = c.chapters.find((x) => x.id === chapterId)
      if (!ch) { setPhase('noexam'); return }
      setCourse(c)
      setChapter(ch)
      let allDone = true
      for (const u of ch.units) {
        const rec = await getStoredAssessment(u.id)
        if (!(rec.pre && rec.post)) allDone = false
      }
      setChapterDone(allDone)
      const exam = await getExam(chapterId)
      if (!exam) { setPhase('noexam'); return }
      setExamMeta({
        title: exam.title,
        description: exam.description,
        passScore: exam.passScore ?? 60,
        pick: exam.pick ?? exam.pool?.length ?? 0,
        total: exam.pool?.length ?? 0
      })
      setResult(await getExamResult(chapterId))
      setPhase('intro')
    })()
  }, [courseId, chapterId])

  function setAns(id, v) {
    setAnswers((a) => ({ ...a, [id]: v }))
  }

  async function handleStart() {
    const v = await startExam(chapterId)
    if (!v) return
    setVariant(v)
    setAnswers({})
    setPhase('taking')
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const rec = await submitExam(chapterId, answers, variant.variantId)
      setReview(rec)
      setResult(await getExamResult(chapterId))
      setPhase('result')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRetry() {
    setReview(null)
    const v = await startExam(chapterId)
    if (!v) return
    setVariant(v)
    setAnswers({})
    setPhase('taking')
  }

  if (phase === 'loading') return <div className="state">加载中…</div>
  if (phase === 'noexam') {
    return (
      <div className="stage">
        <Link to={`/course/${courseId}`} className="back">← 返回课程</Link>
        <div className="state">本章暂未配置阶段考试</div>
      </div>
    )
  }

  const unitTitleMap = {}
  chapter?.units?.forEach((u) => { unitTitleMap[u.id] = u.title })

  // ===== intro =====
  if (phase === 'intro') {
    const best = result?.bestScore ?? 0
    const passed = !!result?.passed
    return (
      <Reveal className="stage">
        <Link to={`/course/${courseId}`} className="back">← 返回课程</Link>
        <div className="exam-intro">
          <span className="growth-kicker">🏁 阶段考试</span>
          <h1>{examMeta.title}</h1>
          <p className="desc">{examMeta.description}</p>
          <ul className="exam-meta">
            <li>题库共 <b>{examMeta.total}</b> 题，每次随机抽取 <b>{examMeta.pick}</b> 题</li>
            <li>每题选项顺序与试卷均随机生成（多版本卷，防作弊）</li>
            <li>合格线：得分率 <b>{examMeta.passScore}%</b></li>
          </ul>
          {passed && (
            <div className="exam-badge passed">✓ 已通关 · 最佳 {best}%</div>
          )}
          {!chapterDone && (
            <div className="exam-warn">
              ⚠️ 你尚未完成本章全部任务的前/后测，建议先学完再考，效果更佳。
            </div>
          )}
          <div className="exam-actions">
            <button className="btn primary" onClick={handleStart}>开始考试 →</button>
            <Link className="btn ghost" to={`/course/${courseId}`}>返回章节</Link>
          </div>
        </div>
      </Reveal>
    )
  }

  // ===== result / review =====
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
    const wrongUnits = [...new Set(items.filter((i) => !i.correct).map((i) => i.it.unitId).filter(Boolean))]
    return (
      <Reveal className="stage">
        <Link to={`/course/${courseId}`} className="back">← 返回课程</Link>
        <div className={`exam-result ${review.passed ? 'pass' : 'fail'}`}>
          <span className="growth-kicker">🏁 阶段考试结果</span>
          <div className={`exam-score ${review.passed ? 'up' : 'down'}`}>
            {review.pct}<span>%</span>
          </div>
          <p className="exam-verdict">
            {review.passed
              ? `恭喜通关！${review.score}/${review.total} 题正确，已达合格线 ${examMeta.passScore}%。`
              : `未达合格线 ${examMeta.passScore}%。${review.score}/${review.total} 题正确，再接再厉。`}
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
                {!i.correct && i.it.unitId && (
                  <Link className="rv-link" to={`/learn/${courseId}/${i.it.unitId}`}>
                    回到：{unitTitleMap[i.it.unitId]?.replace(/^任务：/, '') || i.it.unitId} 复习 →
                  </Link>
                )}
              </div>
            ))}
          </div>

          {wrongUnits.length > 0 && (
            <div className="exam-weak">
              <h3>薄弱任务建议复习</h3>
              <div className="weak-chips">
                {wrongUnits.map((uid) => (
                  <Link key={uid} className="weak-chip" to={`/learn/${courseId}/${uid}`}>
                    {unitTitleMap[uid]?.replace(/^任务：/, '') || uid}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="exam-actions">
            <button className="btn primary" onClick={handleRetry}>换一卷重考 →</button>
            <Link className="btn ghost" to={`/course/${courseId}`}>返回章节</Link>
            <Link className="btn ghost" to="/profile">查看学习画像</Link>
          </div>
        </div>
      </Reveal>
    )
  }

  // ===== taking (modal) =====
  return (
    <div className="stage">
      <Link to={`/course/${courseId}`} className="back">← 返回课程</Link>
      <ModalPop onClose={() => {}} allowSkip={false}>
        <div className="modal exam-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h2>{examMeta.title}</h2>
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
