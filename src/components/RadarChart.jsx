// 通用五维能力雷达图（纯 SVG，适配暗色主题）。
// props: axes=[{ label, value }]  value 为 0~100 的百分比；size 默认 260。
export default function RadarChart({ axes, size = 260 }) {
  const n = axes.length
  if (n < 3) return null
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 40
  const angle = (i) => -Math.PI / 2 + (2 * Math.PI * i) / n
  const point = (i, rad) => [cx + rad * Math.cos(angle(i)), cy + rad * Math.sin(angle(i))]
  const rings = [0.25, 0.5, 0.75, 1]
  const ringPolys = rings.map((rr) =>
    axes.map((_, i) => point(i, r * rr).map((v) => v.toFixed(1)).join(',')).join(' ')
  )
  const dataPts = axes
    .map((a, i) => point(i, r * Math.max(0, Math.min(100, a.value)) / 100).map((v) => v.toFixed(1)).join(','))
    .join(' ')

  return (
    <svg className="radar" viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="能力雷达图">
      {ringPolys.map((pts, i) => (
        <polygon key={i} points={pts} className="radar-grid" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, r)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="radar-axis" />
      })}
      <polygon points={dataPts} className="radar-area" />
      {axes.map((a, i) => {
        const [x, y] = point(i, r * Math.max(0, Math.min(100, a.value)) / 100)
        return <circle key={i} cx={x} cy={y} r={3.2} className="radar-dot" />
      })}
      {axes.map((a, i) => {
        const [x, y] = point(i, r + 16)
        const anchor = Math.abs(x - cx) < 6 ? 'middle' : x > cx ? 'start' : 'end'
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className="radar-label">
            {a.label}
            <tspan x={x} dy="13" className="radar-val">{Math.round(a.value)}</tspan>
          </text>
        )
      })}
    </svg>
  )
}
