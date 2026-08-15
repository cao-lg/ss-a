import { Stagger, StaggerItem } from './motion'

// KPI 卡片网格：把「名词 + 长定义 bullet」转换成
// 指标卡（名称 / 一句话定义 / 核心价值 / 异常解读）。
// 数据：items = [{ name, def, value(可选), signal(可选) }]
// theme: coral | mint | amber | violet（块级配色，默认跟随站点 accent）
export default function Kpi({ title, theme, items = [] }) {
  const list = Array.isArray(items) ? items : []
  return (
    <div className="block viz kpi" data-theme={theme}>
      {title && <div className="block-tag">指标卡片</div>}
      {title && <h4 className="kpi-title">{title}</h4>}
      <Stagger className="kpi-grid" gap={0.1} margin="-12%">
        {list.map((it, i) => (
          <StaggerItem key={i}>
            <div className="kpi-card">
              <div className="kpi-card-head">
                <span className="kpi-name">{it.name}</span>
                {it.value && <span className="kpi-value">{it.value}</span>}
              </div>
              {it.def && <p className="kpi-def">{it.def}</p>}
              {it.signal && (
                <p className="kpi-signal">
                  <span className="kpi-signal-tag">信号</span>
                  {it.signal}
                </p>
              )}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}
