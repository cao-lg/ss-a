// 本地持久化层：用 idb-keyval（IndexedDB）模拟后端 D1 存储。
// 对应《需求补充规格 v0.2》新增表：assessment_records / checkpoint_records / progress
import { get, set, del } from 'idb-keyval'
import { isConsented } from './consent'
import { deriveMacKey, bundleMac, verifyCert, verifyBundle } from './identity'

// 行为事件日志的读取入口（实现位于 behavior.js），在此再导出便于画像统一读取。
export { getBehaviors } from './behavior'

// 未同意前不持久化任何用户数据（微信规范 2.11）
async function guardedSet(key, val) {
  if (!isConsented()) return
  return set(key, val)
}

const USER_KEY = 'lp:user:v4'
const ASSESS_KEY = 'lp:assess:v4' // { [unitId]: { pre, post, preHistory, postHistory } }
const CP_KEY = 'lp:checkpoint:v4' // { [`${unitId}:${itemId}`]: { kind, correct, attempts, last_at } }
const PROGRESS_KEY = 'lp:progress:v4'
const TIME_KEY = 'lp:time:v4' // { units: { [unitId]: ms }, days: { [YYYY-MM-DD]: ms } }
const EXAM_KEY = 'lp:exam:v4' // { [chapterId]: { attempts, bestScore, passed, lastTaken } }
const UNITTEST_KEY = 'lp:unittest:v4' // { [unitId]: { attempts, bestScore, passed, lastTaken } }
const BEHAVIOR_KEY = 'lp:behavior:v4' // 行为事件日志 { [ts,type,...payload] }
const IDENTITY_KEY = 'lp:identity:v4' // 老师签发证书 + 学生激活码（数据归属/防篡改）
const FOREIGN_KEY = 'lp:foreign:v4' // 导入的他人数据（保留原主标记，只读）

export async function getOrCreateUser() {
  let u = await get(USER_KEY)
  if (!u) {
    u = { id: 'u_' + Math.random().toString(36).slice(2, 10), name: '体验学员', createdAt: Date.now() }
    await guardedSet(USER_KEY, u)
  }
  return u
}

export async function setUserName(name) {
  const u = await getOrCreateUser()
  u.name = name || u.name
  await guardedSet(USER_KEY, u)
  return u
}

export async function getUser() {
  return get(USER_KEY)
}

// 身份：老师签发的证书(sid,name,sig) + 学生本地持有的激活码(code)，用于数据归属与防篡改
export async function getIdentity() {
  return (await get(IDENTITY_KEY)) || null
}
export async function setIdentity(id) {
  await guardedSet(IDENTITY_KEY, id)
}
export async function getForeignImport() {
  return (await get(FOREIGN_KEY)) || null
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
  await guardedSet(ASSESS_KEY, all)
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
  await guardedSet(CP_KEY, all)
}

export async function getCheckpoints() {
  return (await get(CP_KEY)) || {}
}

export async function getProgress() {
  return (
    (await get(PROGRESS_KEY)) || {
      xp: 0,
      streak: 0,
      streakDays: 0,
      lastDay: null,
      badges: [],
      updated_at: Date.now()
    }
  )
}

export async function updateProgress(fn) {
  const p = await getProgress()
  const np = fn(p)
  np.updated_at = Date.now()
  await guardedSet(PROGRESS_KEY, np)
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
  await guardedSet(TIME_KEY, all)
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
  await guardedSet(EXAM_KEY, all)
}

export async function getExamRecord(chapterId) {
  const all = (await get(EXAM_KEY)) || {}
  return all[chapterId] || {}
}

export async function getAllExams() {
  return (await get(EXAM_KEY)) || {}
}

