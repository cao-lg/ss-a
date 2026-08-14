import { Link } from 'react-router-dom'

// 左侧"成长路线"目录：按章节分组展示所有单元 + 完成度进度，像 TOC 一样常驻。
export default function CourseSidebar({ course, status, courseId, activeUnitId, onNavigate }) {
  const stages = []
  course.chapters.forEach((ch) => ch.units.forEach((u) => stages.push(u)))

  const doneCount = stages.filter((u) => {
    const r = status[u.id] || {}
    return r.pre && r.post
  }).length
  const pct = stages.length ? Math.round((doneCount / stages.length) * 100) : 0

  let idx = 0
  return (
    <div className="course-side-inner">
      <div className="side-head">
        <span className="growth-kicker">📈 成长路线</span>
        <p className="side-sub">完成度随课前 / 课后测自动点亮</p>
        <div className="side-progress">
          <div className="side-progress-bar">
            <span style={{ width: pct + '%' }} />
          </div>
          <span className="side-progress-num">
            {pct}% · {doneCount}/{stages.length} 任务已完成
          </span>
        </div>
      </div>

      <nav className="side-nav">
        {course.chapters.map((ch) => (
          <div className="side-chapter" key={ch.id}>
            <div className="side-ch-title">{ch.title}</div>
            {ch.units.map((u) => {
              const r = status[u.id] || {}
              const done = r.pre && r.post
              const active = r.pre && !r.post
              const state = done ? 'done' : active ? 'active' : 'locked'
              idx += 1
              const isCurrent = activeUnitId === u.id
              return (
                <Link
                  key={u.id}
                  to={`/learn/${courseId}/${u.id}`}
                  className={`growth-node ${state} ${isCurrent ? 'current' : ''}`}
                  onClick={onNavigate}
                >
                  <span className="growth-dot">{done ? '✓' : idx}</span>
                  <div className="growth-body">
                    <div className="growth-title">{u.title.replace(/^任务：/, '')}</div>
                    <div className="growth-meta">
                      <span className={`growth-state ${state}`}>
                        {state === 'done' ? '已完成' : state === 'active' ? '进行中' : '未开始'}
                      </span>
                      <span className="growth-sep">·</span>
                      <span>{u.duration}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </div>
  )
}
