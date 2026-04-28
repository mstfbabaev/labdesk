import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOrders } from '../services/orderService'

const STATUS_LABELS = {
  new: 'Новый',
  in_progress: 'В работе',
  ready: 'Готов',
  issued: 'Выдан',
}

function requestPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/favicon.ico' })
}

export function useOrderNotifications(enabled) {
  const prevStatuses = useRef(null)

  useEffect(() => {
    if (enabled) requestPermission()
  }, [enabled])

  const { data } = useQuery({
    queryKey: ['orders-poll'],
    queryFn: () => getOrders({ page: 1, page_size: 50 }),
    enabled,
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (!data) return
    const items = data?.items ?? []
    const current = Object.fromEntries(items.map((o) => [o.id, o.status]))

    if (prevStatuses.current !== null) {
      items.forEach((order) => {
        const prev = prevStatuses.current[order.id]
        if (prev && prev !== order.status) {
          notify(
            `Заказ: ${order.patient_name}`,
            `Статус: ${STATUS_LABELS[prev] ?? prev} → ${STATUS_LABELS[order.status] ?? order.status}`
          )
        }
      })
    }

    prevStatuses.current = current
  }, [data])
}
