/* eslint-disable no-unused-vars */
import { createSlice } from '@reduxjs/toolkit'
import {
  loadCommitHistory,
  checkoutCommit,
  mergeBranch,
  checkMergeInProgress,
  loadTags,
  loadRemoteTagInfo,
  deleteTag,
  createTag,
  abortMerge,
  deleteBranch,
  loadBranches,
  createBranch,
  checkoutBranch,
  deleteRemoteBranch,
  fetchFromRemote,
  pullFromRemote,
  pushToRemote,
  commitChanges,
  discardFileChanges,
  stageFile,
  unstageFile,
  loadFileStatus,
  fetchCommandHistory,
  clearCommandHistory,
  selectRepository,
  getCachedDiff,
  getFileDiff,
  renameBranch,
  openRepository,
  loadStashes,
  pushStash,
  applyStash,
  popStash,
  dropStash,
  renameStash,
  getStashDiff,
  fetchUserConfig,
  setUserConfig,
  fastForwardAllBranches
} from './gitThunks'

const STORAGE_KEYS = {
  PREFIXES: 'git_prefixes',
  SELECTED_PREFIXES: 'git_selected_prefixes',
  PROJECTS: 'git_projects'
}

const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : defaultValue
  } catch (e) {
    console.error(`Failed to load ${key} from storage:`, e)
    return defaultValue
  }
}

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`Failed to save ${key} to storage:`, e)
  }
}

// Initial state for git graph
const initialGraphState = {
  commits: [],
  currentHead: null,
  unpushedCount: 0,
  loading: false,
  error: null
}

const DEFAULT_PREFIXES = ['feature/PT-', 'promote-prod/PT-', 'promote-stg2602/PT-']

const initialState = {
  ...initialGraphState,
  showFooter: false,
  hasMergeInProgress: false,
  error: null,
  branches: [],
  remoteBranches: [],
  currentBranch: '',
  fileStatus: [],
  loading: false,
  loadingMessage: '',
  // When non-empty, takes precedence over `loadingMessage`. Use this when a
  // caller needs to keep the LoadingModal visible across multiple thunks whose
  // own pending/fulfilled cases would otherwise clear `loadingMessage`.
  loadingOverride: '',
  commandHistory: [],
  previousHistoryIndex: -1,
  repoPath: null,
  mergeStatus: { isInProgress: false, message: '' },
  cachedDiff: null,
  prefixes: loadFromStorage(STORAGE_KEYS.PREFIXES, DEFAULT_PREFIXES),
  selectedPrefixes: loadFromStorage(STORAGE_KEYS.SELECTED_PREFIXES, []),
  projects: loadFromStorage(STORAGE_KEYS.PROJECTS, []),
  selectedFileDiff: null,
  stashes: [],
  stashLoading: false,
  selectedStashDiff: null,
  localTags: [],
  remoteTags: [],
  localOnlyTags: [],
  remoteOnlyTags: [],
  divergentTags: [],
  tagsLoading: false,
  userConfig: { name: '', email: '' }
}

