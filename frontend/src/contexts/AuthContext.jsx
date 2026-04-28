import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getMe, login as loginService, logout as logoutService, refreshToken } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refreshToken()
      .then(() => getMe())
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    await loginService(email, password)
    const u = await getMe()
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await logoutService()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
