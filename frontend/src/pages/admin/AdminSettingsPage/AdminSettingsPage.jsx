import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotifications, getNotificationStats, retryNotification, setUserTelegram } from '../../../services/notificationService'
import { getUsers } from '../../../services/userService'
import Spinner from '../../../components/ui/Spinner/Spinner'
import styles from './AdminSettingsPage.module.css'

const CHANNEL_LABEL = { telegram: '📱 Telegram', webhook: '🔗 Webhook' }
const EVENT_LABEL = {
  order_created: 'Новый заказ',
  status_changed: 'Смена статуса',
  comment_added: 'Комментарий',
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }) {
  const cls = status === 'sent' ? styles.statusSent : status === 'failed' ? styles.statusFailed : styles.statusPending
  const label = status === 'sent' ? 'Отправлено' : status === 'failed' ? 'Ошибка' : 'Ожидает'
  return <span className={`${styles.statusBadge} ${cls}`}>{label}</span>
}

function NotificationsSection() {
  const qc = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['notif-stats'],
    queryFn: getNotificationStats,
    refetchInterval: 15000,
  })

  const { data: notifs, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({ page: 1, page_size: 20 }),
    refetchInterval: 15000,
  })

  const retryMut = useMutation({
    mutationFn: retryNotification,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-stats'] })
    },
  })

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Уведомления</h2>
      </div>
      <div className={styles.sectionBody}>
        <div className={styles.statsRow}>
          <div className={`${styles.statCard} ${styles.statSent}`}>
            <div className={styles.statVal}>{stats?.sent ?? 0}</div>
            <div className={styles.statLabel}>Отправлено</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statVal}>{stats?.pending ?? 0}</div>
            <div className={styles.statLabel}>В очереди</div>
          </div>
          <div className={`${styles.statCard} ${stats?.failed > 0 ? styles.statFailed : ''}`}>
            <div className={styles.statVal}>{stats?.failed ?? 0}</div>
            <div className={styles.statLabel}>Ошибок</div>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.center}><Spinner size={24} /></div>
        ) : !notifs?.items?.length ? (
          <p className={styles.empty}>Уведомлений пока нет</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Канал</th>
                <th>Событие</th>
                <th>Статус</th>
                <th>Попыток</th>
                <th>Отправлено</th>
                <th>Ошибка</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {notifs.items.map(n => (
                <tr key={n.id}>
                  <td>{CHANNEL_LABEL[n.channel] ?? n.channel}</td>
                  <td className={styles.muted}>{EVENT_LABEL[n.event] ?? n.event}</td>
                  <td><StatusBadge status={n.status} /></td>
                  <td className={styles.muted}>{n.attempts}</td>
                  <td className={styles.muted}>{formatDate(n.sent_at)}</td>
                  <td>{n.error ? <span className={styles.errorText} title={n.error}>{n.error}</span> : '—'}</td>
                  <td>
                    {n.status === 'failed' && (
                      <button
                        className={styles.retryBtn}
                        onClick={() => retryMut.mutate(n.id)}
                        disabled={retryMut.isPending}
                      >
                        ↺ Повторить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function TelegramRow({ user }) {
  const qc = useQueryClient()
  const [chatId, setChatId] = useState(user.telegram_chat_id ?? '')
  const [saved, setSaved] = useState(false)

  const mut = useMutation({
    mutationFn: () => setUserTelegram(user.id, chatId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <div className={styles.doctorRow}>
      <span className={styles.doctorName}>{user.first_name} {user.last_name}</span>
      <input
        className={styles.chatInput}
        placeholder="Chat ID (напр. 123456789)"
        value={chatId}
        onChange={e => { setChatId(e.target.value); setSaved(false) }}
      />
      <button className={styles.saveBtn} onClick={() => mut.mutate()} disabled={mut.isPending}>
        Сохранить
      </button>
      {saved && <span className={styles.saved}>✓ Сохранено</span>}
    </div>
  )
}

function TelegramSection() {
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers({ page: 1, page_size: 100 }),
  })

  const admins  = (usersData?.items ?? []).filter(u => u.role === 'admin')
  const doctors = (usersData?.items ?? []).filter(u => u.role === 'doctor')

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Telegram — Администраторы</h2>
        </div>
        <div className={styles.sectionBody}>
          <p className={styles.hint}>
            Администраторы с прописанным Chat ID получают уведомление о <strong>каждом новом заказе</strong>.
            Узнать свой Chat ID: напишите боту <strong>@userinfobot</strong> в Telegram.
          </p>
          {isLoading ? (
            <div className={styles.center}><Spinner size={24} /></div>
          ) : !admins.length ? (
            <p className={styles.empty}>Администраторы не найдены</p>
          ) : (
            <div style={{ marginTop: 16 }}>
              {admins.map(u => <TelegramRow key={u.id} user={u} />)}
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Telegram — Врачи</h2>
        </div>
        <div className={styles.sectionBody}>
          <p className={styles.hint}>
            Врачи с прописанным Chat ID получают уведомление при <strong>смене статуса их заказа</strong>.
            Chat ID узнаётся через бота <strong>@userinfobot</strong>.
          </p>
          {isLoading ? (
            <div className={styles.center}><Spinner size={24} /></div>
          ) : !doctors.length ? (
            <p className={styles.empty}>Врачи не найдены</p>
          ) : (
            <div style={{ marginTop: 16 }}>
              {doctors.map(u => <TelegramRow key={u.id} user={u} />)}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function AdminSettingsPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Настройки</h1>
      <NotificationsSection />
      <TelegramSection />
    </div>
  )
}
