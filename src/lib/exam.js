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
export function buildExamVariant(exam, seed) {
  const rng = mulberry32(seed)
  const pick = Math.min(exam.pick || exam.pool.length, exam.pool.length)
  const withShuffledOpts = exam.pool.map((it) => {
    if (it.options && it.options.length) {
      return { ...it, options: shuffle(it.options, rng) }
    }
    return { ...it }
  })
  const sampled = shuffle(withShuffledOpts, rng).slice(0, pick)
  const variantId = (seed >>> 0).toString(36)
  return { ...exam, items: sampled, variantId }
}

export function makeSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
}