// 单元测试记录：按 unitId -> { attempts, bestScore, passed, lastTaken }
export async function saveUnitTest(unitId, record) {
  const all = (await get(UNITTEST_KEY)) || {}
  const u = all[unitId] || { attempts: [] }
  u.attempts = [...(u.attempts || []), record].slice(-10)
  u.bestScore = Math.max(u.bestScore ?? 0, record.pct)
  u.passed = u.passed || record.passed
  u.lastTaken = record.taken_at
  all[unitId] = u
  await guardedSet(UNITTEST_KEY, all)
}

export async function getUnitTestRecord(unitId) {
  const all = (await get(UNITTEST_KEY)) || {}
  return all[unitId] || {}
}

export async function getAllUnitTests() {
  return (await get(UNITTEST_KEY)) || {}
}

// 管理后台：导出 / 清空全部学习者数据（不含课程内容静态资源）
export async function exportLearnerData() {
  const [user, assess, checkpoints, progress, time, exams, unitTests, behaviors] = await Promise.all([
    get(USER_KEY), get(ASSESS_KEY), get(CP_KEY), get(PROGRESS_KEY),
    get(TIME_KEY), get(EXAM_KEY), get(UNITTEST_KEY), get(BEHAVIOR_KEY)
  ])
  const records = { user, assess, checkpoints, progress, time, exams, unitTests, behaviors }
  const out = { app: 'learn-platform', version: 2, exportedAt: Date.now(), records }
  const id = await getIdentity()
  if (id) {
    // 绑定身份 + 防篡改：用激活码派生 HMAC 密钥对全量记录算 MAC
    out.identity = { sid: id.sid, name: id.name, sig: id.sig }
    const k = await deriveMacKey(id.code)
    out.mac = await bundleMac(k, { sid: id.sid, name: id.name, records })
  }
  return out
}

const ALL_KEYS = [USER_KEY, ASSESS_KEY, CP_KEY, PROGRESS_KEY, TIME_KEY, EXAM_KEY, UNITTEST_KEY, BEHAVIOR_KEY, FOREIGN_KEY]
export async function clearAllLearnerData() {
  for (const k of ALL_KEYS) await del(k)
}

// 导入导出文件：
//  - 归属与当前身份一致 → 恢复数据，并用 bundleMac 校验是否被篡改；
//  - 归属不一致（导入了别人的文件）→ 保留原主标记存入「外来数据」，不并入本人记录，
//    从而实现「导入别人数据仍显示别人的学号+姓名、无法冒用成自己」。
export async function importLearnerData(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json
  if (!data || typeof data !== 'object' || !data.records) throw new Error('文件格式不正确')
  const me = await getIdentity()
  const fileId = data.identity || null
  const sameOwner = me && fileId && me.sid === fileId.sid && me.name === fileId.name
  if (sameOwner) {
    if (data.mac) {
      const k = await deriveMacKey(me.code)
      const ok = await verifyBundle(k, { sid: fileId.sid, name: fileId.name, records: data.records }, data.mac)
      if (!ok) return { ok: false, reason: 'tampered', owner: fileId }
    }
    const { user, assess, checkpoints, progress, time, exams, unitTests, behaviors } = data.records
    if (user !== undefined) await guardedSet(USER_KEY, user)
    if (assess !== undefined) await guardedSet(ASSESS_KEY, assess)
    if (checkpoints !== undefined) await guardedSet(CP_KEY, checkpoints)
    if (progress !== undefined) await guardedSet(PROGRESS_KEY, progress)
    if (time !== undefined) await guardedSet(TIME_KEY, time)
    if (exams !== undefined) await guardedSet(EXAM_KEY, exams)
    if (unitTests !== undefined) await guardedSet(UNITTEST_KEY, unitTests)
    if (behaviors !== undefined) await guardedSet(BEHAVIOR_KEY, behaviors)
    return { ok: true, merged: true, owner: fileId }
  }
  await guardedSet(FOREIGN_KEY, { identity: fileId, records: data.records, importedAt: Date.now() })
  return { ok: true, foreign: true, owner: fileId }
}
