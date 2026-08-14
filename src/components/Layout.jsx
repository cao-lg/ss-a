import { Link, useLocation } from 'react-router-dom'

export default function Layout({ children }) {
  const { pathname } = useLocation()
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
    </div>
  )
}
