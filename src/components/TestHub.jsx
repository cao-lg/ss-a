import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourse, getExam, getAllExamResults, getAllUnitTestResults } from '../lib/api'
import { Reveal, Stagger, StaggerItem } from './motion'

// 测试中心：单元测试（每任务一张卷） + 每个项目综合测试（章节阶段考） + 所有项目综合测试（结业大考）
export default function TestHub() {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [exams, setExams] = useState({})
  const [unitTests, setUnitTests] = useState({})
  const [comps, setComps] = useState([])

  useEffect(() => {
    ;(async () => {
      const c = await getCourse(courseId)
      setCourse(c)
      setExams(await getAllExamResults())
      setUnitTests(await getAllUnitTestResults())
      const compIds = ['final', 'final-2', 'final-3']
      const compsRaw = await Promise.all(compIds.map((id) => getExam(id)))
      setComps(compIds.map((id, i) => (compsRaw[i] ? { id, title: compsRaw[i].title, description: compsRaw[i].description } : null)).filter(Boolean))
    })()
  }, [courseId])

  if (!course) return <div className="state">加载中…</div>

  const flatUnits = course.chapters.flatMap((ch) => ch.units)
  const finishedUnits = flatUnits.filter((u) => unitTests[u.id]?.passed).length

  return (
    <div className="stage test-hub">
      <Reveal>
        <Link to={`/course/${courseId}`} className="back">← 返回课程</Link>
        <h1>🧪 测试中心</h1>
        <p className="desc">
          三层测验体系：先逐任务做 <b>单元测试</b> 打牢基础，再逐项目做 <b>综合测试</b> 串联知识，
          最后用 <b>所有项目综合测试</b> 检验整门课掌握度。
        </p>
      </Reveal>

      {/* 单元测试 */}
      <section className="hub-section">
        <div className="hub-head">
          <h2>① 单元测试</h2>
          <span className="hub-count">已通关 {finishedUnits}/{flatUnits.length}</span>
        </div>
        <Stagger className="ut-grid">
          {flatUnits.map((u) => {
            const rec = unitTests[u.id] || {}
            return (
              <StaggerItem key={u.id}>
                <Link to={`/test/unit/${courseId}/${u.id}`} className={`card ut-card ${rec.passed ? 'done' : ''}`}>
                  <div className="unit-head">
                    <span>{u.title.replace(/^任务：/, '')}</span>
                    {rec.passed ? (
                      <span className="badge done">✓ {rec.bestScore}%</span>
                    ) : rec.bestScore != null ? (
                      <span className="badge">最佳 {rec.bestScore}%</span>
                    ) : (
                      <span className="badge">未测</span>
                    )}
                  </div>
                  <div className="meta">{u.duration}</div>
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      </section>

      {/* 每个项目综合测试 */}
      <section className="hub-section">
        <div className="hub-head">
          <h2>② 每个项目综合测试</h2>
          <span className="hub-count">阶段考试</span>
        </div>
        <Stagger className="ut-grid">
          {course.chapters.map((ch) => {
            const rec = exams[ch.id] || {}
            return (
              <StaggerItem key={ch.id}>
                <Link to={`/exam/${courseId}/${ch.id}`} className={`card ut-card ${rec.passed ? 'done' : ''}`}>
                  <div className="unit-head">
                    <span>{ch.title}</span>
                    {rec.passed ? (
                      <span className="badge done">✓ {rec.bestScore}%</span>
                    ) : rec.bestScore != null ? (
                      <span className="badge">最佳 {rec.bestScore}%</span>
                    ) : (
                      <span className="badge">未考</span>
                    )}
                  </div>
                  <div className="meta">本项目阶段综合测验</div>
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      </section>

      {/* 所有项目综合测试 */}
      <section className="hub-section">
        <div className="hub-head">
          <h2>③ 所有项目综合测试</h2>
          <span className="hub-count">结业大考 · {comps.length} 套可选</span>
        </div>
        <Stagger className="ut-grid">
          {comps.map((c) => {
            const rec = exams[c.id] || {}
            return (
              <StaggerItem key={c.id}>
                <Link to={`/exam/${courseId}/${c.id}`} className={`card ut-card final ${rec.passed ? 'done' : ''}`}>
                  <div className="unit-head">
                    <span>🎓 {c.title}</span>
                    {rec.passed ? (
                      <span className="badge done">✓ {rec.bestScore}%</span>
                    ) : rec.bestScore != null ? (
                      <span className="badge">最佳 {rec.bestScore}%</span>
                    ) : (
                      <span className="badge">未考</span>
                    )}
                  </div>
                  <div className="meta">{c.description}</div>
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      </section>
    </div>
  )
}
