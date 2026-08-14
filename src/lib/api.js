// 模拟后端 API：前端直接读 public/data 静态内容 + IndexedDB 持久化，
// 等价实现《需求补充规格 v0.2》中的 /api/assessment、/api/assessment/status 等端点。
import { getStoredAssessment, saveAssessment, getOrCreateUser, saveExam, getExamRecord, getAllExams } from './storage'
import { judgeItem } from './judge'
import { buildExamVariant, makeSeed } from './exam'

const DATA = import.meta.env.BASE_URL + 'data'

export async function listCourses() {
  const r = await fetch(`${DATA}/courses/manifest.json`)
  const j = await r.json()
  return j.courses
}

export async function getCourse(id) {
  const r = await fetch(`${DATA}/courses/${id}.json`)
  return r.json()
}

export async function getUnitContent(path) {
  const r = await fetch(`${DATA}/courses/${path}`)
  return r.text()
}

export async function getAssessment(unitId) {
  const r = await fetch(`${DATA}/assessments/${unitId}.json`)
  if (!r.ok) return { unitId, pre: { items: [] }, post: { items: [] } }
  return r.json()
}

// POST /api/assessment —— 提交 pre/post
export async function submitAssessment(unitId, phase, answers) {
  const user = await getOrCreateUser()
  const data = await getAssessment(unitId)
  const items = data[phase]?.items || []
  let score = 0
  const graded = items.map((it) => {
    const correct = judgeItem(it, answers[it.id])
    if (correct) score++
    return { id: it.id, correct }
  })
  const record = {
    unitId,
    phase,
    userId: user.id,
    score,
    total: items.length,
    answers,
    graded,
    completed_at: Date.now()
  }
  await saveAssessment(unitId, phase, record)
  return record
}

// GET /api/assessment/status —— { hasPre, hasPost, preScore, postScore, gain, preMastered }
export async function getAssessmentStatus(unitId) {
  const rec = await getStoredAssessment(unitId)
  const pre = rec.pre
  const post = rec.post
  let gain = null
  // 前测满分：说明本单元对学员已是已知内容，增益含义为"已掌握"而非"持平"
  const preMastered = !!(pre && pre.total > 0 && pre.score === pre.total)
  if (pre && post && post.total > 0) {
    const prePct = pre.total ? pre.score / pre.total : 0
    const postPct = post.total ? post.score / post.total : 0
    gain = Math.round((postPct - prePct) * 100)
  }
  return {
    hasPre: !!pre,
    hasPost: !!post,
    preScore: pre?.score,
    preTotal: pre?.total,
    postScore: post?.score,
    postTotal: post?.total,
    gain,
    preMastered
  }
}

// ===== 阶段考试（章节综合测验）=====

export async function getExam(chapterId) {
  const r = await fetch(`${DATA}/exams/${chapterId}.json`)
  if (!r.ok) return null
  return r.json()
}

export async function getExamResult(chapterId) {
  return getExamRecord(chapterId)
}

export async function getAllExamResults() {
  return getAllExams()
}

// 开卷：生成一份随机试卷变体（多版本卷防作弊）
export async function startExam(chapterId) {
  const exam = await getExam(chapterId)
  if (!exam) return null
  const seed = makeSeed()
  return buildExamVariant(exam, seed)
}

// POST 阶段考试：评分并落库
export async function submitExam(chapterId, answers, variantId) {
  const user = await getOrCreateUser()
  const exam = await getExam(chapterId)
  if (!exam) return null
  const seed = parseInt(variantId, 36) >>> 0
  const variant = buildExamVariant(exam, seed) // 用同一 seed 重建一致试卷
  let score = 0
  const graded = variant.items.map((it) => {
    const correct = judgeItem(it, answers[it.id])
    if (correct) score++
    return { id: it.id, correct, unitId: it.unitId, concept: it.concept }
  })
  const total = variant.items.length
  const pct = total ? Math.round((score / total) * 100) : 0
  const passed = pct >= (exam.passScore ?? 60)
  const record = {
    chapterId,
    userId: user.id,
    score,
    total,
    pct,
    passed,
    variantId,
    answers,
    graded,
    taken_at: Date.now()
  }
  await saveExam(chapterId, record)
  return record
}
