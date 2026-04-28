import { useRef, useEffect, useState } from 'react'
import { GitMerge, ArrowDownLeft, Edit3, Tag, Copy, GitBranch, Upload, ChevronRight, Trash2 } from 'lucide-react'
import styles from './BranchList.module.css'

export const BranchContextMenu = ({
  show,
  x,
  y,
  type, // 'branch', 'commit', or 'tag'
  target, // branchName, commit object, or tag object
  currentBranch,
  onMerge,
  onCheckout,
  onRename,
  onCreateTag,
  onDeleteTag,
  onPushTag,
  onClose,
  branchTags = [], // tags associated with this branch/commit
  localOnlyTags = [], // list of local-only tag names
  onRefreshCommits, // callback to refresh commits after tag operations
  onRequestDeleteTag // callback to request tag deletion confirmation from parent
}) => {
  const contextMenuRef = useRef(null)
  const submenuRef = useRef(null)
  const [expandedTagSubmenu, setExpandedTagSubmenu] = useState(null)
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 })
  const [isPushing, setIsPushing] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInMenu = contextMenuRef.current?.contains(e.target)
      const clickedInSubmenu = submenuRef.current?.contains(e.target)
      
      if (!clickedInMenu && !clickedInSubmenu) {
        onClose()
        setExpandedTagSubmenu(null)
      }
    }

    if (show) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [show, onClose])

  const handleTagHover = (e, tagName) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setSubmenuPosition({
      top: rect.top,
      left: rect.right
    })
    setExpandedTagSubmenu(tagName)
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      console.log('Copied to clipboard:', text)
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback method for older browsers or restricted contexts
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand('copy')
        console.log('Copied to clipboard (fallback):', text)
      } catch (err2) {
        console.error('Fallback copy failed:', err2)
      }
      document.body.removeChild(textArea)
    }
  }

  if (!show) return null

  // Render tag submenu
  const renderTagSubmenu = () => {
    if (!expandedTagSubmenu) return null

    return (
      <div
        ref={submenuRef}
        className={styles.contextMenu}
        style={{
          top: submenuPosition.top,
          left: submenuPosition.left,
          zIndex: 3001
        }}
        onMouseEnter={() => setExpandedTagSubmenu(expandedTagSubmenu)}
      >
        <div className={styles.contextMenuHeader}>
          {expandedTagSubmenu}
        </div>
        <div className={styles.contextMenuContent}>
          {localOnlyTags.includes(expandedTagSubmenu) && (
            <button
              className={styles.contextMenuItem}
              onMouseDown={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                
                if (onPushTag && !isPushing) {
                  setIsPushing(true)
                  try {
                    await onPushTag(expandedTagSubmenu)
                    
                    // Refresh commits immediately after push
                    if (onRefreshCommits) {
                      onRefreshCommits()
                    }
                  } catch (error) {
                    console.error('Error pushing tag:', error)
                  } finally {
                    setIsPushing(false)
                  }
                }
                
                setExpandedTagSubmenu(null)
                onClose()
              }}
              disabled={isPushing}
            >
              <Upload size={14} />
              <span>{isPushing ? 'Pushing...' : 'Push to origin'}</span>
            </button>
          )}
          <button
            className={styles.contextMenuItem}
            onMouseDown={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('Copy button clicked for tag:', expandedTagSubmenu)
              await copyToClipboard(expandedTagSubmenu)
              setExpandedTagSubmenu(null)
              onClose()
            }}
          >
            <Copy size={14} />
            <span>Copy Tag Name</span>
          </button>
          <button
            className={styles.contextMenuItem}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              
              const tagToDelete = expandedTagSubmenu
              
              // Close menus first
              setExpandedTagSubmenu(null)
              onClose()
              
              // Then request confirmation dialog from parent
              if (onRequestDeleteTag) {
                onRequestDeleteTag(tagToDelete, onRefreshCommits)
              }
            }}
            style={{ color: '#ff3b30' }}
          >
            <Trash2 size={14} />
            <span>Delete Tag</span>
          </button>
        </div>
      </div>
    )
  }

  // Branch context menu
  if (type === 'branch') {
    const branchName = target
    const isRemoteBranch = branchName?.includes('origin/')
    const isCurrentBranch = branchName === currentBranch

    return (
      <>
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{
            top: y,
            left: x
          }}
        >
          <div className={styles.contextMenuHeader}>
            {branchName?.replace('origin/', '')}
          </div>
          <div className={styles.contextMenuContent}>
            <button
              className={styles.contextMenuItem}
              onClick={() => {
                onMerge(branchName)
                onClose()
              }}
              disabled={isCurrentBranch}
            >
              <GitMerge size={14} />
              <span>Merge into {currentBranch}</span>
            </button>
            <button
              className={styles.contextMenuItem}
              onClick={() => {
                onCheckout(branchName)
                onClose()
              }}
              disabled={isCurrentBranch}
            >
              <ArrowDownLeft size={14} />
              <span>Checkout</span>
            </button>
            <button
              className={styles.contextMenuItem}
              onClick={() => {
                onRename(branchName)
                onClose()
              }}
              disabled={!branchName || isRemoteBranch}
            >
              <Edit3 size={14} />
              <span>Rename</span>
            </button>
            <button
              className={styles.contextMenuItem}
              onClick={() => {
                onCreateTag(branchName)
                onClose()
              }}
              disabled={isRemoteBranch}
            >
              <Tag size={14} />
              <span>Create Tag</span>
            </button>
            
            {/* Tag submenus */}
            {branchTags && branchTags.length > 0 && (
              <>
                <div className={styles.contextMenuDivider} />
                {branchTags.map((tagName) => (
                  <button
                    key={tagName}
                    className={`${styles.contextMenuItem} ${styles.hasSubmenu}`}
                    onMouseEnter={(e) => handleTagHover(e, tagName)}
                    onMouseLeave={() => setExpandedTagSubmenu(null)}
                  >
                    <Tag size={14} />
                    <span>{tagName}</span>
                    <ChevronRight size={14} className={styles.submenuArrow} />
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {renderTagSubmenu()}
      </>
    )
  }

  // Commit context menu
  if (type === 'commit') {
    const commit = target

    return (
      <>
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{
            top: y,
            left: x
          }}
        >
          <div className={styles.contextMenuHeader}>
            {commit?.shortHash}
          </div>
          <div className={styles.contextMenuContent}>
            <button
              className={styles.contextMenuItem}
              onClick={() => {
                onCreateTag(commit?.hash)
                onClose()
              }}
            >
              <Tag size={14} />
              <span>Create Tag</span>
            </button>
            <button
              className={styles.contextMenuItem}
              onClick={() => {
                onCheckout(commit?.hash)
                onClose()
              }}
            >
              <GitBranch size={14} />
              <span>Checkout Commit</span>
            </button>
            <button
              className={styles.contextMenuItem}
              onClick={async (e) => {
                e.stopPropagation()
                await copyToClipboard(commit?.hash)
                onClose()
              }}
            >
              <Copy size={14} />
              <span>Copy Hash</span>
            </button>

            {/* Tag submenus for commit */}
            {commit?.tags && commit.tags.length > 0 && (
              <>
                <div className={styles.contextMenuDivider} />
                {commit.tags.map((tagName) => (
                  <button
                    key={tagName}
                    className={`${styles.contextMenuItem} ${styles.hasSubmenu}`}
                    onMouseEnter={(e) => handleTagHover(e, tagName)}
                    onMouseLeave={() => setExpandedTagSubmenu(null)}
                  >
                    <Tag size={14} />
                    <span>{tagName}</span>
                    <ChevronRight size={14} className={styles.submenuArrow} />
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {renderTagSubmenu()}
      </>
    )
  }

  // Tag context menu
  if (type === 'tag') {
    const tag = target

    return (
      <>
        <div
        ref={contextMenuRef}
        className={styles.contextMenu}
        style={{
          top: y,
          left: x
        }}
      >
        <div className={styles.contextMenuHeader}>
          {tag?.name}
        </div>
        <div className={styles.contextMenuContent}>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              onCheckout(tag?.name)
              onClose()
            }}
          >
            <GitBranch size={14} />
            <span>Checkout Tag</span>
          </button>
          {tag?.isLocalOnly && (
            <button
              className={styles.contextMenuItem}
              onClick={async (e) => {
                e.stopPropagation()
                
                if (onPushTag && !isPushing) {
                  setIsPushing(true)
                  try {
                    await onPushTag(tag?.name)
                    
                    // Refresh commits immediately after push
                    if (onRefreshCommits) {
                      onRefreshCommits()
                    }
                  } catch (error) {
                    console.error('Error pushing tag:', error)
                  } finally {
                    setIsPushing(false)
                  }
                }
                
                onClose()
              }}
              disabled={isPushing}
            >
              <Upload size={14} />
              <span>{isPushing ? 'Pushing...' : 'Push to origin'}</span>
            </button>
          )}
          <button
            className={styles.contextMenuItem}
            onClick={async (e) => {
              e.stopPropagation()
              await copyToClipboard(tag?.name)
              onClose()
            }}
          >
            <Copy size={14} />
            <span>Copy Tag Name</span>
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={(e) => {
              e.stopPropagation()
              
              const tagToDelete = tag?.name
              
              // Close menu first
              onClose()
              
              // Then request confirmation dialog from parent
              if (onRequestDeleteTag) {
                onRequestDeleteTag(tagToDelete, onRefreshCommits)
              }
            }}
            style={{ color: '#ff3b30' }}
          >
            <Tag size={14} />
            <span>Delete Tag</span>
          </button>
        </div>
      </div>
      </>
    )
  }

  return null
}

