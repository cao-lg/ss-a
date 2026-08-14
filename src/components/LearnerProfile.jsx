// 学习画像（个人诊断画像）：把已落库的学习记录综合成"画像"。
// 输入：assess(pre/post+history) / checkpoint·explore·challenge 记录 / progress / time / 全课程 unit 索引
// 输出：①能力雷达 ②诊断标签 ③薄弱知识域(按章) ④学习行为画像 ⑤自适应建议(复习/挑战/下一站)
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllAssessments, getCheckpoints, getProgress, getTimes, getAllExams } from '../lib/storage'
import { listCourses, getCourse } from '../lib/api'
import RadarChart from './RadarChart'
import { Reveal, Stagger, StaggerItem } from './motion'

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0)
const pct = (x) => Math.round(x * 100)
const fmtMin = (ms) =>
  ms >= 3600000 ? (ms / 3600000).toFixed(1) + ' 小时' : Math.max(1, Math.round(ms / 60000)) + ' 分钟'

export default function LearnerProfile() {
  const [d, setD] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [assess, cp, prog, times, exams] = await Promise.all([
        getAllAssessments(),
        getCheckpoints(),
        getProgress(),
        getTimes(),
        getAllExams()
      ])
      // 构建 unit 索引：unitId -> { title, chapterTitle, courseId }
      const courseIds = await listCourses()
      const courses = await Promise.all(courseIds.map((id) => getCourse(id)))
      const index = {}
      const flatAll = []
      const chapters = []
      for (const c of courses) {
        for (const ch of c.chapters || []) {
          chapters.push({ id: ch.id, title: ch.title, courseId: c.id })
          for (const u of ch.units || []) {
            index[u.id] = { title: u.title, chapterTitle: ch.title, courseId: c.id }
            flatAll.push(u.id)
          }
        }
      }
      const examChapters = chapters.map((ch) => ({
        ...ch,
        passed: !!exams[ch.id]?.passed,
        best: exams[ch.id]?.bestScore ?? 0
      }))
      setD({ assess, cp, prog, times, exams, index, flatAll, examChapters })
    })()
  }, [])

  if (!d) return <div className="state">生成画像中…</div>

  const { assess, cp, prog, times, exams, index, flatAll, examChapters } = d
  const finalPassed = !!exams['final']?.passed
  const anyCourseId = Object.values(index)[0]?.courseId || 'supply-chain'

  // —— 逐单元掌握度与增益 ——
  const units = Object.entries(assess).map(([uid, rec]) => {
    const pre = rec.pre
    const post = rec.post
    let prePct = null
    let postPct = null
    let gain = null
    let weakPost = 0
    if (pre && pre.total) {
      prePct = pre.score / pre.total
      if (post && post.total) {
        postPct = post.score / post.total
        gain = postPct - prePct
      }
    }
    if (post && Array.isArray(post.graded)) weakPost = post.graded.filter((g) => !g.correct).length
    const preMastered = !!(pre && pre.total > 0 && pre.score === pre.total)
    return { uid, prePct, postPct, gain, weakPost, preMastered, meta: index[uid] || { title: uid, chapterTitle: '未归类', courseId: '' } }
  })

  const assessed = units.filter((u) => u.prePct != null && u.postPct != null)
  const hasActivity = units.length > 0 || Object.keys(cp).length > 0 || Object.keys(exams).length > 0

  // —— 能力雷达 5 维 ——
  const cpCheck = Object.values(cp).filter((c) => c.kind === 'checkpoint')
  const cpChal = Object.values(cp).filter((c) => c.kind === 'challenge')
  const avgPre = assessed.length ? mean(assessed.map((u) => u.prePct)) : 0
  const avgPost = assessed.length ? mean(assessed.map((u) => u.postPct)) : 0
  const cpAcc = cpCheck.length ? mean(cpCheck.map((c) => c.correct)) : 0
  const chAcc = cpChal.length ? mean(cpChal.map((c) => c.correct)) : 0
  const coverage = flatAll.length ? Object.keys(assess).length / flatAll.length : 0
  const radarAxes = [
    { label: '前测基线', value: pct(avgPre) },
    { label: '后测掌握', value: pct(avgPost) },
    { label: '检查点', value: pct(cpAcc) },
    { label: '挑战', value: pct(chAcc) },
    { label: '学习覆盖', value: pct(coverage) }
  ]

  // —— 诊断标签 ——
  const tags = []
  const preMasteredUnits = units.filter((u) => u.preMastered)
  const negGain = units.filter((u) => u.gain != null && u.gain < 0)
  const strong = units.filter((u) => u.postPct != null && u.postPct >= 0.8 && (u.gain == null || u.gain >= 0))
  if (!hasActivity) {
    tags.push({ t: '尚未开始诊断', c: 'muted' })
  } else {
    if (preMasteredUnits.length) tags.push({ t: `已掌握型 · 前测满分 ${preMasteredUnits.length} 个`, c: 'ok' })
    if (negGain.length) tags.push({ t: `退步预警 · ${negGain.length} 个任务后测低于前测`, c: 'bad' })
    if (strong.length && !negGain.length) tags.push({ t: '稳步提升型', c: 'info' })
    if (assessed.length >= 3) {
      const ps = assessed.map((u) => u.postPct)
      if (Math.max(...ps) - Math.min(...ps) > 0.4) tags.push({ t: '偏科型 · 强弱不均', c: 'warn' })
    }
    const passedExams = examChapters.filter((e) => e.passed)
    if (passedExams.length) {
      tags.push({
        t: `阶段通关 · ${passedExams.length}/${examChapters.length} 章`,
        c: passedExams.length === examChapters.length ? 'ok' : 'info'
      })
    }
    const finalPassed = !!exams['final']?.passed
    if (finalPassed) {
      tags.push({ t: '🎓 结业通关 · 已获结业资格', c: 'ok' })
    }
  }

  // —— 薄弱知识域（按章聚合） ——
  const weakByChapter = {}
  for (const u of units) {
    const weak = (u.postPct != null && u.postPct < 0.6) || (u.gain != null && u.gain < 0) || u.weakPost > 0
    if (!weak) continue
    const ch = u.meta.chapterTitle
    const arr = (weakByChapter[ch] ||= { chapter: ch, units: [], score: 0 })
    arr.units.push({ uid: u.uid, title: u.meta.title, postPct: u.postPct, gain: u.gain, weakPost: u.weakPost })
    arr.score += (u.postPct != null ? 1 - u.postPct : 0) + (u.gain != null ? Math.max(0, -u.gain) : 0) + u.weakPost * 0.08
  }
  const weakChapters = Object.values(weakByChapter).sort((a, b) => b.score - a.score)

  // —— 学习行为画像 ——
  const cpAll = Object.values(cp)
  const avgAttempts = cpAll.length ? mean(cpAll.map((c) => c.attempts)) : 0
  const exploreCount = cpAll.filter((c) => c.kind === 'explore').length
  const studyDays = Object.keys(times.days || {}).length
  const totalMs = Object.values(times.units || {}).reduce((s, v) => s + v, 0)
  const behaviors = [
    `已连续学习 ${prog.streak} 天 · 累计 ${studyDays} 个学习日`,
    avgAttempts > 1.3
      ? `试错钻研型 · 互动平均尝试 ${avgAttempts.toFixed(1)} 次`
      : `一遍过型 · 互动平均尝试 ${avgAttempts.toFixed(1)} 次`,
    `完成 ${exploreCount} 个探索任务`,
    `累计投入 ${fmtMin(totalMs)}`
  ]

  // —— 自适应建议 ——
  const review = []
  const challenge = []
  for (const u of units) {
    if ((u.postPct != null && u.postPct < 0.6) || (u.gain != null && u.gain < 0)) {
      review.push({ uid: u.uid, title: u.meta.title, courseId: u.meta.courseId })
    }
    if (u.preMastered || (u.postPct != null && u.postPct >= 0.8)) {
      challenge.push({ uid: u.uid, title: u.meta.title, courseId: u.meta.courseId })
    }
  }
  const nextUnits = flatAll
    .filter((uid) => !assess[uid])
    .slice(0, 3)
    .map((uid) => ({ uid, title: (index[uid] || {}).title || uid, courseId: (index[uid] || {}).courseId }))

  if (!hasActivity) {
    return (
      <Reveal>
        <div className="card portrait-empty">
          <h2>学习画像</h2>
          <p className="hint">完成几个任务（含前/后测与互动）后，这里会生成你的专属「个人诊断画像」——薄弱知识域、能力雷达、学习风格与下一步建议。</p>
        </div>
      </Reveal>
    )
  }

  return (
    <Reveal>
      <div className="card portrait">
        <h2>学习画像 · 个人诊断</h2>

        <div className="portrait-grid">
          <div className="portrait-radar">
            <RadarChart axes={radarAxes} />
            <div className="portrait-radar-cap">能力雷达（按已学任务均值）</div>
          </div>

          <div className="portrait-side">
            <div className="portrait-block">
              <div className="portrait-sub">诊断标签</div>
              <div className="tags">
                {tags.map((tg, i) => (
                  <span key={i} className={`tag ${tg.c}`}>{tg.t}</span>
                ))}
              </div>
            </div>
            <div className="portrait-block">
              <div className="portrait-sub">学习行为画像</div>
              <ul className="behavior">
                {behaviors.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {weakChapters.length > 0 && (
          <div className="portrait-block">
            <div className="portrait-sub">薄弱知识域（按章）</div>
            <div className="weak-list">
              {weakChapters.map((wc) => (
                <div key={wc.chapter} className="weak-ch">
                  <div className="weak-ch-title">{wc.chapter}</div>
                  <div className="weak-units">
                    {wc.units.map((u) => (
                      <Link key={u.uid} to={`/learn/${u.courseId || 'supply-chain'}/${u.uid}`} className="weak-unit">
                        {u.title}
                        {u.postPct != null && <span className="weak-pct">{pct(u.postPct)}%</span>}
                        {u.weakPost > 0 && <span className="weak-wb">错 {u.weakPost}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="portrait-block">
          <div className="portrait-sub">阶段考试通关</div>
            <div className="exam-chips">
            {examChapters.map((e) => (
              <Link key={e.id} to={`/exam/${e.courseId}/${e.id}`} className={`exam-chip ${e.passed ? 'done' : ''}`}>
                <span className="exam-chip-t">{e.title.replace(/^项目[一二三四五六七]\s*/, '')}</span>
                <span className="exam-chip-s">{e.passed ? `✓ ${e.best}%` : '未通关'}</span>
              </Link>
            ))}
            <Link key="final" to={`/exam/${anyCourseId}/final`} className={`exam-chip ${finalPassed ? 'done' : ''}`}>
              <span className="exam-chip-t">🎓 结业大考</span>
              <span className="exam-chip-s">{finalPassed ? `✓ ${exams['final'].bestScore}%` : '未通关'}</span>
            </Link>
          </div>
        </div>

        <div className="portrait-block">
          <div className="portrait-sub">自适应建议</div>
          <Stagger className="suggest">
            {review.length > 0 && (
              <StaggerItem>
                <div className="suggest-card review">
                  <div className="suggest-h">📘 建议复习</div>
                  <div className="suggest-items">
                    {review.slice(0, 4).map((r) => (
                      <Link key={r.uid} to={`/learn/${r.courseId || 'supply-chain'}/${r.uid}`} className="suggest-link">
                        {r.title} →
                      </Link>
                    ))}
                  </div>
                </div>
              </StaggerItem>
            )}
            {challenge.length > 0 && (
              <StaggerItem>
                <div className="suggest-card chal">
                  <div className="suggest-h">🚀 可挑战更高阶</div>
                  <div className="suggest-items">
                    {challenge.slice(0, 4).map((c) => (
                      <Link key={c.uid} to={`/learn/${c.courseId || 'supply-chain'}/${c.uid}`} className="suggest-link">
                        {c.title} →
                      </Link>
                    ))}
                  </div>
                </div>
              </StaggerItem>
            )}
            {nextUnits.length > 0 && (
              <StaggerItem>
                <div className="suggest-card next">
                  <div className="suggest-h">➡️ 下一站（未学）</div>
                  <div className="suggest-items">
                    {nextUnits.map((n) => (
                      <Link key={n.uid} to={`/learn/${n.courseId || 'supply-chain'}/${n.uid}`} className="suggest-link">
                        {n.title} →
                      </Link>
                    ))}
                  </div>
                </div>
              </StaggerItem>
            )}
          </Stagger>
        </div>
      </div>
    </Reveal>
  )
}
