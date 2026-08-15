import { Stagger, StaggerItem } from './motion'

// 概念卡网格：把「并列概念 / 类型 / 特征」从大段叙述里抽出来，
// 变成可扫读的小卡片（标题 + 一句说明）。区别于 kpi（kpi 强调指标/数值/信号）。
// 数据：items = [{ title, desc }]
// theme: coral | mint | amber | violet（块级配色，默认跟随站点 accent）
export default function Cards({ title, theme, items = [] }) {
  const list = Array.isArray(items) ? items : []
  return (
    <div className="block viz cards" data-theme={theme}>
      {title && <div className="block-tag">概念卡</div>}
      {title && <h4 className="cards-title">{title}</h4>}
      <Stagger className="cards-grid" gap={0.09} margin="-12%">
        {list.map((it, i) => (
          <StaggerItem key={i}>
            <div className="card-item">
              <span className="card-idx">{i + 1}</span>
              <div className="card-body">
                {it.title && <div className="card-title">{it.title}</div>}
                {it.desc && <p className="card-desc">{it.desc}</p>}
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}
