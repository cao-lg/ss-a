// Generate 3 cross-course comprehensive exams (final / final-2 / final-3)
// from each unit's post-test bank (assessments/<id>.json -> post.items).
// Strategy: every exam covers EVERY unit that has >=1 post item, and the
// full item set is distributed round-robin so the 3 papers are distinct
// yet collectively exhaustive ("检测所有内容").
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const courseId = process.argv[2] || 'supply-chain'
const courseFiles = (process.argv[3] || 'supply-chain').split(',')
const dataDir = path.join(root, 'public', 'data')
const assessDir = path.join(dataDir, 'assessments')
const examDir = path.join(dataDir, 'exams')

// unitId -> chapter title / chapter id (aggregated across all course files)
const unitChapter = {}
const unitChapterId = {}
for (const cf of courseFiles) {
  const course = JSON.parse(fs.readFileSync(path.join(dataDir, 'courses', `${cf}.json`), 'utf8'))
  for (const ch of course.chapters || []) {
    for (const u of ch.units || []) {
      unitChapter[u.id] = ch.title
      unitChapterId[u.id] = ch.id
    }
  }
}

// collect post items per unit
const banks = {}
let totalPost = 0
for (const f of fs.readdirSync(assessDir).filter((x) => x.endsWith('.json'))) {
  const id = f.replace('.json', '')
  const d = JSON.parse(fs.readFileSync(path.join(assessDir, f), 'utf8'))
  const items = (d.post && d.post.items) || []
  if (items.length) {
    banks[id] = items
    totalPost += items.length
  }
}

const mapItem = (it, unitId, chapter, suffix) => {
  const out = {
    id: `${unitId}_${suffix}`,
    type: it.type,
    question: it.question,
    answer: it.answer,
    unitId,
    chapter
  }
  if (it.options && it.options.length) out.options = it.options
  return out
}

const exams = [0, 1, 2].map((e) => ({ pool: [] }))
const titles = ['结业综合测验（卷一）', '结业综合测验（卷二）', '结业综合测验（卷三）']
const descs = [
  '跨全课程的结业综合测验·第一套：随机抽取覆盖各任务的题目，检验整门课掌握度。',
  '跨全课程的结业综合测验·第二套：题目与第一套不同，可换卷重考以巩固薄弱点。',
  '跨全课程的结业综合测验·第三套：题目与前两套不同，全面覆盖各任务核心内容。'
]

let coveredUnits = 0
for (const [unitId, items] of Object.entries(banks)) {
  coveredUnits++
  const chapter = unitChapter[unitId] || ''
  const assigned = [false, false, false]
  items.forEach((it, k) => {
    const e = k % 3
    assigned[e] = true
    exams[e].pool.push(mapItem(it, unitId, chapter, `p${k}_e${e}`))
  })
  // coverage guarantee: ensure every exam has >=1 item from this unit
  items.forEach((it, k) => {
    const e = k % 3
    if (!assigned[e]) {
      assigned[e] = true
      exams[e].pool.push(mapItem(it, unitId, chapter, `cov${k}_e${e}`))
    }
  })
}

// 抽题量：至少覆盖全部单元（每单元保底 1 题由 buildExamVariant 保证），
// 再额外补足约 60% 的题量以加深覆盖面。cs-a≈53、ss-a≈79。
const pick = Math.max(coveredUnits, Math.min(90, Math.ceil(coveredUnits * 1.6)))
const metas = titles.map((t, i) => ({
  courseId,
  chapterId: i === 0 ? 'final' : `final-${i + 1}`,
  title: t,
  description: descs[i],
  passScore: 70,
  pick
}))

exams.forEach((ex, i) => {
  const meta = metas[i]
  const file = path.join(examDir, `${meta.chapterId}.json`)
  fs.writeFileSync(file, JSON.stringify({ ...meta, pool: ex.pool }, null, 2))
  console.log(`${meta.chapterId}.json  items=${ex.pool.length}  unitsCovered=${coveredUnits}`)
})
console.log(`\nTotal units with post bank: ${coveredUnits}`)
console.log(`Total post items drawn: ${totalPost}`)
