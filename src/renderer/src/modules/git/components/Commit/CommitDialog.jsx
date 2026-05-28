/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react'
import { ModalPortal } from '../../../../shared/components/ModalPortal'
import styles from './CommitDialog.module.css'

export const CommitDialog = ({
  show,
  onClose,
  onConfirm,
  loading,
  commitMessage,
  setCommitMessage,
  commitAndPush,
  setCommitAndPush
}) => {
  const textareaRef = useRef(null)

  useEffect(() => {
    if (show && textareaRef.current) {
      // Place cursor at the end on open so a pre-filled message is easy to
      // append to. Intentionally not depending on commitMessage — re-running
      // on every keystroke would yank the caret to the end mid-typing.
      const len = textareaRef.current.value.length
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [show])

  if (!show) return null

  return (
    <ModalPortal>
      <div className={styles.dialogOverlay} onClick={onClose}>
        <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
          <h3>Commit Changes</h3>
          <div className={styles.dialogContent}>
            <textarea
              ref={textareaRef}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Enter commit message..."
              className={styles.commitMessageInput}
            />
            <label className={styles.checkboxLabel}>
              <span>Push after commit</span>
              <div style={{ position: 'relative' }}>
                <input
                  type="checkbox"
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer',
                    zIndex: 1
                  }}
                  checked={commitAndPush}
                  onChange={(e) => setCommitAndPush(e.target.checked)}
                />
                <div className={styles.toggleSwitch}></div>
              </div>
            </label>
          </div>
          <div className={styles.dialogButtons}>
            <button onClick={onClose} className={styles.cancelBtn}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading || !commitMessage.trim()}
              className={styles.confirmBtn}
            >
              {commitAndPush ? 'Commit & Push' : 'Commit'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default CommitDialog
