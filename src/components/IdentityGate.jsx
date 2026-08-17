import { useState, useEffect } from 'react'
import certs from '../data/certs.json'
import publicKey from '../data/public.json'
import { verifyCert } from '../lib/identity'
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

  async function activate() {
    setErr('')
    setBusy(true)
    try {
      const cert = certs.find((c) => c.sid === sid.trim() && c.name === name.trim())
      if (!cert) {
        setErr('名册中找不到该学号+姓名，请确认后联系老师')
        return
      }
      const ok = await verifyCert(publicKey, { sid: cert.sid, name: cert.name, code: code.trim(), sig: cert.sig })
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
