import { Stagger, StaggerItem } from './motion'

// 递进漏斗：把「总量逐级收敛、缺口即信号」的关系可视化。
// 数据：steps = [{ name, desc, gap(可选，缺口/流失提示) }]
export default function Funnel({ title, steps = [] }) {
  const list = Array.isArray(steps) ? steps : []
  return (
    <Stagger className="block funnel" gap={0.09} margin="-12%">
      {title && <div className="block-tag">递进漏斗</div>}
      {title && <h4 className="funnel-title">{title}</h4>}
      <div className="funnel-track">
        {list.map((s, i) => (
          <StaggerItem key={i}>
            <div className="funnel-row">
              <div className="funnel-bar" style={{ width: `${Math.max(38, 100 - i * (46 / Math.max(1, list.length - 1)))}%` }}>
                <span className="funnel-idx">{i + 1}</span>
                <span className="funnel-name">{s.name}</span>
              </div>
              {s.desc && <p className="funnel-desc">{s.desc}</p>}
            </div>
            {s.gap && i < list.length - 1 && (
              <p className="funnel-gap">↓ {s.gap}</p>
            )}
          </StaggerItem>
        ))}
      </div>
    </Stagger>
  )
}
