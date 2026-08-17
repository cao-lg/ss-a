import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllAssessments, getProgress, getUser, setUserName, getTimes, getWrongBook } from '../lib/storage'
import { getAssessment, defaultCourseId } from '../lib/api'
import { MICROCOPY } from '../lib/copy'
import { Reveal, Stagger, StaggerItem } from './motion'
import { levelInfo, BADGES, XP_PER_LEVEL, celebrationFor } from '../lib/gamify'
import Celebration from './Celebration'
import LearnerProfile from './LearnerProfile'

// 兼容两种题库结构：{ items: [...] } 或直接 [...]
function extractItems(block) {
  if (!block) return []
  if (Array.isArray(block)) return block
  if (Array.isArray(block.items)) return block.items
  return []
}

// 把作答值解析成可读文本（选项索引 / 字母 → 选项文本，否则原值）
function fmtAnswer(val, opts) {
  if (val == null) return '（空）'
  if (Array.isArray(opts) && opts.length) {
    const s = String(val).trim()
    if (/^\d+$/.test(s)) {
      const i = Number(s)
      if (opts[i] != null) return opts[i]
    }
    if (/^[A-Da-d]$/.test(s)) {
      const i = s.toUpperCase().charCodeAt(0) - 65
      if (opts[i] != null) return opts[i]
    }
  }
  return String(val)
}

