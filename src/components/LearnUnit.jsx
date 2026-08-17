import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCourse, getUnitContent, getAssessment, getAssessmentStatus, submitAssessment } from '../lib/api'
import { parseDirectives } from '../lib/mdParser'
import { updateProgress, getProgress, getAllAssessments, getStoredAssessment, saveTime } from '../lib/storage'
import { streakBump, evaluateBadges, celebrationFor } from '../lib/gamify'
import { logBehavior } from '../lib/behavior'
import AssessmentModal from './AssessmentModal'
import CourseShell from './CourseShell'
import Celebration from './Celebration'
import { renderBlockContent } from './renderBlock'
import { Magnetic, motion, AnimatePresence } from './motion'

// 正文逐元素逐步浮现由 renderBlock.jsx 内的 mdComponents 统一处理。

// 兼容两种测验数据结构：{ items: [...] }（u41）或直接 [... ]（u42~u45）
function extractItems(block) {
  if (!block) return []
  if (Array.isArray(block)) return block
  if (Array.isArray(block.items)) return block.items
  return []
}

export default function LearnUnit() {
  const { courseId, unitId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [unit, setUnit] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [assessment, setAssessment] = useState({ pre: [], post: [] })
  const [status, setStatus] = useState({ hasPre: false, hasPost: false })
  const [allStatus, setAllStatus] = useState({})
  const [ready, setReady] = useState(false)
  const [showPre, setShowPre] = useState(false)
  const [showPost, setShowPost] = useState(false)
  const [summary, setSummary] = useState(null)
  const [celebration, setCelebration] = useState(null)

  // 行为埋点所需的引用
  const blockRefs = useRef({})
  const dwellRef = useRef({})
  const maxDepthRef = useRef(0)
  const sessionStartRef = useRef(Date.now())

  useEffect(() => {
    ;(async () => {
      const c = await getCourse(courseId)
      const u = c.chapters.flatMap((ch) => ch.units).find((x) => x.id === unitId)
      const md = await getUnitContent(u.path)
      const a = await getAssessment(unitId)
      const st = await getAssessmentStatus(unitId)
      // 为左侧目录加载全部单元进度
      const map = {}
      for (const ch of c.chapters) {
        for (const x of ch.units) {
          map[x.id] = await getStoredAssessment(x.id)
        }
      }
      setAllStatus(map)
      setCourse(c)
      setUnit(u)
      setBlocks(parseDirectives(md))
      setAssessment(a)
      setStatus(st)
      if (!st.hasPre) setShowPre(true)
      setReady(true)
    })()
  }, [courseId, unitId])

  // 学习时长计时：挂载期间每 10s 累加该单元时长，隐藏标签页暂停，卸载时 flush
  useEffect(() => {
    if (!ready || !unitId) return
    let last = Date.now()
    const flush = () => {
      const now = Date.now()
      const dt = now - last
      last = now
      if (dt > 0 && document.visibilityState === 'visible') saveTime(unitId, dt)
    }
    const tick = setInterval(flush, 10000)
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onVis)
      flush()
    }
  }, [ready, unitId])

  // 行为埋点：会话 / 滚动深度 / 段落停留（阅读轨迹）
  useEffect(() => {
    if (!ready || !unitId) return
    sessionStartRef.current = Date.now()
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const max = document.documentElement.scrollHeight - window.innerHeight
        const pct = max > 0 ? window.scrollY / max : 0
        if (pct > maxDepthRef.current) maxDepthRef.current = pct
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const idx = e.target.dataset.idx
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            dwellRef.current[idx] = Date.now()
          } else if (dwellRef.current[idx]) {
            const dwell = Date.now() - dwellRef.current[idx]
            delete dwellRef.current[idx]
            if (dwell > 800) logBehavior('section_view', { unitId, idx: Number(idx), kind: e.target.dataset.kind, dwellMs: dwell })
          }
        }
      },
      { threshold: [0, 0.5, 1] }
    )
    Object.values(blockRefs.current).forEach((el) => el && io.observe(el))

    logBehavior('session_start', { unitId })

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      const now = Date.now()
      for (const [idx, enter] of Object.entries(dwellRef.current)) {
        const dwell = now - enter
        if (dwell > 800) logBehavior('section_view', { unitId, idx: Number(idx), kind: 'md', dwellMs: dwell })
      }
      dwellRef.current = {}
      const durMs = now - sessionStartRef.current
      logBehavior('session_end', { unitId, durMs })
      if (maxDepthRef.current > 0) logBehavior('scroll_depth', { unitId, maxPct: Number(maxDepthRef.current.toFixed(3)) })
      maxDepthRef.current = 0
    }
  }, [ready, unitId, blocks])

  async function refresh() {
    setStatus(await getAssessmentStatus(unitId))
  }

  async function doSubmit(phase, answers) {
    return await submitAssessment(unitId, phase, answers)
  }

  function closePre() {
    setShowPre(false)
    refresh()
  }

  async function closePost() {
    setShowPost(false)
    const st = await getAssessmentStatus(unitId)
    setStatus(st)
    const gain = st.gain ?? 0
    const prev = await getProgress()
    // 写入：XP + 任务计数 + 真实连续学习天数（streakBump 同一天不重复计数）
    let next = await updateProgress((p) => {
      const bumped = streakBump(p)
      return {
        ...bumped,
        xp: bumped.xp + 20 + Math.max(0, gain),
        streak: bumped.streak + 1,
        badges: p.badges.includes('unit-done') ? p.badges : [...p.badges, 'unit-done']
      }
    })
    // 里程碑徽章：完成后测满分 / 连续天数 / 完成过半 / 全部结业
    const all = await getAllAssessments()
    const unitsDone = Object.values(all).filter((r) => r.post).length
    const totalUnits = flatUnits.length
    const perfectPost = st.postTotal > 0 && st.postScore === st.postTotal
    const newIds = evaluateBadges(next, { perfectPost, unitsDone, totalUnits })
    if (newIds.length) {
      next = await updateProgress((p) => ({ ...p, badges: [...new Set([...p.badges, ...newIds])] }))
    }
    // 升级 / 成就演出
    const delta = celebrationFor(prev, next, newIds)
    if (delta.leveledUp || delta.badges.length) setCelebration(delta)
    setSummary({
      gain,
      preMastered: st.preMastered,
      pre: st.preScore,
      post: st.postScore,
      preTotal: st.preTotal,
      postTotal: st.postTotal,
      perfectPost
    })
  }

  if (!ready || !unit) return <div className="state">加载中…</div>

  // 学习旅程进度轨：前测 → 学习中 → 探索挑战 → 后测
  const railSegs = [
    { done: status.hasPre, label: '前测' },
    { done: true, label: '学习' },
    { done: blocks.some((b) => b.kind === 'explore' || b.kind === 'challenge'), label: '探索' },
    { done: status.hasPost, label: '后测' },
  ]

  // 自适应路由：计算"下一单元"（用于增益弹窗的真实分流）
  const flatUnits = course?.chapters?.flatMap((ch) => ch.units) || []
  const curIdx = flatUnits.findIndex((x) => x.id === unitId)
  const nextUnit = curIdx >= 0 && curIdx < flatUnits.length - 1 ? flatUnits[curIdx + 1] : null

  return (
    <CourseShell course={course} status={allStatus} courseId={courseId} activeUnitId={unitId}>
      <div className="learn">
      <div className="learn-head">
        <Link to={`/course/${courseId}`} className="back">← {course?.title}</Link>
        <h1>{unit.title}</h1>
        <div className="meta">{unit.duration}</div>
        <ul className="objectives">
          {unit.objectives.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
        <div className="phase-info">
          <span className="phase-pill">课前测 <b>{status.hasPre ? `${status.preScore}/${status.preTotal}` : '未做'}</b></span>
          <span className="phase-pill">课后测 <b>{status.hasPost ? `${status.postScore}/${status.postTotal}` : '未做'}</b></span>
        </div>
        <div className="progress-rail" aria-label="学习进度">
          {railSegs.map((s, i) => (
            <div key={i} className={`seg ${s.done ? 'done' : ''}`} title={s.label} />
          ))}
        </div>
      </div>

      <div className="learn-body">
        {blocks.map((b, idx) => {
          const wrap = (node) => (
            <div
              key={idx}
              ref={(el) => { if (el) blockRefs.current[idx] = el }}
              data-idx={idx}
              data-kind={b.kind || 'md'}
              className="lb-block"
            >
              {node}
            </div>
          )
          return wrap(renderBlockContent(b, unitId, renderBlockContent))
        })}
      </div>

      <div className="learn-foot">
        {!status.hasPre && (
          <button className="btn" onClick={() => setShowPre(true)}>
            重做课前测
          </button>
        )}
        {!status.hasPost ? (
          <Magnetic>
            <button className="btn primary" onClick={() => setShowPost(true)}>
              完成后测 →
            </button>
          </Magnetic>
        ) : (
          <Magnetic>
            <button className="btn primary" onClick={() => setShowPost(true)}>
              重做后测
            </button>
          </Magnetic>
        )}
        {status.hasPost && (
          <button className="btn" onClick={() => navigate('/profile')}>
            查看我的进步
          </button>
        )}
      </div>

      {showPre && (
        <AssessmentModal
          title="课前测（低利害 · 可跳过）"
          items={extractItems(assessment.pre)}
          allowSkip={true}
          onClose={closePre}
          onSubmit={(a) => doSubmit('pre', a)}
        />
      )}
      {showPost && (
        <AssessmentModal
          title="课后测（测掌握度）"
          items={extractItems(assessment.post)}
          allowSkip={false}
          onClose={closePost}
          onSubmit={(a) => doSubmit('post', a)}
        />
      )}

      <AnimatePresence>
        {summary && (
          <motion.div
            className="modal-backdrop"
            onClick={() => setSummary(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="modal gain-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
            <h2>本任务学习增益</h2>
            {summary.perfectPost && (
              <div className="gain-perfect">💎 满分过关！这一关被你拿下了</div>
            )}
            {summary.preMastered ? (
              <>
                <div className="gain-num mastered">✓ 已掌握</div>
                <p>
                  课前 {summary.pre}/{summary.preTotal} → 课后 {summary.post}/{summary.postTotal}
                </p>
                <p className="hint">
                  课前测已是满分，说明本任务对你大都是已知内容。
                </p>
                <div className="gain-actions">
                  {nextUnit ? (
                    <Link className="btn ghost" to={`/learn/${courseId}/${nextUnit.id}`}>
                      下一任务：{nextUnit.title} →
                    </Link>
                  ) : (
                    <span className="hint">已是最后一任务 🎉 去「学习画像」看看你的成长</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className={`gain-num ${summary.gain > 0 ? 'up' : summary.gain < 0 ? 'down' : 'flat'}`}>
                  {summary.gain >= 0 ? '+' : ''}
                  {summary.gain}
                  <span>%</span>
                </div>
                <p>
                  课前 {summary.pre}/{summary.preTotal} → 课后 {summary.post}/{summary.postTotal}
                </p>
                <div className="gain-actions">
                  {summary.gain > 0 ? (
                    <>
                      <p className="hint">有效学习！继续保持。</p>
                      {nextUnit && (
                        <Link className="btn ghost" to={`/learn/${courseId}/${nextUnit.id}`}>
                          下一任务：{nextUnit.title} →
                        </Link>
                      )}
                    </>
                  ) : summary.gain === 0 ? (
                    <>
                      <p className="hint">持平，建议复习本任务薄弱点。</p>
                      <button className="btn ghost" onClick={() => { setSummary(null); navigate('/profile') }}>
                        查看错题本 →
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="hint">提示退步：后测低于前测，建议重做本任务弱项。</p>
                      <button className="btn ghost" onClick={() => { setSummary(null); setShowPost(true) }}>
                        重做后测 →
                      </button>
                      <button className="btn ghost" onClick={() => { setSummary(null); navigate('/profile') }}>
                        看错题本 →
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
            <button className="btn primary" onClick={() => setSummary(null)}>
              好的
            </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Celebration data={celebration} onDone={() => setCelebration(null)} />

      </div>
    </CourseShell>
  )
}
