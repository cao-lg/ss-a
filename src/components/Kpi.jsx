import { Stagger, StaggerItem } from './motion'

// KPI 卡片网格：把「名词 + 长定义 bullet」转换成
// 指标卡（名称 / 一句话定义 / 核心价值 / 异常解读）。
// 数据：items = [{ name, def, value(可选), signal(可选) }]
export default function Kpi({ title, items = [] }) {
  const list = Array.isArray(items) ? items : []
  return (
    <Stagger className="block kpi" gap={0.1} margin="-12%">
      {title && <div className="block-tag">指标卡片</div>}
      {title && <h4 className="kpi-title">{title}</h4>}
      <div className="kpi-grid">
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
      </div>
    </Stagger>
  )
}
