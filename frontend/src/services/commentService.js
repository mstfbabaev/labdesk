import api from './api'

export async function addComment(orderId, text) {
  const res = await api.post(`/orders/${orderId}/comments`, { text })
  return res.data
}

export async function deleteComment(orderId, commentId) {
  await api.delete(`/orders/${orderId}/comments/${commentId}`)
}
