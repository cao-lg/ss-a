import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listCourses, getCourse } from '../lib/api'
import { getStoredAssessment } from '../lib/storage'
import { Reveal, Stagger, StaggerItem, Magnetic } from './motion'

const FLOW = [
  { icon: '📋', label: '任务前测 · 摸清起点' },
  { icon: '📖', label: '情境学习 · 互动检查点' },
  { icon: '🧭', label: '探索 & 挑战 · 点燃好奇' },
  { icon: '📈', label: '任务后测 · 看见增益' },
]

export default function CourseList() {
  const [courses, setCourses] = useState([])
  const [status, setStatus] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const ids = await listCourses()
      // ss-a 是「六大项目」体系：每个项目是一个独立课程，全部聚合到首页展示
      const cs = await Promise.all(ids.map((id) => getCourse(id)))
      setCourses(cs)
      // 加载每个单元的完成状态（跨全部项目）
      const s = {}
      for (const c of cs) {
        for (const ch of c.chapters) {
          for (const u of ch.units) {
            s[u.id] = await getStoredAssessment(u.id)
          }
        }
      }
      setStatus(s)
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="state">正在点亮学习地图…</div>
  if (!courses.length) return <div className="state">课程数据加载失败</div>

  const totalProjects = courses.length
  const totalTasks = courses.reduce((n, c) => n + c.chapters.length, 0)
  const totalUnits = courses.reduce(
    (n, c) => n + c.chapters.reduce((m, ch) => m + ch.units.length, 0),
    0
  )
  const doneUnits = courses.reduce(
    (n, c) =>
      n + c.chapters.reduce(
        (m, ch) => m + ch.units.filter((u) => status[u.id]?.pre && status[u.id]?.post).length,
        0
      ),
    0
  )
  const firstCourse = courses[0]
  const firstUnit = firstCourse?.chapters[0]?.units[0]

  function chapterProgress(ch) {
    const total = ch.units.length
    const done = ch.units.filter((u) => status[u.id]?.pre && status[u.id]?.post).length
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
  }

  return (
    <div className="course-list">
      <section className="hero">
        <div>
          <span className="hero-badge">✦ 销售交易数据分析 · 六大项目</span>
          <h1>
            用数据读懂销售，
            <br />
            <span className="grad">把交易变成增长决策</span>
          </h1>
          <p className="lead">
            跟随新人「小北」在焕新家电电商部的成长，完成六大项目的全部任务：从真实业务问题出发，把数据变成能落地的增长决策。
          </p>
          <div className="hero-cta">
            {firstUnit && (
              <Magnetic>
                <Link to={`/learn/${firstCourse.id}/${firstUnit.id}`} className="btn primary">
                  开始学习 →
                </Link>
              </Magnetic>
            )}
            <Link to="/profile" className="btn">
              查看我的进步
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hs">
              <b>{totalProjects}</b>
              <span>大项目</span>
            </div>
            <div className="hs">
              <b>{totalTasks}</b>
              <span>个任务</span>
            </div>
            <div className="hs">
              <b>{totalUnits}</b>
              <span>学习任务</span>
            </div>
            <div className="hs">
              <b>{doneUnits}</b>
              <span>已完成任务</span>
            </div>
          </div>
        </div>

        <Reveal delay={0.15}>
          <div className="hero-card">
            <div className="hc-title">一次完整的学习旅程</div>
            <div className="flow">
              {FLOW.map((s, i) => (
                <div key={i}>
                  <div className="flow-step">
                    <span className="flow-dot">{s.icon}</span>
                    {s.label}
                  </div>
                  {i < FLOW.length - 1 && <div className="flow-arrow">↓</div>}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <div className="section-head">
        <h2>六大项目 · 全部任务</h2>
        <span className="sub">
          {totalProjects} 个项目 · {totalTasks} 个任务 · {totalUnits} 个学习任务
        </span>
      </div>

      <Stagger className="projects" mount>
        {courses.map((c) => (
          <StaggerItem key={c.id}>
            <div className="project-group">
              <div className="project-head">
                <h3>{c.title}</h3>
                <span className="project-meta">{c.chapters.length} 个任务</span>
              </div>
              <div className="chapters-grid">
                {c.chapters.map((ch) => {
                  const { done, total, pct } = chapterProgress(ch)
                  return (
                    <Link
                      key={ch.id}
                      to={`/course/${c.id}#${ch.id}`}
                      className={`card chapter-card ${pct === 100 ? 'done' : pct > 0 ? 'active' : ''}`}
                    >
                      <div className="chapter-head">
                        <span className="chapter-num">任务 {ch.order}</span>
                        {pct === 100 && <span className="badge done">✓ 已完成</span>}
                        {pct > 0 && pct < 100 && <span className="badge">进行中 {pct}%</span>}
                      </div>
                      <h3>{ch.title.replace(/^项目[一二三四五六七八九十\d]+\s*/, '')}</h3>
                      <div className="chapter-progress">
                        <div className="chapter-bar">
                          <div className="chapter-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="meta">
                          {done}/{total} 任务 · {ch.units.length} 个学习任务
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}
