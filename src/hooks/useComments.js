import { useCallback, useEffect, useState } from 'react'
import { newId } from '../utils/id'
import { useUser } from '../context/UserContext'
import { useRemoteSync } from './useRemoteSync'
import { subscribeComments, saveCommentRemote, deleteCommentRemote } from '../utils/remoteStorage'

export function useComments(projectId, entityType, entityId) {
  const { user } = useUser()
  const remoteReady = useRemoteSync()
  const [comments, setComments] = useState([])

  useEffect(() => {
    if (!remoteReady || !projectId || !entityId) return undefined
    return subscribeComments(projectId, entityType, entityId, (next) => {
      setComments(next.filter((c) => !c.deleted).sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
    })
  }, [remoteReady, projectId, entityType, entityId])

  const addComment = useCallback(async (text) => {
    if (!text.trim() || !remoteReady) return null
    const comment = {
      id: newId(),
      projectId,
      entityType,
      entityId,
      text: text.trim(),
      authorName: user,
      createdAt: new Date().toISOString(),
    }
    setComments((prev) => [...prev, comment])
    await saveCommentRemote(projectId, entityType, entityId, comment)
    return comment
  }, [remoteReady, projectId, entityType, entityId, user])

  const deleteComment = useCallback(async (commentId) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    await deleteCommentRemote(projectId, entityType, entityId, commentId)
  }, [projectId, entityType, entityId])

  return { comments, addComment, deleteComment }
}
