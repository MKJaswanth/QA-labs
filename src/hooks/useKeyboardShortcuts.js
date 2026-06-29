import { useEffect } from 'react'

/**
 * Global keyboard shortcuts.
 * - Ctrl/Cmd + N  → openAdd()  (e.g. "new test case")
 * - Ctrl/Cmd + S  → onSave()   (e.g. save form)
 * - Escape        → onEscape() (e.g. close modal)
 */
export function useKeyboardShortcuts({ openAdd, onSave, onEscape }) {
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === 'n') {
        e.preventDefault()
        openAdd?.()
      }
      if (mod && e.key === 's') {
        e.preventDefault()
        onSave?.()
      }
      if (e.key === 'Escape') {
        onEscape?.()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openAdd, onSave, onEscape])
}
