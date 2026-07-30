import React, { useState, useCallback, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
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
  AlertTriangle,
  Link2
} from 'lucide-react'
import { CopyButton } from '../../../../shared/components/CopyButton'
import { SearchInput } from '../../../../shared/components/SearchInput'
import { BranchContextMenuController } from './BranchContextMenuController'
import { CommitDiffModal } from '../Commit'
import { formatRelativeTime, formatAbsoluteTime } from '../../../../shared/utils/relativeTime'
import { getBranchCommits, fastForwardAllBranches, openRepository } from '../../store/git/gitThunks'
import { setLoadingOverride, clearLoadingOverride } from '../../store/git/gitSlice'
import {
  BRANCH_COMMITS_LIMIT,
  ROW_H,
  OVERSCAN_ROWS,
  indentStyle,
  commitIndentStyle,
  buildBranchTree,
  countLeaves,
  flattenTree
} from './branchTree'
import { TagBadge, CreateTagModal } from '../Tag'
import tagStyles from '../Tag/Tag.module.css'
import { RenameBranchModal } from './RenameBranchModal'
import { CreateBranchModal } from './CreateBranchModal'
import { useCommitDisplayOptions } from '../Commit/CommitDisplayOptions'
import { CommitTagLegend } from '../Commit/CommitTagLegend'
/* eslint-disable react/prop-types */
import styles from './BranchList.module.css'

