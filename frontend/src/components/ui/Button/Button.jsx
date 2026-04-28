import styles from './Button.module.css'

export default function Button({ children, variant = 'primary', size = 'md', loading, className = '', ...props }) {
  return (
    <button
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <span className={styles.spinner} /> : null}
      {children}
    </button>
  )
}
