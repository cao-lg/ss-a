// 游戏化引擎：等级 / 连续学习天数 / 徽章 / 升级与成就演出数据。
// 纯函数 + 数据目录，无副作用；由 LearnUnit（写入时）与 Profile（渲染时）调用。
// 设计原则：所有动效/文案在 reduced-motion 下自动降级（见 Celebration.jsx）。

export const XP_PER_LEVEL = 150

// 等级称号（珊瑚成长线：从萌新到行业专家）
export const TIERS = [
  '萌新学员',
  '入门学徒',
  '数据新兵',
  '分析能手',
  '洞察先锋',
  '策略分析师',
  '决策智囊',
  '数据大师',
  '首席分析师',
  '行业专家'
]

// 根据累计 XP 推导等级信息
export function levelInfo(xp) {
  const safe = Math.max(0, Math.floor(xp) || 0)
  const maxed = safe >= XP_PER_LEVEL * (TIERS.length - 1)
  const level = maxed ? TIERS.length : Math.floor(safe / XP_PER_LEVEL) + 1
  const xpInto = maxed ? XP_PER_LEVEL : safe - (level - 1) * XP_PER_LEVEL
  const xpToNext = maxed ? 0 : XP_PER_LEVEL - xpInto
  const pct = maxed ? 1 : xpInto / XP_PER_LEVEL
  return {
    level,
    title: TIERS[level - 1],
    xpInto,
    xpToNext,
    pct,
    maxed
  }
}

// 徽章目录：id -> {id,title,desc,icon}
export const BADGES = {
  'first-step': { id: 'first-step', title: '第一步', desc: '完成首个任务后测', icon: '🌱' },
  'streak-3': { id: 'streak-3', title: '三日之约', desc: '连续学习 3 天', icon: '🔥' },
  'streak-7': { id: 'streak-7', title: '一周不辍', desc: '连续学习 7 天', icon: '⚡' },
  'perfect': { id: 'perfect', title: '满分过关', desc: '某任务后测拿到满分', icon: '💎' },
  'halfway': { id: 'halfway', title: '半程达人', desc: '完成过半任务', icon: '🚀' },
  'graduation': { id: 'graduation', title: '正式结业', desc: '完成全部任务后测', icon: '🎓' }
}

// 今日日期键（与 storage.js 同格式 YYYY-MM-DD）
function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

// 真实"连续学习天数"：同一天不重复计数；隔日 +1；中断归 1。
// 返回新的 progress（含 streakDays / lastDay）。
export function streakBump(progress) {
  const today = todayKey()
  if (progress.lastDay === today) return progress
  let streakDays = 1
  if (progress.lastDay) {
    const d = new Date(today)
    const p = new Date(progress.lastDay)
    const diffDays = Math.round((d - p) / 86400000)
    if (diffDays === 1) streakDays = (progress.streakDays || 0) + 1
  }
  return { ...progress, streakDays, lastDay: today }
}

// 依据当前进度与上下文，算出"本次新解锁"的徽章 id 列表（不重复授予）
// ctx: { perfectPost, unitsDone, totalUnits }
export function evaluateBadges(progress, ctx = {}) {
  const have = new Set(progress.badges || [])
  const out = []
  const add = (id) => { if (!have.has(id)) out.push(id) }
  const { perfectPost, unitsDone = 0, totalUnits = 0 } = ctx
  if (unitsDone >= 1) add('first-step')
  if ((progress.streakDays || 0) >= 3) add('streak-3')
  if ((progress.streakDays || 0) >= 7) add('streak-7')
  if (perfectPost) add('perfect')
  if (totalUnits && unitsDone >= Math.ceil(totalUnits / 2)) add('halfway')
  if (totalUnits && unitsDone >= totalUnits) add('graduation')
  return out
}

// 计算升级与成就演出数据：供 Celebration 组件渲染
// 返回 { leveledUp, fromLevel, toLevel, tierTitle, badges:[徽章定义] }
export function celebrationFor(prevProgress, nextProgress, newBadgeIds = []) {
  const a = levelInfo(prevProgress.xp || 0)
  const b = levelInfo(nextProgress.xp || 0)
  const badgeDefs = newBadgeIds.map((id) => BADGES[id]).filter(Boolean)
  return {
    leveledUp: b.level > a.level,
    fromLevel: a.level,
    toLevel: b.level,
    tierTitle: b.title,
    badges: badgeDefs
  }
}
