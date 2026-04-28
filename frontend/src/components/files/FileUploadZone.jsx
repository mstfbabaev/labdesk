import { useRef, useState } from 'react'
import ProgressBar from '../ui/ProgressBar/ProgressBar'
import Button from '../ui/Button/Button'
import styles from './FileUploadZone.module.css'

const ALLOWED = ['.stl', '.zip', '.jpg', '.jpeg', '.png']

export default function FileUploadZone({ uploads, onFilesSelected, disabled }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files) => {
    if (!files?.length) return
    onFilesSelected(files)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.zone} ${dragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className={styles.icon}>📎</span>
        <span className={styles.text}>Перетащите файлы или нажмите для выбора</span>
        <span className={styles.hint}>STL, ZIP, JPG, PNG · до 700 МБ</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED.join(',')}
          className={styles.input}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      {uploads.length > 0 && (
        <div className={styles.progress}>
          {uploads.map((u, i) => (
            <ProgressBar
              key={i}
              value={u.progress}
              label={u.file.name}
              status={u.status}
            />
          ))}
        </div>
      )}
    </div>
  )
}
