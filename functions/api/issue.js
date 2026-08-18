// POST /api/issue — 接收老师浏览器签发的证书数组 [{sid,name,code,sig}]，
// 用环境变量 TEACHER_PUBLIC_KEY 逐条验签，全通过才合并写入 KV[certs]。
//
// 安全模型（方案 Y）：
//   - 端点不设密码：只接受用「老师私钥」签过的证书，外人没有私钥签不进假证书。
//   - 远程名册被篡改也无妨：假证书验不过会被整批拒绝；学生激活仅可用性受影响（可回滚 KV）。
//   - 远程名册不含激活码明文（仅 sid,name,sig），截获也看不到激活码。
//   - 跨域来自教师端 tc-a.pages.dev，故放开 CORS。

const enc = new TextEncoder()
function b64ToBuf(b64) {
  const bin = atob(b64)
  const u = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
  return u.buffer
}

function cors(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    ...extra
  }
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers }
  })
}

// 用多把老师公钥逐个试验签（支持旧随机密钥 + 密码派生密钥平滑过渡）。
async function verifyOne(cert, pubJwks) {
  for (const jwk of pubJwks) {
    try {
      const key = await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['verify'])
      const msg = enc.encode(`${cert.sid}|${cert.name}|${cert.code}`)
      if (await crypto.subtle.verify({ name: 'Ed25519' }, key, b64ToBuf(cert.sig), msg)) return true
    } catch {
      // 单把钥匙失败，继续试下一把
    }
  }
  return false
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() })
}

export async function onRequestPost({ request, env }) {
  // 1) 解析请求体（兼容数组 或 {certs:[...]}）
  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid json' }, 400, cors())
  }
  const list = Array.isArray(body) ? body : (body && Array.isArray(body.certs) ? body.certs : null)
  if (!list) return json({ ok: false, error: 'expect array of certs' }, 400, cors())

  // 2) 解析老师公钥（支持单 JWK 或数组）
  let pubJwks
  try {
    const p = JSON.parse(env.TEACHER_PUBLIC_KEY || '[]')
    pubJwks = Array.isArray(p) ? p : [p]
  } catch {
    return json({ ok: false, error: 'server misconfig: TEACHER_PUBLIC_KEY' }, 500, cors())
  }
  if (!pubJwks.length) return json({ ok: false, error: 'no teacher public key configured' }, 500, cors())

  // 3) 逐条验签：任一不过即整批拒绝（422）
  for (const c of list) {
    if (!c || !c.sid || !c.name || !c.code || !c.sig) {
      return json({ ok: false, error: 'missing field', rejected: c && c.sid }, 422, cors())
    }
    if (!(await verifyOne(c, pubJwks))) {
      return json({ ok: false, error: 'signature rejected', rejected: `${c.sid}/${c.name}` }, 422, cors())
    }
  }

  // 4) 合并写入 KV（按 sid|name 去重）
  const kv = env.CERTS_KV
  let existing = []
  try {
    const raw = await kv.get('certs')
    if (raw) existing = JSON.parse(raw)
  } catch {
    existing = []
  }
  if (!Array.isArray(existing)) existing = []
  const seen = new Set(existing.map((c) => `${c.sid}|${c.name}`))
  let added = 0
  for (const c of list) {
    const k = `${c.sid}|${c.name}`
    if (!seen.has(k)) {
      existing.push({ sid: c.sid, name: c.name, sig: c.sig })
      seen.add(k)
      added++
    }
  }
  await kv.put('certs', JSON.stringify(existing))
  return json({ ok: true, added, total: existing.length }, 200, cors())
}
