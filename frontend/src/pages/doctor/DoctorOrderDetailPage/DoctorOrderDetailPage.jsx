import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrder } from '../../../services/orderService'
import { useFileUpload } from '../../../hooks/useFileUpload'
import Spinner from '../../../components/ui/Spinner/Spinner'
import FileList from '../../../components/files/FileList'
import FileUploadZone from '../../../components/files/FileUploadZone'
import CommentSection from '../../../components/comments/CommentSection'
import styles from './DoctorOrderDetailPage.module.css'

const STEPS = [
  { key: 'new',         label: 'Новый' },
  { key: 'in_progress', label: 'В работе' },
  { key: 'ready',       label: 'Готов' },
  { key: 'issued',      label: 'Выдан' },
]

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU')
}

function isOverdue(order) {
  if (order.status === 'issued') return false
  return new Date(order.delivery_date) < new Date(new Date().setHours(0, 0, 0, 0))
}

function isImage(filename) {
  return /\.(jpg|jpeg|png)$/i.test(filename)
}

function StatusStepper({ status }) {
  const currentIdx = STEPS.findIndex(s => s.key === status)
  return (
    <div className={styles.stepper}>
      {STEPS.map((step, idx) => (
        <div key={step.key} className={styles.stepItem}>
          <div className={`${styles.stepCircle} ${idx <= currentIdx ? styles.stepDone : ''} ${idx === currentIdx ? styles.stepCurrent : ''}`}>
            {idx < currentIdx ? '✓' : idx + 1}
          </div>
          <span className={`${styles.stepLabel} ${idx === currentIdx ? styles.stepLabelActive : ''}`}>{step.label}</span>
          {idx < STEPS.length - 1 && (
            <div className={`${styles.stepLine} ${idx < currentIdx ? styles.stepLineDone : ''}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function ImagePreview({ file }) {
  const [open, setOpen] = useState(false)

  if (!isImage(file.original_name)) return null

  return (
    <>
      <button className={styles.previewBtn} onClick={() => setOpen(true)}>
        👁 Предпросмотр
      </button>
      {open && (
        <div className={styles.lightbox} onClick={() => setOpen(false)}>
          <div className={styles.lightboxInner} onClick={e => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={() => setOpen(false)}>✕</button>
            <img src={file.url} alt={file.original_name} className={styles.lightboxImg} />
            <p className={styles.lightboxName}>{file.original_name}</p>
          </div>
        </div>
      )}
    </>
  )
}

export default function DoctorOrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
  })

  const { uploads, uploadFiles } = useFileUpload(() => {
    queryClient.invalidateQueries({ queryKey: ['order', orderId] })
  })
  const handleUpload = (files) => uploadFiles(orderId, files)

  if (isLoading) return <div className={styles.center}><Spinner size={32} /></div>
  if (!order) return null

  const overdue = isOverdue(order)
  const imageFiles = order.files.filter(f => isImage(f.original_name))

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/doctor/orders')}>← Назад к заказам</button>

      {/* Status stepper */}
      <div className={styles.stepperWrap}>
        <StatusStepper status={order.status} />
      </div>

      {/* Overdue warning */}
      {overdue && (
        <div className={styles.overdueAlert}>
          ⚠ Срок сдачи истёк {formatDate(order.delivery_date)} — обратитесь в лабораторию
        </div>
      )}

      {/* Ready banner */}
      {order.status === 'ready' && (
        <div className={styles.readyAlert}>
          ✓ Заказ готов к выдаче! Свяжитесь с лабораторией для получения.
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>{order.patient_name}</h1>
          <p className={styles.sub}>{order.work_type}</p>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.main}>

          {/* Info */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Информация о заказе</h3>
            <dl className={styles.info}>
              <dt>Дата сдачи</dt>
              <dd className={overdue ? styles.overdueText : ''}>{formatDate(order.delivery_date)}{overdue ? ' — просрочен' : ''}</dd>
              <dt>Создан</dt><dd>{formatDate(order.created_at)}</dd>
              <dt>Обновлён</dt><dd>{formatDate(order.updated_at)}</dd>
              {order.comment && <><dt>Комментарий</dt><dd>{order.comment}</dd></>}
            </dl>
          </section>

          {/* Image previews */}
          {imageFiles.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Фото ({imageFiles.length})</h3>
              <div className={styles.imageGrid}>
                {imageFiles.map(f => (
                  <ImageThumb key={f.id} file={f} />
                ))}
              </div>
            </section>
          )}

          {/* Files */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Файлы ({order.files.length})</h3>
            <FileList files={order.files} orderId={orderId} canDelete />
            <div style={{ marginTop: 16 }}>
              <p className={styles.uploadLabel}>Загрузить дополнительные файлы</p>
              <FileUploadZone uploads={uploads} onFilesSelected={handleUpload} />
            </div>
          </section>
        </div>

        <aside className={styles.aside}>
          <CommentSection orderId={orderId} comments={order.comments} />
        </aside>
      </div>
    </div>
  )
}

function ImageThumb({ file }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className={styles.thumb} onClick={() => setOpen(true)}>
        <img src={file.url} alt={file.original_name} className={styles.thumbImg} />
        <span className={styles.thumbName}>{file.original_name}</span>
      </button>
      {open && (
        <div className={styles.lightbox} onClick={() => setOpen(false)}>
          <div className={styles.lightboxInner} onClick={e => e.stopPropagation()}>
            <button className={styles.lightboxClose} onClick={() => setOpen(false)}>✕</button>
            <img src={file.url} alt={file.original_name} className={styles.lightboxImg} />
            <p className={styles.lightboxName}>{file.original_name}</p>
          </div>
        </div>
      )}
    </>
  )
}
