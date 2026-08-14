import React from 'react'
import styles from './Tag.module.css'
import { useOverlayDismiss } from '../../../../shared/hooks/useOverlayDismiss'

export const CreateTagModal = ({ state, setState, onSubmit }) => {
  const close = () => setState({ show: false, branchName: '', tagName: '' })
  const overlayProps = useOverlayDismiss(close)
  if (!state.show) return null
  return (
    <div className={styles.modalOverlay} {...overlayProps}>
      <div className={styles.macModal} onClick={(e) => e.stopPropagation()}>
        <h3>Create Tag</h3>
        <div className={styles.modalBody}>
          <div className={styles.modalOldName}>
            <span>Branch:</span>
            <code>{state.branchName?.replace('origin/', '')}</code>
          </div>
          <input
            value={state.tagName}
            onChange={(e) => setState((prev) => ({ ...prev, tagName: e.target.value }))}
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
