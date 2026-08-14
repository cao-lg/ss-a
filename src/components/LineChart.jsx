// 学习曲线：前/后测掌握度随完成时间成长的折线 + 区域（纯 SVG，暗色主题）。
// props: curve = [{ ts, pre:number|null, post:number|null }]
export default function LineChart({ curve = [], width = 560, height = 220 }) {
  if (!curve.length) return <div className="state">暂无时间序列数据</div>
  const padL = 34
  const padR = 12
  const padT = 14
  const padB = 26
  const W = width
  const H = height
  const n = curve.length
  const x = (i) => padL + (W - padL - padR) * (n === 1 ? 0.5 : i / (n - 1))
  const y = (v) => padT + (H - padT - padB) * (1 - v / 100)
  const postPts = curve.map((p, i) => (p.post != null ? `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.post).toFixed(1)}` : null)).filter(Boolean)
  const postLine = postPts.join(' ')
  const postArea = postPts.length
    ? `${postLine} L ${x(curve.length - 1).toFixed(1)} ${y(0)} L ${x(0).toFixed(1)} ${y(0)} Z`
    : ''
  const preDots = curve.map((p, i) => (p.pre != null ? { cx: x(i), cy: y(p.pre), i } : null)).filter(Boolean)
  const postDots = curve.map((p, i) => (p.post != null ? { cx: x(i), cy: y(p.post), i } : null)).filter(Boolean)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="lc" role="img" aria-label="学习曲线">
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="rgba(188,174,206,0.16)" />
          <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#bcaece">
            {v}
          </text>
        </g>
      ))}
      {postArea && <path d={postArea} fill="rgba(255,138,91,0.14)" />}
      {postLine && <path d={postLine} fill="none" stroke="#ff8a5b" strokeWidth="2.4" strokeLinejoin="round" />}
      {preDots.map((d) => (
        <circle key={'p' + d.i} cx={d.cx} cy={d.cy} r="2.8" fill="#7fe1c4" opacity="0.85" />
      ))}
      {postDots.map((d) => (
        <circle key={'q' + d.i} cx={d.cx} cy={d.cy} r="3" fill="#ff8a5b" />
      ))}
      <text x={padL} y={H - 6} fontSize="10" fill="#bcaece">
        时间顺序（按完成先后）
      </text>
      <text x={W - padR} y={H - 6} fontSize="10" fill="#bcaece" textAnchor="end">
        掌握度 %
      </text>
    </svg>
  )
}
