import api from './api'

export async function presignUpload(orderId, filename, contentType, fileSizeBytes) {
  const res = await api.post(`/orders/${orderId}/files/presign-upload`, {
    filename,
    content_type: contentType,
    file_size_bytes: fileSizeBytes,
  })
  return res.data
}

export async function confirmUpload(orderId, storageKey, originalFilename, fileSizeBytes, contentType) {
  const res = await api.post(`/orders/${orderId}/files/confirm`, {
    storage_key: storageKey,
    original_filename: originalFilename,
    file_size_bytes: fileSizeBytes,
    content_type: contentType,
  })
  return res.data
}

export async function presignDownload(orderId, fileId) {
  const res = await api.get(`/orders/${orderId}/files/${fileId}/presign-download`)
  return res.data
}

export async function deleteFile(orderId, fileId) {
  await api.delete(`/orders/${orderId}/files/${fileId}`)
}
