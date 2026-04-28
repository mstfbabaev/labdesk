import axios from 'axios'
import api, { setAccessToken } from './api'

export async function login(email, password) {
  const res = await axios.post('/api/v1/auth/login', { email, password }, { withCredentials: true })
  setAccessToken(res.data.access_token)
  return res.data
}

export async function refreshToken() {
  const res = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
  setAccessToken(res.data.access_token)
  return res.data
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } catch (_) {
    // ignore errors on logout
  } finally {
    setAccessToken(null)
  }
}

export async function getMe() {
  const res = await api.get('/auth/me')
  return res.data
}

export async function updateMe(data) {
  const res = await api.patch('/auth/me', data)
  return res.data
}
