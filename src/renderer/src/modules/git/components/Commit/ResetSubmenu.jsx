import React from 'react'
import { RotateCcw, AlertTriangle } from 'lucide-react'
import branchStyles from '../BranchList/BranchList.module.css'

const MODES = [
  { mode: 'soft', label: 'Soft', hint: 'Keep all changes staged', icon: RotateCcw },
  { mode: 'mixed', label: 'Mixed', hint: 'Keep changes unstaged (default)', icon: RotateCcw },
  {
    mode: 'hard',
    label: 'Hard',
    hint: 'DISCARD all changes — destructive',
    icon: AlertTriangle,
    destructive: true
  }
]

/**
 * Reset-HEAD submenu (soft / mixed / hard).
 *
 * Props:
 *   commitHash, position {top, left}
 *   submenuRef – ref forwarded to outer div for parent's click-outside
 *   onClose
 *   onRequestResetToCommit(commitHash, mode) – defers confirm to parent
 */
export const ResetSubmenu = ({
  commitHash,
  position,
  submenuRef,
  onClose,
  onRequestResetToCommit
}) => {
  if (!commitHash) return null
  return (
    <div
      ref={submenuRef}
      className={branchStyles.contextMenu}
      style={{ top: position.top, left: position.left, zIndex: 3001 }}
    >
      <div className={branchStyles.contextMenuHeader}>Reset HEAD to commit</div>
      <div className={branchStyles.contextMenuContent}>
        {MODES.map(({ mode, label, hint, icon: Icon, destructive }) => (
          <button
            key={mode}
            className={branchStyles.contextMenuItem}
            onClick={(e) => {
              e.stopPropagation()
              onClose?.()
              onRequestResetToCommit?.(commitHash, mode)
            }}
            style={destructive ? { color: '#ff3b30' } : undefined}
            title={hint}
          >
            <Icon size={14} />
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 10, opacity: 0.55 }}>{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ResetSubmenu
