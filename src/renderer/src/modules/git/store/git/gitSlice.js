import { createSlice } from '@reduxjs/toolkit'
import {
  loadCommitHistory,
  checkoutCommit,
  mergeBranch,
  checkMergeInProgress,
  refreshTags,
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
  updateCommandHistory,
  clearCommandHistory,
  selectRepository,
  getCachedDiff,
  renameBranch,
  openRepository
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
  isRefreshingTags: false,
  hasMergeInProgress: false,
  error: null,
  branches: [],
  remoteBranches: [],
  currentBranch: '',
  fileStatus: [],
  loading: false,
  loadingMessage: '',
  commandHistory: [],
  previousHistoryIndex: -1,
  repoPath: null,
  mergeStatus: { isInProgress: false, message: '' },
  cachedDiff: null,
  prefixes: loadFromStorage(STORAGE_KEYS.PREFIXES, DEFAULT_PREFIXES),
  selectedPrefixes: loadFromStorage(STORAGE_KEYS.SELECTED_PREFIXES, []),
  projects: loadFromStorage(STORAGE_KEYS.PROJECTS, [])
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
        state.commits = action.payload.commits
        state.currentHead = action.payload.currentHead
        state.unpushedCount = action.payload.unpushedCount
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
      .addCase(refreshTags.pending, (state) => {
        state.isRefreshingTags = true
        state.error = null
      })
      .addCase(refreshTags.fulfilled, (state) => {
        state.isRefreshingTags = false
      })
      .addCase(refreshTags.rejected, (state, action) => {
        state.isRefreshingTags = false
        state.error = action.payload
      })
      .addCase(abortMerge.fulfilled, (state) => {
        state.hasMergeInProgress = false
      })
      .addCase(abortMerge.rejected, (state, action) => {
        state.error = action.payload
      })
      .addCase(checkMergeInProgress.fulfilled, (state, action) => {
        state.hasMergeInProgress = action.payload.data?.hasMergeInProgress || false
      })
      .addCase(checkMergeInProgress.rejected, (state, action) => {
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
        state.currentBranch = action.payload?.currentBranch
        state.branches = action.payload?.branches
        state.remoteBranches = action.payload?.remoteBranches
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
        state.branches.push(action.payload.branchName)
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
        state.fileStatus = action.payload
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
      .addCase(updateCommandHistory.fulfilled, (state, action) => {
        state.commandHistory = action.payload.data
      })
      .addCase(updateCommandHistory.rejected, (state, action) => {
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
        state.repoPath = action.payload.data.repoPath
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
        state.repoPath = action.payload.data.repoPath
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
        state.cachedDiff = action.payload
      })
      .addCase(getCachedDiff.rejected, (state, action) => {
        state.loadingMessage = ''
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
  clearCachedDiff,
  addPrefix,
  removePrefix,
  toggleSelectedPrefix,
  addProject,
  removeProject
} = gitSlice.actions

export default gitSlice.reducer
