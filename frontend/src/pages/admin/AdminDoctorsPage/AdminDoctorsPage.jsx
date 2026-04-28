import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { activateUser, createUser, deactivateUser, getUsers, updateUser } from '../../../services/userService'
import Button from '../../../components/ui/Button/Button'
import Input from '../../../components/ui/Input/Input'
import Modal from '../../../components/ui/Modal/Modal'
import Spinner from '../../../components/ui/Spinner/Spinner'
import styles from './AdminDoctorsPage.module.css'

function DoctorForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState({
    email: initial?.email || '',
    first_name: initial?.first_name || '',
    last_name: initial?.last_name || '',
    password: '',
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <form className={styles.form} autoComplete="off" onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}>
      <Input label="Имя" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
      <Input label="Фамилия" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
      <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
      <Input
        label={initial ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль'}
        type="password"
        value={form.password}
        onChange={(e) => set('password', e.target.value)}
        required={!initial}
      />
      <Button type="submit" loading={loading} style={{ marginTop: 8 }}>
        {initial ? 'Сохранить' : 'Создать врача'}
      </Button>
    </form>
  )
}

export default function AdminDoctorsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => getUsers({ page, page_size: 20, role: 'doctor' }),
  })

  const createMut = useMutation({
    mutationFn: (d) => createUser({ ...d, role: 'doctor' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setCreateOpen(false) },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditTarget(null) },
  })

  const deactivateMut = useMutation({
    mutationFn: (id) => deactivateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const activateMut = useMutation({
    mutationFn: (id) => activateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Врачи</h1>
        <Button onClick={() => setCreateOpen(true)}>+ Добавить врача</Button>
      </div>

      {isLoading ? (
        <div className={styles.center}><Spinner size={32} /></div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Имя</th>
                <th>Email</th>
                <th>Статус</th>
                <th>Зарегистрирован</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((doctor) => (
                <tr key={doctor.id} className={!doctor.is_active ? styles.inactive : ''}>
                  <td>{doctor.first_name} {doctor.last_name}</td>
                  <td>{doctor.email}</td>
                  <td>
                    <span className={`${styles.dot} ${doctor.is_active ? styles.active : styles.deactivated}`} />
                    {doctor.is_active ? 'Активен' : 'Деактивирован'}
                  </td>
                  <td>{new Date(doctor.created_at).toLocaleDateString('ru-RU')}</td>
                  <td className={styles.actions}>
                    <Button variant="ghost" size="sm" onClick={() => setEditTarget(doctor)}>Изменить</Button>
                    {doctor.is_active ? (
                      <Button variant="ghost" size="sm" onClick={() => deactivateMut.mutate(doctor.id)} style={{ color: 'var(--color-danger)' }}>
                        Деактивировать
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => activateMut.mutate(doctor.id)}>Активировать</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.total > 20 && (
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className={styles.pageBtn}>←</button>
          <span className={styles.pageInfo}>Стр. {page} из {Math.ceil(data.total / 20)}</span>
          <button disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage((p) => p + 1)} className={styles.pageBtn}>→</button>
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Новый врач">
        <DoctorForm onSubmit={(d) => createMut.mutate(d)} loading={createMut.isPending} />
        {createMut.error && <p className={styles.error}>{createMut.error.response?.data?.detail}</p>}
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Редактировать врача">
        {editTarget && (
          <DoctorForm
            initial={editTarget}
            onSubmit={(d) => {
              const payload = { ...d }
              if (!payload.password) delete payload.password
              updateMut.mutate({ id: editTarget.id, data: payload })
            }}
            loading={updateMut.isPending}
          />
        )}
        {updateMut.error && <p className={styles.error}>{updateMut.error.response?.data?.detail}</p>}
      </Modal>
    </div>
  )
}
