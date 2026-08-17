// 品牌微文案库（Microcopy）：把平淡的系统提示换成有温度的对话语气。
// 原则：① 贴合珊瑚+薄荷的成长陪伴调性 ② 仍是"有用的信息"而非纯卖萌 ③ 中文优先
// 用法：import { MICROCOPY } from '../lib/copy'，按场景取用；动态部分用函数式。

export const MICROCOPY = {
  loading: {
    default: '正在为你点亮知识灯…',
    exam: '正在生成你的专属测验卷…',
    profile: '正在翻看你的成长相册…'
  },
  empty: {
    assess: '这个任务还没出题，先去学习再来挑战吧 ✨',
    wrongbook: '错题本空空如也，说明你学得很扎实 🌟',
    mastery: '还没有完成任何任务，',
    streak: '今天还没开始学，点开一个任务热个身吧 🔥'
  },
  success: {
    unitDone: (gain) => (gain > 0 ? `有效学习！增益 +${gain}%` : '已完成本任务，保持节奏 👍'),
    levelUp: (tier) => `你已晋升为「${tier}」`,
    allMastered: '全部任务通关，正式结业 🎓'
  },
  error: {
    network: '网络打了个小喷嚏，再试一次就好 🤧',
    examFail: (need) => `还差一点点，合格线 ${need} 分，再来一次就稳了！`,
    generic: '出了点小状况，我们马上处理～'
  },
  hint: {
    preSkip: '课前测不计入成绩，放轻松，先摸清起点',
    retry: '错题是最好的老师，去重做一遍巩固一下',
    streakKeep: (n) => `已连续学习 ${n} 天，这份坚持很珍贵，明天也来见我吧 🌿`
  }
}
