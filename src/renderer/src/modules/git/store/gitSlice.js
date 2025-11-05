import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

// Initial state for git graph
const initialGraphState = {
  commits: [],
  currentHead: null,
  currentBranch: null,
  unpushedCount: 0,
  loading: false,
  error: null
}

// Utility function to update command history index
const updateHistoryIndex = (getState, dispatch) => {
  const state = getState()
  const lastIndex = state.git.commandHistory.length
  dispatch(gitSlice.actions.updatePreviousHistoryIndex(lastIndex))
}

export const loadCommitHistory = createAsyncThunk(
  'git/loadCommitHistory',
  async (_, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.getCommitHistory()

      if (result.success) {
        return {
          commits: result.commits || [],
          currentHead: result.currentHead,
          currentBranch: result.currentBranch,
          unpushedCount: result.unpushedCount || 0
        }
      } else {
        return rejectWithValue(result.error || 'Failed to load commit history')
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error loading commit history')
    }
  }
)

export const refreshTags = createAsyncThunk(
  'git/refreshTags',
  async (_, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git integration not available')
    }

    // Update previous history index in the state
    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.refreshTags()

      if (result.success) {
        return { success: true }
      } else {
        return rejectWithValue('Failed to refresh tags')
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error refreshing tags')
    }
  }
)

export const abortMerge = createAsyncThunk(
  'git/abortMerge',
  async (_, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git integration not available')
    }

    // Update previous history index in the state
    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.abortMerge()

      if (result.success) {
        return { success: true }
      } else {
        return rejectWithValue(result.error || 'Failed to abort merge')
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error aborting merge')
    }
  }
)

export const checkMergeInProgress = createAsyncThunk(
  'git/checkMergeInProgress',
  async (_, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git integration not available')
    }

    // Update previous history index in the state
    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.checkMergeInProgress()

      if (result.success) {
        return { hasMergeInProgress: result.isMergeInProgress }
      } else {
        return rejectWithValue(result.error || 'Failed to check merge status')
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error checking merge status')
    }
  }
)

export const deleteBranch = createAsyncThunk(
  'git/deleteBranch',
  async (branchName, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    // Update previous history index in the state
    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.deleteBranch(branchName)
      await dispatch(updateCommandHistory())

      if (result.success) {
        return { success: true, branchName }
      } else {
        return rejectWithValue(result.error || 'Failed to delete branch')
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error deleting branch')
    }
  }
)

export const loadBranches = createAsyncThunk(
  'git/loadBranches',
  async (_, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    // Update previous history index in the state
    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.listBranches()

      if (result.success) {
        const rawOutput = result.command.output || ''
        const current = rawOutput.split('\n').find((line) => line.trim().startsWith('* '))
        const currentBranch = current ? current.trim().replace('* ', '') : ''
        await dispatch(updateCommandHistory())

        return {
          branches: result.branches,
          remoteBranches: result.remoteBranches,
          currentBranch
        }
      } else {
        return rejectWithValue(result.error || 'Failed to load branches')
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error loading branches')
    }
  }
)

export const createBranch = createAsyncThunk(
  'git/createBranch',
  async (branchName, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    // Update previous history index in the state
    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.createBranch(branchName)
      await dispatch(updateCommandHistory())

      if (result.success) {
        return { success: true, branchName }
      } else {
        return rejectWithValue(result.error || 'Failed to create branch')
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error creating branch')
    }
  }
)

export const mergeBranch = createAsyncThunk(
  'git/mergeBranch',
  async (sourceBranch, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.mergeBranch(sourceBranch)

      if (result.success) {
        // Reload branches, status and commit history after merge
        await Promise.all([
          dispatch(loadBranches()),
          dispatch(loadFileStatus()),
          dispatch(loadCommitHistory())
        ])
        return { success: true }
      } else {
        return rejectWithValue(result.error || 'Failed to merge branch')
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error merging branch')
    }
  }
)

