// 可插拔代码执行器：默认懒加载 Pyodide（浏览器端 Python，无后端）。
// 离线或加载失败时返回 error，由 Challenge 组件优雅降级提示。
let pyodidePromise = null
let loadFailed = false

function loadPyodideLib() {
  if (pyodidePromise) return pyodidePromise
  if (loadFailed) return Promise.reject(new Error('Pyodide 加载已失败'))
  pyodidePromise = (async () => {
    try {
      await new Promise((res, rej) => {
        const s = document.createElement('script')
        s.src = 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.js'
        s.onload = res
        s.onerror = () => rej(new Error('CDN 加载失败'))
        document.head.appendChild(s)
      })
      return await window.loadPyodide()
    } catch (e) {
      loadFailed = true
      throw e
    }
  })()
  return pyodidePromise
}

function indent(code) {
  return code
    .split('\n')
    .map((l) => (l.length ? '    ' + l : l))
    .join('\n')
}

export async function runPython(code, expected) {
  try {
    const py = await loadPyodideLib()
    const wrapped = `import sys, io\n_stdout = io.StringIO()\n_old = sys.stdout\nsys.stdout = _stdout\ntry:\n${indent(
      code
    )}\nfinally:\n    sys.stdout = _old\n_stdout.getvalue()`
    const out = await py.runPythonAsync(wrapped)
    const actual = String(out ?? '').trim()
    const exp = String(expected ?? '').trim()
    const ok = actual === exp
    return { ok, actual, error: null, online: true }
  } catch (e) {
    return { ok: false, actual: null, error: String(e?.message || e), online: false }
  }
}
