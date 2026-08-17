import { webcrypto as nodeCrypto } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const { signCert } = await import('../src/lib/identity.js')

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// 1) 名册：每行 学号,姓名（老师替换为真实班级名册）
const rosterPath = join(root, 'tools', 'roster.csv')
if (!existsSync(rosterPath)) {
  console.error('缺少 tools/roster.csv（每行：学号,姓名）')
  process.exit(1)
}
const rows = readFileSync(rosterPath, 'utf8')
  .split('\n').map((l) => l.trim()).filter(Boolean)
  .map((l) => {
    const [sid, name] = l.split(',').map((s) => s.trim())
    return { sid, name }
  })
if (!rows.length) { console.error('名册为空'); process.exit(1) }

// 2) 密钥对：复用已存在的私钥，保证旧证书持续有效
const keysPath = join(root, 'tools', 'teacher-keys.json')
let keys
if (existsSync(keysPath)) {
  keys = JSON.parse(readFileSync(keysPath, 'utf8'))
} else {
  const kp = await nodeCrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
  keys = {
    private: await nodeCrypto.subtle.exportKey('jwk', kp.privateKey),
    public: await nodeCrypto.subtle.exportKey('jwk', kp.publicKey)
  }
  writeFileSync(keysPath, JSON.stringify(keys, null, 2))
  console.log('已生成新的 Ed25519 密钥对')
}

// 3) 为每个学生签发证书（激活码 = 随机 32 字符十六进制）
function randomCode() {
  const b = new Uint8Array(16)
  nodeCrypto.getRandomValues(b)
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}
const students = rows.map((r) => ({ ...r, code: randomCode() }))

const certs = [] // 公开：嵌入 App（学号,姓名,sig）
const secrets = [] // 秘密：仅老师保留（学号,姓名,激活码）
for (const s of students) {
  const sig = await signCert(keys.private, s.sid, s.name, s.code)
  certs.push({ sid: s.sid, name: s.name, sig })
  secrets.push({ sid: s.sid, name: s.name, code: s.code })
}

// 4) 写出
const dataDir = join(root, 'src', 'data')
mkdirSync(dataDir, { recursive: true })
writeFileSync(join(dataDir, 'certs.json'), JSON.stringify(certs, null, 2))
writeFileSync(join(dataDir, 'public.json'), JSON.stringify(keys.public, null, 2))
writeFileSync(join(root, 'tools', 'teacher-secrets.json'), JSON.stringify(secrets, null, 2))

console.log(`已签发 ${certs.length} 名学生：`)
certs.forEach((c) => console.log(`  - ${c.name}（${c.sid}）`))
console.log('\nsrc/data/certs.json 与 src/data/public.json 已更新（公开，可提交）')
console.log('tools/teacher-secrets.json 含激活码（机密，勿提交/勿泄露）')
console.log('tools/teacher-keys.json 含私钥（机密，勿提交）')
