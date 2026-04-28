import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { updateMe } from '../../services/authService'
import styles from './ProfilePage.module.css'

function Field({ label, value, onChange, type = 'text', placeholder, readOnly }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        className={`${styles.input} ${readOnly ? styles.inputReadOnly : ''}`}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  )
}

export default function ProfilePage() {
  const { user, setUser } = useAuth()

  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName]   = useState(user?.last_name ?? '')
  const [password, setPassword]   = useState('')
  const [passConfirm, setPassConfirm] = useState('')

  const [savedInfo, setSavedInfo] = useState(false)
  const [savedPass, setSavedPass] = useState(false)
  const [passError, setPassError] = useState('')

  const infoMut = useMutation({
    mutationFn: () => updateMe({ first_name: firstName, last_name: lastName }),
    onSuccess: (updated) => {
      setUser(updated)
      setSavedInfo(true)
      setTimeout(() => setSavedInfo(false), 2500)
    },
  })

  const passMut = useMutation({
    mutationFn: () => updateMe({ password }),
    onSuccess: () => {
      setPassword('')
      setPassConfirm('')
      setSavedPass(true)
      setTimeout(() => setSavedPass(false), 2500)
    },
  })

  const handleInfoSubmit = (e) => {
    e.preventDefault()
    infoMut.mutate()
  }

  const handlePassSubmit = (e) => {
    e.preventDefault()
    setPassError('')
    if (password.length < 6) return setPassError('Минимум 6 символов')
    if (password !== passConfirm) return setPassError('Пароли не совпадают')
    passMut.mutate()
  }

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>{initials}</div>
        </div>
        <div className={styles.heroInfo}>
          <h1 className={styles.heroName}>{user?.first_name} {user?.last_name}</h1>
          <span className={styles.heroBadge}>
            {user?.role === 'admin' ? 'Администратор' : 'Врач'}
          </span>
          <p className={styles.heroEmail}>{user?.email}</p>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Личные данные</h2>
          </div>
          <form onSubmit={handleInfoSubmit} className={styles.form}>
            <div className={styles.row}>
              <Field label="Имя" value={firstName} onChange={e => setFirstName(e.target.value)} />
              <Field label="Фамилия" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
            <Field label="Email" value={user?.email ?? ''} readOnly />
            <div className={styles.formFooter}>
              <button
                type="submit"
                className={styles.btn}
                disabled={infoMut.isPending}
              >
                {infoMut.isPending ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
              {savedInfo && <span className={styles.successMsg}>✓ Данные обновлены</span>}
              {infoMut.isError && <span className={styles.errorMsg}>Ошибка сохранения</span>}
            </div>
          </form>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Безопасность</h2>
          </div>
          <form onSubmit={handlePassSubmit} className={styles.form}>
            <Field
              label="Новый пароль"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPassError('') }}
              placeholder="Минимум 6 символов"
            />
            <Field
              label="Повторите пароль"
              type="password"
              value={passConfirm}
              onChange={e => { setPassConfirm(e.target.value); setPassError('') }}
              placeholder="Введите пароль ещё раз"
            />
            {passError && <p className={styles.errorMsg}>{passError}</p>}
            <div className={styles.formFooter}>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnSecondary}`}
                disabled={passMut.isPending || !password}
              >
                {passMut.isPending ? 'Сохранение...' : 'Изменить пароль'}
              </button>
              {savedPass && <span className={styles.successMsg}>✓ Пароль изменён</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
