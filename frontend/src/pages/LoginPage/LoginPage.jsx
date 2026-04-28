import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(user.role === 'admin' ? '/admin/orders' : '/doctor/orders')
    } catch (err) {
      setError(err.response?.data?.detail || 'Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* ── LEFT: Form ── */}
        <div className={styles.left}>
          <h1 className={styles.greeting}>Добро пожаловать!</h1>
          <p className={styles.sub}>Введите email и пароль для входа.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@dentallab.com"
                required
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Пароль</label>
              <div className={styles.passwordWrap}>
                <input
                  className={styles.input}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className={styles.showBtn}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Скрыть' : 'Показать'}
                </button>
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : 'Войти'}
            </button>
          </form>

          <p className={styles.powered}>
            Powered by{' '}
            <a href="https://t.me/BuxaraSoftUz" target="_blank" rel="noreferrer">@BuxaraSoftUz</a>
          </p>
        </div>

        {/* ── RIGHT: Brand image ── */}
        <div className={styles.right}>
          <img src="/logo.png" alt="LabDesk" className={styles.rightLogo} />
          <p className={styles.rightTagline}>Зуботехническая<br />лаборатория</p>
        </div>

      </div>
    </div>
  )
}
