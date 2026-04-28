import api from './api'

export async function getNotifications(params) {
  const res = await api.get('/notifications', { params })
  return res.data
}

export async function getNotificationStats() {
  const res = await api.get('/notifications/stats')
  return res.data
}

export async function retryNotification(id) {
  const res = await api.post(`/notifications/${id}/retry`)
  return res.data
}

export async function setUserTelegram(userId, telegramChatId) {
  const res = await api.patch(`/notifications/telegram/${userId}`, {
    telegram_chat_id: telegramChatId || null,
  })
  return res.data
}
