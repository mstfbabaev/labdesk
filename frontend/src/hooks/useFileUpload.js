import { useState } from 'react'
import { confirmUpload, presignUpload } from '../services/fileService'

export function useFileUpload(onSuccess) {
  const [uploads, setUploads] = useState([])

  const updateUpload = (index, patch) => {
    setUploads((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)))
  }

  const uploadFile = (orderId, file, index) => {
    return new Promise(async (resolve, reject) => {
      try {
        const { presigned_url, storage_key } = await presignUpload(
          orderId,
          file.name,
          file.type || 'application/octet-stream',
          file.size
        )

        const xhr = new XMLHttpRequest()
        xhr.open('PUT', presigned_url)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            updateUpload(index, { progress: Math.round((e.loaded / e.total) * 100) })
          }
        }

        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const confirmed = await confirmUpload(
                orderId,
                storage_key,
                file.name,
                file.size,
                file.type || 'application/octet-stream'
              )
              updateUpload(index, { progress: 100, status: 'done' })
              resolve(confirmed)
            } catch (err) {
              updateUpload(index, { status: 'error', error: 'Ошибка подтверждения загрузки' })
              reject(err)
            }
          } else {
            updateUpload(index, { status: 'error', error: `HTTP ${xhr.status}` })
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        }

        xhr.onerror = () => {
          updateUpload(index, { status: 'error', error: 'Ошибка сети' })
          reject(new Error('Network error'))
        }

        xhr.send(file)
      } catch (err) {
        updateUpload(index, { status: 'error', error: err.response?.data?.detail || err.message })
        reject(err)
      }
    })
  }

  const uploadFiles = async (orderId, files) => {
    const fileArray = Array.from(files)
    setUploads(fileArray.map((f) => ({ file: f, progress: 0, status: 'uploading', error: null })))

    const results = []
    for (let i = 0; i < fileArray.length; i++) {
      try {
        const result = await uploadFile(orderId, fileArray[i], i)
        results.push(result)
      } catch (_) {
        // individual errors already tracked in state
      }
    }

    if (onSuccess) onSuccess(results)
    return results
  }

  const reset = () => setUploads([])

  return { uploads, uploadFiles, reset }
}
