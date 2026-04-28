import styles from './Spinner.module.css'

export default function Spinner({ size = 24, className = '' }) {
  return (
    <span
      className={`${styles.spinner} ${className}`}
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  )
}
