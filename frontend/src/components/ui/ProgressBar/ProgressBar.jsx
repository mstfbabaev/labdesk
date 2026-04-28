import styles from './ProgressBar.module.css'

export default function ProgressBar({ value = 0, label, status = 'uploading' }) {
  return (
    <div className={styles.wrapper}>
      {label && (
        <div className={styles.info}>
          <span className={styles.label}>{label}</span>
          <span className={`${styles.pct} ${styles[status]}`}>
            {status === 'done' ? 'Готово' : status === 'error' ? 'Ошибка' : `${value}%`}
          </span>
        </div>
      )}
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${styles[status]}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
