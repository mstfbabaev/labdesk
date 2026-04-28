import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteFile, presignDownload } from '../../services/fileService'
import Button from '../ui/Button/Button'
import styles from './FileList.module.css'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function FileIcon({ contentType }) {
  if (contentType?.includes('image')) return '🖼'
  if (contentType === 'application/zip' || contentType?.includes('zip')) return '📦'
  return '📄'
}

export default function FileList({ files, orderId, canDelete = false }) {
  const queryClient = useQueryClient()

  const deleteMut = useMutation({
    mutationFn: ({ orderId, fileId }) => deleteFile(orderId, fileId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
  })

  const handleDownload = async (file) => {
    try {
      const { presigned_url } = await presignDownload(orderId, file.id)
      const a = document.createElement('a')
      a.href = presigned_url
      a.download = file.original_filename
      a.target = '_blank'
      a.click()
    } catch (e) {
      alert('Ошибка скачивания файла')
    }
  }

  if (!files?.length) {
    return <p className={styles.empty}>Файлы не загружены</p>
  }

  return (
    <ul className={styles.list}>
      {files.map((file) => (
        <li key={file.id} className={styles.item}>
          <span className={styles.icon}><FileIcon contentType={file.content_type} /></span>
          <div className={styles.info}>
            <span className={styles.name}>{file.original_filename}</span>
            <span className={styles.size}>{formatSize(file.file_size_bytes)}</span>
          </div>
          <div className={styles.actions}>
            <Button variant="ghost" size="sm" onClick={() => handleDownload(file)}>
              Скачать
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                loading={deleteMut.isPending}
                onClick={() => {
                  if (confirm(`Удалить файл "${file.original_filename}"?`)) {
                    deleteMut.mutate({ orderId, fileId: file.id })
                  }
                }}
                style={{ color: 'var(--color-danger)' }}
              >
                Удалить
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
