import { useAuth } from '../../contexts/AuthContext'
import { useOrderNotifications } from '../../hooks/useOrderNotifications'
import Sidebar from './Sidebar'
import styles from './Layout.module.css'

function NotificationWatcher() {
  const { user } = useAuth()
  useOrderNotifications(user?.role === 'doctor')
  return null
}

export default function Layout({ children }) {
  return (
    <div className={styles.root}>
      <Sidebar />
      <NotificationWatcher />
      <main className={styles.main}>{children}</main>
    </div>
  )
}
