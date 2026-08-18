// 管理后台（教师/运营控制台）：本平台为纯前端 + IndexedDB 单机版，
// 后台聚焦「内容总览 / 内容校验 / 学习数据 / 数据管理」四大本地能力。
// 注：多租户真实后端（Workers+D1、跨用户聚合、权限体系）属独立更大的工程，未在本次范围。
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCourse, listCourses } from '../lib/api'
import {
  getAllAssessments,
  getCheckpoints,
  getProgress,
  getTimes,
  getAllExams,
  exportLearnerData,
  clearAllLearnerData,
  importLearnerData,
  getIdentity
} from '../lib/storage'
import { parseDirectives } from '../lib/mdParser'
import { Reveal, Stagger, StaggerItem } from './motion'
import VerifyPanel from './VerifyPanel'

const ADMIN_PASS = 'admin123'
const EXAM_IDS = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'final']
const DATA = import.meta.env.BASE_URL + 'data'

export default function AdminConsole() {
  const [unlocked, setUnlocked] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem('lp:adminUnlocked') === '1'
  )
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')

  const tryUnlock = (e) => {
    e.preventDefault()
    if (pass === ADMIN_PASS) {
      sessionStorage.setItem('lp:adminUnlocked', '1')
      setUnlocked(true)
    } else {
      setErr('口令不正确')
    }
  }

  if (!unlocked) {
    return (
      <div className="admin-gate card">
        <h2>🔐 管理后台</h2>
        <p className="hint">请输入管理口令进入控制台。默认口令 <code>admin123</code>（演示用，生产应改为服务端鉴权）。</p>
        <form className="admin-gate-form" onSubmit={tryUnlock}>
          <input
            className="inp"
            type="password"
            placeholder="管理口令"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoFocus
          />
          <button className="btn primary" type="submit">进入</button>
        </form>
        {err && <div className="admin-err">{err}</div>}
      </div>
    )
  }

  return (
    <div className="admin">
      <Reveal>
        <Link to="/" className="back">← 返回课程</Link>
        <h1>管理后台 · 教师控制台</h1>
        <p className="desc">
          本平台为纯前端单机版（数据存于浏览器 IndexedDB）。后台提供内容总览、内容校验、学习数据与数据管理四类本地工具。
          <strong>多租户真实后端</strong>（云端账号、跨学员聚合、权限分级）为独立工程，可后续基于 Cloudflare Workers + D1 构建。
        </p>
      </Reveal>
      <Overview />
      <ContentCheck />
      <LearningData />
      <IdentityPanel />
      <DataMgmt />
      <VerifyPanel />
    </div>
  )
}

function Overview() {
  const [d, setD] = useState(null)
  useEffect(() => {
    ;(async () => {
      const courseIds = await listCourses()
      const courses = await Promise.all(courseIds.map((id) => getCourse(id)))
      const chapters = courses.reduce((s, c) => s + (c.chapters?.length || 0), 0)
      const units = courses.reduce((s, c) => s + (c.chapters || []).reduce((a, ch) => a + (ch.units?.length || 0), 0), 0)
      const [assess, progress, times, exams] = await Promise.all([
        getAllAssessments(),
        getProgress(),
        getTimes(),
        getAllExams()
      ])
      const completed = Object.values(assess).filter((r) => r.pre && r.post).length
      const examAttempts = Object.values(exams).reduce((s, e) => s + (e.attempts?.length || 0), 0)
      const passedCh = Object.values(exams).filter((e) => e.passed).length
      const totalMs = Object.values(times.units || {}).reduce((s, v) => s + v, 0)
      const fmtMin = totalMs >= 3600000 ? (totalMs / 3600000).toFixed(1) + ' 小时' : Math.max(1, Math.round(totalMs / 60000)) + ' 分钟'
      setD({
        courseCount: courses.length,
        chapters,
        units,
        examCount: EXAM_IDS.length,
        completed,
        totalUnits: units,
        streak: progress.streak || 0,
        examAttempts,
        passedCh,
        fmtMin
      })
    })()
  }, [])
  if (!d) return <div className="state">加载中…</div>
  const cards = [
    { b: d.courseCount, s: '课程数' },
    { b: d.chapters, s: '章节数' },
    { b: d.units, s: '任务数' },
    { b: `${d.examCount}`, s: '考试数(阶段+结业)' },
    { b: `${d.completed}/${d.totalUnits}`, s: '已学完任务' },
    { b: `${d.passedCh}/${d.chapters}`, s: '阶段考试通关' },
    { b: d.examAttempts, s: '考试总次数' },
    { b: d.streak, s: '当前连续学习(天)' },
    { b: d.fmtMin, s: '累计学习时长' }
  ]
  return (
    <section className="admin-sec">
      <h2>📊 内容总览</h2>
      <div className="stat-grid">
        {cards.map((c, i) => (
          <div className="stat" key={i}><b>{c.b}</b><span>{c.s}</span></div>
        ))}
      </div>
    </section>
  )
}

