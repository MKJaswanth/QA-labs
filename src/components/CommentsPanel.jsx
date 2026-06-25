import { useState } from 'react'
import { useComments } from '../hooks/useComments'
import { useUser } from '../context/UserContext'
import { useNotifications } from '../hooks/useNotifications'
import { useTeamMembers } from '../hooks/useTeamMembers'

// entityOwnerName: the person who created/owns the entity — they get notified on new comments
export function CommentsPanel({ projectId, entityType, entityId, entityTitle, entityOwnerName }) {
  const { comments, addComment, deleteComment } = useComments(projectId, entityType, entityId)
  const { user } = useUser()
  const { sendNotification } = useNotifications()
  const { members } = useTeamMembers()
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    setSubmitting(true)
    const comment = await addComment(draft)
    setDraft('')
    setSubmitting(false)

    // Notify the entity owner (and assignee if different)
    if (comment && entityOwnerName && entityOwnerName !== user) {
      sendNotification({
        recipient: entityOwnerName,
        type: 'comment',
        entityId,
        entityName: entityTitle,
        message: `${user} commented on "${entityTitle}": ${comment.text.slice(0, 80)}${comment.text.length > 80 ? '…' : ''}`,
        projectId,
      })
    }
  }

  const canDelete = (comment) => comment.authorName === user

  return (
    <div className="comments-panel">
      <div className="comments-list">
        {comments.length === 0
          ? <p className="comments-empty">No comments yet.</p>
          : comments.map((c) => (
            <div key={c.id} className="comment-item">
              <div className="comment-avatar">{(c.authorName || '?').slice(0, 2).toUpperCase()}</div>
              <div className="comment-body">
                <div className="comment-meta">
                  <strong>{c.authorName}</strong>
                  <span className="comment-time">{new Date(c.createdAt).toLocaleString()}</span>
                  {canDelete(c) && (
                    <button type="button" className="comment-delete" onClick={() => deleteComment(c.id)} aria-label="Delete comment">×</button>
                  )}
                </div>
                <p className="comment-text">{c.text}</p>
              </div>
            </div>
          ))
        }
      </div>

      <form className="comment-form" onSubmit={handleSubmit}>
        <textarea
          className="comment-input"
          rows={2}
          placeholder="Add a comment…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e) }}
        />
        <div className="comment-form-footer">
          <span className="comment-hint">Ctrl+Enter to submit</span>
          <button type="submit" className="primary-button" disabled={!draft.trim() || submitting}>
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  )
}
