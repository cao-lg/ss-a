import { Stagger, StaggerItem } from './motion'

// 流程 / 时序链：纵向时间线，把「依次发生、可带基准带」的环节串成一条链路。
// 贯穿轴线 + 圆形节点编号 + 卡片（名称 / 基准标签 / 说明），节点随滚动依次点亮。
// 数据：steps = [{ name, desc, benchmark(可选，行业基准/异常解读) }]
// theme: coral | mint | amber | violet（块级配色，默认跟随站点 accent）
export default function Flow({ title, theme, steps = [] }) {
  const list = Array.isArray(steps) ? steps : []
  return (
    <div className="block viz flow2" data-theme={theme}>
      {title && <div className="block-tag">流程链</div>}
      {title && <h4 className="flow-title">{title}</h4>}
      <Stagger className="flow2-track" gap={0.08} margin="-12%">
        {list.map((s, i) => (
          <StaggerItem key={i} className={`flow2-item-wrap ${s.benchmark ? 'bench' : ''}`}>
            <span className="flow2-node">{i + 1}</span>
            <div className="flow2-item">
              <div className="flow2-body">
                <div className="flow2-card-head">
                  <span className="flow2-name">{s.name}</span>
                  {s.benchmark && <span className="flow2-bench">基准 {s.benchmark}</span>}
                </div>
                {s.desc && <p className="flow2-desc">{s.desc}</p>}
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}