function ContentCheck() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)
  const run = async () => {
    setRunning(true)
    setResults(null)
    const out = []
    try {
      const course = await getCourse('supply-chain')
      const unitIds = course.chapters.flatMap((ch) => ch.units.map((u) => u.id))
      // 单元 md 解析校验
      for (const uid of unitIds) {
        try {
          const txt = await (await fetch(`${DATA}/courses/${uid}.md`)).text()
          const blocks = parseDirectives(txt)
          const dirs = blocks.filter((b) => b.type === 'directive')
          const ok = dirs.length > 0 && !/\|.{0,3}(\||\n\|){9}/.test(txt) // 无宽表残留
          out.push({
            name: `任务 ${uid}.md`,
            type: '内容解析',
            ok,
            detail: ok ? `解析通过，情境/互动指令 ${dirs.length} 个` : '解析异常或存在宽表'
          })
        } catch (e) {
          out.push({ name: `任务 ${uid}.md`, type: '内容解析', ok: false, detail: '读取失败: ' + e.message })
        }
      }
      // 题库校验
      for (const eid of EXAM_IDS) {
        try {
          const j = await (await fetch(`${DATA}/exams/${eid}.json`)).json()
          let bad = 0
          for (const it of j.pool || []) {
            if (it.type === 'multiple_choice' && (!it.options?.includes(it.answer))) bad++
          }
          const pickOk = (j.pick || j.pool.length) <= (j.pool?.length || 0)
          const ok = bad === 0 && pickOk
          out.push({
            name: `题库 ${eid}.json`,
            type: '题库校验',
            ok,
            detail: ok
              ? `抽题 ${j.pick || j.pool.length}/${j.pool.length}，答案均命中`
              : (bad ? `${bad} 题答案不在选项内` : 'pick 超出题库')
          })
        } catch (e) {
          out.push({ name: `题库 ${eid}.json`, type: '题库校验', ok: false, detail: '读取失败: ' + e.message })
        }
      }
    } catch (e) {
      out.push({ name: '整体', type: '系统', ok: false, detail: e.message })
    }
    setResults(out)
    setRunning(false)
  }
  const passCount = results?.filter((r) => r.ok).length
  return (
    <section className="admin-sec">
      <h2>🛡️ 内容校验</h2>
      <p className="hint">校验全部任务情境剧本解析、阶段/结业题库答案命中与抽题合理性。建议每次内容更新后运行一次。</p>
      <button className="btn" onClick={run} disabled={running}>{running ? '校验中…' : '运行内容校验'}</button>
      {results && (
        <>
          <div className={`admin-summary ${passCount === results.length ? 'ok' : 'bad'}`}>
            通过 {passCount}/{results.length}
          </div>
          <div className="admin-table">
            {results.map((r, i) => (
              <div className={`admin-row ${r.ok ? 'ok' : 'bad'}`} key={i}>
                <span className="ar-name">{r.name}</span>
                <span className="ar-type">{r.type}</span>
                <span className="ar-detail">{r.detail}</span>
                <span className="ar-flag">{r.ok ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function LearningData() {
  const [d, setD] = useState(null)
  useEffect(() => {
    ;(async () => {
      const [assess, cp, exams, times, course] = await Promise.all([
        getAllAssessments(),
        getCheckpoints(),
        getAllExams(),
        getTimes(),
        getCourse('supply-chain')
      ])
      const units = Object.entries(assess).map(([uid, rec]) => {
        const pre = rec.pre, post = rec.post
        const postPct = post && post.total ? post.score / post.total : null
        return { uid, has: !!(pre && post), postPct }
      })
      const completed = units.filter((u) => u.has).length
      const totalUnits = course.chapters.flatMap((ch) => ch.units).length
      const examRows = Object.entries(exams).map(([id, e]) => ({
        id,
        attempts: e.attempts?.length || 0,
        best: e.bestScore ?? 0,
        passed: !!e.passed
      }))
      const weak = units.filter((u) => u.postPct != null && u.postPct < 0.6)
      const totalMs = Object.values(times.units || {}).reduce((s, v) => s + v, 0)
      setD({ completed, totalUnits, examRows, weakCount: weak.length, totalMs })
    })()
  }, [])
  if (!d) return <div className="state">加载中…</div>
  const fmtMin = d.totalMs >= 3600000 ? (d.totalMs / 3600000).toFixed(1) + ' 小时' : Math.max(1, Math.round(d.totalMs / 60000)) + ' 分钟'
  return (
    <section className="admin-sec">
      <h2>📈 学习数据（本机）</h2>
      <div className="stat-grid small">
        <div className="stat"><b>{d.completed}/{d.totalUnits}</b><span>已学完任务</span></div>
        <div className="stat"><b>{d.examRows.length}</b><span>已参加考试科目</span></div>
        <div className="stat"><b>{d.weakCount}</b><span>后测低于 60% 任务</span></div>
        <div className="stat"><b>{fmtMin}</b><span>累计学习时长</span></div>
      </div>
      <h3>考试记录</h3>
      <div className="admin-table">
        <div className="admin-row head">
          <span className="ar-name">科目</span><span className="ar-type">次数</span>
          <span className="ar-detail">最佳分</span><span className="ar-flag">状态</span>
        </div>
        {d.examRows.length === 0 && <div className="admin-row"><span className="ar-detail">暂无考试记录</span></div>}
        {d.examRows.map((r) => (
          <div className={`admin-row ${r.passed ? 'ok' : ''}`} key={r.id}>
            <span className="ar-name">{r.id === 'final' ? '🎓 结业大考' : r.id}</span>
            <span className="ar-type">{r.attempts}</span>
            <span className="ar-detail">{r.best}%</span>
            <span className="ar-flag">{r.passed ? '✓ 通关' : '—'}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function IdentityPanel() {
  const [id, setId] = useState(null)
  const [msg, setMsg] = useState('')
  const refresh = () => { getIdentity().then(setId) }
  useEffect(refresh, [])
  const activate = () => window.dispatchEvent(new Event('lp:open-identity'))
  const onPick = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setMsg('')
    try {
      await importLearnerData(await f.text())
      setMsg('已恢复你自己的学习数据。')
      refresh()
    } catch (err) {
      setMsg('导入失败：' + err.message)
    }
  }
  return (
    <section className="admin-sec identity-panel">
      <h2>🪪 数据归属与身份</h2>
      {id ? (
        <div className="identity-status ok">当前身份：<b>{id.name}</b>（学号 {id.sid}）· 数据已绑定，导出可被老师验证</div>
      ) : (
        <div className="identity-status warn">尚未激活身份：导出数据无归属证明，老师无法核验。请点击下方激活。</div>
      )}
      <div className="admin-mgmt">
        <button className="btn" onClick={activate}>{id ? '更换 / 重新激活身份' : '激活身份'}</button>
        <label className="btn ghost file-btn">导入导出文件
          <input type="file" accept="application/json,.json" onChange={onPick} hidden />
        </label>
      </div>
      {msg && <div className="admin-msg">{msg}</div>}
    </section>
  )
}

const TEACHER_EMAIL_KEY = 'lp:teacherEmail'

function DataMgmt() {
  const [msg, setMsg] = useState('')
  const [teacherEmail, setTeacherEmail] = useState(() => {
    try { return localStorage.getItem(TEACHER_EMAIL_KEY) || '' } catch { return '' }
  })
  const saveEmail = (v) => {
    setTeacherEmail(v)
    try { localStorage.setItem(TEACHER_EMAIL_KEY, v) } catch {}
  }

  const runExport = async () => {
    const data = await exportLearnerData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const today = new Date().toISOString().slice(0, 10)
    const sid = data.identity?.sid || 'unknown'
    const name = data.identity?.name || 'unknown'
    a.download = `learner-data-${sid}-${today}.json`
    a.click()
    URL.revokeObjectURL(url)
    return { data, today, sid, name }
  }

  const doExport = async () => {
    await runExport()
    setMsg('已导出本机学习数据 JSON')
  }

  const sendToTeacher = async () => {
    if (!teacherEmail.trim()) {
      setMsg('请先填写老师邮箱')
      return
    }
    const { data, today, sid, name } = await runExport()
    const subject = `[学练测平台] 学习数据提交 - 学号${sid} ${name} - ${today}`
    const body = `老师您好，\n\n附件是我的学习数据文件，请查收。\n\n- 学号：${sid}\n- 姓名：${name}\n- 提交日期：${today}\n\n该文件已绑定本人身份并带防篡改校验，可在老师控制台核验。\n\n（此邮件由「学练测平台」学生端自动生成）`
    window.location.href = `mailto:${encodeURIComponent(teacherEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setMsg('已唤起邮件客户端并导出数据文件，请手动附加 JSON 附件后发送给老师')
  }

  const doReset = async () => {
    if (!window.confirm('确定清空本机全部学习记录（用户/评测/检查点/进度/时长/考试）？此操作不可撤销。')) return
    await clearAllLearnerData()
    setMsg('已清空本机全部学习数据，刷新页面后生效')
  }

  return (
    <section className="admin-sec">
      <h2>🧰 数据管理</h2>
      <p className="hint">设置老师邮箱后，可一键导出并通过邮件客户端发送；邮件主题已固定格式，方便老师分类归档。</p>
      <div className="admin-email-row">
        <label>老师邮箱</label>
        <input
          type="email"
          className="inp email-inp"
          placeholder="teacher@school.edu.cn"
          value={teacherEmail}
          onChange={(e) => saveEmail(e.target.value)}
        />
      </div>
      <div className="admin-mgmt">
        <button className="btn" onClick={doExport}>导出本机学习数据</button>
        <button className="btn" onClick={sendToTeacher}>📧 导出并发送给老师</button>
        <button className="btn danger" onClick={doReset}>清空本机全部学习数据</button>
      </div>
      {msg && <div className="admin-msg">{msg}</div>}
    </section>
  )
}
