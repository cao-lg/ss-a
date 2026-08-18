import { useState, useEffect } from 'react'
import certs from '../data/certs.json'
import publicKey from '../data/public.json'
import { verifyCert, asKeyArray } from '../lib/identity'
import { getIdentity, setIdentity } from '../lib/storage'

// 身份激活：学生输入老师签发的 学号+姓名+激活码，App 用内置公钥验证证书，
// 通过即把学习数据归属锁定到该身份（用于导出时绑定与防篡改）。
export default function IdentityGate() {
  const [open, setOpen] = useState(false)
  const [sid, setSid] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getIdentity().then((id) => { if (!id) setOpen(true) })
    const h = () => setOpen(true)
    window.addEventListener('lp:open-identity', h)
    return () => window.removeEventListener('lp:open-identity', h)
  }, [])

  // 拉取最新公开名册：远程 KV 优先，合并打包内置的 certs.json（兜底，KV 未配置时也能激活旧学生）。
  async function loadMergedCerts() {
    const local = Array.isArray(certs) ? certs : []
    try {
      const res = await fetch('/api/certs', { cache: 'no-store' })
      if (res.ok) {
        const remote = await res.json()
        if (Array.isArray(remote) && remote.length) {
          const map = new Map()
          // 先 local 后 remote：同名同姓以远程（更新）为准
          for (const c of [...local, ...remote]) map.set(`${c.sid}|${c.name}`, c)
          return [...map.values()]
        }
      }
    } catch {
      // 网络/Function 不可用 → 用打包内置名册兜底
    }
    return local
  }

  async function activate() {
    setErr('')
    setBusy(true)
    try {
      const merged = await loadMergedCerts()
      const cert = merged.find((c) => c.sid === sid.trim() && c.name === name.trim())
      if (!cert) {
        setErr('名册中找不到该学号+姓名，请确认后联系老师')
        return
      }
      // 多公钥逐把验签（旧随机密钥 + 老师密码派生密钥 均可）
      const pubKeys = asKeyArray(publicKey)
      let ok = false
      for (const pk of pubKeys) {
        if (await verifyCert(pk, { sid: cert.sid, name: cert.name, code: code.trim(), sig: cert.sig })) {
          ok = true
          break
        }
      }
      if (!ok) {
        setErr('激活码与老师签发的身份不匹配')
        return
      }
      await setIdentity({ sid: cert.sid, name: cert.name, sig: cert.sig, code: code.trim(), activatedAt: Date.now() })
      setOpen(false)
      setSid('')
      setName('')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal identity-gate" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" aria-label="关闭" onClick={() => setOpen(false)}>×</button>
        <h2>🪪 身份激活</h2>
        <p className="identity-hint">
          输入老师发给你的 <b>学号、姓名、激活码</b>，把你的学习数据归属锁定到本人。
          激活后导出的文件可被老师验证真实归属，且无法被他人冒用。
        </p>
        <label>学号</label>
        <input value={sid} onChange={(e) => setSid(e.target.value)} placeholder="如 2024001" />
        <label>姓名</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如 张三" />
        <label>激活码</label>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="老师发放的一串字符" />
        {err && <div className="identity-err">{err}</div>}
        <div className="modal-actions">
          <button className="btn primary" onClick={activate} disabled={busy}>
            {busy ? '校验中…' : '激活并锁定'}
          </button>
        </div>
      </div>
    </div>
  )
}
