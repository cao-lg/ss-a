// 时间热力图：星期 × 时段 的投入分布（纯 SVG，暗色主题）。
// props: matrix = number[7][4]；labelsY = 7 个星期；labelsX = 4 个时段；max 为最大计数。
export default function Heatmap({ matrix = [], labelsY = [], labelsX = [], max = 1 }) {
  if (!matrix.length) return <div className="state">暂无时间分布</div>
  const cell = 30
  const gap = 4
  const padL = 44
  const padT = 16
  const cols = matrix[0].length
  const W = padL + cols * (cell + gap)
  const H = padT + matrix.length * (cell + gap) + 22
  const color = (v) => {
    if (!v) return 'rgba(188,174,206,0.10)'
    const t = max > 0 ? v / max : 0
    const r = Math.round(60 + (255 - 60) * t)
    const g = Math.round(40 + (138 - 40) * t)
    const b = Math.round(60 + (91 - 60) * t)
    return `rgba(${r},${g},${b},${0.22 + 0.66 * t})`
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="hm" role="img" aria-label="学习时间热力">
      {matrix.map((row, y) => (
        <g key={y}>
          <text x={padL - 8} y={padT + y * (cell + gap) + cell / 2} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#bcaece">
            {labelsY[y]}
          </text>
          {row.map((v, x) => (
            <rect
              key={x}
              x={padL + x * (cell + gap)}
              y={padT + y * (cell + gap)}
              width={cell}
              height={cell}
              rx="5"
              fill={color(v)}
            >
              <title>{`${labelsY[y]} ${labelsX[x]}：投入 ${v} 次`}</title>
            </rect>
          ))}
        </g>
      ))}
      {labelsX.map((l, x) => (
        <text key={x} x={padL + x * (cell + gap) + cell / 2} y={H - 6} textAnchor="middle" fontSize="10.5" fill="#bcaece">
          {l}
        </text>
      ))}
    </svg>
  )
}
