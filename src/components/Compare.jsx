import { Stagger, StaggerItem } from './motion'

// 双栏对比：把「辨析 / 对比 / 区别」类内容（如结构化 vs 非结构化、定量 vs 定性）
// 从叙述里抽出来，左右两栏并置，一眼看出差异。
// 两种用法：
//   1) 逐维对比：rows = [{ left, right }]（每条一行，左对右）
//   2) 整块对比：left={title,desc,points?} / right={title,desc,points?}
//      points 为字符串数组，可选。
// theme: coral | mint | amber | violet（块级配色，默认跟随站点 accent）
export default function Compare({ title, theme, rows = [], left, right }) {
  const hasRows = Array.isArray(rows) && rows.length > 0
  return (
    <div className="block viz compare" data-theme={theme}>
      {title && <div className="block-tag">对比</div>}
      {title && <h4 className="compare-title">{title}</h4>}

      {hasRows ? (
        <div className="compare-rows">
          {rows.map((r, i) => (
            <div className="compare-row" key={i}>
              <div className="compare-cell compare-left">
                {r.leftTitle && <div className="compare-cell-head">{r.leftTitle}</div>}
                <span className="compare-text">{r.left}</span>
              </div>
              <div className="compare-vs">vs</div>
              <div className="compare-cell compare-right">
                {r.rightTitle && <div className="compare-cell-head">{r.rightTitle}</div>}
                <span className="compare-text">{r.right}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Stagger className="compare-cols" gap={0.1} margin="-12%">
          <StaggerItem>
            <div className="compare-col compare-left">
              {left?.title && <div className="compare-col-head">{left.title}</div>}
              {left?.desc && <p className="compare-col-desc">{left.desc}</p>}
              {Array.isArray(left?.points) && (
                <ul className="compare-points">
                  {left.points.map((p, k) => (
                    <li key={k}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="compare-col compare-right">
              {right?.title && <div className="compare-col-head">{right.title}</div>}
              {right?.desc && <p className="compare-col-desc">{right.desc}</p>}
              {Array.isArray(right?.points) && (
                <ul className="compare-points">
                  {right.points.map((p, k) => (
                    <li key={k}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          </StaggerItem>
        </Stagger>
      )}
    </div>
  )
}
