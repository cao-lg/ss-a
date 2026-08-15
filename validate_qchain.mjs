// 结构校验：ss-a 每个单元重写后必须是合法的「整任务问题链」。
// 用法：
//   单文件： node validate_qchain.mjs public/data/courses/u21-1.md
//   全量  ： node validate_qchain.mjs
// 判据：
//   1) 顶层至少有一个 :::qchain 容器，且所有容器(qchain/question/reveal) body 不为 null（已正确闭合）。
//   2) qchain 体内每个 question 都含 ≥1 个 reveal（看解析）与 ≥1 个验证门(checkpoint/challenge)。
//   3) 每个 reveal 自身也必须正确闭合（body 不为 null）。
// 注意：组件层已修复 reveal 无限递归（reveal 改解析 body 再渲染子块），本脚本只做「质量/闭合」校验，
//      不参与崩溃防护；但任何未闭合容器都会在此暴露。
import { parseDirectives } from './src/lib/mdParser.js'
import fs from 'node:fs'
import path from 'node:path'

const NODE = 'C:/Users/caolg/.workbuddy/binaries/node/versions/22.22.2/node.exe'

function checkOne(file) {
  const md = fs.readFileSync(file, 'utf8')
  const top = parseDirectives(md)
  const issues = []
  const isContainer = (b) => b.kind === 'qchain' || b.kind === 'question' || b.kind === 'q' || b.kind === 'reveal'
  for (const b of top) {
    if (isContainer(b) && (b.body == null)) {
      issues.push(`顶层 ${b.kind} 未闭合 (body=null)`)
    }
  }
  const qchains = top.filter((b) => b.kind === 'qchain')
  if (qchains.length === 0) {
    issues.push('无 :::qchain 容器（整任务问题链缺失）')
    return { file, issues, questions: 0, reveals: 0, verifies: 0 }
  }
  let questions = 0, reveals = 0, verifies = 0
  for (const qc of qchains) {
    const qs = parseDirectives(qc.body).filter((b) => b.kind === 'question' || b.kind === 'q')
    questions += qs.length
    for (const q of qs) {
      if (q.body == null) {
        issues.push(`question 未闭合: ${q.attrs?.title || '(无标题)'}`)
        continue
      }
      const inner = parseDirectives(q.body)
      const r = inner.filter((b) => b.kind === 'reveal')
      // 验证门必须是 question 顶层兄弟块：QuestionView 只在 question 顶层判定 needsVerify，
      // 若 checkpoint/challenge 被塞进 reveal 内部，needsVerify=false → 无法作为解锁下一问的硬闸门。
      const vTop = inner.filter((b) => b.kind === 'checkpoint' || b.kind === 'challenge')
      if (r.length < 1) issues.push(`question 缺少 reveal(看解析，须为 question 顶层兄弟块): ${q.attrs?.title || '(无标题)'}`)
      if (vTop.length < 1) issues.push(`question 缺少验证门(checkpoint/challenge 须为 question 顶层兄弟块，不能放进 reveal 内): ${q.attrs?.title || '(无标题)'}`)
      reveals += r.length
      verifies += vTop.length
      for (const rv of r) {
        if (rv.body == null) issues.push(`reveal 未闭合: ${q.attrs?.title || '(无标题)'}`)
      }
    }
  }
  return { file, issues, questions, reveals, verifies }
}

function main() {
  const arg = process.argv[2]
  let files
  if (arg) {
    files = [arg]
  } else {
    const dir = 'public/data/courses'
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => path.join(dir, f))
  }
  let total = 0, fail = 0
  for (const f of files) {
    const r = checkOne(f)
    total++
    if (r.issues.length === 0) {
      console.log(`OK   ${path.basename(f)}  (q=${r.questions} reveal=${r.reveals} verify=${r.verifies})`)
    } else {
      fail++
      console.log(`FAIL ${path.basename(f)}`)
      for (const i of r.issues) console.log(`       - ${i}`)
    }
  }
  console.log(`\n${total - fail}/${total} 单元通过结构校验${fail ? `，${fail} 个有问题` : '，全部 OK'}`)
  if (fail) process.exit(1)
}

main()
