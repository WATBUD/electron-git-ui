/* eslint-disable react/prop-types */
import styles from './BranchList.module.css'

export const CreateBranchModal = ({ state, setState, onSubmit, branchPrefix }) => {
  if (!state.show) return null
  const close = () => setState({ show: false, branchName: '' })
  return (
    <div className={styles.modalOverlay} onClick={close}>
      <div className={styles.macModal} onClick={(e) => e.stopPropagation()}>
        <h3>Create Branch</h3>
        <div className={styles.modalBody}>
          {branchPrefix && (
            <div className={styles.modalOldName}>
              <span>Prefix:</span>
              <code>{branchPrefix}</code>
            </div>
          )}
          <input
            value={state.branchName}
            onChange={(e) => setState((prev) => ({ ...prev, branchName: e.target.value }))}
            placeholder="Branch name (e.g., feature/login)"
            className={styles.modalInput}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (state.branchName?.trim()) onSubmit()
              } else if (e.key === 'Escape') {
                close()
              }
            }}
          />
        </div>
        <div className={styles.modalFooter}>
          <button onClick={close} className={styles.modalCancel}>
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!state.branchName || !state.branchName.trim()}
            className={styles.modalConfirm}
          >
            Create Branch
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateBranchModal
