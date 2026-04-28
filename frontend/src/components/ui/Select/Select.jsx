import styles from './Select.module.css'

export default function Select({ label, error, options = [], className = '', ...props }) {
  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <select className={`${styles.select} ${error ? styles.hasError : ''}`} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
