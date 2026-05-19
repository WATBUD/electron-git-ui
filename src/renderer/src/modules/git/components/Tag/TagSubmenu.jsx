import React, { useState } from 'react'
import { Upload, Copy, Trash2 } from 'lucide-react'
import { copyToClipboard } from '../BranchList/menuShared'
import branchStyles from '../BranchList/BranchList.module.css'

/**
 * Right-positioned submenu listing actions for a single tag.
 * Used by branch and commit menus when a tag entry is hovered.
 *
 * Props:
 *   tagName, position {top,left}
 *   localOnlyTags / remoteOnlyTags / divergentTags arrays for classification
 *   submenuRef – ref forwarded to the outer div so parent's click-outside ignores it
 *   onClose
 *   onPushTag(tag) – called for Push to origin
 *   onRequestDeleteTag(tag, refreshCallback, mode)
 *   onRefreshCommits  – passthrough refresh
 */
export const TagSubmenu = ({
  tagName,
  position,
  localOnlyTags = [],
  remoteOnlyTags = [],
  divergentTags = [],
  submenuRef,
  onClose,
  onPushTag,
  onRequestDeleteTag,
  onRefreshCommits
}) => {
  const [isPushing, setIsPushing] = useState(false)
  if (!tagName) return null

  const isLocalOnly = localOnlyTags.includes(tagName)
  const isRemoteOnly = remoteOnlyTags.includes(tagName)
  const isDivergent = divergentTags.includes(tagName)
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
    <div
      ref={submenuRef}
      className={branchStyles.contextMenu}
      style={{ top: position.top, left: position.left, zIndex: 3001 }}
    >
      <div className={branchStyles.contextMenuHeader}>{tagName}</div>
      <div className={branchStyles.contextMenuContent}>
        {isLocalOnly && (
          <button
            className={branchStyles.contextMenuItem}
            onMouseDown={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!onPushTag || isPushing) return
              setIsPushing(true)
              try {
                await onPushTag(tagName)
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
          onMouseDown={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            await copyToClipboard(tagName)
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
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClose?.()
              onRequestDeleteTag?.(tagName, onRefreshCommits, mode)
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

export default TagSubmenu
