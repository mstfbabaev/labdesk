import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addComment, deleteComment } from '../../services/commentService'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../ui/Button/Button'
import styles from './CommentSection.module.css'

function formatDate(iso) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function CommentSection({ orderId, comments = [] }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')

  const addMut = useMutation({
    mutationFn: (t) => addComment(orderId, t),
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (commentId) => deleteComment(orderId, commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
  })

  return (
    <div className={styles.section}>
      <h4 className={styles.title}>Комментарии</h4>

      {comments.length === 0 && <p className={styles.empty}>Комментариев пока нет</p>}

      <ul className={styles.list}>
        {comments.map((c) => (
          <li key={c.id} className={styles.item}>
            <div className={styles.meta}>
              <span className={styles.author}>{c.author.full_name}</span>
              <span className={styles.date}>{formatDate(c.created_at)}</span>
              {(user?.role === 'admin' || user?.id === c.author.id) && (
                <button
                  className={styles.deleteBtn}
                  onClick={() => deleteMut.mutate(c.id)}
                  title="Удалить"
                >×</button>
              )}
            </div>
            <p className={styles.text}>{c.text}</p>
          </li>
        ))}
      </ul>

      <div className={styles.form}>
        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написать комментарий..."
          rows={3}
        />
        <Button
          size="sm"
          onClick={() => text.trim() && addMut.mutate(text.trim())}
          loading={addMut.isPending}
          disabled={!text.trim()}
        >
          Отправить
        </Button>
      </div>
    </div>
  )
}
