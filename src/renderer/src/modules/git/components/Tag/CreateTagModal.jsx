import React from 'react'
import styles from './Tag.module.css'

export const CreateTagModal = ({ state, setState, onSubmit }) => {
  if (!state.show) return null
  const close = () => setState({ show: false, branchName: '', tagName: '' })
  return (
    <div className={styles.modalOverlay} onClick={close}>
      <div className={styles.macModal} onClick={(e) => e.stopPropagation()}>
        <h3>Create Tag</h3>
        <div className={styles.modalBody}>
          <div className={styles.modalOldName}>
            <span>Branch:</span>
            <code>{state.branchName?.replace('origin/', '')}</code>
          </div>
          <input
            value={state.tagName}
            onChange={(e) =>
              setState((prev) => ({ ...prev, tagName: e.target.value }))
            }
            placeholder="Tag name (e.g., v1.0.0)"
            className={styles.modalInput}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit()
              else if (e.key === 'Escape') close()
            }}
          />
        </div>
        <div className={styles.modalFooter}>
          <button onClick={close} className={styles.modalCancel}>
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!state.tagName || !state.tagName.trim()}
            className={styles.modalConfirm}
          >
            Create Tag
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateTagModal
