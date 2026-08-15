import { Stagger, StaggerItem } from './motion'

// 流程 / 时序链：把「依次发生、可带基准带」的环节串成一条链路。
// 数据：steps = [{ name, desc, benchmark(可选，行业基准/异常解读) }]
export default function Flow({ title, steps = [] }) {
  const list = Array.isArray(steps) ? steps : []
  return (
    <Stagger className="block flow2" gap={0.08} margin="-12%">
      {title && <div className="block-tag">流程链</div>}
      {title && <h4 className="flow-title">{title}</h4>}
      <div className="flow2-track">
        {list.map((s, i) => (
          <StaggerItem key={i} className="flow2-item-wrap">
            <div className="flow2-item">
              <span className="flow2-dot">{i + 1}</span>
              <div className="flow2-body">
                <div className="flow2-card-head">
                  <span className="flow2-name">{s.name}</span>
                  {s.benchmark && <span className="flow2-bench">基准 {s.benchmark}</span>}
                </div>
                {s.desc && <p className="flow2-desc">{s.desc}</p>}
              </div>
            </div>
            {i < list.length - 1 && <div className="flow2-arrow" aria-hidden="true">↓</div>}
          </StaggerItem>
        ))}
      </div>
    </Stagger>
  )
}
