// 解析单元 Markdown 中的自定义指令：:::checkpoint / :::explore / :::challenge
// 指令属性写在 { } 内，可为单行或多行（属性值可跨行）。所有内容都在属性中，
// 指令块以开头的 :::type{ 与属性对象的闭括号 } 界定，可不写结尾 :::。
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
        return raw
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

  // 从 attrStr 起始位置（已在左括号 { 之后）找到外层闭合的 }，返回包含该 } 的索引（相对 attrStr）
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
    return k
  }

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
        if (closeIdx < attrStr.length) {
          // 找到了外层闭合
          attrStr = attrStr.slice(0, closeIdx)
          break
        }
        j++
        attrStr += '\n' + (lines[j] ?? '')
      }
      const attrs = parseAttrs(attrStr)
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
