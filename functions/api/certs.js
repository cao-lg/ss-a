// GET /api/certs — 读取 KV 中的公开名册（不含激活码明文），供学生站激活时拉取最新证书。
// 公开只读；缓存 30s 以降低 KV 读压力。无需鉴权：名册本就公开，且每条证书仍需学生站内置公钥验签。
export async function onRequestGet({ env }) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=30',
    'access-control-allow-origin': '*'
  }
  try {
    const raw = await env.CERTS_KV.get('certs')
    const list = raw ? JSON.parse(raw) : []
    return new Response(JSON.stringify(Array.isArray(list) ? list : []), { headers })
  } catch {
    return new Response(JSON.stringify([]), { headers })
  }
}

// 兼容跨域预检（极少用，但保留以防学生站从其他源调试）。
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400'
    }
  })
}
