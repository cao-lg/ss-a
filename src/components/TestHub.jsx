import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getCourse, getExam, getAllExamResults, getAllUnitTestResults, listCourses, defaultCourseId } from '../lib/api'
import { Reveal, Stagger, StaggerItem } from './motion'

// 测试中心：单元测试（每任务一张卷） + 每个项目综合测试（章节阶段考） + 所有项目综合测试（结业大考）
export default function TestHub() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [courseError, setCourseError] = useState(false)
  const [exams, setExams] = useState({})
  const [unitTests, setUnitTests] = useState({})
  const [comps, setComps] = useState([])
  const [allCourses, setAllCourses] = useState([])

  // 项目切换条：并行拉取 manifest 全部课程标题，让所有项目从一个页面可达。
  // 用 allSettled 容错：任一课程读取失败都不能让整条切换条消失（否则只剩首个项目）。
  useEffect(() => {
    ;(async () => {
      const ids = await listCourses()
      const settled = await Promise.allSettled(
        ids.map(async (id) => {
          const c = await getCourse(id)
          return { id, title: c?.title || id }
        })
      )
      const courses = settled
        .map((s, i) => (s.status === 'fulfilled' ? s.value : { id: ids[i], title: ids[i] }))
        .filter(Boolean)
      setAllCourses(courses)
    })()
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const c = await getCourse(courseId)
        if (!alive) return
        setCourse(c)
        setExams(await getAllExamResults())
        setUnitTests(await getAllUnitTestResults())
        const compIds = ['final', 'final-2', 'final-3']
        const compsRaw = await Promise.all(compIds.map((id) => getExam(id)))
        if (!alive) return
        setComps(compIds.map((id, i) => (compsRaw[i] ? { id, title: compsRaw[i].title, description: compsRaw[i].description } : null)).filter(Boolean))
        setCourseError(false)
      } catch {
        if (alive) setCourseError(true)
      }
    })()
    return () => { alive = false }
  }, [courseId])

  const showSwitcher = allCourses.length > 1

  const flatUnits = course.chapters.flatMap((ch) => ch.units)
  const finishedUnits = flatUnits.filter((u) => unitTests[u.id]?.passed).length

  return (
    <div className="stage test-hub">
      {showSwitcher && (
        <nav className="project-switch" aria-label="项目切换">
          {allCourses.map((c) => (
            <Link
              key={c.id}
              to={`/tests/${c.id}`}
              className={`pill ${c.id === courseId ? 'active' : ''}`}
            >
              {c.title}
            </Link>
          ))}
        </nav>
      )}
      {courseError ? (
        <div className="state">
          <h2>该项目的测验数据暂未上线</h2>
          <p>当前站点仅包含「{allCourses.find((c) => c.id === courseId)?.title || courseId}」的题库，或在其他项目数据未部署时无法访问。</p>
          {showSwitcher && (
            <Link to={`/tests/${allCourses[0]?.id}`} className="btn">前往已上线项目 →</Link>
          )}
        </div>
      ) : !course ? (
        <div className="state">加载中…</div>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
