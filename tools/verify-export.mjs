import { webcrypto as nodeCrypto } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const { verifyCert, deriveMacKey, verifyBundle } = await import('../src/lib/identity.js')

const file = process.argv[2]
if (!file) { console.error('用法：node tools/verify-export.mjs <导出文件.json>'); process.exit(1) }

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const data = JSON.parse(readFileSync(file, 'utf8'))
const cert = data.identity
if (!cert || !cert.sig) { console.log('✗ 该文件不含身份证书，可能不是本系统导出'); process.exit(1) }

const pub = JSON.parse(readFileSync(join(root, 'src', 'data', 'public.json'), 'utf8'))
const secrets = JSON.parse(readFileSync(join(root, 'tools', 'teacher-secrets.json'), 'utf8'))
const sec = secrets.find((s) => s.sid === cert.sid && s.name === cert.name)

const certOk = await verifyCert(pub, { ...cert, code: sec.code })
let macOk = false
if (sec) {
  const key = await deriveMacKey(sec.code)
  macOk = await verifyBundle(key, { sid: cert.sid, name: cert.name, records: data.records }, data.mac)
} else {
  console.log('⚠ 名册中找不到该学生（teacher-secrets.json 不匹配）')
}

console.log('──────── 核验报告 ────────')
console.log(`姓名：${cert.name}`)
console.log(`学号：${cert.sid}`)
console.log(`证书有效(老师签发)：${certOk ? '是' : '否'}`)
console.log(`数据未被篡改：${sec ? (macOk ? '是' : '否') : '无法校验(缺激活码)'}`)
if (certOk && macOk) {
  console.log('\n✓ 真实有效 —— 可据此给平时成绩')
  const p = data.records?.progress
  if (p) console.log(`等级XP：${p.xp ?? 0}`)
} else {
  console.log('\n✗ 存疑，请勿直接采用')
}
