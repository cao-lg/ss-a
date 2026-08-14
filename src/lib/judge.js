// 统一判题：支持 multiple_choice / predict / fill / output
// - 选择题：options 可能是 "A. xxx" 形式，expected 可能是字母（"B"）或选项文本
// - 填空题：expected 为答案文本，按归一化后相等判定
export function letterToIndex(s) {
  if (!s) return -1
  const m = /^([A-Da-d])/.exec(String(s).trim())
  return m ? m[1].toUpperCase().charCodeAt(0) - 65 : -1
}

export function stripOpt(o) {
  return String(o).replace(/^[A-Da-d][.、)）\s]*/, '').trim()
}

function normalizeExpected(type, options, expected) {
  const exp = String(expected ?? '').trim()
  if (options && options.length) {
    if (/^[A-Da-d]$/.test(exp)) return { mode: 'letter', val: exp.toUpperCase() }
    const expStripped = stripOpt(exp)
    const idx = options.findIndex((o) => stripOpt(o) === expStripped)
    if (idx >= 0) return { mode: 'index', val: idx }
  }
  return { mode: 'text', val: exp }
}

// item: { type, options?, expected? } ; ans: 选项字母/下标/文本
export function judgeAnswer(type, options, expected, ans) {
  if (type === 'output') return null // 代码题由执行器判定
  const n = normalizeExpected(type, options, expected)
  if (n.mode === 'text') {
    return String(ans ?? '').trim() === n.val
  }
  let ansVal = ans
  if (typeof ans === 'number') ansVal = String.fromCharCode(65 + ans)
  if (n.mode === 'letter') {
    return String(ansVal ?? '').trim().toUpperCase() === n.val
  }
  // index mode
  let ai = typeof ans === 'number' ? ans : letterToIndex(ans)
  return ai === n.val
}

export function judgeItem(item, ans) {
  const options = item.options ?? item.testConfig?.options
  const expected = item.answer ?? item.testConfig?.expected
  return judgeAnswer(item.type, options, expected, ans)
}
