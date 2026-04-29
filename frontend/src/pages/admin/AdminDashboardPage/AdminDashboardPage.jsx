import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getStats, getOrders } from '../../../services/orderService'
import Spinner from '../../../components/ui/Spinner/Spinner'
import Badge from '../../../components/ui/Badge/Badge'
import styles from './AdminDashboardPage.module.css'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU')
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 30000,
  })

  const { data: recent } = useQuery({
    queryKey: ['orders', 'recent'],
    queryFn: () => getOrders({ page: 1, page_size: 8, sort_by: 'created_at', order: 'desc' }),
  })

  const { data: readyOrders } = useQuery({
    queryKey: ['orders', 'ready'],
    queryFn: () => getOrders({ page: 1, page_size: 5, status: 'ready' }),
  })

  if (statsLoading) return <div className={styles.center}><Spinner size={32} /></div>

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Дашборд</h1>

      {/* Alerts */}
      {stats?.ready > 0 && (
        <Link to="/admin/orders?status=ready" className={styles.alertReady}>
          <span>✓ {stats.ready} {stats.ready === 1 ? 'заказ готов' : 'заказа готовы'} к выдаче</span>
          <span className={styles.alertLink}>Посмотреть →</span>
        </Link>
      )}
      {stats?.overdue > 0 && (
        <Link to="/admin/orders" className={styles.alertOverdue}>
          <span>⚠ {stats.overdue} {stats.overdue === 1 ? 'заказ просрочен' : 'заказа просрочены'}</span>
          <span className={styles.alertLink}>Посмотреть →</span>
        </Link>
      )}

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>📋</span>
          <span className={styles.statVal}>{stats?.new ?? 0}</span>
          <span className={styles.statLabel}>Новые</span>
          <Link to="/admin/orders" className={styles.statAction}>Открыть →</Link>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>⚙️</span>
          <span className={styles.statVal}>{stats?.in_progress ?? 0}</span>
          <span className={styles.statLabel}>В работе</span>
          <Link to="/admin/orders" className={styles.statAction}>Открыть →</Link>
        </div>
        <div className={`${styles.statCard} ${stats?.ready > 0 ? styles.statCardReady : ''}`}>
          <span className={styles.statIcon}>✅</span>
          <span className={styles.statVal}>{stats?.ready ?? 0}</span>
          <span className={styles.statLabel}>Отправлены в клинику</span>
          <Link to="/admin/orders" className={styles.statAction}>Открыть →</Link>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statIcon}>📎</span>
          <span className={styles.statVal}>{stats?.issued ?? 0}</span>
          <span className={styles.statLabel}>Архив завершённых работ</span>
          <Link to="/admin/orders?status=issued" className={styles.statAction}>Открыть →</Link>
        </div>
      </div>

      <div className={styles.bottom}>
        {/* Ready orders */}
        {readyOrders?.items?.length > 0 && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Отправлены в клинику</h2>
              <Link to="/admin/orders" className={styles.panelLink}>Все заказы →</Link>
            </div>
            <div className={styles.orderList}>
              {readyOrders.items.map(o => (
                <Link key={o.id} to={`/admin/orders/${o.id}`} className={styles.orderRow}>
                  <div className={styles.orderInfo}>
                    <span className={styles.orderPatient}>{o.patient_name}</span>
                    <span className={styles.orderMeta}>{o.work_type} · {o.doctor.full_name}</span>
                  </div>
                  <div className={styles.orderRight}>
                    <Badge status={o.status} />
                    <span className={styles.orderDate}>{formatDate(o.delivery_date)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent orders */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Последние заказы</h2>
            <Link to="/admin/orders" className={styles.panelLink}>Все заказы →</Link>
          </div>
          <div className={styles.orderList}>
            {recent?.items?.map(o => (
              <Link key={o.id} to={`/admin/orders/${o.id}`} className={styles.orderRow}>
                <div className={styles.orderInfo}>
                  <span className={styles.orderPatient}>{o.patient_name}</span>
                  <span className={styles.orderMeta}>{o.work_type} · {o.doctor.full_name}</span>
                </div>
                <div className={styles.orderRight}>
                  <Badge status={o.status} />
                  <span className={styles.orderDate}>{formatDate(o.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
