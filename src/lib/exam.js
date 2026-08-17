// 阶段考试：题库抽卷（多版本卷防作弊）
// 给定题库与种子，进行 选项乱序 + 题目抽样 + 顺序打乱，生成唯一试卷。
// 选项乱序后无需重映射答案：judge 按 answer 文本匹配，与选项位置无关。

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(arr, rng) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

// 根据题库与种子构造一份试卷变体
// 抽样策略升级：优先保证「每个单元至少 1 题」（覆盖全部任务/知识点），
// 再用剩余名额从题库随机补足，最后整体打乱顺序 + 选项乱序。
// 这样即使 pick 远小于题库总量，也不会漏掉任何一个单元。
export function buildExamVariant(exam, seed) {
  const rng = mulberry32(seed)
  const pool = exam.pool || []
  const pick = Math.min(exam.pick || pool.length, pool.length)

  // 按 unitId 分组（缺省归为同一组，退化为纯随机抽样）
  const groups = new Map()
  for (const it of pool) {
    const key = it.unitId ?? '__ungrouped__'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(it)
  }
  const unitKeys = [...groups.keys()]

  const selected = []
  const consumed = new Set()
  let remaining = pick

  // 1) 每单元保底抽 1 题（单元数 <= pick 时全保底）
  const shuffledUnits = shuffle(unitKeys, rng)
  for (const uk of shuffledUnits) {
    if (remaining <= 0) break
    const items = groups.get(uk)
    const idx = Math.floor(rng() * items.length)
    const chosen = items[idx]
    selected.push(chosen)
    consumed.add(chosen)
    remaining--
  }

  // 2) 剩余名额从「未抽中」的题库中随机补足
  const rest = shuffle(pool.filter((it) => !consumed.has(it)), rng)
  for (const it of rest) {
    if (remaining <= 0) break
    selected.push(it)
    remaining--
  }

  // 3) 整体顺序打乱 + 选项乱序
  const withShuffledOpts = shuffle(selected, rng).map((it) => {
    if (it.options && it.options.length) {
      return { ...it, options: shuffle(it.options, rng) }
    }
    return { ...it }
  })
  const variantId = (seed >>> 0).toString(36)
  return { ...exam, items: withShuffledOpts, variantId }
}

export function makeSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
}
