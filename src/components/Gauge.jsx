// 半圆/270° 仪表盘：结业就绪度（纯 SVG，暗色主题）。
// props: value(0~100), size, label
export default function Gauge({ value = 0, size = 168, label = '就绪度' }) {
  const v = Math.max(0, Math.min(100, value || 0))
  const r = size / 2 - 16
  const cx = size / 2
  const cy = size / 2
  const start = Math.PI * 0.75 // 135°
  const end = Math.PI * 2.25 // 405°（扫过 270°）
  const a1 = start + (end - start) * (v / 100)
  const polar = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const large = end - start > Math.PI ? 1 : 0
  const [x0, y0] = polar(start)
  const [x1, y1] = polar(end)
  const [fx0, fy0] = polar(start)
  const [fx1, fy1] = polar(a1)
  const fillLarge = a1 - start > Math.PI ? 1 : 0
  const track = `M ${x0} ${y0} A ${r} ${r} 0 1 1 ${x1} ${y1}`
  const fill = `M ${fx0} ${fy0} A ${r} ${r} 0 ${fillLarge} 1 ${fx1} ${fy1}`
  const col = v >= 75 ? '#7fe1c4' : v >= 45 ? '#ff8a5b' : '#e08a8a'
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="gauge" role="img" aria-label={`${label} ${Math.round(v)}`}>
      <path d={track} fill="none" stroke="rgba(188,174,206,0.18)" strokeWidth="12" strokeLinecap="round" />
      <path d={fill} fill="none" stroke={col} strokeWidth="12" strokeLinecap="round" />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="32" fontWeight="800" fill="#f4ece0">
        {Math.round(v)}
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="11.5" fill="#bcaece">
        {label}
      </text>
    </svg>
  )
}