const BranchList = ({
  branches = [],
  remoteBranches = [],
  currentBranch,
  repoPath,
  loading,
  onCheckout,
  onCheckoutCommit,
  onMerge,
  createBranchByNewBranchName,
  selectedPrefixes = [],
  onRename,
  onCreateTag,
  localTags = [],
  localOnlyTags = [],
  remoteOnlyTags = [],
  divergentTags = [],
  divergentTagDetails = [],
  onRequestDeleteTag,
  onRequestDeleteBranch,
  onRequestResetToCommit,
  onPushTag,
  onSwitchWorktree
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
  const [createBranchState, setCreateBranchState] = useState({
    show: false,
    branchName: ''
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

  // Switching projects (e.g. via keyboard shortcut) swaps the `branches` prop
  // but leaves this component mounted, so the cached per-branch commit lists and
  // the expanded/collapsed state would otherwise still show the *previous*
  // project's commits. Reset all repo-scoped transient state when repoPath
  // changes so the Local branch commit lists refresh for the new project.
  const prevRepoPathRef = useRef(repoPath)
  React.useEffect(() => {
    if (prevRepoPathRef.current === repoPath) return
    prevRepoPathRef.current = repoPath
    setBranchCommits({})
    setExpandedBranches(new Set())
    setViewingCommit(null)
  }, [repoPath])
  const [dirtyWarning, setDirtyWarning] = useState(false)
  const dispatch = useDispatch()
  const fileStatus = useSelector((s) => s.git.fileStatus || [])
  const hasUncommittedChanges = fileStatus.length > 0
  const { options: commitDisplay, toggle: toggleCommitDisplay } = useCommitDisplayOptions()

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
    (e, type, target, isRemote = false) => {
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
        isRemote,
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
    return flattenTree(tree, 0, collapsedFolders, currentBranch, [], 'remote:')
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

  const handleFastForwardAll = useCallback(async () => {
    // Block when the working tree has uncommitted or staged changes — a
    // fast-forward can otherwise leave the user in a messy partial state if
    // git refuses to move HEAD on the dirty branch.
    if (hasUncommittedChanges) {
      setDirtyWarning(true)
      return
    }
    try {
      await dispatch(fastForwardAllBranches()).unwrap()
    } catch (err) {
      console.error('Failed to fast-forward all branches:', err)
    }
  }, [dispatch, hasUncommittedChanges])

  // Submit create branch from modal
  const submitCreateBranch = useCallback(() => {
    const { branchName } = createBranchState
    setCreateBranchState({ show: false, branchName: '' })
    if (!branchName?.trim() || !createBranchByNewBranchName) return

    const branchNames = branchPrefix
      ? branchPrefix
          .split(',')
          .map((p) => `${p.trim()}${branchName}`)
          .join(',')
      : branchName
    createBranchByNewBranchName(branchNames)
  }, [createBranchState, branchPrefix, createBranchByNewBranchName])

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

  // Submit create tag.
  // Close the modal immediately and explicitly own loadingMessage for the
  // whole "create + refresh tags + refresh branches + refresh expanded commits"
  // pipeline. We can't rely solely on createTag.pending/fulfilled because:
  //   - createTag.fulfilled clears loadingMessage halfway through the flow
  //   - loadTags / loadBranches that run afterwards are silent (no message)
  // So the global LoadingModal would only flash briefly.
  const submitCreateTag = useCallback(() => {
    const { tagName, branchName } = createTagState
    setCreateTagState({ show: false, branchName: '', tagName: '' })
    if (!tagName?.trim() || !onCreateTag) return

    // Use loadingOverride so the LoadingModal stays up across createTag →
    // loadTags → loadBranches → expanded-commit refresh. Each individual
    // thunk's pending/fulfilled would otherwise clear loadingMessage and
    // make the loader flicker / disappear before the UI actually refreshes.
    dispatch(setLoadingOverride('Creating tag…'))
    ;(async () => {
      try {
        await onCreateTag(tagName, branchName)
        dispatch(setLoadingOverride('Refreshing branches…'))
        const expanded = Array.from(expandedBranches)
        await Promise.all(
          expanded.map((bn) =>
            dispatch(getBranchCommits({ branchName: bn, limit: BRANCH_COMMITS_LIMIT }))
              .unwrap()
              .then((result) => setBranchCommits((prev) => ({ ...prev, [bn]: result.data })))
              .catch((err) => console.error('Error refreshing branch commits:', err))
          )
        )
      } catch (err) {
        console.error('Create tag failed:', err)
      } finally {
        dispatch(clearLoadingOverride())
      }
    })()
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
          <button
            onClick={() => setCreateBranchState({ show: true, branchName: '' })}
            className={styles.headerCreateBtn}
            title="Create new branch"
          >
            <Plus size={13} />
            <span>Create Branch</span>
          </button>
          <button
            onClick={handleFastForwardAll}
            className={styles.headerFetchBtn}
            title="Fast-forward all local tracking branches to their upstream remote counterparts"
          >
            <RefreshCw size={12} />
            <span>Fast-Forward All</span>
          </button>
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
                <TagBadge
                  key={tag}
                  tag={tag}
                  localOnlyTags={localOnlyTags}
                  remoteOnlyTags={remoteOnlyTags}
                  divergentTags={divergentTags}
                  className={tagStyles.matchingTagItem}
                  onClick={() => setTagSearchTerm(tag)}
                  onContextMenu={(e) =>
                    handleContextMenu(e, 'tag', {
                      name: tag,
                      isDivergent: true
                    })
                  }
                />
              ))}
              {divergentTags.length > 5 && (
                <span className={styles.divergentWarningMore}>
                  +{divergentTags.length - 5} more
                </span>
              )}
            </div>
            {/* Per-tag local vs remote SHAs straight from
                `git show-ref --tags -d` and `git ls-remote --tags origin`. */}
            {divergentTagDetails.length > 0 && (
              <div className={styles.divergentHashTable}>
                {divergentTagDetails.map((d) => (
                  <div key={d.name} className={styles.divergentHashRow}>
                    <span
                      className={styles.divergentHashTagName}
                      onClick={() => setTagSearchTerm(d.name)}
                      title="Search this tag"
                    >
                      {d.name}
                    </span>
                    <span className={styles.divergentHashCell}>
                      <span className={styles.divergentHashLabel}>local</span>
                      <code className={styles.divergentHash}>
                        {d.localHash ? d.localHash.slice(0, 8) : '—'}
                      </code>
                    </span>
                    <span className={styles.divergentHashCell}>
                      <span className={styles.divergentHashLabel}>remote</span>
                      <code className={styles.divergentHash}>
                        {d.remoteHash ? d.remoteHash.slice(0, 8) : '—'}
                      </code>
                    </span>
                  </div>
                ))}
              </div>
            )}
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
            {matchingTags.map((tag) => (
              <TagBadge
                key={tag}
                tag={tag}
                localOnlyTags={localOnlyTags}
                remoteOnlyTags={remoteOnlyTags}
                divergentTags={divergentTags}
                className={styles.matchingTagItem}
                onContextMenu={(e) =>
                  handleContextMenu(e, 'tag', {
                    name: tag,
                    isLocalOnly: localOnlyTags.includes(tag),
                    isRemoteOnly: remoteOnlyTags.includes(tag),
                    isDivergent: divergentTags.includes(tag)
                  })
                }
              />
            ))}
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
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{ marginLeft: '10px', display: 'flex', alignItems: 'center' }}
                  >
                    <CommitTagLegend
                      commitDisplay={commitDisplay}
                      toggleCommitDisplay={toggleCommitDisplay}
                      style={{ paddingBottom: 0, gap: '10px' }}
                    />
                  </div>
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
                              <div className={styles.branchMain} style={indentStyle(entry.depth)}>
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
                          isDetached = false,
                          isCurrent = false,
                          worktreePath = null
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
                              <div className={styles.branchMain} style={indentStyle(entry.depth)}>
                                <span className={styles.folderChevronPlaceholder} />
                                <GitBranch size={13} className={styles.itemIcon} />
                                <span className={styles.branchNameText}>{entry.node.name}</span>
                                {isDetached && (
                                  <span className={styles.detachedBadge} title="Detached HEAD">
                                    Detached
                                  </span>
                                )}
                                {worktreePath && !isActive && (
                                  <button
                                    type="button"
                                    className={styles.worktreeBadge}
                                    title={`Open this branch's worktree:\n${worktreePath}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      dispatch(openRepository(worktreePath)).then(() =>
                                        onSwitchWorktree?.()
                                      )
                                    }}
                                  >
                                    <Link2 size={11} />
                                    <span>worktree</span>
                                  </button>
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
                                        style={{
                                          cursor: 'pointer',
                                          ...commitIndentStyle(entry.depth)
                                        }}
                                        title="Click to view changes"
                                      >
                                        <div className={styles.commitDot} />
                                        <div className={styles.commitDetails}>
                                          <div className={styles.commitMeta}>
                                            {commitDisplay.hash && (
                                              <span className={styles.commitHash}>
                                                {commit.shortHash}
                                              </span>
                                            )}
                                            {commitDisplay.author && (
                                              <span className={styles.commitAuthor}>
                                                {commit.author}
                                              </span>
                                            )}
                                            {commitDisplay.date && commit.date && (
                                              <span
                                                className={styles.commitDate}
                                                title={formatAbsoluteTime(commit.date)}
                                              >
                                                <Clock size={11} />
                                                {formatRelativeTime(commit.date)}
                                              </span>
                                            )}
                                            {commitDisplay.tags && commit.tags.length > 0 && (
                                              <div className={tagStyles.commitTags}>
                                                {commit.tags.map((tag) => (
                                                  <TagBadge
                                                    key={tag}
                                                    tag={tag}
                                                    inline
                                                    localOnlyTags={localOnlyTags}
                                                    remoteOnlyTags={remoteOnlyTags}
                                                    divergentTags={divergentTags}
                                                  />
                                                ))}
                                              </div>
                                            )}
                                            {commitDisplay.branches &&
                                              (() => {
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
                                                        <GitBranch size={10} />
                                                        {b.name}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )
                                              })()}
                                          </div>
                                          {commitDisplay.message && (
                                            <div className={styles.commitMessage}>
                                              {commit.message}
                                            </div>
                                          )}
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
                                        No commits with tag &quot;{tagSearchTerm}&quot;
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
                                        style={indentStyle(entry.depth)}
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
                                    onContextMenu={(e) =>
                                      handleContextMenu(e, 'branch', branch, true)
                                    }
                                  >
                                    <div
                                      className={styles.branchMain}
                                      style={indentStyle(entry.depth)}
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

      <CreateBranchModal
        state={createBranchState}
        setState={setCreateBranchState}
        onSubmit={submitCreateBranch}
        branchPrefix={branchPrefix}
      />

      {dirtyWarning && (
        <div className={styles.modalOverlay} onClick={() => setDirtyWarning(false)}>
          <div className={styles.macModal} onClick={(e) => e.stopPropagation()}>
            <h3>Uncommitted changes</h3>
            <div className={styles.modalBody}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'rgba(255,255,255,0.85)'
                }}
              >
                You have <strong>{fileStatus.length}</strong> uncommitted file
                {fileStatus.length === 1 ? '' : 's'}.
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                Please <strong>commit</strong> or <strong>stash</strong> your changes before
                fast-forwarding — otherwise git may refuse to move the current branch.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={() => setDirtyWarning(false)}
                className={styles.modalConfirm}
                autoFocus
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <RenameBranchModal
        state={renameBranchState}
        setState={setRenameBranchState}
        onSubmit={submitRename}
      />

      <CreateTagModal
        state={createTagState}
        setState={setCreateTagState}
        onSubmit={submitCreateTag}
      />

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
        onRequestDeleteTag={onRequestDeleteTag}
        onRequestDeleteBranch={onRequestDeleteBranch}
        onRequestResetToCommit={onRequestResetToCommit}
        onPushTag={onPushTag}
        onRefreshCommits={handleRefreshCommits}
      />
    </div>
  )
}

export default BranchList
