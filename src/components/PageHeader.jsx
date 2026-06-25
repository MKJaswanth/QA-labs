export function PageHeader({ title, description, action, backTo }) {
  const handleBack = () => {
    if (backTo) {
      window.location.hash = `#${backTo}`
    } else {
      window.history.back()
    }
  }

  return (
    <div className="page-header">
      <div className="page-header-copy">
        {backTo !== undefined && (
          <button type="button" className="page-back-btn" onClick={handleBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="page-back-label">Back</span>
          </button>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  )
}
