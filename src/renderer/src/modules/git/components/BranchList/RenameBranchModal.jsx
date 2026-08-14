import React from 'react'
import styles from './BranchList.module.css'
import { useOverlayDismiss } from '../../../../shared/hooks/useOverlayDismiss'

export const RenameBranchModal = ({ state, setState, onSubmit }) => {
  const close = () => setState({ show: false, oldName: '', newName: '' })
  const overlayProps = useOverlayDismiss(close)
  if (!state.show) return null
  return (
    <div className={styles.modalOverlay} {...overlayProps}>
      <div className={styles.macModal} onClick={(e) => e.stopPropagation()}>
        <h3>Rename Branch</h3>
        <div className={styles.modalBody}>
          <div className={styles.modalOldName}>
            <span>Current:</span>
            <code>{state.oldName}</code>
          </div>
          <input
            value={state.newName}
            onChange={(e) => setState((prev) => ({ ...prev, newName: e.target.value }))}
            placeholder="New branch name"
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
            disabled={!state.newName || state.newName === state.oldName}
            className={styles.modalConfirm}
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  )
}

export default RenameBranchModal
