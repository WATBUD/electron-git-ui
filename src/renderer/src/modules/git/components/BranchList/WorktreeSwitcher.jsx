import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FolderGit2, Check } from 'lucide-react'
import { openRepository } from '../../store/git/gitThunks'
import styles from './WorktreeSwitcher.module.css'

/* eslint-disable react/prop-types */

// Basename of a worktree path — used as a fallback label when a worktree has
// no branch (detached HEAD) so every chip still shows something meaningful.
const baseName = (p) =>
  p
    ? p
        .replace(/[/\\]+$/, '')
        .split(/[/\\]/)
        .pop()
    : ''

/**
 * Horizontal switcher for the worktrees attached to the current repo. A
 * worktree is just a folder checked out on its own branch, so switching to one
 * is the same as opening that folder as the repo (reuses `openRepository`).
 *
 * Renders nothing when the repo has only the main worktree — there is nothing
 * to switch between in that case.
 */
export const WorktreeSwitcher = ({ onSwitched }) => {
  const dispatch = useDispatch()
  const worktrees = useSelector((s) => s.git.worktrees || [])
  const repoPath = useSelector((s) => s.git.repoPath)

  const handleSwitch = useCallback(
    (path) => {
      if (!path || path === repoPath) return
      dispatch(openRepository(path)).then(() => onSwitched?.())
    },
    [dispatch, repoPath, onSwitched]
  )

  // Only the main worktree (or none) → nothing to switch between.
  if (worktrees.length < 2) return null

  return (
    <div className={styles.worktreeBar}>
      <div className={styles.worktreeBarLabel} title="Worktrees attached to this repo">
        <FolderGit2 size={13} />
        <span>Worktrees</span>
      </div>
      <div className={styles.worktreeChips}>
        {worktrees.map((wt) => {
          const isCurrent = wt.isCurrent || wt.path === repoPath
          const label = wt.branch || (wt.isDetached ? baseName(wt.path) : baseName(wt.path))
          return (
            <button
              key={wt.path}
              type="button"
              className={`${styles.worktreeChip} ${isCurrent ? styles.current : ''}`}
              disabled={isCurrent}
              onClick={() => handleSwitch(wt.path)}
              title={`${wt.path}${wt.isMain ? '  (main worktree)' : ''}${
                wt.isDetached ? '  (detached HEAD)' : ''
              }`}
            >
              {isCurrent && <Check size={11} className={styles.chipCheck} />}
              <span className={styles.chipLabel}>{label}</span>
              {wt.isMain && <span className={styles.chipTag}>main</span>}
              {wt.isDetached && <span className={styles.chipTag}>detached</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default WorktreeSwitcher
