// 公式块：把「带计算公式的指标」做成公式 + 变量释义。
// 数据：expr(公式主体) / vars=[{ sym, mean }] / note(可选解读)
// theme: coral | mint | amber | violet（块级配色，默认跟随站点 accent）
export default function Formula({ title, theme, expr, vars = [], note }) {
  const list = Array.isArray(vars) ? vars : []
  return (
    <div className="block viz formula" data-theme={theme}>
      <div className="block-tag">公式</div>
      {title && <h4 className="formula-title">{title}</h4>}
      {expr && <div className="formula-expr">{expr}</div>}
      {list.length > 0 && (
        <ul className="formula-vars">
          {list.map((v, i) => (
            <li key={i}>
              <code className="formula-sym">{v.sym}</code>
              <span>{v.mean}</span>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="formula-note">{note}</p>}
    </div>
  )
}