export const checkoutCommit = createAsyncThunk(
  'git/checkoutCommit',
  async (commitHash, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.checkoutCommit(commitHash)

      if (result.success) {
        await Promise.all([
          dispatch(loadCommitHistory())
          //dispatch(loadBranches()),
          //dispatch(loadFileStatus())
        ])
        return { success: true }
      } else {
        return rejectWithValue(result.error || 'Failed to checkout commit')
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error checking out commit')
    }
  }
)

export const checkoutBranch = createAsyncThunk(
  'git/checkoutBranch',
  async (branchName, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    // Update previous history index in the state
    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.checkoutBranch(branchName)

      if (result.success) {
        return { success: true, branchName }
      } else {
        return rejectWithValue(result.error || 'Failed to checkout branch')
      }
    } catch (err) {
      // 捕獲完整的錯誤訊息，包括 stderr
      const errorMessage = err.message || err.toString() || 'Error checking out branch'
      return rejectWithValue(errorMessage)
    }
  }
)

export const deleteRemoteBranch = createAsyncThunk(
  'git/deleteRemoteBranch',
  async (branchName, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    // Update previous history index in the state
    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.deleteRemoteBranch(branchName)

      if (result.success) {
        return { success: true, branchName }
      } else {
        return rejectWithValue(result.error || 'Failed to delete remote branch')
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error deleting remote branch')
    }
  }
)

export const fetchFromRemote = createAsyncThunk(
  'git/fetchFromRemote',
  async (pruneBranches = false, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    // Update previous history index in the state
    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.fetch(pruneBranches)

      if (result.success) {
        return { success: true }
      } else {
        return rejectWithValue(result.error || 'Failed to fetch from remote')
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error fetching from remote')
    }
  }
)

export const pushToRemote = createAsyncThunk(
  'git/pushToRemote',
  async (forcePush = false, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    // Update previous history index in the state
    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.push(forcePush)

      if (result.success) {
        return { success: true }
      } else {
        return rejectWithValue(result.error || 'Failed to push to remote')
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error pushing to remote')
    }
  }
)

export const commitChanges = createAsyncThunk(
  'git/commitChanges',
  async (commitMessage, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    // Update previous history index in the state
    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.commit(commitMessage)
      if (result.success) {
        await Promise.all([dispatch(loadFileStatus()), dispatch(updateCommandHistory())])
        return { success: true, message: commitMessage }
      } else {
        return rejectWithValue(result.error || 'Failed to commit changes')
      }
    } catch (error) {
      console.error('Error committing changes:', error)
      return rejectWithValue(error.message || 'Failed to commit changes')
    }
  }
)

export const discardFileChanges = createAsyncThunk(
  'git/discardFileChanges',
  async (files, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const { commandHistory } = getState().git
    const lastIndex = commandHistory.length
    dispatch(gitSlice.actions.updatePreviousHistoryIndex(lastIndex))

    try {
      // Convert single file to array for consistent handling
      const fileArray = Array.isArray(files) ? files : [files]
      const result = await window.git.discardFileChanges(fileArray)

      if (result.success) {
        // Update the status after successful discard
        await Promise.all([dispatch(loadFileStatus()), dispatch(updateCommandHistory())])
        return { success: true, files: fileArray, count: result.count || fileArray.length }
      } else {
        return rejectWithValue(result.error || 'Failed to discard file changes')
      }
    } catch (error) {
      console.error('Error discarding file changes:', error)
      // Still try to refresh the status even if there was an error
      try {
        await dispatch(loadFileStatus())
      } catch (refreshError) {
        console.error('Error refreshing file status:', refreshError)
      }
      return rejectWithValue(error.message || 'Failed to discard changes')
    }
  }
)

export const stageFile = createAsyncThunk(
  'git/stageFile',
  async (file, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    try {
      const result = await window.git.stageFile(file)
      if (result.success) {
        await dispatch(loadFileStatus())
        return { success: true, file }
      } else {
        return rejectWithValue(result.error || 'Failed to stage file')
      }
    } catch (error) {
      console.error('Error staging file:', error)
      return rejectWithValue(error.message || 'Failed to stage file')
    }
  }
)

