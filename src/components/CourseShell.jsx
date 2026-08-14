import { useState } from 'react'
import CourseSidebar from './CourseSidebar'

// 课程/学习页的外壳：左侧常驻"成长路线"目录 + 右侧主内容；移动端目录收成可滑出的抽屉。
export default function CourseShell({ course, status, courseId, activeUnitId, children }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="side-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? '关闭目录' : '打开目录'}
      >
        {open ? '✕ 关闭' : '📋 目录'}
      </button>
      {open && <div className="side-backdrop" onClick={() => setOpen(false)} />}
      <div className={`course-shell ${open ? 'drawer-open' : ''}`}>
        <aside className="course-side">
          <CourseSidebar
            course={course}
            status={status}
            courseId={courseId}
            activeUnitId={activeUnitId}
            onNavigate={() => setOpen(false)}
          />
        </aside>
        <div className="course-main">{children}</div>
      </div>
    </>
  )
}
