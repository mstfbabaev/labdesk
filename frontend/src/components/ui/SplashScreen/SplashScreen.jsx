import { useEffect, useState } from 'react'
import styles from './SplashScreen.module.css'

export default function SplashScreen({ loading }) {
  const [visible, setVisible] = useState(true)
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    if (!loading) {
      setFadingOut(true)
      const t = setTimeout(() => setVisible(false), 400)
      return () => clearTimeout(t)
    }
  }, [loading])

  if (!visible) return null

  return (
    <div className={`${styles.overlay} ${fadingOut ? styles.fadeOut : ''}`}>
      <div className={styles.content}>
        <img src="/logo.png" alt="LabDesk" className={styles.logoImg} />
        <p className={styles.subtitle}>Зуботехническая лаборатория</p>
        <div className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
      </div>
      <span className={styles.brand}>© 2024 LabDesk</span>
    </div>
  )
}
