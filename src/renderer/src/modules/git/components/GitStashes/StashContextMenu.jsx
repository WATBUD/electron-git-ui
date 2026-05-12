import { forwardRef, useState, useCallback, useImperativeHandle } from 'react'
import { Edit3, Play, ArrowUpToLine, Trash2 } from 'lucide-react'
import styles from './GitStashes.module.css'

export const StashContextMenu = forwardRef(function StashContextMenu(
  { onApply, onPop, onRename, onDrop },
  ref
) {
  const [state, setState] = useState(null)

  const close = useCallback(() => setState(null), [])

  const open = useCallback((payload) => {
    setState(payload)
  }, [])

  useImperativeHandle(ref, () => ({ open, close }), [open, close])

  if (!state) return null

  const { x, y, stashIndex, stashMessage } = state

  const runAndClose = (fn) => () => {
    fn?.(stashIndex, stashMessage)
    close()
  }

  return (
    <div
      className={styles.contextMenu}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.contextMenuItem} onClick={runAndClose(onApply)}>
        <Play size={14} style={{ marginRight: 8 }} fill="currentColor" />
        <span>Apply</span>
      </div>
      <div className={styles.contextMenuItem} onClick={runAndClose(onPop)}>
        <ArrowUpToLine size={14} style={{ marginRight: 8 }} />
        <span>Pop</span>
      </div>
      <div className={styles.contextMenuItem} onClick={runAndClose(onRename)}>
        <Edit3 size={14} style={{ marginRight: 8 }} />
        <span>Rename</span>
      </div>
      <div
        className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger || ''}`}
        style={{ color: '#ff3b30' }}
        onClick={runAndClose(onDrop)}
      >
        <Trash2 size={14} style={{ marginRight: 8 }} />
        <span>Drop</span>
      </div>
    </div>
  )
})

export default StashContextMenu
