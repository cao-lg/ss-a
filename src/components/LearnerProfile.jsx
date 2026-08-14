// 学习画像（个人诊断画像）：把已落库的学习记录 + 行为事件 综合成"立体画像"。
// 输入：assess / checkpoint·explore·challenge·behavior 记录 / progress / time / 全课程索引
// 输出：八维能力雷达 / 各项目能力分布 / 学习曲线 / 时间热力 / 学习风格 / 结业就绪度 /
//       薄弱知识域 / 阶段通关 / 自适应建议
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllAssessments, getCheckpoints, getProgress, getTimes, getAllExams, getBehaviors } from '../lib/storage'
import { listCourses, getCourse } from '../lib/api'
import { computeAnalytics } from '../lib/analytics'
import RadarChart from './RadarChart'
import LineChart from './LineChart'
import BarsChart from './BarsChart'
import Heatmap from './Heatmap'
import Gauge from './Gauge'
import { Reveal, Stagger, StaggerItem } from './motion'

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0)
const pct = (x) => Math.round((x || 0) * 100)
const fmtMin = (ms) =>
  ms >= 3600000 ? (ms / 3600000).toFixed(1) + ' 小时' : Math.max(1, Math.round(ms / 60000)) + ' 分钟'

export default function LearnerProfile() {
  const [d, setD] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [assess, cp, prog, times, exams, behaviors] = await Promise.all([
        getAllAssessments(),
        getCheckpoints(),
        getProgress(),
        getTimes(),
        getAllExams(),
        getBehaviors(),
      ])
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
        best: exams[ch.id]?.bestScore ?? 0,
      }))
      setD({ assess, cp, prog, times, exams, behaviors, courses, index, flatAll, examChapters })
    })()
  }, [])

  if (!d) return <div className="state">生成画像中…</div>

  const { assess, cp, prog, times, exams, behaviors, courses, index, flatAll, examChapters } = d
  const A = computeAnalytics({ assess, cp, prog, times, exams, behaviors, courses, index, flatAll, examChapters })
  const { hasActivity } = A
  const finalPassed = !!exams['final']?.passed
  const anyCourseId = Object.values(index)[0]?.courseId || 'supply-chain'

  const units = A.units
  const assessed = A.assessed
  const preMasteredUnits = units.filter((u) => u.preMastered)
  const negGain = units.filter((u) => u.gain != null && u.gain < 0)
  const strong = units.filter((u) => u.postPct != null && u.postPct >= 0.8 && (u.gain == null || u.gain >= 0))
  const cpAll = Object.values(cp)
  const avgAttempts = cpAll.length ? mean(cpAll.map((c) => c.attempts)) : 0
  const totalMs = Object.values(times.units || {}).reduce((s, v) => s + v, 0)

  // —— 诊断标签 ——
  const tags = []
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
    if (passedExams.length)
      tags.push({ t: `阶段通关 · ${passedExams.length}/${examChapters.length} 章`, c: passedExams.length === examChapters.length ? 'ok' : 'info' })
    if (finalPassed) tags.push({ t: '🎓 结业通关 · 已获结业资格', c: 'ok' })
    if (A.persona.primary && assessed.length) tags.push({ t: `学习风格 · ${A.persona.primary}`, c: 'info' })
  }

  // —— 自适应建议 ——
  const review = []
  const challenge = []
  for (const u of units) {
    if ((u.postPct != null && u.postPct < 0.6) || (u.gain != null && u.gain < 0))
      review.push({ uid: u.uid, title: u.meta.title, courseId: u.meta.courseId })
    if (u.preMastered || (u.postPct != null && u.postPct >= 0.8))
      challenge.push({ uid: u.uid, title: u.meta.title, courseId: u.meta.courseId })
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
          <p className="hint">
            完成几个任务（含前/后测与互动）后，这里会生成你的专属「个人诊断画像」——八维能力雷达、各项目掌握分布、学习曲线、时间热力、学习风格与下一步建议。
          </p>
        </div>
      </Reveal>
    )
  }

  const projectBars = A.projects.map((p) => ({
    id: p.id,
    label: p.title.replace(/^项目[一二三四五六七]\s*/, ''),
    value: p.mastery,
    meta: p,
  }))
  const proj = (s) => s.replace(/^项目[一二三四五六七]\s*/, '')

  return (
    <Reveal>
      <div className="card portrait">
        <h2>学习画像 · 个人诊断（多维立体）</h2>

        {/* 雷达 + 行为画像 */}
        <div className="portrait-grid">
          <div className="portrait-radar">
            <RadarChart axes={A.radarAxes} />
            <div className="portrait-radar-cap">八维能力雷达（按已学任务均值）</div>
          </div>
          <div className="portrait-side">
            <div className="portrait-block">
              <div className="portrait-sub">诊断标签</div>
              <div className="tags">
                {tags.map((tg, i) => (
                  <span key={i} className={`tag ${tg.c}`}>
                    {tg.t}
                  </span>
                ))}
              </div>
            </div>
            <div className="portrait-block">
              <div className="portrait-sub">学习行为画像</div>
              <ul className="behavior">
                <li>
                  已连续学习 <b>{prog.streak}</b> 天 · 累计 <b>{A.studyDays}</b> 个学习日
                </li>
                <li>
                  近 14 天活跃 <b>{A.consistency.last14}</b> 天（节奏 <b>{A.consistency.cadence}%</b>）
                </li>
                <li>
                  {avgAttempts > 1.3
                    ? `试错钻研型 · 互动平均尝试 ${avgAttempts.toFixed(1)} 次`
                    : `一遍过型 · 互动平均尝试 ${avgAttempts.toFixed(1)} 次`}
                </li>
                <li>
                  完成 <b>{A.exploreUnits}</b> 个单元的探索互动 · 挑战尝试 <b>{A.challengeEvents}</b> 次
                </li>
                <li>
                  累计投入 <b>{fmtMin(totalMs)}</b> · 单次平均 <b>{A.consistency.sessionMin.toFixed(1)}</b> 分钟
                </li>
                <li>
                  阅读停留均值 <b>{(A.avgDwell / 1000).toFixed(0)}</b> 秒/段 · 最长读到 <b>{Math.round(A.maxDepth * 100)}%</b>
                </li>
                <li>
                  使用线索 <b>{A.hintEvents}</b> 次
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 学习风格 + 结业就绪 */}
        <div className="portrait-grid two">
          <div className="portrait-block">
            <div className="portrait-sub">学习风格 / 人格</div>
            <div className="persona">
              <div className="persona-main">{A.persona.primary}</div>
              <div className="persona-traits">
                {A.persona.traits.map((t, i) => (
                  <span key={i} className="tag info">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="portrait-block" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Gauge value={A.readiness} label={finalPassed ? '已结业' : '结业就绪度'} />
            <div>
              <div className="portrait-sub">结业大考就绪度</div>
              <p className="hint">
                {finalPassed
                  ? '你已通关结业大考 🎓'
                  : A.readiness >= 75
                  ? '准备就绪，可挑战结业大考'
                  : '建议先补齐薄弱任务再考'}
              </p>
            </div>
          </div>
        </div>

        {/* 各项目能力分布 */}
        <div className="portrait-block">
          <div className="portrait-sub">各项目能力分布（六大项目掌握度）</div>
          <BarsChart data={projectBars} />
          <div className="proj-legend">
            {A.projects.map((p) => (
              <span key={p.id} className="proj-legend-item">
                {proj(p.title)}：覆盖 {p.covered}/{p.totalUnits}
                {p.avgPost != null ? ` · 均掌握 ${pct(p.avgPost)}%` : ''}
              </span>
            ))}
          </div>
        </div>

        {/* 学习曲线 */}
        <div className="portrait-block">
          <div className="portrait-sub">学习曲线（掌握度随时间成长）</div>
          <LineChart curve={A.curve} />
          <div className="lc-legend">
            <span className="dot coral" /> 课后测掌握度
            <span className="dot mint" /> 课前测基线
          </div>
        </div>

        {/* 时间热力 */}
        <div className="portrait-block">
          <div className="portrait-sub">学习时段热力（星期 × 时段，颜色越亮投入越多）</div>
          <Heatmap matrix={A.timeHeat.matrix} labelsY={A.timeHeat.labelsY} labelsX={A.timeHeat.labelsX} max={A.timeHeat.max} />
        </div>

        {/* 薄弱知识域 */}
        {A.weakChapters.length > 0 && (
          <div className="portrait-block">
            <div className="portrait-sub">薄弱知识域（按章）</div>
            <div className="weak-list">
              {A.weakChapters.map((wc) => (
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

        {/* 阶段考试通关 */}
        <div className="portrait-block">
          <div className="portrait-sub">阶段考试通关</div>
          <div className="exam-chips">
            {examChapters.map((e) => (
              <Link key={e.id} to={`/exam/${e.courseId}/${e.id}`} className={`exam-chip ${e.passed ? 'done' : ''}`}>
                <span className="exam-chip-t">{proj(e.title)}</span>
                <span className="exam-chip-s">{e.passed ? `✓ ${e.best}%` : '未通关'}</span>
              </Link>
            ))}
            <Link key="final" to={`/exam/${anyCourseId}/final`} className={`exam-chip ${finalPassed ? 'done' : ''}`}>
              <span className="exam-chip-t">🎓 结业大考</span>
              <span className="exam-chip-s">{finalPassed ? `✓ ${exams['final'].bestScore}%` : '未通关'}</span>
            </Link>
          </div>
        </div>

        {/* 自适应建议 */}
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
