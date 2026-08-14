// 行为数据层：轻量事件日志，用于构建"学习行为画像"。
// 不阻塞 UI（fire-and-forget），仅当已同意隐私时才记录（微信规范 2.11）。
// 事件类型：session_start / session_end / scroll_depth / section_view /
//           scene_open / explore_choice / hint_used / challenge_attempt
import { get, set } from 'idb-keyval'
import { isConsented } from './consent'

const BEHAVIOR_KEY = 'lp:behavior:v4'
const MAX_EVENTS = 4000

export function logBehavior(type, payload = {}) {
  if (!isConsented()) return
  try {
    const ev = { ts: Date.now(), type, ...payload }
    get(BEHAVIOR_KEY)
      .then((all) => {
        const arr = all || []
        arr.push(ev)
        if (arr.length > MAX_EVENTS) arr.splice(0, arr.length - MAX_EVENTS)
        set(BEHAVIOR_KEY, arr)
      })
      .catch(() => {})
  } catch (e) {
    /* 隐私模式 / IndexedDB 不可用，忽略 */
  }
}

export async function getBehaviors() {
  try {
    return (await get(BEHAVIOR_KEY)) || []
  } catch {
    return []
  }
}
