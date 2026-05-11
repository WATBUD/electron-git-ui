import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ErrorModal } from '../../../../shared/components/ErrorModal'
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog'
import { useConfirmDialog } from '../../../../shared/hooks/useConfirmDialog'
import { Toolbar } from '../../components/Toolbar'
import { FileStatus } from '../../components/FileStatus'
import { GitStashes } from '../../components/GitStashes'
import { FooterArea } from '../../layout/FooterArea'
import { AppToolbar } from '../../layout/AppToolbar'
import LeftSideBar from '../../layout/LeftSideBar'
import BranchList from '../../components/BranchList'
import ProjectList from '../../components/ProjectList'
import { GitGraphContainer } from './GitGraphContainer'
import {
  checkMergeInProgress,
  deleteBranch,
  loadBranches,
  createBranch,
  mergeBranch,
  checkoutBranch,
  checkoutCommit,
  deleteRemoteBranch,
  fetchFromRemote,
  pullFromRemote,
  pushToRemote,
  commitChanges,
  loadFileStatus,
  stageFile,
  unstageFile,
  discardFileChanges,
  clearError,
  loadCommitHistory,
  renameBranch,
  addPrefix,
  openRepository,
  getFileDiff,
  setSelectedFileDiff,
  loadStashes,
  pushStash,
  applyStash,
  popStash,
  dropStash,
  renameStash,
  getStashDiff,
  loadTags,
  createTag,
  deleteTag
} from '../../store/git'
import styles from './main-page-git.module.css'
import { LoadingModal } from '../../../../shared/components/LoadingModal'
import { GIT_TABS } from '../../constants/tabs'
import {
  AlertCircle,
  FileEdit,
  Plus,
  Trash2,
  RefreshCcw,
  Copy,
  HelpCircle,
  File
} from 'lucide-react'

