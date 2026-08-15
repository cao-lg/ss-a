// 解析单元 Markdown 中的自定义指令：:::checkpoint / :::explore / :::challenge
// 指令属性写在 { } 内，可为单行或多行（属性值可跨行）。所有内容都在属性中，
// 指令块以开头的 :::type{ 与属性对象的闭括号 } 界定，可不写结尾 :::。
// 把「对象字面量里用 = 当键值分隔符」的写法（如 {title="x"} 或 points=[...]）
// 修正为合法 JS（title:"x" / points:[...]）。仅对字符串外、且前导为标识符/闭合括号的 =
// 做转换；字符串内部的 =（如 desc="a=b"）不受影响。仅在本地可信内容下使用。
function toObjectLiteral(s) {
  let out = ''
  let inStr = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      out += c
      if (c === '"' && s[i - 1] !== '\\') inStr = false
      continue
    }
    if (c === '"') { inStr = true; out += c; continue }
    if (c === '=') {
      const trimmed = out.replace(/\s+$/, '')
      const prev = trimmed[trimmed.length - 1]
      const nxt = s[i + 1]
      const prevOk = prev !== undefined && /[A-Za-z0-9_)\]}]/.test(prev)
      const nxtOk = nxt !== '='
      if (prevOk && nxtOk) { out += ':'; continue }
    }
    out += c
  }
  return out
}

export function parseAttrs(str) {
  const attrs = {}
  let i = 0

  function skipSpace() {
    while (i < str.length && /\s/.test(str[i])) i++
  }

  function parseValue() {
    skipSpace()
    if (str[i] === '"') {
      // 字符串
      let s = ''
      i++ // skip opening quote
      while (i < str.length) {
        const ch = str[i]
        if (ch === '\\') {
          i++
          s += str[i] ?? ''
        } else if (ch === '"') {
          i++
          return s
        } else {
          s += ch
        }
        i++
      }
      return s
    }
    if (str[i] === '[' || str[i] === '{') {
      // JSON 数组或对象
      const open = str[i]
      const close = open === '[' ? ']' : '}'
      let depth = 1
      let raw = str[i]
      i++
      while (i < str.length && depth > 0) {
        const ch = str[i]
        if (ch === '"') {
          // 跳过字符串
          raw += ch
          i++
          while (i < str.length) {
            const c2 = str[i]
            raw += c2
            if (c2 === '\\') {
              i++
              raw += str[i] ?? ''
            } else if (c2 === '"') {
              break
            }
            i++
          }
        } else {
          if (ch === open) depth++
          if (ch === close) depth--
          raw += ch
        }
        i++
      }
      try {
        return JSON.parse(raw)
      } catch {
        // 兼容「未加引号键名」的 JS 字面量写法（如 {title:"x", desc:"y"}），
        // 这种写法不是合法 JSON，但更贴近人类/AI 书写习惯。仅在本地可信内容下使用。
        try {
          const fixed = toObjectLiteral(raw)
          return new Function('return (' + fixed + ')')()
        } catch {
          return raw
        }
      }
    }
    // 数字（整数/小数/负数）
    const numMatch = /^-?\d+(\.\d+)?/.exec(str.slice(i))
    if (numMatch) {
      const raw = numMatch[0]
      i += raw.length
      return Number(raw)
    }
    // 布尔
    if (str.slice(i, i + 4) === 'true') { i += 4; return true }
    if (str.slice(i, i + 5) === 'false') { i += 5; return false }
    // 未识别，返回 undefined
    return undefined
  }

  while (i < str.length) {
    skipSpace()
    if (i >= str.length) break
    // 读取 key
    const keyStart = i
    while (i < str.length && /\w/.test(str[i])) i++
    const key = str.slice(keyStart, i)
    skipSpace()
    if (str[i] !== '=') {
      // 跳过未知字符
      i++
      continue
    }
    i++ // skip =
    const val = parseValue()
    if (key) attrs[key] = val
  }

  return attrs
}

export function parseDirectives(md) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let buf = []
  const pushMd = () => {
    if (buf.length) {
      blocks.push({ type: 'md', content: buf.join('\n') })
      buf = []
    }
  }

  // 从 attrStr 起始位置（已在左括号 { 之后）找到外层闭合的 }。
  // 找到时返回 } 的位置索引；未找到（跨行）时返回 -1。
  function findClosingBrace(s) {
    let depth = 1
    let k = 0
    while (k < s.length && depth > 0) {
      const ch = s[k]
      if (ch === '"') {
        k++
        while (k < s.length) {
          const c2 = s[k]
          if (c2 === '\\') {
            k += 2
          } else if (c2 === '"') {
            k++
            break
          } else {
            k++
          }
        }
        continue
      }
      if (ch === '{') depth++
      if (ch === '}') depth--
      k++
    }
    return depth === 0 ? k - 1 : -1
  }

  // 容器指令（含 body）的体终止行：独立 `:::` 行闭合。
  // 只有「容器类指令」(qchain/question/q) 的 opener 才计入深度；
  // 属性式指令(compare/cards/steps…) 不带 body、无独立 `:::` 闭合，不计入深度，
  // 这样 qchain 的体内可以并排多个 :::question 兄弟节点而不被提前截断。
  // 返回终止行索引；若无终止行返回 -1（当作属性式指令，无 body）。
  function findBodyEnd(startLine) {
    let depth = 0
    let m = startLine
    while (m < lines.length) {
      const ln = lines[m]
      if (/^\s*:::\s*$/.test(ln)) {
        if (depth === 0) return m
        depth--
      } else if (/^:::(qchain|question|q|reveal)\{/.test(ln)) {
        depth++
      }
      m++
    }
    return -1
  }

  // 容器类指令：既接受属性，也接受「体」（直到独立 ::: 前的内容）。
  // 这些指令的体内可含任意 Markdown 与其它可视化块，由对应组件递归渲染。
  const CONTAINER_KINDS = new Set(['qchain', 'question', 'q', 'reveal'])

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const open = /^:::(\w+)\{(.*)$/.exec(line)
    if (open) {
      pushMd()
      const kind = open[1]
      let attrStr = open[2]
      let j = i
      // 属性可能跨行，使用括号深度找闭合的 }
      while (j < lines.length) {
        const closeIdx = findClosingBrace(attrStr)
        if (closeIdx >= 0) {
          // 找到了外层闭合
          attrStr = attrStr.slice(0, closeIdx)
          break
        }
        j++
        attrStr += '\n' + (lines[j] ?? '')
      }
      const attrs = parseAttrs(attrStr)
      if (CONTAINER_KINDS.has(kind)) {
        const end = findBodyEnd(j + 1)
        if (end >= 0) {
          const body = lines.slice(j + 1, end).join('\n').trim()
          blocks.push({ type: 'directive', kind, attrs, body })
          i = end + 1
          continue
        }
        // 无 body 终止行：退化为属性式（body 为 null），行为同旧
        blocks.push({ type: 'directive', kind, attrs, body: null })
        i = j + 1
        continue
      }
      // 若下一行是单独的 ::: 结尾，跳过
      if ((lines[j + 1] ?? '').trim() === ':::') j++
      blocks.push({ type: 'directive', kind, attrs })
      i = j + 1
      continue
    }
    buf.push(line)
    i++
  }
  pushMd()
  return blocks
}
