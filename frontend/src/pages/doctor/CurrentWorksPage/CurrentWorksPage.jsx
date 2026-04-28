import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getOrders } from '../../../services/orderService'
import Badge from '../../../components/ui/Badge/Badge'
import Spinner from '../../../components/ui/Spinner/Spinner'
import styles from './CurrentWorksPage.module.css'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU')
}

function isOverdue(order) {
  if (order.status === 'issued') return false
  return new Date(order.delivery_date) < new Date(new Date().setHours(0, 0, 0, 0))
}

const TABS = [
  { key: 'all',         label: 'Все' },
  { key: 'new',         label: 'Новые' },
  { key: 'in_progress', label: 'В работе' },
  { key: 'ready',       label: 'Готовы' },
  { key: 'issued',      label: 'Выданы' },
]

export default function CurrentWorksPage() {
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'doctor'],
    queryFn: () => getOrders({ page: 1, page_size: 100 }),
  })

  const orders = data?.items ?? []

  const stats = useMemo(() => ({
    total:       orders.length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    ready:       orders.filter(o => o.status === 'ready').length,
    overdue:     orders.filter(o => isOverdue(o)).length,
  }), [orders])

  const filtered = useMemo(() => {
    let list = tab === 'all' ? orders : orders.filter(o => o.status === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o => o.patient_name.toLowerCase().includes(q) || o.work_type.toLowerCase().includes(q))
    }
    return list
  }, [orders, tab, search])

  if (isLoading) return <div className={styles.center}><Spinner size={32} /></div>

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.topBar}>
        <h1 className={styles.heading}>Мои заказы</h1>
        <Link to="/doctor/new-order" className={styles.newBtn}>+ Новый заказ</Link>
      </div>

      {/* Stats */}
      {orders.length > 0 && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{stats.total}</span>
            <span className={styles.statLabel}>Всего</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{stats.in_progress}</span>
            <span className={styles.statLabel}>В работе</span>
          </div>
          <div className={`${styles.stat} ${stats.ready > 0 ? styles.statReady : ''}`}>
            <span className={styles.statNum}>{stats.ready}</span>
            <span className={styles.statLabel}>Готовы к выдаче</span>
          </div>
          {stats.overdue > 0 && (
            <div className={`${styles.stat} ${styles.statOverdue}`}>
              <span className={styles.statNum}>{stats.overdue}</span>
              <span className={styles.statLabel}>Просрочено</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className={styles.controls}>
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key !== 'all' && (
                <span className={styles.tabCount}>
                  {orders.filter(o => o.status === t.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          className={styles.search}
          placeholder="Поиск по пациенту или типу работы..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {orders.length === 0 ? (
            <>
              <span className={styles.emptyIcon}>📋</span>
              <p className={styles.emptyText}>Заказов пока нет</p>
              <Link to="/doctor/new-order" className={styles.emptyLink}>Создать первый заказ →</Link>
            </>
          ) : (
            <>
              <span className={styles.emptyIcon}>🔍</span>
              <p className={styles.emptyText}>Ничего не найдено</p>
            </>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(order => {
            const overdue = isOverdue(order)
            return (
              <Link
                key={order.id}
                to={`/doctor/orders/${order.id}`}
                className={`${styles.card} ${overdue ? styles.cardOverdue : ''} ${order.status === 'ready' ? styles.cardReady : ''}`}
              >
                {order.status === 'ready' && (
                  <div className={styles.readyBanner}>✓ Готов к выдаче</div>
                )}
                <div className={styles.cardHeader}>
                  <span className={styles.patient}>{order.patient_name}</span>
                  <Badge status={order.status} />
                </div>
                <p className={styles.workType}>{order.work_type}</p>
                <div className={styles.cardFooter}>
                  <span className={`${styles.meta} ${overdue ? styles.overdueDate : ''}`}>
                    📅 {formatDate(order.delivery_date)}{overdue ? ' — Просрочен!' : ''}
                  </span>
                  {order.file_count > 0 && (
                    <span className={styles.meta}>📎 {order.file_count}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
