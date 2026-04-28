import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrders, updateOrderStatus, deleteOrder } from '../../../services/orderService'
import { getUsers } from '../../../services/userService'
import Badge from '../../../components/ui/Badge/Badge'
import Select from '../../../components/ui/Select/Select'
import Input from '../../../components/ui/Input/Input'
import Spinner from '../../../components/ui/Spinner/Spinner'
import styles from './AdminOrdersPage.module.css'

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'new', label: 'Новый' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'ready', label: 'Готов' },
  { value: 'issued', label: 'Выдан' },
]

const STATUS_NEXT = {
  new:         { value: 'in_progress', label: 'В работе' },
  in_progress: { value: 'ready',       label: 'Готов' },
  ready:       { value: 'issued',      label: 'Выдан' },
  issued:      null,
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU')
}

function isOverdue(order) {
  if (order.status === 'issued') return false
  return new Date(order.delivery_date) < new Date(new Date().setHours(0, 0, 0, 0))
}

export default function AdminOrdersPage() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState({ status: '', doctor_id: '', date_from: '', date_to: '', sort_by: 'created_at', order: 'desc' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', filters, search, page],
    queryFn: () => getOrders({ ...filters, search, page, page_size: 20 }),
  })

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers({ page: 1, page_size: 100 }),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })

  const handleDelete = (order) => {
    if (window.confirm(`Удалить заказ "${order.patient_name}"? Это действие нельзя отменить.`)) {
      deleteMut.mutate(order.id)
    }
  }

  const doctorOptions = [
    { value: '', label: 'Все врачи' },
    ...(usersData?.items || []).map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` })),
  ]

  const set = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1) }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <h1 className={styles.heading}>Все заказы</h1>
        {data?.total !== undefined && (
          <span className={styles.total}>Найдено: {data.total}</span>
        )}
      </div>

      <div className={styles.filters}>
        <Input
          placeholder="Поиск по пациенту..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ minWidth: 200 }}
        />
        <Select options={STATUS_OPTIONS} value={filters.status} onChange={e => set('status', e.target.value)} />
        <Select options={doctorOptions} value={filters.doctor_id} onChange={e => set('doctor_id', e.target.value)} />
        <Input type="date" value={filters.date_from} onChange={e => set('date_from', e.target.value)} />
        <Input type="date" value={filters.date_to} onChange={e => set('date_to', e.target.value)} />
        <Select
          value={`${filters.sort_by}_${filters.order}`}
          onChange={e => { const [by, ord] = e.target.value.split('_'); set('sort_by', by); setFilters(f => ({ ...f, order: ord })) }}
          options={[
            { value: 'created_at_desc', label: 'Сначала новые' },
            { value: 'created_at_asc',  label: 'Сначала старые' },
            { value: 'delivery_date_asc',  label: 'По дате сдачи ↑' },
            { value: 'delivery_date_desc', label: 'По дате сдачи ↓' },
          ]}
        />
      </div>

      {isLoading ? (
        <div className={styles.center}><Spinner size={32} /></div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Пациент</th>
                  <th>Тип работы</th>
                  <th>Врач</th>
                  <th>Дата сдачи</th>
                  <th>Файлы</th>
                  <th>Статус</th>
                  <th>Создан</th>
                  <th>Действие</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map(order => {
                  const overdue = isOverdue(order)
                  const next = STATUS_NEXT[order.status]
                  return (
                    <tr key={order.id} className={overdue ? styles.rowOverdue : ''}>
                      <td>
                        <Link to={`/admin/orders/${order.id}`} className={styles.link}>
                          {order.patient_name}
                        </Link>
                      </td>
                      <td className={styles.workType}>{order.work_type}</td>
                      <td>{order.doctor.full_name}</td>
                      <td className={overdue ? styles.overdueDate : ''}>
                        {formatDate(order.delivery_date)}{overdue ? ' ⚠' : ''}
                      </td>
                      <td className={styles.center}>{order.file_count || '—'}</td>
                      <td><Badge status={order.status} /></td>
                      <td className={styles.muted}>{formatDate(order.created_at)}</td>
                      <td>
                        {next ? (
                          <button
                            className={styles.nextBtn}
                            onClick={() => statusMut.mutate({ id: order.id, status: next.value })}
                            disabled={statusMut.isPending}
                          >
                            → {next.label}
                          </button>
                        ) : (
                          <span className={styles.done}>✓</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(order)}
                          disabled={deleteMut.isPending}
                          title="Удалить заказ"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!data?.items?.length && <p className={styles.empty}>Заказов не найдено</p>}

          {data?.total > 20 && (
            <div className={styles.pagination}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>← Назад</button>
              <span className={styles.pageInfo}>Стр. {page} из {Math.ceil(data.total / 20)}</span>
              <button disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>Вперёд →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
