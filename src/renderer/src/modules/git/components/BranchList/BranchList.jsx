import React, { useState, useCallback, useMemo, useRef } from 'react'
import { useDispatch } from 'react-redux'
import {
  ChevronDown,
  Plus,
  RefreshCw,
  Trash2,
  GitBranch,
  Tag,
  Folder,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { CopyButton } from '../../../../shared/components/CopyButton'
import { SearchInput } from '../../../../shared/components/SearchInput'
import { BranchContextMenuController } from './BranchContextMenuController'
import { CommitDiffModal } from './CommitDiffModal'
import { formatRelativeTime, formatAbsoluteTime } from './relativeTime'
import { getBranchCommits } from '../../store/git/gitThunks'
import styles from './BranchList.module.css'

// Constants
const BRANCH_COMMITS_LIMIT = 1000
const INDENT_PX = 14
const ROW_H = 26
const OVERSCAN_ROWS = 8

// Build a tree from a flat branch list using `/` as path separator.
// Leaf nodes carry the original branchObj; folder nodes hold children.
const buildBranchTree = (branchList) => {
  const root = { type: 'folder', name: '', children: new Map(), path: '' }
  for (const branchObj of branchList) {
    const name = typeof branchObj === 'string' ? branchObj : branchObj.name
    const parts = name.split('/')
    let node = root
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i]
      const path = parts.slice(0, i + 1).join('/')
      let next = node.children.get(seg)
      if (!next) {
        next = { type: 'folder', name: seg, children: new Map(), path }
        node.children.set(seg, next)
      }
      node = next
    }
    const leafSeg = parts[parts.length - 1]
    node.children.set(leafSeg, { type: 'leaf', name: leafSeg, fullName: name, branchObj })
  }
  return root
}

// Count leaves under a folder (for the count badge).
const countLeaves = (node) => {
  if (node.type === 'leaf') return 1
  let n = 0
  for (const child of node.children.values()) n += countLeaves(child)
  return n
}

// Flatten the tree into a sorted array of render entries.
// Folders sort before their siblings and are sorted alphabetically; leaves last.
const flattenTree = (node, depth, collapsedFolders, currentBranch, out) => {
  const entries = Array.from(node.children.values()).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    // current branch always first within its folder
    if (a.type === 'leaf' && a.fullName === currentBranch) return -1
    if (b.type === 'leaf' && b.fullName === currentBranch) return 1
    return a.name.localeCompare(b.name)
  })
  for (const child of entries) {
    if (child.type === 'folder') {
      const collapsed = collapsedFolders.has(child.path)
      out.push({ kind: 'folder', node: child, depth, collapsed })
      if (!collapsed) flattenTree(child, depth + 1, collapsedFolders, currentBranch, out)
    } else {
      out.push({ kind: 'leaf', node: child, depth })
    }
  }
  return out
}

