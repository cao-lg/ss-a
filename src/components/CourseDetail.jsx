import { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { getCourse, getAllExamResults, getAllUnitTestResults } from '../lib/api'
import { getStoredAssessment } from '../lib/storage'
import { Reveal, Stagger, StaggerItem } from './motion'
import CourseShell from './CourseShell'

export default function CourseDetail() {
  const { courseId } = useParams()
  const location = useLocation()
  const [course, setCourse] = useState(null)
  const [status, setStatus] = useState({})
  const [exams, setExams] = useState({})
  const [unitTests, setUnitTests] = useState({})

  useEffect(() => {
    ;(async () => {
      const c = await getCourse(courseId)
      setCourse(c)
      const s = {}
      for (const ch of c.chapters) {
        for (const u of ch.units) {
          s[u.id] = await getStoredAssessment(u.id)
        }
      }
      setStatus(s)
      setExams(await getAllExamResults())
      setUnitTests(await getAllUnitTestResults())
    })()
  }, [courseId])

  // 从首页项目卡片进入时，自动滚动到对应章节
  useEffect(() => {
    if (!course) return
    const hash = location.hash.replace('#', '')
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    }
  }, [course, location.hash])

  if (!course) return <div className="state">加载中…</div>

  return (
    <CourseShell course={course} status={status} courseId={courseId}>
      <div className="course-detail">
        <Reveal>
          <Link to="/" className="back">← 返回课程</Link>
          <h1>{course.title}</h1>
          <p className="desc">{course.description}</p>
          <div className="course-actions">
            <Link to={`/tests/${courseId}`} className="btn ghost">🧪 测试中心</Link>
          </div>
        </Reveal>

        {course.chapters.map((ch) => {
        const chapterDone = ch.units.every((u) => status[u.id]?.pre && status[u.id]?.post)
        const examRec = exams[ch.id] || {}
        return (
          <section key={ch.id} id={ch.id} className="chapter">
            <h2>{ch.title}</h2>
            <Stagger className="units">
              {ch.units.map((u) => {
                const rec = status[u.id] || {}
                const done = rec.pre && rec.post
                const utRec = unitTests[u.id] || {}
                return (
                  <StaggerItem key={u.id}>
                    <div className={`card unit-card ${done ? 'done' : ''}`}>
                      <Link to={`/learn/${courseId}/${u.id}`} className="unit-main">
                        <div className="unit-head">
                          <span>{u.title}</span>
                          {done && <span className="badge done">✓ 已完成</span>}
                        </div>
                        <div className="meta">
                          {u.duration} · {u.objectives.length} 目标
                        </div>
                      </Link>
                      <Link to={`/test/unit/${courseId}/${u.id}`} className={`unit-test-link ${utRec.passed ? 'done' : ''}`}>
                        🧪 单元测试{utRec.passed ? ` · ${utRec.bestScore}%` : ''}
                      </Link>
                    </div>
                  </StaggerItem>
                )
              })}
              <StaggerItem>
                <Link
                  to={`/exam/${courseId}/${ch.id}`}
                  className={`card exam-card ${examRec.passed ? 'done' : ''}`}
                >
                  <div className="unit-head">
                    <span>🏁 阶段考试</span>
                    {examRec.passed ? (
                      <span className="badge done">✓ 已通关 {examRec.bestScore}%</span>
                    ) : chapterDone ? (
                      <span className="badge">可参加</span>
                    ) : (
                      <span className="badge locked">🔒 待解锁</span>
                    )}
                  </div>
                  <div className="meta">
                    {examRec.passed
                      ? '点开可换卷重考刷分'
                      : chapterDone
                      ? '本章任务已学完，来检验掌握度'
                      : '完成本章全部任务前/后测后解锁'}
                  </div>
                </Link>
              </StaggerItem>
            </Stagger>
          </section>
        )
      })}

      <FinalExamCard course={course} status={status} exams={exams} courseId={courseId} />
      </div>
    </CourseShell>
  )
}

function FinalExamCard({ course, status, exams, courseId }) {
  const flatAll = course.chapters.flatMap((ch) => ch.units.map((u) => u.id))
  const allUnitsDone = flatAll.length > 0 && flatAll.every((uid) => status[uid]?.pre && status[uid]?.post)
  const allExamsPassed = course.chapters.every((ch) => exams[ch.id]?.passed)
  const finalRec = exams['final'] || {}
  let state, tip
  if (finalRec.passed) {
    state = <span className="badge done">✓ 已通关 {finalRec.bestScore}%</span>
    tip = '点开可换卷重考刷分'
  } else if (allExamsPassed) {
    state = <span className="badge">🎓 可参加</span>
    tip = '全部阶段考试已全部通关，来拿下结业大考'
  } else if (allUnitsDone) {
    state = <span className="badge">可参加（建议先通关阶段考试）</span>
    tip = '课程已全部学完，建议先逐章通关阶段考试再来挑战'
  } else {
    state = <span className="badge locked">🔒 待解锁</span>
    tip = '学完全部任务并通关全部阶段考试后开放'
  }
  return (
    <section className="chapter">
      <h2>结业考核</h2>
      <Link to={`/exam/${courseId}/final`} className={`card exam-card final ${finalRec.passed ? 'done' : ''}`}>
        <div className="unit-head">
          <span>🎓 结业大考</span>
          {state}
        </div>
        <div className="meta">{tip}</div>
      </Link>
    </section>
  )
}
