import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllAssessments, getProgress, getUser, setUserName, getTimes, getWrongBook } from '../lib/storage'
import { getAssessment } from '../lib/api'
import { Reveal, Stagger, StaggerItem } from './motion'
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

export default function Profile() {
  const [progress, setProgress] = useState(null)
  const [assess, setAssess] = useState({})
  const [user, setUser] = useState(null)
  const [name, setName] = useState('')
  const [times, setTimes] = useState({ units: {}, days: {} })
  const [wrongBook, setWrongBook] = useState([])

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
    })()
  }, [])

  if (!progress) return <div className="state">加载中…</div>

  const units = Object.entries(assess)

  return (
    <div className="profile">
      <Reveal>
        <h1>我的进步</h1>
      </Reveal>

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
          <Stagger className="stats">
            <StaggerItem><div className="stat"><b>{progress.xp}</b><span>经验 XP</span></div></StaggerItem>
            <StaggerItem><div className="stat"><b>{progress.streak}</b><span>连续完成</span></div></StaggerItem>
            <StaggerItem><div className="stat"><b>{progress.badges.length}</b><span>徽章</span></div></StaggerItem>
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
          还没有完成任何任务，<Link to="/">去学习 →</Link>
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
        <div className="state">还没有错题，继续保持 👍</div>
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
    </div>
  )
}