export const unstageFile = createAsyncThunk(
  'git/unstageFile',
  async (file, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    try {
      const result = await window.git.unstageFile(file)
      if (result.success) {
        // Refresh the file status after unstaging
        await dispatch(loadFileStatus())
        return { success: true, file }
      } else {
        return rejectWithValue(result.error || 'Failed to unstage file')
      }
    } catch (error) {
      console.error('Error unstaging file:', error)
      return rejectWithValue(error.message || 'Failed to unstage file')
    }
  }
)

export const loadFileStatus = createAsyncThunk(
  'git/loadFileStatus',
  async (_, { rejectWithValue, getState, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }
    updateHistoryIndex(getState, dispatch)
    try {
      const result = await window.git.getStatus()
      if (result.success) {
        await dispatch(updateCommandHistory())
        return { files: result.files }
      } else {
        return rejectWithValue(result.error || 'Failed to load file status')
      }
    } catch (error) {
      console.error('Error loading file status:', error)
      return rejectWithValue(error.message || 'Failed to load file status')
    }
  }
)

export const updateCommandHistory = createAsyncThunk(
  'git/updateCommandHistory',
  async (_, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    try {
      const history = await window.git.getCommandHistory()
      return { history }
    } catch (err) {
      return rejectWithValue(err.message || 'Error updating command history')
    }
  }
)

export const clearCommandHistory = createAsyncThunk(
  'git/clearCommandHistory',
  async (_, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    try {
      await window.git.clearCommandHistory()
      return { success: true }
    } catch (err) {
      return rejectWithValue(err.message || 'Error clearing command history')
    }
  }
)

export const selectRepository = createAsyncThunk(
  'git/selectRepository',
  async (_, { rejectWithValue, dispatch, getState }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    // Update previous history index in the state
    updateHistoryIndex(getState, dispatch)

    try {
      const result = await window.git.selectRepository()
      if (result && result.success) {
        await dispatch(updateCommandHistory())
        return { path: result.path }
      } else {
        return rejectWithValue('Failed to select repository')
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error selecting repository')
    }
  }
)

const initialState = {
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
  ...initialGraphState,
  repoPath: null,
  mergeStatus: { isInProgress: false, message: '' }
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
    }
  },
  extraReducers: (builder) => {
    // Git Graph reducers
    builder
      .addCase(loadCommitHistory.pending, (state) => {
        state.loadingMessage = 'Loading commit history...'
        state.error = null
      })
      .addCase(loadCommitHistory.fulfilled, (state, action) => {
        state.loadingMessage = ''
        state.commits = action.payload.commits
        state.currentHead = action.payload.currentHead
        state.currentBranch = action.payload.currentBranch
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
        state.error = null
      })
      .addCase(mergeBranch.fulfilled, (state) => {})
      .addCase(mergeBranch.rejected, (state, action) => {
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
        state.hasMergeInProgress = action.payload.hasMergeInProgress
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
        state.branches = action.payload.branches
        state.remoteBranches = action.payload.remoteBranches
        state.currentBranch = action.payload.currentBranch
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
      // checkoutBranch
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
      // pushToRemote
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
      // commitChanges
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
      // loadFileStatus
      .addCase(loadFileStatus.pending, (state) => {
        state.loadingMessage = 'Loading file status...'
        state.error = null
      })
      .addCase(loadFileStatus.fulfilled, (state, action) => {
        state.loadingMessage = ''
        state.fileStatus = action.payload.files
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
        state.commandHistory = action.payload.history
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
      // selectRepository
      .addCase(selectRepository.pending, (state) => {
        state.loadingMessage = 'Selecting repository...'
        state.error = null
      })
      .addCase(selectRepository.fulfilled, (state, action) => {
        state.loadingMessage = ''
        state.repoPath = action.payload.path
      })
      .addCase(selectRepository.rejected, (state, action) => {
        state.loadingMessage = ''
        state.error = action.payload
      })
  }
})

export const {
  toggleFooter,
  setMergeInProgress,
  setMergeStatus,
  setError,
  clearError,
  setLoading,
  stopLoading
} = gitSlice.actions

export default gitSlice.reducer
