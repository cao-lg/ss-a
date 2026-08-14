// 本地持久化层：用 idb-keyval（IndexedDB）模拟后端 D1 存储。
// 对应《需求补充规格 v0.2》新增表：assessment_records / checkpoint_records / progress
import { get, set, del } from 'idb-keyval'

const USER_KEY = 'lp:user:v4'
const ASSESS_KEY = 'lp:assess:v4' // { [unitId]: { pre, post, preHistory, postHistory } }
const CP_KEY = 'lp:checkpoint:v4' // { [`${unitId}:${itemId}`]: { kind, correct, attempts, last_at } }
const PROGRESS_KEY = 'lp:progress:v4'
const TIME_KEY = 'lp:time:v4' // { units: { [unitId]: ms }, days: { [YYYY-MM-DD]: ms } }
const EXAM_KEY = 'lp:exam:v4' // { [chapterId]: { attempts, bestScore, passed, lastTaken } }

export async function getOrCreateUser() {
  let u = await get(USER_KEY)
  if (!u) {
    u = { id: 'u_' + Math.random().toString(36).slice(2, 10), name: '体验学员', createdAt: Date.now() }
    await set(USER_KEY, u)
  }
  return u
}

export async function setUserName(name) {
  const u = await getOrCreateUser()
  u.name = name || u.name
  await set(USER_KEY, u)
  return u
}

export async function getUser() {
  return get(USER_KEY)
}

// 评测记录：按 unitId -> { pre, post, preHistory, postHistory }
// 保留最新记录供状态计算，同时 append 历史（最多保留最近 10 次）供趋势/重做分析
export async function saveAssessment(unitId, phase, record) {
  const all = (await get(ASSESS_KEY)) || {}
  const u = all[unitId] || {}
  const histKey = phase + 'History'
  u[phase] = record
  u[histKey] = [...(u[histKey] || []), record].slice(-10)
  all[unitId] = u
  await set(ASSESS_KEY, all)
}

export async function getStoredAssessment(unitId) {
  const all = (await get(ASSESS_KEY)) || {}
  return all[unitId] || {}
}

export async function getAllAssessments() {
  return (await get(ASSESS_KEY)) || {}
}

// 检查点 / 挑战记录
export async function saveCheckpoint(unitId, itemId, kind, correct, attempts) {
  const all = (await get(CP_KEY)) || {}
  const k = `${unitId}:${itemId}`
  const prev = all[k]
  all[k] = {
    kind,
    correct: correct ? 1 : 0,
    attempts: (prev?.attempts || 0) + (attempts || 1),
    last_at: Date.now()
  }
  await set(CP_KEY, all)
}

export async function getCheckpoints() {
  return (await get(CP_KEY)) || {}
}

export async function getProgress() {
  return (
    (await get(PROGRESS_KEY)) || {
      xp: 0,
      streak: 0,
      badges: [],
      updated_at: Date.now()
    }
  )
}

export async function updateProgress(fn) {
  const p = await getProgress()
  const np = fn(p)
  np.updated_at = Date.now()
  await set(PROGRESS_KEY, np)
  return np
}

// 学习时长：按单元累加 + 按天累加（用于"学了多久、哪天学的最多"）
function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export async function saveTime(unitId, ms) {
  if (!ms || ms <= 0) return
  const all = (await get(TIME_KEY)) || { units: {}, days: {} }
  all.units = all.units || {}
  all.days = all.days || {}
  all.units[unitId] = (all.units[unitId] || 0) + ms
  const k = todayKey()
  all.days[k] = (all.days[k] || 0) + ms
  await set(TIME_KEY, all)
}

export async function getTimes() {
  const all = (await get(TIME_KEY)) || { units: {}, days: {} }
  return { units: all.units || {}, days: all.days || {} }
}

// 错题本：聚合所有单元 post 测中答错的题（含最新一次作答的答案）
export async function getWrongBook() {
  const all = (await get(ASSESS_KEY)) || {}
  const wrong = []
  for (const [unitId, rec] of Object.entries(all)) {
    const post = rec.post
    if (!post || !Array.isArray(post.graded)) continue
    for (const g of post.graded) {
      if (!g.correct) {
        wrong.push({
          unitId,
          itemId: g.id,
          userAnswer: post.answers?.[g.id]
        })
      }
    }
  }
  return wrong
}

// 阶段考试记录：按 chapterId -> { attempts, bestScore, passed, lastTaken }
export async function saveExam(chapterId, record) {
  const all = (await get(EXAM_KEY)) || {}
  const u = all[chapterId] || { attempts: [] }
  u.attempts = [...(u.attempts || []), record].slice(-10)
  u.bestScore = Math.max(u.bestScore ?? 0, record.pct)
  u.passed = u.passed || record.passed
  u.lastTaken = record.taken_at
  all[chapterId] = u
  await set(EXAM_KEY, all)
}

export async function getExamRecord(chapterId) {
  const all = (await get(EXAM_KEY)) || {}
  return all[chapterId] || {}
}

export async function getAllExams() {
  return (await get(EXAM_KEY)) || {}
}

// 管理后台：导出 / 清空全部学习者数据（不含课程内容静态资源）
export async function exportLearnerData() {
  const [user, assess, checkpoints, progress, time, exams] = await Promise.all([
    get(USER_KEY),
    get(ASSESS_KEY),
    get(CP_KEY),
    get(PROGRESS_KEY),
    get(TIME_KEY),
    get(EXAM_KEY)
  ])
  return { exportedAt: Date.now(), user, assess, checkpoints, progress, time, exams }
}

const ALL_KEYS = [USER_KEY, ASSESS_KEY, CP_KEY, PROGRESS_KEY, TIME_KEY, EXAM_KEY]
export async function clearAllLearnerData() {
  for (const k of ALL_KEYS) await del(k)
}
