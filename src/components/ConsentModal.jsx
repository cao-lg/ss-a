import { motion, AnimatePresence } from './motion'

// 首次访问 / 页脚「隐私说明」复看时弹出。
// 两个明确选项；不强制、不诱导，关闭即视为「暂不使用学习记录」。
export default function ConsentModal({ open, onAccept, onDecline, decided }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="consent-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="consent-card"
            role="dialog"
            aria-modal="true"
            aria-label="隐私与学习数据说明"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <h2>隐私与学习数据说明</h2>
            <p>
              本平台是纯前端学习工具，会在<strong>你当前浏览器本地（IndexedDB）</strong>保存以下数据，
              用于生成学习画像与错题本：
            </p>
            <ul>
              <li>学习身份（默认昵称「体验学员」，可随时修改）</li>
              <li>课前 / 课后测、阶段考的作答与对错记录</li>
              <li>学习时长、进度、徽章</li>
            </ul>
            <p>
              这些数据<strong>仅存储于你的设备，不会上传到任何服务器</strong>，
              也不会收集手机号、身份证号等个人信息。你可在「管理后台」随时导出或清空。
            </p>
            <div className="consent-actions">
              <button className="btn primary" onClick={onAccept}>
                同意并开始记录
              </button>
              <button className="btn ghost" onClick={onDecline}>
                暂不使用学习记录
              </button>
            </div>
            {decided && (
              <p className="consent-note">
                你已做出选择，可随时点击下方「隐私说明」更改。
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
