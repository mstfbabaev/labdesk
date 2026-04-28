import api from './api'

export async function getOrders(params) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
  const res = await api.get('/orders', { params: clean })
  return res.data
}

export async function getOrder(id) {
  const res = await api.get(`/orders/${id}`)
  return res.data
}

export async function createOrder(data) {
  const res = await api.post('/orders', data)
  return res.data
}

export async function updateOrderStatus(id, status) {
  const res = await api.patch(`/orders/${id}/status`, { status })
  return res.data
}

export async function deleteOrder(id) {
  await api.delete(`/orders/${id}`)
}

export async function getStats() {
  const res = await api.get('/orders/stats')
  return res.data
}