const BranchList = ({
  branches = [],
  remoteBranches = [],
  currentBranch,
  loading,
  onCheckout,
  onCheckoutCommit,
  onDelete,
  onDeleteRemote,
  onMerge,
  newBranchName,
  setNewBranchName,
  createBranchByNewBranchName,
  selectedPrefixes = [],
  onRename,
  onCreateTag,
  localTags = [],
  localOnlyTags = [],
  remoteOnlyTags = [],
  divergentTags = [],
  onDeleteTag,
  onRequestDeleteTag,
  onRequestDeleteBranch,
  onPushTag
}) => {
  const contextMenuRef = useRef(null)
  const [renameBranchState, setRenameBranchState] = useState({
    show: false,
    oldName: '',
    newName: ''
  })
  const [createTagState, setCreateTagState] = useState({
    show: false,
    branchName: '',
    tagName: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [tagSearchTerm, setTagSearchTerm] = useState('')
  const [isRemoteBranchesCollapsed, setIsRemoteBranchesCollapsed] = useState(false)
  const [isLocalBranchesCollapsed, setIsLocalBranchesCollapsed] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState(new Set())
  const [expandedBranches, setExpandedBranches] = useState(new Set())
  const [localPaneRatio, setLocalPaneRatio] = useState(0.5)
  const scrollAreaRef = useRef(null)
  const dragStateRef = useRef({ active: false, moved: false, startY: 0 })
  // Refs holding "current" filtered counts so the drag handler (defined early) can
  // read them without forcing them into its useCallback dep list (would TDZ).
  const localCountRef = useRef(0)
  const remoteCountRef = useRef(0)
  const remoteScrollerRef = useRef(null)
  const [remoteScrollTop, setRemoteScrollTop] = useState(0)
  const [remoteViewportH, setRemoteViewportH] = useState(0)

  React.useEffect(() => {
    const el = remoteScrollerRef.current
    if (!el) return
    const onScroll = () => setRemoteScrollTop(el.scrollTop)
    const ro = new ResizeObserver(() => setRemoteViewportH(el.clientHeight))
    el.addEventListener('scroll', onScroll, { passive: true })
    ro.observe(el)
    setRemoteViewportH(el.clientHeight)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [isRemoteBranchesCollapsed, isLocalBranchesCollapsed])

  const toggleFolder = useCallback((path) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  // REMOTE header: always toggles on click. Acts as splitter only when both panes expanded.
  const handleRemoteHeaderMouseDown = useCallback(
    (e) => {
      if (e.button !== 0) return
      const canDrag =
        !isLocalBranchesCollapsed &&
        !isRemoteBranchesCollapsed &&
        localCountRef.current > 0 &&
        remoteCountRef.current > 0
      dragStateRef.current = { active: true, moved: false, startY: e.clientY, canDrag }
      e.preventDefault()

      const onMove = (ev) => {
        const st = dragStateRef.current
        if (!st.active || !st.canDrag) return
        if (!st.moved && Math.abs(ev.clientY - st.startY) > 3) {
          st.moved = true
          document.body.style.cursor = 'ns-resize'
          document.body.style.userSelect = 'none'
        }
        if (st.moved) {
          const el = scrollAreaRef.current
          if (!el) return
          const rect = el.getBoundingClientRect()
          const ratio = (ev.clientY - rect.top) / rect.height
          setLocalPaneRatio(Math.max(0.1, Math.min(0.9, ratio)))
        }
      }
      const onUp = () => {
        const st = dragStateRef.current
        const wasDrag = st.moved
        dragStateRef.current = { active: false, moved: false, startY: 0, canDrag: false }
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        if (!wasDrag) {
          setIsRemoteBranchesCollapsed((v) => !v)
        }
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [isLocalBranchesCollapsed, isRemoteBranchesCollapsed]
  )
  const [branchCommits, setBranchCommits] = useState({})
  const [loadingCommits, setLoadingCommits] = useState(false)
  const [viewingCommit, setViewingCommit] = useState(null)
  const dispatch = useDispatch()

  const handleViewCommit = useCallback((commit) => {
    setViewingCommit(commit)
  }, [])

  const closeCommitDiffModal = useCallback(() => {
    setViewingCommit(null)
  }, [])

  // Memoized branch prefix
  const branchPrefix = useMemo(() => selectedPrefixes.join(','), [selectedPrefixes])

  // Handle context menu — opens via ref so BranchList itself does NOT re-render
  // when a menu opens. Re-rendering this tree is expensive when there are many
  // branches + expanded commit lists.
  const handleContextMenu = useCallback(
    (e, type, target) => {
      e.preventDefault()

      let tags = []
      if (type === 'branch') {
        const branchObj = branches.find((b) => (typeof b === 'string' ? b : b.name) === target)
        tags = branchObj?.tags || []
      } else if (type === 'commit') {
        tags = target?.tags || []
      }

      contextMenuRef.current?.open({
        x: e.clientX,
        y: e.clientY,
        type,
        target,
        tags
      })
    },
    [branches]
  )

  // Close context menu
  const closeContextMenu = useCallback(() => {
    contextMenuRef.current?.close()
  }, [])

  // Sort and filter branches
  const sortBranches = useCallback(
    (branchesList) => {
      return [...branchesList]
        .filter((branch) => {
          const name = typeof branch === 'string' ? branch : branch.name
          const matchesBranchName =
            searchTerm === '' || name.toLowerCase().includes(searchTerm.toLowerCase())

          if (tagSearchTerm) {
            const branchObj =
              typeof branch === 'string'
                ? branches.find((b) => (typeof b === 'string' ? b : b.name) === name)
                : branch
            const tags = branchObj?.tags || []
            const branchHasTag = tags.some((tag) =>
              tag.toLowerCase().includes(tagSearchTerm.toLowerCase())
            )
            const commits = branchCommits[name] || []
            const commitsHaveTag = commits.some((commit) =>
              commit.tags.some((tag) => tag.toLowerCase().includes(tagSearchTerm.toLowerCase()))
            )

            return matchesBranchName && (branchHasTag || commitsHaveTag)
          }

          return matchesBranchName
        })
        .sort((a, b) => {
          const nameA = typeof a === 'string' ? a : a.name
          const nameB = typeof b === 'string' ? b : b.name
          if (nameB === currentBranch) return 1
          if (nameA === currentBranch) return -1
          return nameA.localeCompare(nameB)
        })
    },
    [searchTerm, tagSearchTerm, branches, branchCommits, currentBranch]
  )

  // Filter commits by tag
  const filterCommitsByTag = useCallback(
    (commits) => {
      if (!tagSearchTerm) return commits
      return commits.filter((commit) =>
        commit.tags.some((tag) => tag.toLowerCase().includes(tagSearchTerm.toLowerCase()))
      )
    },
    [tagSearchTerm]
  )

  // Memoized sorted branches
  const sortedLocalBranches = useMemo(() => sortBranches(branches), [sortBranches, branches])
  const sortedRemoteBranches = useMemo(
    () => sortBranches(remoteBranches),
    [sortBranches, remoteBranches]
  )

  // Tree-flatten with folders collapsed/expanded for the mainstream sidebar look
  const localTreeEntries = useMemo(() => {
    const tree = buildBranchTree(sortedLocalBranches)
    return flattenTree(tree, 0, collapsedFolders, currentBranch, [])
  }, [sortedLocalBranches, collapsedFolders, currentBranch])

  const remoteTreeEntries = useMemo(() => {
    const tree = buildBranchTree(sortedRemoteBranches)
    return flattenTree(tree, 0, collapsedFolders, currentBranch, [])
  }, [sortedRemoteBranches, collapsedFolders, currentBranch])

  // Auto-collapse when a filter wipes out a section (preserves user's manual toggle for non-empty case)
  const effectiveLocalCollapsed = isLocalBranchesCollapsed || sortedLocalBranches.length === 0
  const effectiveRemoteCollapsed = isRemoteBranchesCollapsed || sortedRemoteBranches.length === 0

  // Mirror filtered counts into refs for the early-declared drag handler.
  localCountRef.current = sortedLocalBranches.length
  remoteCountRef.current = sortedRemoteBranches.length

  // All known tags (local + remote-only) deduped — used by the search-matched
  // tag list below so a tag the user is searching for shows up even if its
  // commit isn't reachable from any expanded branch's recent log.
  const allKnownTags = useMemo(() => {
    return Array.from(new Set([...localTags, ...remoteOnlyTags]))
  }, [localTags, remoteOnlyTags])

  const matchingTags = useMemo(() => {
    const term = tagSearchTerm.trim().toLowerCase()
    if (!term) return []
    return allKnownTags.filter((t) => t.toLowerCase().includes(term))
  }, [allKnownTags, tagSearchTerm])

  // Auto-load commits for all branches when tag search is active
  React.useEffect(() => {
    if (!tagSearchTerm || branches.length === 0) {
      setLoadingCommits(false)
      return
    }

    const loadAllCommits = async () => {
      setLoadingCommits(true)

      const loadPromises = branches.map(async (branchObj) => {
        const branchName = typeof branchObj === 'string' ? branchObj : branchObj.name
        if (branchCommits[branchName]) return null

        try {
          const result = await dispatch(
            getBranchCommits({ branchName, limit: BRANCH_COMMITS_LIMIT })
          ).unwrap()
          return { branchName, commits: result.data }
        } catch (err) {
          console.error('Error loading branch commits:', err)
          return null
        }
      })

      const results = await Promise.all(loadPromises)
      const newCommits = results.reduce((acc, result) => {
        if (result) acc[result.branchName] = result.commits
        return acc
      }, {})

      if (Object.keys(newCommits).length > 0) {
        setBranchCommits((prev) => ({ ...prev, ...newCommits }))
      }

      setLoadingCommits(false)
    }

    loadAllCommits()
  }, [tagSearchTerm, branches.length, branchCommits, dispatch])

  // Handle create branch
  const handleCreateBranch = useCallback(() => {
    if (!newBranchName.trim()) return

    const branchNames = branchPrefix
      ? branchPrefix
          .split(',')
          .map((p) => `${p.trim()}${newBranchName}`)
          .join(',')
      : newBranchName
    createBranchByNewBranchName(branchNames)
  }, [newBranchName, branchPrefix, createBranchByNewBranchName])

  // Handle rename branch
  const handleRenameBranch = useCallback(
    (oldName) => {
      setRenameBranchState({ show: true, oldName, newName: oldName })
      closeContextMenu()
    },
    [closeContextMenu]
  )

  // Handle create tag
  const handleCreateTag = useCallback(
    (branchName) => {
      setCreateTagState({ show: true, branchName, tagName: '' })
      closeContextMenu()
    },
    [closeContextMenu]
  )

  // Submit create tag
  const submitCreateTag = useCallback(async () => {
    if (!createTagState.tagName?.trim() || !onCreateTag) {
      setCreateTagState({ show: false, branchName: '', tagName: '' })
      return
    }

    await onCreateTag(createTagState.tagName, createTagState.branchName)

    // Refresh commits for all expanded branches
    Array.from(expandedBranches).forEach((branchName) => {
      dispatch(getBranchCommits({ branchName, limit: BRANCH_COMMITS_LIMIT }))
        .unwrap()
        .then((result) => {
          setBranchCommits((prev) => ({ ...prev, [branchName]: result.data }))
        })
        .catch((err) => console.error('Error refreshing branch commits:', err))
    })

    setCreateTagState({ show: false, branchName: '', tagName: '' })
  }, [createTagState, onCreateTag, expandedBranches, dispatch])

  // Submit rename
  const submitRename = useCallback(() => {
    if (renameBranchState.newName && renameBranchState.newName !== renameBranchState.oldName) {
      onRename(renameBranchState.oldName, renameBranchState.newName)
    }
    setRenameBranchState({ show: false, oldName: '', newName: '' })
  }, [renameBranchState, onRename])

  // Handle branch click
  const handleBranchClick = useCallback(
    async (branchName) => {
      setExpandedBranches((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(branchName)) {
          newSet.delete(branchName)
        } else {
          newSet.add(branchName)
        }
        return newSet
      })

      if (!branchCommits[branchName]) {
        try {
          const result = await dispatch(
            getBranchCommits({ branchName, limit: BRANCH_COMMITS_LIMIT })
          ).unwrap()
          setBranchCommits((prev) => ({ ...prev, [branchName]: result.data }))
        } catch (err) {
          console.error('Error loading branch commits:', err)
        }
      }
    },
    [branchCommits, dispatch]
  )

  // Handle refresh commits
  const handleRefreshCommits = useCallback(() => {
    // Refresh all expanded branches commits
    Array.from(expandedBranches).forEach((branchName) => {
      dispatch(getBranchCommits({ branchName, limit: BRANCH_COMMITS_LIMIT }))
        .unwrap()
        .then((result) => {
          setBranchCommits((prev) => ({ ...prev, [branchName]: result.data }))
        })
        .catch((err) => console.error('Error refreshing branch commits:', err))
    })

    // Refresh tag search commits
    if (tagSearchTerm && branches.length > 0) {
      branches.forEach(async (branchObj) => {
        const branchName = typeof branchObj === 'string' ? branchObj : branchObj.name
        try {
          const result = await dispatch(
            getBranchCommits({ branchName, limit: BRANCH_COMMITS_LIMIT })
          ).unwrap()
          setBranchCommits((prev) => ({ ...prev, [branchName]: result.data }))
        } catch (err) {
          console.error('Error loading branch commits:', err)
        }
      })
    }
  }, [expandedBranches, tagSearchTerm, branches, dispatch])

  return (
    <div className={styles.branchManagement}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.headerPrefixSection}>
            <Tag size={12} className={styles.prefixIcon} />
            <span className={styles.prefixHeaderLabel}>Prefix</span>
            {selectedPrefixes.length > 0 ? (
              <div className={styles.prefixChips}>
                {selectedPrefixes.map((p) => (
                  <span key={p} className={styles.prefixChip}>
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <span className={styles.placeholder}>None selected</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.topTools}>
        <div className={styles.createSection}>
          <input
            type="text"
            value={newBranchName}
            onChange={setNewBranchName}
            placeholder="New branch name..."
            className={styles.branchInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newBranchName.trim() && !loading) {
                handleCreateBranch()
              }
            }}
          />
          <button
            onClick={handleCreateBranch}
            disabled={loading || !newBranchName.trim()}
            className={styles.createBtn}
          >
            <Plus size={14} />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Search inputs */}
      <div className={styles.searchContainer}>
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search branches..."
          customStyle={{ flex: 1 }}
        />
        <SearchInput
          value={tagSearchTerm}
          onChange={(e) => setTagSearchTerm(e.target.value)}
          placeholder="Search tags..."
          customStyle={{ flex: 1 }}
        />
      </div>

      {/* Tag legend */}
      <div className={styles.tagLegend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles.localOnly}`}>
            <Tag size={8} />
          </span>
          <span className={styles.legendText}>Local only</span>
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles.remoteOnly}`}>
            <Tag size={8} />
          </span>
          <span className={styles.legendText}>Remote only</span>
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles.synced}`}>
            <Tag size={8} />
          </span>
          <span className={styles.legendText}>Synced</span>
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendBadge} ${styles.divergent}`}>
            <Tag size={8} />
          </span>
          <span className={styles.legendText}>Divergent</span>
        </span>
      </div>

      {/* Divergent tag warning — these block `git fetch` with "would clobber existing tag" */}
      {divergentTags.length > 0 && (
        <div className={styles.divergentWarning}>
          <AlertTriangle size={14} className={styles.divergentWarningIcon} />
          <div className={styles.divergentWarningBody}>
            <div className={styles.divergentWarningTitle}>
              {divergentTags.length} divergent tag
              {divergentTags.length === 1 ? '' : 's'} blocking fetch
            </div>
            <div className={styles.divergentWarningTags}>
              {divergentTags.slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`${styles.tagBadge} ${styles.divergent} ${styles.matchingTagItem}`}
                  title="Click to search this tag — right-click on the matching badge to delete the local copy"
                  onClick={() => setTagSearchTerm(tag)}
                  onContextMenu={(e) =>
                    handleContextMenu(e, 'tag', {
                      name: tag,
                      isDivergent: true
                    })
                  }
                >
                  <Tag size={9} />
                  {tag}
                </button>
              ))}
              {divergentTags.length > 5 && (
                <span className={styles.divergentWarningMore}>
                  +{divergentTags.length - 5} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {loadingCommits && tagSearchTerm && (
        <div className={styles.loadingHint}>
          <RefreshCw size={12} className={styles.spinning} />
          <span>Loading commits...</span>
        </div>
      )}
      {tagSearchTerm && matchingTags.length > 0 && (
        <div className={styles.matchingTagsSection}>
          <div className={styles.matchingTagsHeader}>Matching tags ({matchingTags.length})</div>
          <div className={styles.matchingTagsList}>
            {matchingTags.map((tag) => {
              const isDivergent = divergentTags.includes(tag)
              const isLocalOnly = localOnlyTags.includes(tag)
              const isRemoteOnly = remoteOnlyTags.includes(tag)
              const variant = isDivergent
                ? styles.divergent
                : isRemoteOnly
                  ? styles.remoteOnly
                  : isLocalOnly
                    ? styles.localOnly
                    : styles.synced
              const titleText = isDivergent
                ? 'Divergent — local & remote point to different commits (right-click to delete)'
                : isRemoteOnly
                  ? 'Remote only (right-click to delete)'
                  : isLocalOnly
                    ? 'Local only (right-click to delete)'
                    : 'Synced (right-click to delete)'
              return (
                <span
                  key={tag}
                  className={`${styles.tagBadge} ${variant} ${styles.matchingTagItem}`}
                  title={titleText}
                  onContextMenu={(e) =>
                    handleContextMenu(e, 'tag', {
                      name: tag,
                      isLocalOnly,
                      isRemoteOnly,
                      isDivergent
                    })
                  }
                >
                  <Tag size={9} />
                  {tag}
                </span>
              )
            })}
          </div>
        </div>
      )}
      <div className={styles.listSection}>
        <div className={styles.branchListContainer}>
          {loading && !branches.length ? (
            <div className={styles.loading}>
              <RefreshCw size={24} className={styles.spinning} />
              <p>Fetching branches...</p>
            </div>
          ) : (
            <div className={styles.scrollArea} ref={scrollAreaRef}>
              {/* Local Branches */}
              <div
                className={`${styles.branchGroup} ${effectiveLocalCollapsed ? styles.collapsed : ''}`}
                style={
                  !effectiveLocalCollapsed && effectiveRemoteCollapsed
                    ? // REMOTE collapsed → LOCAL fits content, leaves empty space below if short
                      { flex: '0 1 auto' }
                    : !effectiveLocalCollapsed && !effectiveRemoteCollapsed
                      ? { flexGrow: localPaneRatio }
                      : undefined
                }
              >
                <div
                  className={styles.groupHeader}
                  onClick={() => setIsLocalBranchesCollapsed(!isLocalBranchesCollapsed)}
                >
                  <ChevronDown
                    className={`${styles.chevronIcon} ${effectiveLocalCollapsed ? styles.collapsed : ''}`}
                    size={14}
                  />
                  <span>LOCAL</span>
                  <span className={styles.groupCount}>{sortedLocalBranches.length}</span>
                </div>
                {!effectiveLocalCollapsed && (
                  <div className={styles.groupContent}>
                    {localTreeEntries.length > 0 ? (
                      localTreeEntries.map((entry) => {
                        if (entry.kind === 'folder') {
                          const leafCount = countLeaves(entry.node)
                          return (
                            <div
                              key={`folder-${entry.node.path}`}
                              className={styles.branchItem}
                              onClick={() => toggleFolder(entry.node.path)}
                            >
                              <div
                                className={styles.branchMain}
                                style={{ paddingLeft: 8 + entry.depth * INDENT_PX }}
                              >
                                <ChevronDown
                                  size={12}
                                  className={`${styles.folderChevron} ${entry.collapsed ? styles.collapsed : ''}`}
                                />
                                <Folder size={13} className={styles.folderIcon} />
                                <span className={styles.folderName}>{entry.node.name}</span>
                                <span className={styles.folderCount}>{leafCount}</span>
                              </div>
                            </div>
                          )
                        }
                        const branchObj = entry.node.branchObj
                        const branch = entry.node.fullName
                        const {
                          ahead = 0,
                          behind = 0,
                          tags = [],
                          isDetached = false,
                          isCurrent = false
                        } = (typeof branchObj === 'object' ? branchObj : {}) || {}
                        const isActive = isCurrent || branch === currentBranch
                        const isExpanded =
                          expandedBranches.has(branch) || (tagSearchTerm && branchCommits[branch])

                        return (
                          <div key={`local-${branch}`}>
                            <div
                              onDoubleClick={() => !isActive && onCheckout(branch)}
                              onClick={() => handleBranchClick(branch)}
                              className={`${styles.branchItem} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
                              onContextMenu={(e) => handleContextMenu(e, 'branch', branch)}
                            >
                              <div
                                className={styles.branchMain}
                                style={{ paddingLeft: 8 + entry.depth * INDENT_PX }}
                              >
                                <span className={styles.folderChevronPlaceholder} />
                                <GitBranch size={13} className={styles.itemIcon} />
                                <span className={styles.branchNameText}>{entry.node.name}</span>
                                {isDetached && (
                                  <span className={styles.detachedBadge} title="Detached HEAD">
                                    Detached
                                  </span>
                                )}
                                {isActive && (
                                  <CheckCircle2 size={12} className={styles.activeCheck} />
                                )}
                                <div className={styles.syncStatus}>
                                  {ahead > 0 && (
                                    <span className={styles.ahead} title={`${ahead} ahead`}>
                                      <ArrowUp size={9} />
                                      {ahead}
                                    </span>
                                  )}
                                  {behind > 0 && (
                                    <span className={styles.behind} title={`${behind} behind`}>
                                      <ArrowDown size={9} />
                                      {behind}
                                    </span>
                                  )}
                                </div>
                                {tags.length > 0 && (
                                  <div className={styles.tagBadges}>
                                    {tags.slice(0, 2).map((tag) => {
                                      const isDivergent = divergentTags.includes(tag)
                                      const isLocalOnly = localOnlyTags.includes(tag)
                                      const isRemoteOnly = remoteOnlyTags.includes(tag)
                                      const variant = isDivergent
                                        ? styles.divergent
                                        : isRemoteOnly
                                          ? styles.remoteOnly
                                          : isLocalOnly
                                            ? styles.localOnly
                                            : styles.synced
                                      const titleText = isDivergent
                                        ? `${tag} (Divergent — local & remote point to different commits)`
                                        : isRemoteOnly
                                          ? `${tag} (Remote only)`
                                          : isLocalOnly
                                            ? `${tag} (Local only)`
                                            : `${tag} (Synced)`
                                      return (
                                        <span
                                          key={tag}
                                          className={`${styles.tagBadge} ${variant}`}
                                          title={titleText}
                                        >
                                          <Tag size={8} />
                                          {tag}
                                        </span>
                                      )
                                    })}
                                    {tags.length > 2 && (
                                      <span
                                        className={styles.tagBadge}
                                        title={tags.slice(2).join(', ')}
                                      >
                                        +{tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className={styles.itemActions}>
                                  <CopyButton
                                    textToCopy={branch}
                                    size={12}
                                    showCopiedText={false}
                                  />
                                  {!isActive && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (onRequestDeleteBranch) {
                                          onRequestDeleteBranch(branch, false)
                                        }
                                      }}
                                      className={styles.itemDeleteBtn}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Show commits when expanded or when tag search is active */}
                            {(expandedBranches.has(branch) ||
                              (tagSearchTerm && branchCommits[branch])) &&
                              branchCommits[branch] && (
                                <div className={styles.commitHistory}>
                                  {filterCommitsByTag(branchCommits[branch]).length > 0 ? (
                                    filterCommitsByTag(branchCommits[branch]).map((commit) => (
                                      <div
                                        key={commit.hash}
                                        className={styles.commitItem}
                                        onClick={() => handleViewCommit(commit)}
                                        onContextMenu={(e) =>
                                          handleContextMenu(e, 'commit', commit)
                                        }
                                        style={{ cursor: 'pointer' }}
                                        title="Click to view changes"
                                      >
                                        <div className={styles.commitDot} />
                                        <div className={styles.commitDetails}>
                                          <div className={styles.commitMessage}>
                                            {commit.message}
                                          </div>
                                          <div className={styles.commitMeta}>
                                            <span className={styles.commitHash}>
                                              {commit.shortHash}
                                            </span>
                                            <span className={styles.commitAuthor}>
                                              {commit.author}
                                            </span>
                                            {commit.date && (
                                              <span
                                                className={styles.commitDate}
                                                title={formatAbsoluteTime(commit.date)}
                                              >
                                                <Clock size={9} />
                                                {formatRelativeTime(commit.date)}
                                              </span>
                                            )}
                                            {commit.tags.length > 0 && (
                                              <div className={styles.commitTags}>
                                                {commit.tags.map((tag) => {
                                                  const isDivergent = divergentTags.includes(tag)
                                                  const isLocalOnly = localOnlyTags.includes(tag)
                                                  const isRemoteOnly = remoteOnlyTags.includes(tag)
                                                  const variant = isDivergent
                                                    ? styles.divergent
                                                    : isRemoteOnly
                                                      ? styles.remoteOnly
                                                      : isLocalOnly
                                                        ? styles.localOnly
                                                        : styles.synced
                                                  const titleText = isDivergent
                                                    ? `${tag} (Divergent — local & remote point to different commits)`
                                                    : isRemoteOnly
                                                      ? `${tag} (Remote only)`
                                                      : isLocalOnly
                                                        ? `${tag} (Local only)`
                                                        : `${tag} (Synced)`
                                                  return (
                                                    <span
                                                      key={tag}
                                                      className={`${styles.commitTag} ${variant}`}
                                                      title={titleText}
                                                    >
                                                      <Tag size={8} />
                                                      {tag}
                                                    </span>
                                                  )
                                                })}
                                              </div>
                                            )}
                                            {(() => {
                                              const info = commit.branches
                                              if (!info) return null
                                              const all = [
                                                ...(info.local || []).map((b) => ({
                                                  name: b,
                                                  isRemote: false,
                                                  isCurrent: b === branch
                                                })),
                                                ...(info.remote || []).map((b) => ({
                                                  name: b,
                                                  isRemote: true,
                                                  isCurrent: false
                                                }))
                                              ]
                                              if (all.length === 0) return null
                                              return (
                                                <div className={styles.commitBranches}>
                                                  {all.map((b) => (
                                                    <span
                                                      key={(b.isRemote ? 'r:' : 'l:') + b.name}
                                                      className={`${styles.commitBranchBadge} ${b.isRemote ? styles.commitBranchRemote : styles.commitBranchLocal} ${b.isCurrent ? styles.commitBranchCurrent : ''}`}
                                                      title={`${b.isCurrent ? 'Currently expanded — ' : ''}Tip of ${b.isRemote ? 'remote' : 'local'} branch: ${b.name}`}
                                                    >
                                                      <GitBranch size={8} />
                                                      {b.name}
                                                    </span>
                                                  ))}
                                                </div>
                                              )
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : tagSearchTerm ? (
                                    <div className={styles.noCommits}>
                                      <p
                                        style={{
                                          fontSize: '11px',
                                          color: 'rgba(255, 255, 255, 0.3)',
                                          padding: '8px'
                                        }}
                                      >
                                        No commits with tag "{tagSearchTerm}"
                                      </p>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                          </div>
                        )
                      })
                    ) : (
                      <div className={styles.loading} style={{ height: 'auto', padding: '20px' }}>
                        <p style={{ fontSize: '12px' }}>No matching local branches</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Remote Branches */}
              {remoteBranches.length > 0 && (
                <div
                  className={`${styles.branchGroup} ${effectiveRemoteCollapsed ? styles.collapsed : ''}`}
                  style={
                    !effectiveLocalCollapsed && !effectiveRemoteCollapsed
                      ? { flexGrow: 1 - localPaneRatio }
                      : undefined
                  }
                >
                  <div
                    className={`${styles.groupHeader} ${!effectiveLocalCollapsed && !effectiveRemoteCollapsed ? styles.groupHeaderSplitter : ''}`}
                    onMouseDown={handleRemoteHeaderMouseDown}
                  >
                    <ChevronDown
                      className={`${styles.chevronIcon} ${effectiveRemoteCollapsed ? styles.collapsed : ''}`}
                      size={14}
                    />
                    <span>REMOTE</span>
                    <span className={styles.groupCount}>{sortedRemoteBranches.length}</span>
                  </div>
                  {!effectiveRemoteCollapsed && (
                    <div ref={remoteScrollerRef} className={styles.groupContent}>
                      {remoteTreeEntries.length > 0 ? (
                        (() => {
                          const total = remoteTreeEntries.length
                          const first = Math.max(
                            0,
                            Math.floor(remoteScrollTop / ROW_H) - OVERSCAN_ROWS
                          )
                          const last = Math.min(
                            total - 1,
                            Math.ceil((remoteScrollTop + remoteViewportH) / ROW_H) + OVERSCAN_ROWS
                          )
                          const slice = []
                          for (let i = first; i <= last; i++)
                            slice.push({ entry: remoteTreeEntries[i], idx: i })
                          return (
                            <div
                              className={styles.virtualSpacer}
                              style={{ height: total * ROW_H, position: 'relative' }}
                            >
                              {slice.map(({ entry, idx }) => {
                                const top = idx * ROW_H
                                if (entry.kind === 'folder') {
                                  const leafCount = countLeaves(entry.node)
                                  const folderCollapsed = collapsedFolders.has(
                                    `remote:${entry.node.path}`
                                  )
                                  return (
                                    <div
                                      key={`remote-folder-${entry.node.path}`}
                                      className={styles.branchItem}
                                      style={{
                                        position: 'absolute',
                                        top,
                                        left: 0,
                                        right: 0,
                                        height: ROW_H
                                      }}
                                      onClick={() => toggleFolder(`remote:${entry.node.path}`)}
                                    >
                                      <div
                                        className={styles.branchMain}
                                        style={{ paddingLeft: 8 + entry.depth * INDENT_PX }}
                                      >
                                        <ChevronDown
                                          size={12}
                                          className={`${styles.folderChevron} ${folderCollapsed ? styles.collapsed : ''}`}
                                        />
                                        <Folder size={13} className={styles.folderIcon} />
                                        <span className={styles.folderName}>{entry.node.name}</span>
                                        <span className={styles.folderCount}>{leafCount}</span>
                                      </div>
                                    </div>
                                  )
                                }
                                const branch = entry.node.fullName
                                const isActive = branch === currentBranch
                                return (
                                  <div
                                    key={`remote-${branch}`}
                                    onDoubleClick={() => !isActive && onCheckout(branch)}
                                    className={`${styles.branchItem} ${isActive ? styles.active : ''}`}
                                    style={{
                                      position: 'absolute',
                                      top,
                                      left: 0,
                                      right: 0,
                                      height: ROW_H
                                    }}
                                    onContextMenu={(e) => handleContextMenu(e, 'branch', branch)}
                                  >
                                    <div
                                      className={styles.branchMain}
                                      style={{ paddingLeft: 8 + entry.depth * INDENT_PX }}
                                    >
                                      <span className={styles.folderChevronPlaceholder} />
                                      <GitBranch size={13} className={styles.itemIcon} />
                                      <span className={styles.branchNameText}>
                                        {entry.node.name}
                                      </span>
                                      {isActive && (
                                        <CheckCircle2 size={12} className={styles.activeCheck} />
                                      )}
                                      <div className={styles.itemActions}>
                                        <CopyButton
                                          textToCopy={branch}
                                          size={12}
                                          showCopiedText={false}
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (onRequestDeleteBranch) {
                                              onRequestDeleteBranch(branch, true)
                                            }
                                          }}
                                          className={styles.itemDeleteBtn}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()
                      ) : (
                        <div className={styles.loading} style={{ height: 'auto', padding: '20px' }}>
                          <p style={{ fontSize: '12px' }}>No matching remote branches</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {renameBranchState.show && (
        <div
          className={styles.modalOverlay}
          onClick={() => setRenameBranchState({ show: false, oldName: '', newName: '' })}
        >
          <div className={styles.macModal} onClick={(e) => e.stopPropagation()}>
            <h3>Rename Branch</h3>
            <div className={styles.modalBody}>
              <div className={styles.modalOldName}>
                <span>Current:</span>
                <code>{renameBranchState.oldName}</code>
              </div>
              <input
                value={renameBranchState.newName}
                onChange={(e) =>
                  setRenameBranchState((prev) => ({ ...prev, newName: e.target.value }))
                }
                placeholder="New branch name"
                className={styles.modalInput}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename()
                }}
              />
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={() => setRenameBranchState({ show: false, oldName: '', newName: '' })}
                className={styles.modalCancel}
              >
                Cancel
              </button>
              <button
                onClick={submitRename}
                disabled={
                  !renameBranchState.newName ||
                  renameBranchState.newName === renameBranchState.oldName
                }
                className={styles.modalConfirm}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {createTagState.show && (
        <div
          className={styles.modalOverlay}
          onClick={() => setCreateTagState({ show: false, branchName: '', tagName: '' })}
        >
          <div className={styles.macModal} onClick={(e) => e.stopPropagation()}>
            <h3>Create Tag</h3>
            <div className={styles.modalBody}>
              <div className={styles.modalOldName}>
                <span>Branch:</span>
                <code>{createTagState.branchName?.replace('origin/', '')}</code>
              </div>
              <input
                value={createTagState.tagName}
                onChange={(e) =>
                  setCreateTagState((prev) => ({ ...prev, tagName: e.target.value }))
                }
                placeholder="Tag name (e.g., v1.0.0)"
                className={styles.modalInput}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitCreateTag()
                }}
              />
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={() => setCreateTagState({ show: false, branchName: '', tagName: '' })}
                className={styles.modalCancel}
              >
                Cancel
              </button>
              <button
                onClick={submitCreateTag}
                disabled={!createTagState.tagName || !createTagState.tagName.trim()}
                className={styles.modalConfirm}
              >
                Create Tag
              </button>
            </div>
          </div>
        </div>
      )}

      <CommitDiffModal commit={viewingCommit} onClose={closeCommitDiffModal} />

      <BranchContextMenuController
        ref={contextMenuRef}
        localOnlyTags={localOnlyTags}
        remoteOnlyTags={remoteOnlyTags}
        divergentTags={divergentTags}
        currentBranch={currentBranch}
        onMerge={onMerge}
        onCheckout={onCheckout}
        onCheckoutCommit={onCheckoutCommit}
        onRename={handleRenameBranch}
        onCreateTag={handleCreateTag}
        onDeleteTag={onDeleteTag}
        onRequestDeleteTag={onRequestDeleteTag}
        onRequestDeleteBranch={onRequestDeleteBranch}
        onPushTag={onPushTag}
        onRefreshCommits={handleRefreshCommits}
      />
    </div>
  )
}

export default BranchList
