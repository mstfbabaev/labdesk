import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrder, updateOrderStatus } from '../../../services/orderService'
import { useFileUpload } from '../../../hooks/useFileUpload'
import Badge from '../../../components/ui/Badge/Badge'
import Button from '../../../components/ui/Button/Button'
import Select from '../../../components/ui/Select/Select'
import Spinner from '../../../components/ui/Spinner/Spinner'
import FileList from '../../../components/files/FileList'
import FileUploadZone from '../../../components/files/FileUploadZone'
import CommentSection from '../../../components/comments/CommentSection'
import styles from './AdminOrderDetailPage.module.css'

const STATUS_OPTIONS = [
  { value: 'new', label: 'Новый' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'ready', label: 'Готов' },
  { value: 'issued', label: 'Выдан' },
]

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU')
}

export default function AdminOrderDetailPage() {
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

  const statusMut = useMutation({
    mutationFn: (status) => updateOrderStatus(orderId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
  })

  if (isLoading) return <div className={styles.center}><Spinner size={32} /></div>
  if (!order) return null

  const nextStatuses = {
    new: ['in_progress'],
    in_progress: ['ready'],
    ready: ['issued'],
    issued: [],
  }
  const canAdvance = nextStatuses[order.status]?.length > 0

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/admin/orders')}>← Назад к заказам</button>

      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>{order.patient_name}</h1>
          <p className={styles.sub}>{order.work_type}</p>
        </div>
        <Badge status={order.status} />
      </div>

      <div className={styles.grid}>
        <div className={styles.main}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Информация</h3>
            <dl className={styles.info}>
              <dt>Врач</dt><dd>{order.doctor.full_name}</dd>
              <dt>Дата сдачи</dt><dd>{formatDate(order.delivery_date)}</dd>
              <dt>Создан</dt><dd>{formatDate(order.created_at)}</dd>
              <dt>Обновлён</dt><dd>{formatDate(order.updated_at)}</dd>
              {order.comment && <><dt>Комментарий</dt><dd>{order.comment}</dd></>}
            </dl>
          </section>

          {canAdvance && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Сменить статус</h3>
              <div className={styles.statusRow}>
                {nextStatuses[order.status].map((s) => (
                  <Button
                    key={s}
                    onClick={() => statusMut.mutate(s)}
                    loading={statusMut.isPending}
                  >
                    Перевести: {STATUS_OPTIONS.find((o) => o.value === s)?.label}
                  </Button>
                ))}
              </div>
            </section>
          )}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Файлы ({order.files.length})</h3>
            <FileList files={order.files} orderId={orderId} canDelete />
            <div style={{ marginTop: 16 }}>
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
