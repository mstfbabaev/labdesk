import { useEffect } from 'react'
import styles from './Modal.module.css'

export default function Modal({ isOpen, onClose, title, children, width = 480 }) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal} style={{ width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
