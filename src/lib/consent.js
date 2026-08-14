// 隐私同意：决定本地（IndexedDB）是否开始记录学习者数据。
// 对齐《微信外部链接内容管理规范》2.11：未经用户明确同意，不得复制/存储用户数据。
export const CONSENT_KEY = 'lp:consent'

export function getConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY)
  } catch {
    return null
  }
}

export function setConsent(v) {
  try {
    localStorage.setItem(CONSENT_KEY, v)
  } catch {
    /* 隐私模式下 localStorage 可能不可用，忽略 */
  }
}

// 仅当从未做过选择时才需要弹窗
export function needsConsent() {
  return getConsent() === null
}

export function isConsented() {
  return getConsent() === '1'
}
