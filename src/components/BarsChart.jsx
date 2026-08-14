// 横向条形图：各项目能力分布（纯 SVG，暗色主题）。
// props: data = [{ id, label, value(0~100), meta? }]
export default function BarsChart({ data = [], max = 100, width = 560 }) {
  if (!data.length) return <div className="state">暂无项目数据</div>
  const rowH = 40
  const padL = 10
  const padR = 10
  const padT = 6
  const padB = 6
  const H = padT + padB + data.length * rowH
  const W = width
  const labelW = 132
  const valW = 44
  const barX = padL + labelW
  const barW = W - barX - padR - valW
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="bars" role="img" aria-label="项目能力分布">
      {data.map((d, i) => {
        const y = padT + i * rowH
        const v = clamp(d.value)
        const w = max > 0 ? (barW * v) / max : 0
        const col = v >= 75 ? '#7fe1c4' : v >= 45 ? '#ff8a5b' : '#d98a8a'
        return (
          <g key={d.id || i}>
            <text x={padL} y={y + rowH / 2} dominantBaseline="middle" fontSize="12.5" fill="#f4ece0">
              {d.label}
            </text>
            <rect x={barX} y={y + 9} width={barW} height={rowH - 20} rx="6" fill="rgba(188,174,206,0.12)" />
            <rect x={barX} y={y + 9} width={Math.max(0, w)} height={rowH - 20} rx="6" fill={col} />
            <text x={barX + barW + 6} y={y + rowH / 2} dominantBaseline="middle" fontSize="12.5" fontWeight="700" fill="#f4ece0">
              {Math.round(v)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const clamp = (x) => Math.max(0, Math.min(100, x || 0))
