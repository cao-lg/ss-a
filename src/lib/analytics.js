// 多维学习画像计算：把已落库的学习记录 + 行为事件 综合成"立体画像"。
// 输出：八维能力雷达 / 各项目能力分布 / 学习曲线 / 一致性节奏 / 时间热力 /
//       学习风格 / 结业就绪度。computeAnalytics 为纯函数，便于复用与测试。

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0)
const clamp100 = (x) => Math.max(0, Math.min(100, x || 0))

export function computeAnalytics({
  assess = {},
  cp = {},
  prog = { xp: 0, streak: 0, badges: [] },
  times = { units: {}, days: {} },
  exams = {},
  behaviors = [],
  courses = [],
  index = {},
  flatAll = [],
  examChapters = [],
}) {
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
    return {
      uid,
      prePct,
      postPct,
      gain,
      weakPost,
      preMastered,
      meta: index[uid] || { title: uid, chapterTitle: '未归类', courseId: '' },
    }
  })
  const assessed = units.filter((u) => u.prePct != null && u.postPct != null)
  const avgPre = assessed.length ? mean(assessed.map((u) => u.prePct)) : 0
  const avgPost = assessed.length ? mean(assessed.map((u) => u.postPct)) : 0

  // —— 检查点 / 挑战准确率 ——
  const cpVals = Object.values(cp)
  const cpCheck = cpVals.filter((c) => c.kind === 'checkpoint')
  const cpChal = cpVals.filter((c) => c.kind === 'challenge')
  const cpAcc = cpCheck.length ? mean(cpCheck.map((c) => c.correct)) : 0
  const chAcc = cpChal.length ? mean(cpChal.map((c) => c.correct)) : 0

  // —— 各项目（课程）能力分布 ——
  const projects = courses.map((c) => {
    const uids = (c.chapters || []).flatMap((ch) => (ch.units || []).map((u) => u.id))
    let cov = 0
    const posts = []
    const gains = []
    const weak = []
    for (const uid of uids) {
      const u = units.find((x) => x.uid === uid)
      if (!u) continue
      if (u.postPct != null) {
        cov++
        posts.push(u.postPct)
        if (u.postPct < 0.6 || u.gain < 0) weak.push({ uid, title: u.meta.title, postPct: u.postPct, gain: u.gain })
      }
      if (u.gain != null) gains.push(u.gain)
    }
    const avgPostP = posts.length ? mean(posts) : null
    const coverageRatio = uids.length ? cov / uids.length : 0
    const mastery = avgPostP != null ? clamp100(avgPostP * 100 * (0.6 + 0.4 * coverageRatio)) : 0
    return {
      id: c.id,
      title: c.title,
      totalUnits: uids.length,
      covered: cov,
      avgPost: avgPostP,
      avgGain: gains.length ? mean(gains) : null,
      weakUnits: weak,
      mastery,
    }
  })

  // —— 行为事件聚合 ——
  const evByType = {}
  for (const e of behaviors) (evByType[e.type] ||= []).push(e)
  const exploreEvents = evByType['explore_choice'] || []
  const exploreUnits = new Set(exploreEvents.map((e) => e.unitId))
  const sectionEvents = evByType['section_view'] || []
  const sessionEvents = evByType['session_end'] || []
  const hintEvents = evByType['hint_used'] || []
  const challengeEvents = evByType['challenge_attempt'] || []
  const dwellVals = sectionEvents.map((e) => e.dwellMs || 0).filter((d) => d > 0)
  const avgDwell = dwellVals.length ? mean(dwellVals) : 0
  const maxDepth = behaviors
    .filter((e) => e.type === 'scroll_depth')
    .reduce((m, e) => Math.max(m, e.maxPct || 0), 0)
  const totalMs = Object.values(times.units || {}).reduce((s, v) => s + v, 0)
  const studyDays = Object.keys(times.days || {}).length

  // —— 八维能力雷达 ——
  const explorePart = assessed.length ? clamp100((exploreUnits.size / assessed.length) * 100) : 0
  const coverage = flatAll.length ? clamp100((Object.keys(assess).length / flatAll.length) * 100) : 0
  const persist = clamp100(prog.streak * 8)
  const invest = clamp100(totalMs / 60000 / 30 * 100)
  const radarAxes = [
    { label: '前测基线', value: clamp100(avgPre * 100) },
    { label: '后测掌握', value: clamp100(avgPost * 100) },
    { label: '检查点', value: clamp100(cpAcc * 100) },
    { label: '挑战', value: clamp100(chAcc * 100) },
    { label: '探索参与', value: explorePart },
    { label: '学习覆盖', value: coverage },
    { label: '学习坚持', value: persist },
    { label: '投入度', value: invest },
  ]

  // —— 学习曲线（前/后测掌握度随完成时间成长）——
  const tl = []
  for (const [uid, rec] of Object.entries(assess)) {
    if (rec.pre && rec.pre.completed_at)
      tl.push({ ts: rec.pre.completed_at, pre: rec.pre.total ? (rec.pre.score / rec.pre.total) * 100 : 0, post: null })
    if (rec.post && rec.post.completed_at)
      tl.push({ ts: rec.post.completed_at, post: rec.post.total ? (rec.post.score / rec.post.total) * 100 : 0, pre: null })
  }
  tl.sort((a, b) => a.ts - b.ts)
  const curve = tl

  // —— 一致性 / 节奏 ——
  const dayKeys = Object.keys(times.days || {})
  const now = Date.now()
  const dayMs = 86400000
  const last14 = dayKeys.filter((d) => {
    const t = new Date(d + 'T00:00:00').getTime()
    return t <= now && now - t < 14 * dayMs
  }).length
  const cadence = clamp100((last14 / 14) * 100)
  const sessionMin = sessionEvents.length ? mean(sessionEvents.map((e) => (e.durMs || 0) / 60000)) : 0
  const consistency = { studyDays, last14, cadence, sessionMin, totalMin: totalMs / 60000 }

  // —— 时间热力（星期 × 时段）——
  const WD = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const BU = ['凌晨', '上午', '下午', '晚上']
  const matrix = WD.map(() => BU.map(() => 0))
  let heatMax = 0
  for (const e of behaviors) {
    if (!e.ts) continue
    const d = new Date(e.ts)
    const wd = (d.getDay() + 6) % 7 // 周一=0
    const h = d.getHours()
    const bu = h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3
    matrix[wd][bu]++
    if (matrix[wd][bu] > heatMax) heatMax = matrix[wd][bu]
  }
  const timeHeat = { matrix, labelsY: WD, labelsX: BU, max: heatMax }

  // —— 学习风格 / 人格 ——
  const traits = []
  if (exploreUnits.size >= 3) traits.push({ k: '探索型', w: exploreUnits.size })
  if (avgDwell >= 12000) traits.push({ k: '深耕细读', w: Math.round(avgDwell / 1000) })
  if (prog.streak >= 3) traits.push({ k: '自律坚持', w: prog.streak })
  if (maxDepth >= 0.85) traits.push({ k: '完整通读', w: Math.round(maxDepth * 100) })
  if (challengeEvents.length >= 3) traits.push({ k: '爱挑战', w: challengeEvents.length })
  if (hintEvents.length >= 3) traits.push({ k: '善用线索', w: hintEvents.length })
  traits.sort((a, b) => b.w - a.w)
  const persona = {
    primary: traits[0]?.k || (assessed.length ? '稳步前进' : '尚未成形'),
    traits: traits.map((t) => t.k),
  }

  // —— 薄弱知识域（按章）——
  const weakByChapter = {}
  for (const u of units) {
    const weak = (u.postPct != null && u.postPct < 0.6) || (u.gain != null && u.gain < 0) || u.weakPost > 0
    if (!weak) continue
    const ch = u.meta.chapterTitle
    const arr = weakByChapter[ch] || (weakByChapter[ch] = { chapter: ch, units: [], score: 0 })
    arr.units.push({ uid: u.uid, title: u.meta.title, postPct: u.postPct, gain: u.gain, weakPost: u.weakPost })
    arr.score += (u.postPct != null ? 1 - u.postPct : 0) + (u.gain != null ? Math.max(0, -u.gain) : 0) + u.weakPost * 0.08
  }
  const weakChapters = Object.values(weakByChapter).sort((a, b) => b.score - a.score)

  // —— 结业就绪度 ——
  const weakCount = units.filter(
    (u) => (u.postPct != null && u.postPct < 0.6) || (u.gain != null && u.gain < 0)
  ).length
  const weakRatio = flatAll.length ? weakCount / flatAll.length : 0
  const finalPassed = !!exams['final']?.passed
  let readiness = 0
  if (assessed.length && coverage > 0) {
    const coveragePct = coverage
    const avgPostPct = avgPost * 100
    const weakPct = weakRatio * 100
    readiness = clamp100(coveragePct * 0.4 + avgPostPct * 0.4 + (100 - weakPct) * 0.2)
  }
  if (finalPassed) readiness = 100

  const hasActivity =
    units.length > 0 || cpVals.length > 0 || Object.keys(exams).length > 0 || behaviors.length > 0

  return {
    hasActivity,
    units,
    assessed,
    avgPre,
    avgPost,
    cpAcc,
    chAcc,
    projects,
    radarAxes,
    curve,
    consistency,
    timeHeat,
    persona,
    readiness,
    finalPassed,
    weakChapters,
    examChapters,
    exploreUnits: exploreUnits.size,
    exploreEvents: exploreEvents.length,
    hintEvents: hintEvents.length,
    challengeEvents: challengeEvents.length,
    avgDwell,
    maxDepth,
    totalMin: totalMs / 60000,
    studyDays,
  }
}
