import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Sidebar.module.css'

const adminNav = [
  { to: '/admin/dashboard', label: 'Дашборд' },
  { to: '/admin/orders', label: 'Все заказы' },
  { to: '/admin/doctors', label: 'Врачи' },
]

const doctorNav = [
  { to: '/doctor/new-order', label: 'Новый заказ' },
  { to: '/doctor/orders', label: 'Текущие работы' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const nav = user?.role === 'admin' ? adminNav : doctorNav
  const settingsTo = user?.role === 'admin' ? '/admin/settings' : null

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src="/logo.png" alt="LabDesk" className={styles.logoMark} />
      </div>

      <nav className={styles.nav}>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.bottom}>
        {settingsTo && (
          <NavLink
            to={settingsTo}
            className={({ isActive }) => `${styles.link} ${styles.settingsLink} ${isActive ? styles.active : ''}`}
          >
            ⚙ Настройки
          </NavLink>
        )}
        <div className={styles.footer}>
          <NavLink to="/profile" className={styles.userInfo}>
            <span className={styles.userName}>{user?.first_name} {user?.last_name}</span>
            <span className={styles.userRole}>{user?.role === 'admin' ? 'Администратор' : 'Врач'}</span>
          </NavLink>
          <button className={styles.logoutBtn} onClick={logout}>Выйти</button>
        </div>
      </div>
    </aside>
  )
}
