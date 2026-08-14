import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import ConsentModal from './ConsentModal'
import { getConsent, setConsent, needsConsent } from '../lib/consent'

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const [showConsent, setShowConsent] = useState(() => needsConsent())

  const accept = () => {
    setConsent('1')
    setShowConsent(false)
  }
  const decline = () => {
    setConsent('0')
    setShowConsent(false)
  }

  return (
    <div className="app">
      <div className="ambient" aria-hidden="true" />
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">学</span>
          学练测 · 一体化平台
        </Link>
        <nav className="nav">
          <Link to="/" className={pathname === '/' ? 'active' : ''}>课程</Link>
          <Link to="/profile" className={pathname.startsWith('/profile') ? 'active' : ''}>我的进步</Link>
          <Link to="/admin" className={pathname.startsWith('/admin') ? 'active' : ''}>管理后台</Link>
        </nav>
      </header>
      <main className="content">{children}</main>
      <footer className="site-footer">
        <span className="foot-copy">学练测一体化平台 · 数据仅存本地</span>
        <button className="privacy-link" onClick={() => setShowConsent(true)}>
          隐私说明
        </button>
      </footer>
      <ConsentModal
        open={showConsent}
        onAccept={accept}
        onDecline={decline}
        decided={getConsent() !== null}
      />
    </div>
  )
}
