import { useState } from 'react'
import publicKey from '../data/public.json'
import { verifyCert, deriveMacKey, verifyBundle } from '../lib/identity'

// 老师核验面板：拖入学生发来的导出 JSON，用内置公钥验证证书（确认真实归属），
// 若再粘贴该生激活码，可进一步用 bundleMac 复核数据是否被篡改。
export default function VerifyPanel() {
  const [code, setCode] = useState('')
  const [report, setReport] = useState(null)
  const [err, setErr] = useState('')

  async function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setReport(null)
    setErr('')
    let data
    try {
      data = JSON.parse(await f.text())
    } catch {
      setErr('不是合法的 JSON 文件')
      return
    }
    const cert = data.identity
    if (!cert || !cert.sig) {
      setErr('该文件不含身份证书，可能不是本系统导出')
      return
    }
    // 证书签名包含激活码，核验需提供该生激活码（老师从名册获取）
    const certOk = code.trim() ? await verifyCert(publicKey, { ...cert, code: code.trim() }) : null
    let macOk = null
    if (code.trim()) {
      const k = await deriveMacKey(code.trim())
      macOk = await verifyBundle(k, { sid: cert.sid, name: cert.name, records: data.records }, data.mac)
    }
    setReport({
      name: cert.name,
      sid: cert.sid,
      certOk,
      macOk,
      progress: data.records?.progress
    })
  }

  return (
    <section className="admin-sec verify-panel">
      <h2>🔎 核验学生导出文件</h2>
      <p className="verify-hint">
        选择学生发来的导出 JSON，验证真实归属；粘贴该生<b>激活码</b>可做完整防篡改核验。
      </p>
      <div className="verify-row">
        <input type="file" accept="application/json,.json" onChange={onFile} />
        <input
          className="verify-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="可选：该生激活码（做防篡改校验）"
        />
      </div>
      {err && <div className="identity-err">{err}</div>}
      {report && (
        <div className="verify-report">
          <div className="vr-line"><span>姓名</span><b>{report.name}</b></div>
          <div className="vr-line"><span>学号</span><b>{report.sid}</b></div>
          <div className="vr-line">
            <span>证书有效（老师签发）</span>
            <b className={report.certOk === null ? 'muted' : report.certOk ? 'ok' : 'bad'}>
              {report.certOk === null ? '未校验（缺激活码）' : report.certOk ? '是 ✓' : '否 ✗'}
            </b>
          </div>
          <div className="vr-line">
            <span>数据未被篡改</span>
            <b className={report.macOk === null ? 'muted' : report.macOk ? 'ok' : 'bad'}>
              {report.macOk === null ? '未校验（缺激活码）' : report.macOk ? '是 ✓' : '否 ✗'}
            </b>
          </div>
          {report.certOk && report.macOk !== false && (
            <div className="vr-ok">✓ 真实有效 —— 可据此给平时成绩（等级XP：{report.progress?.xp ?? 0}）</div>
          )}
          {!report.certOk && <div className="vr-bad">✗ 证书无效，疑似伪造，请勿采用</div>}
          {report.certOk && report.macOk === false && (
            <div className="vr-bad">✗ 证书有效但数据被篡改，请勿采用</div>
          )}
        </div>
      )}
    </section>
  )
}
