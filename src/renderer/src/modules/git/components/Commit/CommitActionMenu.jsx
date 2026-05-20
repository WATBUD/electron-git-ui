/* eslint-disable react/prop-types, no-unused-vars */
import React, { useRef, useState } from 'react'
import { Tag, GitBranch, Copy, ChevronRight, RotateCcw } from 'lucide-react'
import { TagSubmenu } from '../Tag/TagSubmenu'
import { ResetSubmenu } from './ResetSubmenu'
import { useClickOutsideMenu, copyToClipboard } from '../BranchList/menuShared'
import branchStyles from '../BranchList/BranchList.module.css'

/**
 * Context menu for `type='commit'`.
 * Shows create-tag / checkout / copy-hash / reset-HEAD + nested tag submenus.
 */
export const CommitActionMenu = ({
  show,
  x,
  y,
  target: commit,
  onCheckout,
  onCheckoutCommit,
  onCreateTag,
  onClose,
  localOnlyTags = [],
  remoteOnlyTags = [],
  divergentTags = [],
  onRefreshCommits,
  onRequestDeleteTag,
  onRequestResetToCommit,
  onPushTag
}) => {
  const menuRef = useRef(null)
  const submenuRef = useRef(null)
  const [hoveredTag, setHoveredTag] = useState(null)
  const [tagSubmenuPos, setTagSubmenuPos] = useState({ top: 0, left: 0 })
  const [showReset, setShowReset] = useState(false)
  const [resetPos, setResetPos] = useState({ top: 0, left: 0 })

  useClickOutsideMenu({
    show,
    primaryRef: menuRef,
    submenuRef,
    onClose: () => {
      setHoveredTag(null)
      setShowReset(false)
      onClose?.()
    }
  })

  if (!show) return null

  const handleTagHover = (e, tagName) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTagSubmenuPos({ top: rect.top, left: rect.right })
    setHoveredTag(tagName)
    setShowReset(false)
  }

  const handleResetHover = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setResetPos({ top: rect.top, left: rect.right })
    setShowReset(true)
    setHoveredTag(null)
  }

  return (
    <>
      <div ref={menuRef} className={branchStyles.contextMenu} style={{ top: y, left: x }}>
        <div className={branchStyles.contextMenuHeader}>{commit?.shortHash}</div>
        <div className={branchStyles.contextMenuContent}>
          <button
            className={branchStyles.contextMenuItem}
            onClick={() => {
              onCreateTag?.(commit?.hash)
              onClose?.()
            }}
            onMouseEnter={() => {
              setHoveredTag(null)
              setShowReset(false)
            }}
          >
            <Tag size={14} />
            <span>Create Tag</span>
          </button>
          <button
            className={branchStyles.contextMenuItem}
            onClick={() => {
              ;(onCheckoutCommit || onCheckout)?.(commit?.hash)
              onClose?.()
            }}
            onMouseEnter={() => {
              setHoveredTag(null)
              setShowReset(false)
            }}
          >
            <GitBranch size={14} />
            <span>Checkout Commit</span>
          </button>
          <button
            className={branchStyles.contextMenuItem}
            onClick={async (e) => {
              e.stopPropagation()
              await copyToClipboard(commit?.hash)
              onClose?.()
            }}
            onMouseEnter={() => {
              setHoveredTag(null)
              setShowReset(false)
            }}
          >
            <Copy size={14} />
            <span>Copy Hash</span>
          </button>

          {onRequestResetToCommit && (
            <button
              className={`${branchStyles.contextMenuItem} ${branchStyles.hasSubmenu}`}
              onMouseEnter={handleResetHover}
            >
              <RotateCcw size={14} />
              <span>Reset HEAD to here</span>
              <ChevronRight size={14} className={branchStyles.submenuArrow} />
            </button>
          )}

          {commit?.tags && commit.tags.length > 0 && (
            <>
              <div className={branchStyles.contextMenuDivider} />
              {commit.tags.map((tagName) => (
                <button
                  key={tagName}
                  className={`${branchStyles.contextMenuItem} ${branchStyles.hasSubmenu}`}
                  onMouseEnter={(e) => handleTagHover(e, tagName)}
                >
                  <Tag size={14} />
                  <span>{tagName}</span>
                  <ChevronRight size={14} className={branchStyles.submenuArrow} />
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {hoveredTag && (
        <TagSubmenu
          tagName={hoveredTag}
          position={tagSubmenuPos}
          submenuRef={submenuRef}
          localOnlyTags={localOnlyTags}
          remoteOnlyTags={remoteOnlyTags}
          divergentTags={divergentTags}
          onClose={() => {
            setHoveredTag(null)
            onClose?.()
          }}
          onPushTag={onPushTag}
          onRequestDeleteTag={onRequestDeleteTag}
          onRefreshCommits={onRefreshCommits}
        />
      )}
      {showReset && (
        <ResetSubmenu
          commitHash={commit?.hash}
          position={resetPos}
          submenuRef={submenuRef}
          onClose={() => {
            setShowReset(false)
            onClose?.()
          }}
          onRequestResetToCommit={onRequestResetToCommit}
        />
      )}
    </>
  )
}

export default CommitActionMenu