export const MainPageGit = () => {
  const [newBranchName, setNewBranchName] = useState('')
  const [activeTab, setActiveTab] = useState(GIT_TABS.PROJECTS)
  const { confirmDialog, requestConfirm, handleConfirm, handleCancel, setToggleValue, getTitle } = useConfirmDialog()
  const error = useSelector((state) => state.git.error)

  // Get state from Redux
  const showFooter = useSelector((state) => state.git.showFooter)
  const branches = useSelector((state) => state.git.branches)
  const remoteBranches = useSelector((state) => state.git.remoteBranches)
  const currentBranch = useSelector((state) => state.git.currentBranch)
  const fileStatus = useSelector((state) => state.git.fileStatus)
  const loadingMessage = useSelector((state) => state.git.loadingMessage)
  // `state.git.loading` is never flipped — derive from loadingMessage so
  // inline spinners (e.g. BranchList "Fetching branches...") actually fire.
  const loading = !!loadingMessage
  const repoPath = useSelector((state) => state.git.repoPath)
  const mergeStatus = useSelector((state) => state.git.mergeStatus)
  const prefixes = useSelector((state) => state.git.prefixes)
  const selectedPrefixes = useSelector((state) => state.git.selectedPrefixes)
  const projects = useSelector((state) => state.git.projects || [])
  const selectedFileDiff = useSelector((state) => state.git.selectedFileDiff)
  const stashes = useSelector((state) => state.git.stashes)
  const stashLoading = useSelector((state) => state.git.stashLoading)
  const selectedStashDiff = useSelector((state) => state.git.selectedStashDiff)
  const localTags = useSelector((state) => state.git.localTags || [])
  const localOnlyTags = useSelector((state) => state.git.localOnlyTags || [])
  const remoteOnlyTags = useSelector((state) => state.git.remoteOnlyTags || [])
  const divergentTags = useSelector((state) => state.git.divergentTags || [])
  const hasMergeInProgress = useSelector((state) => state.git.hasMergeInProgress)
  const dispatch = useDispatch()

  // When a merge starts having conflicts, jump to the files tab so the user
  // can resolve them. Triggers on the false → true transition.
  useEffect(() => {
    if (hasMergeInProgress) {
      setActiveTab(GIT_TABS.FILES)
      dispatch(loadFileStatus())
    }
  }, [hasMergeInProgress, dispatch])

  useEffect(() => {
    // Debug: Check if window.git is available
    console.log('window.git available:', !!window.git)
    if (window.git) {
      console.log('Available git methods:', Object.keys(window.git))
    }
  }, [])

  useEffect(() => {
    if (repoPath) {
      dispatch(loadBranches())
      dispatch(loadFileStatus())
      dispatch(checkMergeInProgress())
      dispatch(loadTags())

    }
  }, [repoPath, dispatch])

  useEffect(() => {
    const handleFocus = () => {
      if (repoPath) {
        if (activeTab === GIT_TABS.FILES) {
          dispatch(loadFileStatus())
        }
        if (activeTab === GIT_TABS.BRANCH_VIEW) {
          dispatch(checkMergeInProgress())
          dispatch(loadBranches())
          // Refresh tag info silently — keeps divergent/remoteOnly badges fresh
          dispatch(loadTags())
        }
        if (activeTab === GIT_TABS.STASHES) {
          dispatch(loadStashes())
        }
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [repoPath, activeTab, dispatch])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
        const index = parseInt(e.key) - 1
        if (projects[index]) {
          e.preventDefault()
          if (projects[index] !== repoPath) {
            dispatch(openRepository(projects[index])).then(() => {
              setActiveTab(GIT_TABS.BRANCH_VIEW)
            })
          } else {
            //setActiveTab(GIT_TABS.BRANCH_VIEW)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [projects, repoPath, dispatch])

  const handleFileClick = async ({ file, isStaged }) => {
    const result = await dispatch(getFileDiff({ file, isStaged }))
    if (getFileDiff.fulfilled.match(result)) {
      // Diff is now loaded and available in selectedFileDiff
    }
  }

  const getStatusText = (file) => {
    if (file.statusType) {
      const { staged, working } = file.statusType
      if (staged === 'U' || working === 'U') return 'Conflict'
      if (staged === 'M') return 'Staged Changes'
      if (staged === 'A') return 'Staged Addition'
      if (staged === 'D') return 'Staged Deletion'
      if (staged === 'R') return 'Staged Rename'
      if (staged === 'C') return 'Staged Copy'
      if (working === 'M') return 'Working Changes'
      if (working === 'A') return 'Working Addition'
      if (working === 'D') return 'Working Deletion'
      if (working === '?') return 'Untracked'
    }
    return 'Unknown'
  }

  const getStatusIcon = (file) => {
    const { staged, working } = file.statusType

    const iconSize = 14

    if (staged === 'U' || working === 'U') return <AlertCircle size={iconSize} color="#ff3b30" />
    if (staged === 'M' || working === 'M') return <FileEdit size={iconSize} color="#0a84ff" />
    if (staged === 'A' || working === 'A') return <Plus size={iconSize} color="#34c759" />
    if (staged === 'D' || working === 'D') return <Trash2 size={iconSize} color="#ff3b30" />
    if (staged === 'R') return <RefreshCcw size={iconSize} color="#5e5ce6" />
    if (staged === 'C') return <Copy size={iconSize} color="#5e5ce6" />
    if (staged === '?' || working === '?') return <HelpCircle size={iconSize} color="#8e8e93" />
    return <File size={iconSize} color="#8e8e93" />
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === GIT_TABS.FILES) {
      dispatch(loadFileStatus())
    }
    if (tab === GIT_TABS.BRANCH_VIEW) {
      dispatch(checkMergeInProgress())
      dispatch(loadBranches())
      dispatch(loadTags())
    }
    if (tab === GIT_TABS.GRAPH) {
      dispatch(loadCommitHistory())
    }
    if (tab === GIT_TABS.STASHES) {
      dispatch(loadStashes())
    }
  }

  // Handle delete tag confirmation request from BranchContextMenu
  const handleRequestDeleteTag = (tagName, refreshCallback) => {
    requestConfirm({
      type: 'tag',
      name: tagName,
      refreshCallback,
      onConfirm: async () => {
        try {
          await dispatch(deleteTag({ tagName, isRemote: false }))
          // Wait for both to complete before UI updates
          await dispatch(loadTags())
          await dispatch(loadBranches())
        } catch (error) {
          console.error('Error deleting tag:', error)
          throw error
        }
      }
    })
  }

  // Handle delete branch confirmation request
  const handleRequestDeleteBranch = (branchName, isRemote = false) => {
    requestConfirm({
      type: 'branch',
      name: branchName,
      isRemote,
      // Force-delete only applies to local branches (`-D` vs `-d`); remote
      // delete (`git push origin --delete`) ignores merge state already.
      toggle: isRemote
        ? null
        : {
            label: 'Force delete (allow unmerged commits)',
            hint: 'Use git branch -D — irreversibly drops commits not merged elsewhere.',
            defaultValue: false
          },
      onConfirm: async ({ toggleValue }) => {
        const result = isRemote
          ? await dispatch(deleteRemoteBranch(branchName))
          : await dispatch(deleteBranch({ branchName, force: !!toggleValue }))
        const action = isRemote ? deleteRemoteBranch : deleteBranch
        if (action.fulfilled.match(result)) {
          await dispatch(loadBranches())
        }
      }
    })
  }

  return (
    <div className={styles.gitUi}>
      <div className={styles.toolbarContainer}>
        <AppToolbar />

        {repoPath && (
          <Toolbar
            onPull={async () => {
              await dispatch(pullFromRemote())
              dispatch(loadTags())
            }}
            onFetch={async (pruneBranches) => {
              await dispatch(fetchFromRemote(pruneBranches))
              dispatch(loadTags())
            }}
            onPush={async (forcePush) => {
              await dispatch(pushToRemote(forcePush))
            }}
            onCommit={async (commitMessage) => {
              await dispatch(commitChanges(commitMessage))
            }}
            onStash={async (includeStaged, customMessage) => {
              try {
                const defaultMessage = includeStaged 
                  ? 'Auto stash from toolbar (all changes)'
                  : 'Auto stash from toolbar (unstaged only)'
                const message = customMessage || defaultMessage
                
                if (includeStaged) {
                  // Stash all files (staged + unstaged)
                  const result = await dispatch(pushStash(message))
                  if (pushStash.fulfilled.match(result)) {
                    dispatch(loadFileStatus())
                  }
                } else {
                  // Stash only unstaged files, preserve staged files
                  const unstagedFiles = (fileStatus || [])
                    .filter(f => !f.isStaged)
                    .map(f => f.file)
                  
                  const result = await dispatch(pushStash({ 
                    message: message,
                    files: unstagedFiles.length > 0 ? unstagedFiles : undefined
                  }))
                  if (pushStash.fulfilled.match(result)) {
                    dispatch(loadFileStatus())
                  }
                }
              } catch (error) {
                console.error('Stash error:', error)
                dispatch(loadFileStatus()) // Refresh status in case of error
              }
            }}
            loading={loading}
          />
        )}
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.contentArea}>
          <LeftSideBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isRepoSelected={!!repoPath}
          />
          <div className={styles.mainContent}>
            {activeTab === GIT_TABS.PROJECTS && (
              <ProjectList onProjectSelect={() => setActiveTab(GIT_TABS.BRANCH_VIEW)} />
            )}
            {repoPath && (
              <>
                {activeTab === GIT_TABS.BRANCH_VIEW && (
                  <BranchList
                    branches={branches}
                    remoteBranches={remoteBranches}
                    currentBranch={currentBranch}
                    loading={loading}
                    localTags={localTags}
                    localOnlyTags={localOnlyTags}
                    remoteOnlyTags={remoteOnlyTags}
                    divergentTags={divergentTags}
                    onCheckout={async (branchName) => {
                      await dispatch(checkoutBranch(branchName))
                    }}
                    onCheckoutCommit={async (commitHash) => {
                      await dispatch(checkoutCommit(commitHash))
                    }}
                    onDelete={async (branchName) => {
                      await dispatch(deleteBranch(branchName))
                    }}
                    onDeleteRemote={async (branchName) => {
                      const result = await dispatch(deleteRemoteBranch(branchName))
                    }}
                    onDeleteTag={async (tagName, isRemote) => {
                      try {
                        await dispatch(deleteTag({ tagName, isRemote }))
                        // Wait for both to complete before UI updates
                        await dispatch(loadTags())
                        await dispatch(loadBranches())
                      } catch (error) {
                        console.error('Error deleting tag:', error)
                      }
                    }}
                    onRequestDeleteTag={handleRequestDeleteTag}
                    onRequestDeleteBranch={handleRequestDeleteBranch}
                    onPushTag={async (tagName) => {
                      try {
                        await window.git.pushTag(tagName)
                        // Wait for both to complete before UI updates
                        await dispatch(loadTags())
                        await dispatch(loadBranches())
                      } catch (error) {
                        console.error('Error pushing tag:', error)
                        throw error
                      }
                    }}
                    onRefresh={() => {
                      dispatch(loadBranches())
                    }}
                    onMerge={async (branchName) => {
                      await dispatch(mergeBranch(branchName))
                    }}
                    onRename={async (oldName, newName) => {
                      await dispatch(renameBranch({ oldName, newName }))
                    }}
                    onCreateTag={async (tagName, branchName) => {
                      const result = await dispatch(createTag({ tagName, branchName, message: '' }))
                      // Only refresh on success; loadTags/loadBranches' pending reducer
                      // clears state.error and would swallow the failure message.
                      if (createTag.fulfilled.match(result)) {
                        await dispatch(loadTags())
                        await dispatch(loadBranches())
                      }
                    }}
                    selectedPrefixes={selectedPrefixes}
                    newBranchName={newBranchName}
                    setNewBranchName={(e) => setNewBranchName(e.target.value)}
                    createBranchByNewBranchName={async (fullName) => {
                      const nameToCreate = typeof fullName === 'string' ? fullName : newBranchName
                      if (!nameToCreate.trim()) return

                      const names = nameToCreate
                        .split(',')
                        .map((name) => name.trim())
                        .filter(Boolean)

                      for (const name of names) {
                        await dispatch(createBranch(name))
                      }
                      setNewBranchName('')
                      dispatch(loadBranches())
                    }}
                  />
                )}

                {activeTab === GIT_TABS.GRAPH && <GitGraphContainer />}

                {activeTab === GIT_TABS.FILES && (
                  <FileStatus
                    fileStatus={fileStatus}
                    repoPath={repoPath}
                    selectedFileDiff={selectedFileDiff}
                    onFileClick={({ file, isStaged }) =>
                      handleFileClick({ file, isStaged })
                    }
                    onStageFile={async (files) => {
                      const result = await dispatch(stageFile(files))
                      if (stageFile.fulfilled.match(result)) {
                        dispatch(loadFileStatus())
                      }
                    }}
                    onUnstageFile={async (files) => {
                      const result = await dispatch(unstageFile(files))
                      if (unstageFile.fulfilled.match(result)) {
                        dispatch(loadFileStatus())
                      }
                    }}
                    onDiscardChanges={async (file) => {
                      const result = await dispatch(discardFileChanges(file))
                      if (discardFileChanges.fulfilled.match(result)) {
                        dispatch(loadFileStatus())
                      }
                    }}
                    onRemoveFile={async (file) => {
                      const result = await dispatch(discardFileChanges(file))
                      if (discardFileChanges.fulfilled.match(result)) {
                        dispatch(loadFileStatus())
                      }
                    }}
                    getStatusIcon={getStatusIcon}
                    getStatusText={getStatusText}
                    onRefresh={async () => {
                      await dispatch(loadFileStatus())
                    }}
                    onStashFile={async (file) => {
                      const result = await dispatch(pushStash(file))
                      if (pushStash.fulfilled.match(result)) {
                        dispatch(loadFileStatus())
                      }
                    }}
                    loading={loading}
                  />
                )}

                {activeTab === GIT_TABS.STASHES && (
                  <GitStashes
                    stashes={stashes}
                    loading={stashLoading}
                    selectedStashDiff={selectedStashDiff}
                    onRefresh={() => dispatch(loadStashes())}
                    onPush={async (message) => dispatch(pushStash(message))}
                    onApply={async (stashIndex) => dispatch(applyStash(stashIndex))}
                    onPop={async (stashIndex) => dispatch(popStash(stashIndex))}
                    onDrop={async (stashIndex) => dispatch(dropStash(stashIndex))}
                    onRename={async (stashIndex, newMessage) => dispatch(renameStash({ stashIndex, newMessage }))}
                    onSelectStash={(stashIndex) => dispatch(getStashDiff(stashIndex))}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <div style={{ display: showFooter ? 'block' : 'none' }}>
          <FooterArea />
        </div>
      </div>
      <LoadingModal message={loadingMessage} />
      <ErrorModal error={error} show={!!error} onClose={() => dispatch(clearError())} />
      
      {/* Global ConfirmDialog for tag and branch deletion */}
      <ConfirmDialog
        show={confirmDialog.show}
        title={getTitle(confirmDialog.type)}
        message={confirmDialog.message}
        confirmText={confirmDialog.toggleValue ? 'Force Delete' : 'Delete'}
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        toggle={confirmDialog.toggle}
        toggleValue={confirmDialog.toggleValue}
        onToggleChange={setToggleValue}
      />
    </div>
  )
}
