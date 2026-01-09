import { createAsyncThunk } from '@reduxjs/toolkit'
import { updatePreviousHistoryIndex } from '../../store/git'
// Generic async function to handle Git API calls with error handling
async function callGit(fn, rejectWithValue, fallbackError, fnName) {
  try {
    const result = await fn()
    console.log(`%c callGit ${fnName} result:`, 'color: blue;', result)
    if (!result.success) {
      return rejectWithValue(result.message ?? fallbackError)
    }

    return result
  } catch (err) {
    console.error(`Error in ${fnName}:`, err)
    return rejectWithValue(err?.message ?? fallbackError)
  }
}
// Utility function to update command history index
const updateHistoryIndex = (getState, dispatch) => {
  const state = getState()
  const lastIndex = state.git.commandHistory.length
  dispatch(updatePreviousHistoryIndex(lastIndex))
}

// Utility function to check Git API initialization and handle errors
const checkGitApiInitialization = (rejectWithValue) => {
  if (!window.git) {
    return rejectWithValue('Git API not initialized')
  }
}

export const loadCommitHistory = createAsyncThunk(
  'git/loadCommitHistory',
  async (_, { getState, rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    updateHistoryIndex(getState, dispatch)

    const result = await callGit(
      () => window.git.loadCommitHistory(),
      rejectWithValue,
      'Failed to load commit history',
      'loadCommitHistory'
    )
    const { commits = [], currentHead, currentBranch, unpushedCount = 0 } = result.data ?? {}
    return {
      commits,
      currentHead,
      currentBranch,
      unpushedCount
    }
  }
)

export const refreshTags = createAsyncThunk(
  'git/refreshTags',
  async (_, { getState, rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    updateHistoryIndex(getState, dispatch)

    const result = await callGit(
      () => window.git.refreshTags(),
      rejectWithValue,
      'Failed to refresh tags',
      'refreshTags'
    )
    return result
  }
)

export const abortMerge = createAsyncThunk(
  'git/abortMerge',
  async (_, { getState, rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    updateHistoryIndex(getState, dispatch)

    const result = await callGit(
      () => window.git.abortMerge(),
      rejectWithValue,
      'Failed to abort merge',
      'abortMerge'
    )
    return result
  }
)

export const checkMergeInProgress = createAsyncThunk(
  'git/checkMergeInProgress',
  async (_, { getState, rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    updateHistoryIndex(getState, dispatch)

    const result = await callGit(
      () => window.git.checkMergeInProgress(),
      rejectWithValue,
      'Failed to check merge status',
      'checkMergeInProgress'
    )
    return result
  }
)

export const deleteBranch = createAsyncThunk(
  'git/deleteBranch',
  async (branchName, { getState, rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    updateHistoryIndex(getState, dispatch)

    const result = await callGit(
      () => window.git.deleteBranch(branchName),
      rejectWithValue,
      'Failed to delete branch',
      'deleteBranch'
    )
    await dispatch(updateCommandHistory())
    await dispatch(loadBranches())
    return result
  }
)

export const loadBranches = createAsyncThunk(
  'git/loadBranches',
  async (_, { getState, rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    updateHistoryIndex(getState, dispatch)

    const result = await callGit(
      () => window.git.loadBranches(),
      rejectWithValue,
      'Failed to load branches',
      'loadBranches'
    )
    await dispatch(updateCommandHistory())
    return {
      branches: result.data?.branches,
      remoteBranches: result.data?.remoteBranches,
      currentBranch: result.data?.currentBranch
    }
  }
)

export const createBranch = createAsyncThunk(
  'git/createBranch',
  async (branchName, { getState, rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    updateHistoryIndex(getState, dispatch)

    const result = await callGit(
      () => window.git.createBranch(branchName),
      rejectWithValue,
      'Failed to create branch',
      'createBranch'
    )

    await dispatch(updateCommandHistory())

    return { success: true, branchName }
  }
)

export const mergeBranch = createAsyncThunk(
  'git/mergeBranch',
  async (sourceBranch, { getState, rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    updateHistoryIndex(getState, dispatch)

    const result = await callGit(
      () => window.git.mergeBranch(sourceBranch),
      rejectWithValue,
      'Failed to merge branch',
      'mergeBranch'
    )

    // Reload branches, status and commit history after merge
    await Promise.all([
      dispatch(loadBranches()),
      dispatch(loadFileStatus()),
      dispatch(loadCommitHistory())
    ])
    return { success: true }
  }
)

export const checkoutCommit = createAsyncThunk(
  'git/checkoutCommit',
  async (commitHash, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    updateHistoryIndex(getState, dispatch)

    const result = await callGit(
      () => window.git.checkoutCommit(commitHash),
      rejectWithValue,
      'Failed to checkout commit',
      'checkoutCommit'
    )

    await Promise.all([
      dispatch(loadCommitHistory())
      //dispatch(loadBranches()),
      //dispatch(loadFileStatus())
    ])
    return { success: true }
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

    const result = await callGit(
      () => window.git.checkoutBranch(branchName),
      rejectWithValue,
      'Failed to checkout branch',
      'checkoutBranch'
    )
    await dispatch(loadBranches())
    return result
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

    const result = await callGit(
      () => window.git.deleteRemoteBranch(branchName),
      rejectWithValue,
      'Failed to delete remote branch',
      'deleteRemoteBranch'
    )
    await dispatch(loadBranches())
    return result
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

    const result = await callGit(
      () => window.git.fetch(pruneBranches),
      rejectWithValue,
      'Failed to fetch from remote',
      'fetchFromRemote'
    )
    await dispatch(loadBranches())
    return result
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

    const result = await callGit(
      () => window.git.push(forcePush),
      rejectWithValue,
      'Failed to push to remote',
      'pushToRemote'
    )
    await dispatch(loadBranches())
    return result
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
    const result = await callGit(
      () => window.git.commit(commitMessage),
      rejectWithValue,
      'Failed to commit changes',
      'commitChanges'
    )
    await Promise.all([dispatch(loadFileStatus()), dispatch(updateCommandHistory())])
    return result
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
    dispatch(updatePreviousHistoryIndex(lastIndex))

    const result = await callGit(
      () => window.git.discardFileChanges(Array.isArray(files) ? files : [files]),
      rejectWithValue,
      'Failed to discard file changes',
      'discardFileChanges'
    )

    // Update the status after successful discard
    await Promise.all([dispatch(loadFileStatus()), dispatch(updateCommandHistory())])
    return {
      success: true,
      files: Array.isArray(files) ? files : [files],
      count: result.data?.count || (Array.isArray(files) ? files.length : 1)
    }
  }
)

export const stageFile = createAsyncThunk(
  'git/stageFile',
  async (file, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.stageFile(file),
      rejectWithValue,
      'Failed to stage file',
      'stageFile'
    )

    await dispatch(loadFileStatus())
    return result
  }
)

export const unstageFile = createAsyncThunk(
  'git/unstageFile',
  async (file, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.unstageFile(file),
      rejectWithValue,
      'Failed to unstage file',
      'unstageFile'
    )

    // Refresh the file status after unstaging
    await dispatch(loadFileStatus())
    return result
  }
)

export const loadFileStatus = createAsyncThunk(
  'git/loadFileStatus',
  async (_, { rejectWithValue, getState, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }
    updateHistoryIndex(getState, dispatch)
    const result = await callGit(
      () => window.git.getStatus(),
      rejectWithValue,
      'Failed to load file status',
      'getStatus'
    )

    await dispatch(updateCommandHistory())
    return result
  }
)

export const updateCommandHistory = createAsyncThunk(
  'git/updateCommandHistory',
  async (_, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.getCommandHistory(),
      rejectWithValue,
      'Error updating command history',
      'getCommandHistory'
    )
    return result
  }
)

export const clearCommandHistory = createAsyncThunk(
  'git/clearCommandHistory',
  async (_, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.clearCommandHistory(),
      rejectWithValue,
      'Error clearing command history',
      'clearCommandHistory'
    )

    return { success: true }
  }
)

export const selectRepository = createAsyncThunk(
  'git/selectRepository',
  async (_, { rejectWithValue, dispatch, getState }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }


    const result = await callGit(
      () => window.git.selectRepository(),
      rejectWithValue,
      'Error selecting repository',
      'selectRepository'
    )
        // Update previous history index in the state
    updateHistoryIndex(getState, dispatch)
    await dispatch(loadCommitHistory())
    await dispatch(updateCommandHistory())
    return result
  }
)
