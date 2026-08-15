import { Stagger, StaggerItem } from './motion'

// 编号步骤：把「操作步骤 / 流程步骤 / 认知递进」从叙述里抽成一条带编号的链路。
// 与 flow2（带行业基准基准带）区分：steps 更轻量，强调"第 1 步 → 第 2 步 → …"的顺序，
// 如 数据→信息→知识→决策 的认知递进，或 采集→整合→分析→决策→反馈 的闭环。
// 数据：steps = [{ title, desc }]
// theme: coral | mint | amber | violet（块级配色，默认跟随站点 accent）
export default function Steps({ title, theme, steps = [] }) {
  const list = Array.isArray(steps) ? steps : []
  return (
    <div className="block viz steps" data-theme={theme}>
      {title && <div className="block-tag">步骤</div>}
      {title && <h4 className="steps-title">{title}</h4>}
      <Stagger className="steps-track" gap={0.08} margin="-12%">
        {list.map((s, i) => (
          <StaggerItem key={i} className="step-item-wrap">
            <span className="step-num">{i + 1}</span>
            <div className="step-body">
              {s.title && <div className="step-title">{s.title}</div>}
              {s.desc && <p className="step-desc">{s.desc}</p>}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}