const gitSlice = createSlice({
  name: 'git',
  initialState,
  reducers: {
    updatePreviousHistoryIndex: (state, action) => {
      state.previousHistoryIndex = action.payload
    },
    toggleFooter: (state) => {
      state.showFooter = !state.showFooter
    },
    setMergeInProgress: (state, action) => {
      state.hasMergeInProgress = action.payload
    },
    setMergeStatus: (state, action) => {
      state.mergeStatus = action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    setLoading: (state, action) => {
      state.loadingMessage = action.payload || ''
    },
    stopLoading: (state) => {
      state.loadingMessage = ''
    },
    setLoadingOverride: (state, action) => {
      state.loadingOverride = action.payload || ''
    },
    clearLoadingOverride: (state) => {
      state.loadingOverride = ''
    },
    clearCachedDiff: (state) => {
      state.cachedDiff = null
    },
    addPrefix: (state, action) => {
      const prefix = action.payload
      if (prefix && !state.prefixes.includes(prefix)) {
        state.prefixes.push(prefix)
        saveToStorage(STORAGE_KEYS.PREFIXES, state.prefixes)
      }
    },
    removePrefix: (state, action) => {
      state.prefixes = state.prefixes.filter((p) => p !== action.payload)
      state.selectedPrefixes = state.selectedPrefixes.filter((p) => p !== action.payload)
      saveToStorage(STORAGE_KEYS.PREFIXES, state.prefixes)
      saveToStorage(STORAGE_KEYS.SELECTED_PREFIXES, state.selectedPrefixes)
    },
    toggleSelectedPrefix: (state, action) => {
      const prefix = action.payload
      if (state.selectedPrefixes.includes(prefix)) {
        state.selectedPrefixes = state.selectedPrefixes.filter((p) => p !== prefix)
      } else {
        state.selectedPrefixes.push(prefix)
      }
      saveToStorage(STORAGE_KEYS.SELECTED_PREFIXES, state.selectedPrefixes)
    },
    addProject: (state, action) => {
      const path = action.payload
      if (path && !state.projects.includes(path)) {
        state.projects.push(path)
        saveToStorage(STORAGE_KEYS.PROJECTS, state.projects)
      }
    },
    removeProject: (state, action) => {
      state.projects = state.projects.filter((p) => p !== action.payload)
      saveToStorage(STORAGE_KEYS.PROJECTS, state.projects)
    },
    reorderProjects: (state, action) => {
      state.projects = action.payload
      saveToStorage(STORAGE_KEYS.PROJECTS, state.projects)
    },
    setSelectedFileDiff: (state, action) => {
      state.selectedFileDiff = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCommitHistory.pending, (state) => {
        state.loadingMessage = 'Loading commit history...'
        state.error = null
      })
      .addCase(loadCommitHistory.fulfilled, (state, action) => {
        state.loadingMessage = ''
        const data = action.payload?.data ?? {}
        state.commits = data.commits || []
        state.currentHead = data.currentHead
        state.currentBranch = data.currentBranch
        state.unpushedCount = data.unpushedCount || 0
      })
      .addCase(loadCommitHistory.rejected, (state, action) => {
        state.error = action.payload
      })
      .addCase(checkoutCommit.pending, (state) => {
        state.error = null
      })
      .addCase(checkoutCommit.fulfilled, (state) => {})
      .addCase(checkoutCommit.rejected, (state, action) => {
        state.error = action.payload
      })
      .addCase(mergeBranch.pending, (state) => {
        state.loadingMessage = 'Merging branch...'
        state.error = null
      })
      .addCase(mergeBranch.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(mergeBranch.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })

      .addCase(renameBranch.pending, (state) => {
        state.loadingMessage = 'Renaming branch...'
        state.error = null
      })
      .addCase(renameBranch.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(renameBranch.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })

    // Existing reducers
    builder
      .addCase(loadTags.pending, (state) => {
        // Silent — don't set loadingMessage so the BranchList renders branches
        // immediately without waiting for the slow ls-remote tag query.
        state.tagsLoading = true
      })
      .addCase(loadTags.fulfilled, (state, action) => {
        state.tagsLoading = false
        const data = action.payload?.data
        state.localTags = data?.localTags || []
        const remoteTags = data?.remoteTags || []
        state.remoteTags = remoteTags.filter((tag, index, self) => self.indexOf(tag) === index)
        state.localOnlyTags = data?.localOnlyTags || []
        state.remoteOnlyTags = data?.remoteOnlyTags || []
        state.divergentTags = data?.divergentTags || []
      })
      .addCase(loadTags.rejected, (state, action) => {
        // Silent — failure shouldn't reset loadingMessage (it wasn't set).
        state.tagsLoading = false
        state.error = action.payload
      })
      // Background remote tag info — does NOT touch loadingMessage / error.
      .addCase(loadRemoteTagInfo.fulfilled, (state, action) => {
        const data = action.payload?.data
        if (!data) return
        state.remoteOnlyTags = data.remoteOnlyTags || []
        state.divergentTags = data.divergentTags || []
      })
      .addCase(deleteTag.pending, (state) => {
        state.loadingMessage = 'Deleting tag...'
        state.error = null
      })
      .addCase(deleteTag.fulfilled, (state) => {
        // Keep loading message until refresh completes
        // Tags will be reloaded after deletion
      })
      .addCase(deleteTag.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      .addCase(createTag.pending, (state) => {
        state.loadingMessage = 'Creating tag...'
        state.error = null
      })
      .addCase(createTag.fulfilled, (state) => {
        state.loadingMessage = ''
        // Tags will be reloaded after creation
      })
      .addCase(createTag.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      .addCase(abortMerge.fulfilled, (state) => {
        state.hasMergeInProgress = false
      })
      .addCase(abortMerge.rejected, (state, action) => {
        state.error = action.payload
      })
      .addCase(checkMergeInProgress.fulfilled, (state, action) => {
        const data = action.payload?.data
        state.hasMergeInProgress = data?.hasMergeInProgress || false
      })
      .addCase(checkMergeInProgress.rejected, (state, action) => {
        state.error = action.payload
      })
      .addCase(fetchUserConfig.fulfilled, (state, action) => {
        const data = action.payload?.data
        state.userConfig = {
          name: data?.name || '',
          email: data?.email || ''
        }
      })
      .addCase(setUserConfig.fulfilled, (state, action) => {
        const data = action.payload?.data
        state.userConfig = {
          name: data?.name || '',
          email: data?.email || ''
        }
      })
      .addCase(setUserConfig.rejected, (state, action) => {
        state.error = action.payload
      })
      .addCase(deleteBranch.rejected, (state, action) => {
        state.error = action.payload
      })
      // loadBranches
      .addCase(loadBranches.pending, (state) => {
        state.loadingMessage = 'Loading branches...'
        state.error = null
      })
      .addCase(loadBranches.fulfilled, (state, action) => {
        state.loadingMessage = ''
        const data = action.payload?.data
        state.currentBranch = data?.currentBranch
        state.branches = data?.branches
        state.remoteBranches = data?.remoteBranches
        // remoteOnlyTags / divergentTags are intentionally NOT cleared here —
        // they are filled asynchronously by loadRemoteTagInfo so the inline
        // branch list can render immediately without waiting for ls-remote.
      })
      .addCase(loadBranches.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      // createBranch
      .addCase(createBranch.pending, (state, action) => {
        state.loadingMessage = `Creating branch...`
        state.error = null
      })
      .addCase(createBranch.fulfilled, (state, action) => {
        state.loadingMessage = ''
        // No state update needed, branches will be reloaded
      })
      .addCase(createBranch.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      .addCase(checkoutBranch.pending, (state) => {
        state.loadingMessage = 'Checking out branch...'
        state.error = null
      })
      .addCase(checkoutBranch.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(checkoutBranch.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      // deleteRemoteBranch
      .addCase(deleteRemoteBranch.pending, (state) => {
        state.loadingMessage = 'Deleting remote branch...'
        state.error = null
      })
      .addCase(deleteRemoteBranch.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(deleteRemoteBranch.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      // fetchFromRemote
      .addCase(fetchFromRemote.pending, (state) => {
        state.loadingMessage = 'Fetching from remote...'
        state.error = null
      })
      .addCase(fetchFromRemote.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(fetchFromRemote.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      // fastForwardAllBranches
      .addCase(fastForwardAllBranches.pending, (state) => {
        state.loadingMessage = 'Running Fast-Forward All...'
        state.error = null
      })
      .addCase(fastForwardAllBranches.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(fastForwardAllBranches.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      // pullFromRemote
      .addCase(pullFromRemote.pending, (state) => {
        state.loadingMessage = 'Pulling from remote...'
        state.error = null
      })
      .addCase(pullFromRemote.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(pullFromRemote.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      .addCase(pushToRemote.pending, (state) => {
        state.loadingMessage = 'Pushing to remote...'
        state.error = null
      })
      .addCase(pushToRemote.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(pushToRemote.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      .addCase(commitChanges.pending, (state) => {
        state.loadingMessage = 'Committing changes...'
        state.error = null
      })
      .addCase(commitChanges.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(commitChanges.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      .addCase(loadFileStatus.pending, (state) => {
        state.loadingMessage = 'Loading file status...'
        state.error = null
      })
      .addCase(loadFileStatus.fulfilled, (state, action) => {
        state.loadingMessage = ''
        state.fileStatus = action.payload?.data?.files ?? []
      })
      .addCase(loadFileStatus.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      // stageFile
      .addCase(stageFile.pending, (state) => {
        state.loadingMessage = 'Staging file...'
        state.error = null
      })
      .addCase(stageFile.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(stageFile.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      // unstageFile
      .addCase(unstageFile.pending, (state) => {
        state.loadingMessage = 'Unstaging file...'
        state.error = null
      })
      .addCase(unstageFile.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(unstageFile.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      // discardFileChanges
      .addCase(discardFileChanges.pending, (state) => {
        state.loadingMessage = 'Discarding file changes...'
        state.error = null
      })
      .addCase(discardFileChanges.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(discardFileChanges.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      .addCase(fetchCommandHistory.fulfilled, (state, action) => {
        state.commandHistory = action.payload?.data ?? []
      })
      .addCase(fetchCommandHistory.rejected, (state, action) => {
        state.error = action.payload
      })
      // clearCommandHistory
      .addCase(clearCommandHistory.fulfilled, (state) => {
        state.commandHistory = []
      })
      .addCase(clearCommandHistory.rejected, (state, action) => {
        state.error = action.payload
      })
      .addCase(selectRepository.pending, (state) => {
        state.loadingMessage = 'Selecting repository...'
        state.error = null
      })
      .addCase(selectRepository.fulfilled, (state, action) => {
        state.loadingMessage = ''
        const data = action.payload?.data
        state.repoPath = data?.repoPath
        if (state.repoPath && !state.projects.includes(state.repoPath)) {
          state.projects.push(state.repoPath)
          saveToStorage(STORAGE_KEYS.PROJECTS, state.projects)
        }
      })
      .addCase(selectRepository.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      .addCase(openRepository.pending, (state) => {
        state.loadingMessage = 'Opening repository...'
        state.error = null
      })
      .addCase(openRepository.fulfilled, (state, action) => {
        state.loadingMessage = ''
        const data = action.payload?.data
        state.repoPath = data?.repoPath
      })
      .addCase(openRepository.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      .addCase(getCachedDiff.pending, (state) => {
        state.loadingMessage = 'Fetching cached diff...'
        state.error = null
      })
      .addCase(getCachedDiff.fulfilled, (state, action) => {
        state.loadingMessage = ''
        state.cachedDiff = action.payload?.data ?? ''
      })
      .addCase(getCachedDiff.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      .addCase(getFileDiff.pending, (state) => {
        state.loadingMessage = 'Fetching file diff...'
        state.error = null
      })
      .addCase(getFileDiff.fulfilled, (state, action) => {
        state.loadingMessage = ''
        state.selectedFileDiff = action.payload?.data ?? ''
      })
      .addCase(getFileDiff.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      // loadStashes
      .addCase(loadStashes.pending, (state) => {
        state.loadingMessage = 'Loading stashes...'
        state.stashLoading = true
        state.error = null
      })
      .addCase(loadStashes.fulfilled, (state, action) => {
        state.loadingMessage = ''
        state.stashLoading = false
        state.stashes = action.payload?.data ?? []
        state.selectedStashDiff = null // 重載列表時清除預覽
      })
      .addCase(loadStashes.rejected, (state, action) => {
        state.loadingMessage = ''
        state.stashLoading = false
        state.error = action.payload
      })
      // pushStash
      .addCase(pushStash.pending, (state) => {
        state.loadingMessage = 'Stashing changes...'
        state.error = null
      })
      .addCase(pushStash.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(pushStash.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      // applyStash
      .addCase(applyStash.pending, (state) => {
        state.loadingMessage = 'Applying stash...'
        state.error = null
      })
      .addCase(applyStash.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(applyStash.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      // popStash
      .addCase(popStash.pending, (state) => {
        state.loadingMessage = 'Popping stash...'
        state.error = null
      })
      .addCase(popStash.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(popStash.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      // dropStash
      .addCase(dropStash.pending, (state) => {
        state.loadingMessage = 'Dropping stash...'
        state.error = null
      })
      .addCase(dropStash.fulfilled, (state) => {
        state.loadingMessage = ''
      })
      .addCase(dropStash.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
      // renameStash
      .addCase(renameStash.pending, (state) => {
        console.log('renameStash.pending', state)
        state.loadingMessage = 'Renaming stash...'
        state.error = null
      })
      .addCase(renameStash.fulfilled, (state) => {
        console.log('renameStash.fulfilled', state)
        state.loadingMessage = ''
      })
      .addCase(renameStash.rejected, (state, action) => {
        console.log('renameStash.rejected', state, action)
        state.loadingMessage = ''
        state.error = action.payload
      })
      .addCase(getStashDiff.pending, (state) => {
        console.log('getStashDiff.pending', state)
        state.error = null
      })
      .addCase(getStashDiff.fulfilled, (state, action) => {
        state.selectedStashDiff = action.payload?.data ?? ''
      })
      .addCase(getStashDiff.rejected, (state, action) => {
        state.error = action.payload
      })
  }
})

export const {
  toggleFooter,
  updatePreviousHistoryIndex,
  setMergeInProgress,
  setMergeStatus,
  setError,
  clearError,
  setLoading,
  stopLoading,
  setLoadingOverride,
  clearLoadingOverride,
  clearCachedDiff,
  addPrefix,
  removePrefix,
  toggleSelectedPrefix,
  addProject,
  removeProject,
  reorderProjects,
  setSelectedFileDiff
} = gitSlice.actions

export default gitSlice.reducer
