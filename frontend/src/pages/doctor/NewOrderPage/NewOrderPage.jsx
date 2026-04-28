import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createOrder } from '../../../services/orderService'
import { useFileUpload } from '../../../hooks/useFileUpload'
import Input from '../../../components/ui/Input/Input'
import Button from '../../../components/ui/Button/Button'
import FileUploadZone from '../../../components/files/FileUploadZone'
import styles from './NewOrderPage.module.css'

export default function NewOrderPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ patient_name: '', work_type: '', delivery_date: '', comment: '' })
  const [error, setError] = useState('')
  const [pendingFiles, setPendingFiles] = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const { uploads, uploadFiles } = useFileUpload(() => {
    navigate('/doctor/orders')
  })

  const createMut = useMutation({ mutationFn: createOrder })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const order = await createMut.mutateAsync(form)
      if (pendingFiles?.length) {
        await uploadFiles(order.id, pendingFiles)
      } else {
        navigate('/doctor/orders')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка создания заказа')
    }
  }

  const isUploading = uploads.some((u) => u.status === 'uploading')

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Новый заказ</h1>

      <div className={styles.card}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="ФИО пациента"
            value={form.patient_name}
            onChange={(e) => set('patient_name', e.target.value)}
            placeholder="Иванов Иван Иванович"
            required
          />
          <Input
            label="Тип работы"
            value={form.work_type}
            onChange={(e) => set('work_type', e.target.value)}
            placeholder="Коронка металлокерамическая"
            required
          />
          <Input
            label="Дата сдачи"
            type="date"
            value={form.delivery_date}
            onChange={(e) => set('delivery_date', e.target.value)}
            required
          />
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Комментарий</label>
            <textarea
              className={styles.textarea}
              value={form.comment}
              onChange={(e) => set('comment', e.target.value)}
              placeholder="Дополнительные указания..."
              rows={3}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Файлы (STL, ZIP, JPG, PNG)</label>
            <FileUploadZone
              uploads={uploads}
              onFilesSelected={(files) => setPendingFiles(Array.from(files))}
              disabled={createMut.isPending || isUploading}
            />
            {pendingFiles?.length > 0 && !uploads.length && (
              <p className={styles.pendingInfo}>Выбрано файлов: {pendingFiles.length}. Файлы будут загружены после создания заказа.</p>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <Button
              type="submit"
              size="lg"
              loading={createMut.isPending || isUploading}
              disabled={createMut.isPending || isUploading}
            >
              {isUploading ? 'Загрузка файлов...' : 'Создать заказ'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