// 尊重 reduced-motion：数字 count-up 直接给终值，不跑动画
const REDUCE =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useCountUp(target, reduce, duration = 900) {
  const [val, setVal] = useState(reduce ? target : 0)
  useEffect(() => {
    if (reduce) {
      setVal(target)
      return
    }
    let raf
    let start = null
    const tick = (t) => {
      if (start == null) start = t
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, reduce, duration])
  return val
}

// 画像页"上次已见"快照：用于检测升级 / 新徽章，触发多步庆祝
const SEEN_KEY = 'profile:seen:v1'

export default function Profile() {
  const [progress, setProgress] = useState(null)
  const [assess, setAssess] = useState({})
  const [user, setUser] = useState(null)
  const [name, setName] = useState('')
  const [times, setTimes] = useState({ units: {}, days: {} })
  const [wrongBook, setWrongBook] = useState([])
  const [celebrate, setCelebrate] = useState(null)
  const [newBadges, setNewBadges] = useState([])
  const [xpWidth, setXpWidth] = useState(0)
  const [testsPath, setTestsPath] = useState('#')

  // lvl / count-up 必须在 early-return 之前计算，保证 hooks 顺序稳定
  const lvl = levelInfo(progress?.xp || 0)
  const xpShown = useCountUp(progress?.xp || 0, REDUCE)
  const xpIntoShown = useCountUp(lvl.xpInto, REDUCE)

  useEffect(() => {
    ;(async () => {
      const [p, a, u, t] = await Promise.all([getProgress(), getAllAssessments(), getUser(), getTimes()])
      setProgress(p)
      setAssess(a)
      setUser(u)
      setName(u?.name || '')
      setTimes(t)
      // 错题本：聚合 post 测错题，并 join 题库补全题干/选项/正确答案
      const wb = await getWrongBook()
      const byUnit = {}
      for (const w of wb) (byUnit[w.unitId] ||= []).push(w)
      const resolved = []
      for (const [uid, items] of Object.entries(byUnit)) {
        const data = await getAssessment(uid)
        const postItems = extractItems(data.post)
        for (const w of items) {
          const it = postItems.find((x) => x.id === w.itemId)
          if (!it) continue
          resolved.push({
            unitId: uid,
            q: it.question || it.title || '（题目）',
            opts: it.options ?? it.testConfig?.options,
            userAnswer: w.userAnswer,
            correct: it.answer ?? it.testConfig?.expected
          })
        }
      }
      setWrongBook(resolved)

      // 升级 / 新徽章检测：与 localStorage 中上次已见快照比对
      const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || 'null')
      const curLevel = levelInfo(p.xp).level
      const curBadges = p.badges || []
      const seenBadges = seen?.badgeIds || []
      const newBadgeIds = seen ? curBadges.filter((id) => !seenBadges.includes(id)) : []
      const leveledUp = seen ? curLevel > (seen?.level || 1) : false
      const xpGain = seen ? Math.max(0, p.xp - (seen?.xp || 0)) : 0
      if (leveledUp || newBadgeIds.length > 0) {
        setCelebrate(
          celebrationFor(seen ? { xp: seen.xp } : { xp: 0 }, p, newBadgeIds)
        )
        setNewBadges(newBadgeIds)
      }
      localStorage.setItem(
        SEEN_KEY,
        JSON.stringify({ level: curLevel, xp: p.xp, badgeIds: curBadges })
      )
    })()
  }, [])

  // XP 进度条：从 0 填充到目标（reduced-motion 直接定值）
  useEffect(() => {
    if (!progress) return
    const target = Math.round(lvl.pct * 100)
    if (REDUCE) {
      setXpWidth(target)
      return
    }
    const id = setTimeout(() => setXpWidth(target), 120)
    return () => clearTimeout(id)
  }, [progress, lvl.pct])

  // 测试中心入口：取首个课程 id 拼 /tests/:courseId
  useEffect(() => {
    defaultCourseId().then((id) => id && setTestsPath(`/tests/${id}`))
  }, [])

  if (!progress) return <div className="state">{MICROCOPY.loading.profile}</div>

  const units = Object.entries(assess)
  const allBadges = Object.values(BADGES)
  const unlockedBadges = allBadges.filter((b) => progress.badges.includes(b.id))

  return (
    <div className="profile">
      <Reveal>
        <h1>我的进步</h1>
      </Reveal>

      {/* 去测验中心：一键直达综合测试入口 */}
      {testsPath !== '#' && (
        <Reveal>
          <Link to={testsPath} className="card go-test">
            <span className="go-test-icon" aria-hidden="true">🧪</span>
            <span className="go-test-body">
              <span className="go-test-title">去测验中心</span>
              <span className="go-test-sub">单元测试 · 项目阶段考 · 结业大考，随时检验掌握度</span>
            </span>
            <span className="go-test-arrow" aria-hidden="true">→</span>
          </Link>
        </Reveal>
      )}

      <Reveal>
        <div className="card">
          <div className="row">
            <span>昵称</span>
            <input
              className="inp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={async () => {
                await setUserName(name)
              }}
            />
          </div>
          <div className="level-badge">
            <span className="lv-tag">Lv.{lvl.level}</span>
            <span className="lv-title">{lvl.title}</span>
            <div className="xp-bar" role="progressbar" aria-valuenow={Math.round(lvl.pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="距下一级经验进度">
              <div className="xp-fill" style={{ width: `${xpWidth}%` }} />
            </div>
            <span className="xp-text">{lvl.maxed ? '已满级 🏆' : `${xpIntoShown}/${XP_PER_LEVEL} XP`}</span>
          </div>
          <Stagger className="stats">
            <StaggerItem><div className="stat"><b>{xpShown}</b><span>经验 XP</span></div></StaggerItem>
            <StaggerItem><div className="stat"><b>{progress.streakDays}</b><span>连续学习(天)</span></div></StaggerItem>
            <StaggerItem><div className="stat"><b>{progress.badges.length}</b><span>徽章</span></div></StaggerItem>
          </Stagger>
        </div>
      </Reveal>

      <Reveal>
        <div className="card badge-card">
          <div className="row">
            <span>成就徽章</span>
            <span className="badge-count">{unlockedBadges.length}/{allBadges.length}</span>
          </div>
          <Stagger className="badge-grid">
            {allBadges.map((b) => {
              const got = progress.badges.includes(b.id)
              const isNew = newBadges.includes(b.id)
              return (
                <StaggerItem key={b.id}>
                  <div
                    className={`badge ${got ? 'got' : 'locked'}${isNew ? ' is-new' : ''}`}
                    title={got ? b.desc : `未解锁：${b.desc}`}
                  >
                    <span className="badge-icon" aria-hidden="true">{got ? b.icon : '🔒'}</span>
                    <span className="badge-title">{b.title}</span>
                    <span className="badge-desc">{b.desc}</span>
                  </div>
                </StaggerItem>
              )
            })}
          </Stagger>
        </div>
      </Reveal>

      {(() => {
        const unitsMap = times.units || {}
        const daysMap = times.days || {}
        const totalMs = Object.values(unitsMap).reduce((s, v) => s + v, 0)
        const todayKey = new Date().toISOString().slice(0, 10)
        const todayMs = daysMap[todayKey] || 0
        const studyDays = Object.keys(daysMap).length
        const topUnits = Object.entries(unitsMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
        const fmtMin = (ms) => (ms >= 3600000 ? (ms / 3600000).toFixed(1) + ' 小时' : Math.round(ms / 60000) + ' 分钟')
        return (
          <Reveal>
            <div className="card time-card">
              <div className="row">
                <span>学习时长</span>
                <span className="time-total">{fmtMin(totalMs)}</span>
              </div>
              <Stagger className="stats">
                <StaggerItem><div className="stat"><b>{fmtMin(todayMs)}</b><span>今日</span></div></StaggerItem>
                <StaggerItem><div className="stat"><b>{studyDays}</b><span>学习天数</span></div></StaggerItem>
                <StaggerItem><div className="stat"><b>{Object.keys(unitsMap).length}</b><span>涉及任务</span></div></StaggerItem>
              </Stagger>
              {topUnits.length > 0 && (
                <div className="time-top">
                  <div className="time-top-title">耗时最多的任务</div>
                  {topUnits.map(([uid, ms]) => (
                    <div key={uid} className="time-top-row">
                      <span className="time-top-name">{uid}</span>
                      <span className="time-top-ms">{fmtMin(ms)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        )
      })()}

      <LearnerProfile />

      <h2>任务掌握度</h2>
      {units.length === 0 && (
        <div className="state">
          {MICROCOPY.empty.mastery}<Link to="/">去学习 →</Link>
        </div>
      )}
      <Reveal>
        <table className="mastery">
          <thead>
            <tr>
              <th>任务</th>
              <th>课前</th>
              <th>课后</th>
              <th>增益</th>
            </tr>
          </thead>
          <tbody>
            {units.map(([uid, rec]) => {
              const pre = rec.pre
              const post = rec.post
              let gain = null
              if (pre && post && post.total) {
                const prePct = pre.total ? pre.score / pre.total : 0
                const postPct = post.total ? post.score / post.total : 0
                gain = Math.round((postPct - prePct) * 100)
              }
              return (
                <tr key={uid}>
                  <td>{uid}</td>
                  <td>{pre ? `${pre.score}/${pre.total}` : '-'}</td>
                  <td>{post ? `${post.score}/${post.total}` : '-'}</td>
                  <td className={gain > 0 ? 'up' : gain < 0 ? 'down' : 'flat'}>
                    {gain == null ? '-' : (gain > 0 ? '+' : '') + gain + '%'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Reveal>

      <h2>错题本</h2>
      {wrongBook.length === 0 && (
        <div className="state">{MICROCOPY.empty.wrongbook}</div>
      )}
      <Reveal>
        <div className="wrongbook">
          {wrongBook.map((w, i) => (
            <div className="wb-item" key={i}>
              <div className="wb-q">
                <span className="wb-unit">{w.unitId}</span>
                {w.q}
              </div>
              <div className="wb-answers">
                <div className="wb-row wrong">
                  <span className="wb-tag">你的答案</span>
                  <span>{fmtAnswer(w.userAnswer, w.opts)}</span>
                </div>
                <div className="wb-row right">
                  <span className="wb-tag">正确答案</span>
                  <span>{fmtAnswer(w.correct, w.opts)}</span>
                </div>
              </div>
              <Link className="wb-redo" to={`/learn/${w.unitId}`}>去重做 →</Link>
            </div>
          ))}
        </div>
      </Reveal>

      {celebrate && (
        <Celebration data={celebrate} onDone={() => setCelebrate(null)} />
      )}
    </div>
  )
}
