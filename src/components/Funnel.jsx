import { Stagger, StaggerItem } from './motion'

// 递进漏斗：上宽下窄梯形，把「总量逐级收敛、缺口即流失信号」可视化。
// 名称在条内（短），说明分离到条外，流失缺口用红色药丸标注。
// 数据：steps = [{ name, desc, gap(可选，缺口/流失提示) }]
// theme: coral | mint | amber | violet（块级配色，默认跟随站点 accent）
export default function Funnel({ title, theme, steps = [] }) {
  const list = Array.isArray(steps) ? steps : []
  const n = Math.max(1, list.length - 1)
  return (
    <div className="block viz funnel" data-theme={theme}>
      {title && <div className="block-tag">递进漏斗</div>}
      {title && <h4 className="funnel-title">{title}</h4>}
      <Stagger className="funnel-track" gap={0.09} margin="-12%">
        {list.map((s, i) => {
          const w = Math.max(46, 100 - (n ? i * (54 / n) : 0))
          return (
            <StaggerItem key={i}>
              <div className="funnel-row">
                <div className="funnel-bar" style={{ width: `${w}%` }}>
                  <span className="funnel-idx">{i + 1}</span>
                  <span className="funnel-name">{s.name}</span>
                </div>
                {s.desc && <p className="funnel-desc">{s.desc}</p>}
              </div>
              {s.gap && i < list.length - 1 && (
                <p className="funnel-gap">↓ 缺口 · {s.gap}</p>
              )}
            </StaggerItem>
          )
        })}
      </Stagger>
    </div>
  )
}
