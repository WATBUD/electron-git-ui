import React, { useRef, useState } from 'react'
import { GitBranch, Upload, Copy, Trash2 } from 'lucide-react'
import {
  useClickOutsideMenu,
  copyToClipboard
} from '../BranchList/menuShared'
import branchStyles from '../BranchList/BranchList.module.css'

/**
 * Context menu for `type='tag'` (when the user right-clicks a tag badge directly).
 * Inline actions — no hover submenu — because the user is already targeting a tag.
 */
export const TagActionMenu = ({
  show,
  x,
  y,
  target: tag,
  onCheckout,
  onCheckoutCommit,
  onClose,
  localOnlyTags = [],
  remoteOnlyTags = [],
  divergentTags = [],
  onRefreshCommits,
  onRequestDeleteTag,
  onPushTag
}) => {
  const menuRef = useRef(null)
  const [isPushing, setIsPushing] = useState(false)
  useClickOutsideMenu({ show, primaryRef: menuRef, onClose })

  if (!show) return null

  // Prefer flags coming from the target object; fall back to props arrays.
  const isLocalOnly = tag?.isLocalOnly ?? localOnlyTags.includes(tag?.name)
  const isRemoteOnly = tag?.isRemoteOnly ?? remoteOnlyTags.includes(tag?.name)
  const isDivergent = tag?.isDivergent ?? divergentTags.includes(tag?.name)
  const deleteOptions = [
    { mode: 'local', label: 'Delete Local Tag' },
    { mode: 'remote', label: 'Delete Remote Tag' },
    { mode: 'both', label: 'Delete Local + Remote' }
  ]
  const visibleDelete =
    isLocalOnly || isDivergent
      ? deleteOptions.filter((o) => o.mode === 'local')
      : isRemoteOnly
        ? deleteOptions.filter((o) => o.mode === 'remote')
        : deleteOptions

  return (
    <div ref={menuRef} className={branchStyles.contextMenu} style={{ top: y, left: x }}>
      <div className={branchStyles.contextMenuHeader}>{tag?.name}</div>
      <div className={branchStyles.contextMenuContent}>
        <button
          className={branchStyles.contextMenuItem}
          onClick={() => {
            ;(onCheckoutCommit || onCheckout)?.(tag?.name)
            onClose?.()
          }}
        >
          <GitBranch size={14} />
          <span>Checkout Tag</span>
        </button>
        {isLocalOnly && (
          <button
            className={branchStyles.contextMenuItem}
            onClick={async (e) => {
              e.stopPropagation()
              if (!onPushTag || isPushing) return
              setIsPushing(true)
              try {
                await onPushTag(tag?.name)
                onRefreshCommits?.()
              } catch (err) {
                console.error('Error pushing tag:', err)
              } finally {
                setIsPushing(false)
              }
              onClose?.()
            }}
            disabled={isPushing}
          >
            <Upload size={14} />
            <span>{isPushing ? 'Pushing...' : 'Push to origin'}</span>
          </button>
        )}
        <button
          className={branchStyles.contextMenuItem}
          onClick={async (e) => {
            e.stopPropagation()
            await copyToClipboard(tag?.name)
            onClose?.()
          }}
        >
          <Copy size={14} />
          <span>Copy Tag Name</span>
        </button>
        {visibleDelete.map(({ mode, label }) => (
          <button
            key={mode}
            className={branchStyles.contextMenuItem}
            onClick={(e) => {
              e.stopPropagation()
              onClose?.()
              onRequestDeleteTag?.(tag?.name, onRefreshCommits, mode)
            }}
            style={{ color: '#ff3b30' }}
          >
            <Trash2 size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default TagActionMenu
