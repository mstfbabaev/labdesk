import styles from './Badge.module.css'

const STATUS_LABELS = {
  new: 'Новый',
  in_progress: 'В работе',
  ready: 'Готов',
  issued: 'Выдан',
}

export default function Badge({ status, children, className = '' }) {
  const label = status ? (STATUS_LABELS[status] || status) : children
  return (
    <span className={`${styles.badge} ${status ? styles[status.replace('_', '-')] : ''} ${className}`}>
      {label}
    </span>
  )
}
